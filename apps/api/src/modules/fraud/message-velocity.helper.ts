/**
 * apps/api/src/modules/fraud/message-velocity.helper.ts
 *
 * Trust & Safety Prompt 5 — extracted from
 * FraudScoringService.scoreMessageVelocity()'s query so the same 24h
 * message-count logic can be reused by SuspiciousActivityService's
 * real-time spike check without duplicating it (per Prompt 5's explicit
 * instruction). Takes a plain Prisma-client-shaped object rather than
 * PrismaService specifically, so both apps/api's PrismaService (via
 * `.db('read')`) and apps/worker's (direct) can pass their own client in —
 * same reasoning as the rest of this duplication-convention codebase.
 */

export interface MessageCountClient {
  message: {
    count(args: any): Promise<number>;
  };
}

/**
 * NOTE ON THE `any` BELOW: originally typed as a narrow structural
 * interface (`{ message: { count(args): Promise<number> } }`), which is
 * the more type-safe choice and works fine once a real `@prisma/client` is
 * generated. In THIS sandbox, the generated client is a stub (network
 * blocks binaries.prisma.sh — see schema.prisma Prompt 1 migration note
 * for the same root cause) whose PrismaService type has no model
 * properties at all, so TS's structural-assignability check for passing
 * `this.prisma` into an explicit interface fails even though direct
 * property access like `this.prisma.message.count(...)` elsewhere in this
 * codebase compiles fine. Widened to `any` here to not block on a
 * sandbox-only artifact — verify this still typechecks cleanly with the
 * interface restored once you run `prisma generate` locally; if it does,
 * feel free to tighten this back up.
 */
export async function countRecentMessages(
  client: any,
  userId: string,
  windowHours: number,
): Promise<number> {
  const since = new Date(Date.now() - windowHours * 3600 * 1000);
  return client.message.count({ where: { senderId: userId, createdAt: { gte: since } } });
}
