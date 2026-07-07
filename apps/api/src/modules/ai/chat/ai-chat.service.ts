/**
 * apps/api/src/modules/ai/chat/ai-chat.service.ts
 *
 * Prompt 3 — Buyer-facing AI chat assistant.
 *
 * Deliberately separate from Chat/Message (human-to-human buyer↔seller
 * chat) — see AiChatSession/AiChatMessage's schema comment.
 *
 * Flow per sendMessage():
 *   1. Cheap intent classification (search_filter / general_question /
 *      listing_question) via OpenAiService.complete().
 *   2a. search_filter  → reuse SearchService.parseNaturalLanguageQuery() +
 *       search(), then summarize ONLY the rows actually returned.
 *   2b. general_question / listing_question → RAG: embed the query,
 *       pgvector top-k retrieval against Listing.embedding, answer from
 *       that retrieved context only.
 *
 * GROUNDING RULE (both paths): the prompt sent to OpenAiService.complete()
 * for the final answer contains the retrieved listing rows as structured
 * JSON and explicitly instructs the model not to describe anything outside
 * that list. This is the whole point of Prompt 3 — never let the model
 * invent a listing it wasn't given.
 *
 * KNOWN GAP (flagged, not silently handled): the source prompt's 3-way
 * intent split only specifies behavior for 2 of the 3 branches
 * (search_filter, general_question) — "listing_question" has no distinct
 * spec. Routed through the same RAG path as general_question for now
 * (asking about a specific listing is still "answer from retrieved
 * context"), but if listing_question should instead look up ONE specific
 * listing by ID from the conversation, that needs its own retrieval path —
 * revisit once real usage shows which case actually comes up.
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { OpenAiService } from '../../../common/ai/openai.service';
import { SearchService } from '../../search/search.service';

const MAX_MESSAGES_PER_SESSION = 30;
const RAG_TOP_K = 5;
const SEARCH_FILTER_GROUNDING_LIMIT = 5;

type Intent = 'search_filter' | 'general_question' | 'listing_question';

export interface AssistantReply {
  reply: string;
  intent: Intent;
  sessionId: string;
  limitReached?: boolean;
}

interface RagListingRow {
  id: string;
  titleEn: string;
  titleKu: string;
  price: string;
  currency: string;
  similarity?: number;
}

@Injectable()
export class AiChatService {
  private readonly logger = new Logger(AiChatService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly openai: OpenAiService,
    private readonly searchService: SearchService,
  ) {}

  /* ── Session management ──────────────────────────────────────────────── */

  async createSession(userId: string | null, locale = 'ku'): Promise<string> {
    const session = await this.prisma.aiChatSession.create({
      data: {
        userId,
        locale,
        // 24h idle expiry — a session with no activity for a day is
        // considered abandoned. Not enforced as a hard delete anywhere
        // yet (no cleanup job in this pass); just a marker for a future
        // nightly sweep, consistent with other "computed, swept later"
        // fields elsewhere in this codebase (e.g. FraudScore's pattern).
        expiresAt: new Date(Date.now() + 24 * 3600 * 1000),
      },
      select: { id: true },
    });
    return session.id;
  }

  async getHistory(sessionId: string) {
    return this.prisma.aiChatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
      select: { id: true, role: true, content: true, createdAt: true },
    });
  }

  /* ── Main entry point ────────────────────────────────────────────────── */

  async sendMessage(sessionId: string, userMessage: string, locale = 'ku'): Promise<AssistantReply> {
    const trimmed = userMessage?.trim();
    if (!trimmed) {
      return { reply: '', intent: 'general_question', sessionId };
    }

    const messageCount = await this.prisma.aiChatMessage.count({ where: { sessionId } });
    if (messageCount >= MAX_MESSAGES_PER_SESSION) {
      return {
        reply:
          locale === 'ku'
            ? 'گەیشتیتە سنووری زۆرترین نامە بۆ ئەم گفتوگۆیە. تکایە گفتوگۆیەکی نوێ دەست پێ بکە.'
            : 'This conversation has reached its message limit. Please start a new one.',
        intent: 'general_question',
        sessionId,
        limitReached: true,
      };
    }

    await this.persist(sessionId, 'user', trimmed);

    const intent = await this.classifyIntent(trimmed);
    let reply: string;

    if (intent === 'search_filter') {
      reply = await this.handleSearchFilter(trimmed, locale);
    } else {
      reply = await this.handleRag(trimmed, locale);
    }

    await this.persist(sessionId, 'assistant', reply);

    return { reply, intent, sessionId };
  }

  private async persist(sessionId: string, role: 'user' | 'assistant', content: string): Promise<void> {
    try {
      await this.prisma.aiChatMessage.create({
        data: { sessionId, role, content },
      });
    } catch (err) {
      // Persistence failure shouldn't stop the reply from reaching the
      // user — but it does mean history for this turn is lost, worth a
      // loud warning rather than silent swallow.
      this.logger.warn(`Failed to persist ${role} message for session ${sessionId}: ${(err as Error).message}`);
    }
  }

  /* ── Step 1: intent classification ───────────────────────────────────── */

  private async classifyIntent(message: string): Promise<Intent> {
    const systemPrompt = `Classify the user's message into exactly one category. Respond with ONLY one word, no punctuation:
- search_filter: the user wants to find/filter vehicles by attributes (brand, price, year, body type, fuel, location, etc.)
- listing_question: the user is asking about a specific listing they're already looking at
- general_question: anything else (how the platform works, general car advice, etc.)`;

    const raw = await this.openai.complete(message, systemPrompt, false, {
      feature: 'ai-chat.classifyIntent',
      cache: true,
      cacheTtlSeconds: 3600,
    });

    const normalized = raw.trim().toLowerCase();
    if (normalized.includes('search_filter')) return 'search_filter';
    if (normalized.includes('listing_question')) return 'listing_question';
    return 'general_question';
  }

  /* ── Step 2a: search_filter — reuse Prompt 2's NL parsing + search ───── */

  private async handleSearchFilter(message: string, locale: string): Promise<string> {
    try {
      const parsed = await this.searchService.parseNaturalLanguageQuery(message, locale);
      const result = await this.searchService.search(message, { locale });

      const rows = (result?.data ?? []).slice(0, SEARCH_FILTER_GROUNDING_LIMIT);
      return this.summarizeGroundedRows(rows, message, locale, parsed);
    } catch (err) {
      this.logger.warn(`handleSearchFilter() failed: ${(err as Error).message}`);
      return this.fallbackReply(locale);
    }
  }

  /* ── Step 2b: RAG — embed + pgvector top-k + grounded answer ─────────── */

  private async handleRag(message: string, locale: string): Promise<string> {
    try {
      const embedding = await this.openai.embed(message, { feature: 'ai-chat.rag' });
      if (!embedding.length) {
        return this.fallbackReply(locale);
      }

      const vectorStr = `[${embedding.join(',')}]`;
      const rows = await this.prisma.db('read').$queryRaw<RagListingRow[]>`
        SELECT id, "titleEn", "titleKu", price::text as price, currency,
               1 - (embedding <=> ${vectorStr}::vector) AS similarity
        FROM listings
        WHERE status = 'ACTIVE'
          AND "deletedAt" IS NULL
          AND embedding IS NOT NULL
        ORDER BY embedding <=> ${vectorStr}::vector
        LIMIT ${RAG_TOP_K}
      `;

      return this.summarizeGroundedRows(rows, message, locale);
    } catch (err) {
      this.logger.warn(`handleRag() failed: ${(err as Error).message}`);
      return this.fallbackReply(locale);
    }
  }

  /* ── Shared grounded-answer generation ───────────────────────────────── */

  private async summarizeGroundedRows(
    rows: Array<{ id: string; titleEn?: string; titleKu?: string; price: any; currency?: string }>,
    userMessage: string,
    locale: string,
    parsedFilters?: Record<string, unknown>,
  ): Promise<string> {
    if (!rows.length) {
      return locale === 'ku'
        ? 'هیچ ئۆتۆمبێلێکی گونجاو نەدۆزرایەوە بۆ ئەم پرسیارە.'
        : 'No matching listings were found for that.';
    }

    const context = rows.map((r) => ({
      id: r.id,
      title: r.titleEn || r.titleKu,
      price: r.price,
      currency: r.currency,
    }));

    const systemPrompt = `You are a helpful vehicle-marketplace assistant. Answer the user's question using ONLY the listings JSON provided below — never mention, describe, or invent a vehicle that isn't in this list. If the list doesn't answer the question, say so honestly.
Respond in ${locale === 'ku' ? 'Sorani Kurdish' : locale}.
Keep the answer short (2-4 sentences), natural, and conversational — not a raw data dump.

LISTINGS:
${JSON.stringify(context)}
${parsedFilters ? `\nEXTRACTED FILTERS (for your context only, do not repeat verbatim): ${JSON.stringify(parsedFilters)}` : ''}`;

    const reply = await this.openai.complete(userMessage, systemPrompt, false, {
      feature: 'ai-chat.summarize',
      cache: false, // conversational — each turn's phrasing may reasonably vary
    });

    return reply || this.fallbackReply(locale);
  }

  private fallbackReply(locale: string): string {
    return locale === 'ku'
      ? 'ببورە، ئێستا ناتوانم وەڵامی ئەم پرسیارە بدەمەوە. تکایە دووبارە هەوڵ بدەوە.'
      : "Sorry, I can't answer that right now. Please try again.";
  }
}
