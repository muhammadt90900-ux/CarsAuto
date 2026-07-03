# Phase 2 / Prompt 2.3 — Partitioning Runbook

**Status: NOT EXECUTED.** Everything in this runbook and the accompanying
`.sql` files is for review. Nothing here has been run against any database.

Tables covered: `messages`, `audit_logs`, `transaction_logs`, `notifications`.
All four are unbounded, append-heavy, and queried almost exclusively by a
recent time window — the textbook case for PostgreSQL native RANGE
partitioning on `createdAt`, monthly partitions.

---

## 1. Why this needs manual SQL (not `prisma db push` / `prisma migrate`)

Prisma's schema language has no way to express `PARTITION BY RANGE`. Declarative
partitioning has to be created with raw SQL, and Prisma has to be told
(informally, via the schema comment added in this pass) not to run
destructive `db push` against these tables afterward, since Prisma doesn't
understand that `messages` is now a parent table with child partitions and
could try to "fix" it back to a plain table.

## 2. You cannot `ALTER TABLE ... PARTITION BY` a populated table

PostgreSQL does not support converting an existing, populated table into a
partitioned table in place. The only path is:

1. Create a **new**, empty, partitioned table with a temporary name.
2. Backfill it from the old table, in batches (to avoid a long-held lock
   and a huge single transaction).
3. Swap the two tables via rename, inside a short transaction.
4. Keep the old table around (renamed, not dropped) for N days as a
   rollback safety net.

This is the same "expand-migrate-contract" shape as Prompt 2.2's column
migration, applied to a much larger blast radius (these are the 4 highest
row-count tables in the schema), so the batching and rollback window matter
more here.

### Step-by-step (generic — same shape for all 4 tables)

Below, replace `TABLE`, `PK`, and the partition-key column as appropriate.
The 4 `.sql` files in this directory already have these substitutions done
for each specific table — this section is the reasoning behind them.

```sql
-- ── Step A: create the new partitioned parent, empty ──────────────────────
-- Same columns as the original table. The partition key (createdAt) MUST
-- be part of the primary key on a partitioned table — see the FK caveat
-- in section 4 for why this matters for `messages` specifically.
CREATE TABLE "TABLE_new" (
  LIKE "TABLE" INCLUDING DEFAULTS INCLUDING CONSTRAINTS EXCLUDING INDEXES,
  PRIMARY KEY (id, "createdAt")
) PARTITION BY RANGE ("createdAt");

-- ── Step B: create partitions for the window you need now ─────────────────
-- (see the per-table .sql files — past 2 months + current + next 3 months)

-- ── Step C: backfill in batches, oldest data first ─────────────────────────
-- Do this in a script (not one giant INSERT), e.g. 10k-50k rows per batch,
-- looping until 0 rows remain, with a short sleep between batches so you're
-- not saturating the primary with a sustained bulk write. Pattern:
--
--   INSERT INTO "TABLE_new"
--   SELECT * FROM "TABLE"
--   WHERE "createdAt" >= $cursor
--   ORDER BY "createdAt" ASC
--   LIMIT $batchSize
--   ON CONFLICT DO NOTHING;
--
-- Track $cursor as the max createdAt seen in the last batch fetched (not
-- inserted) — same cursor-pagination shape as Prompt 2.2's backfill script.

-- ── Step D: catch up rows written WHILE you were backfilling ──────────────
-- Between "you started Step C" and "you do the swap in Step E", new rows
-- keep landing in the OLD table. Immediately before the swap, run Step C's
-- query one more time filtered to createdAt >= (when Step C started), to
-- catch the delta. Repeat this narrowing catch-up pass 2-3 times — each
-- pass should be much faster than the last, converging toward near-zero
-- rows, which is what makes Step E's lock window short.

-- ── Step E: the swap — short transaction, brief exclusive lock ────────────
BEGIN;
  ALTER TABLE "TABLE" RENAME TO "TABLE_old";
  ALTER TABLE "TABLE_new" RENAME TO "TABLE";
  -- Recreate sequences/defaults/FK names if `LIKE ... INCLUDING` renamed
  -- any constraint names on the way — check \d "TABLE" after this and
  -- compare against \d "TABLE_old" from before you started.
COMMIT;

-- ── Step F: final catch-up + verification ──────────────────────────────────
-- Any rows written to "TABLE_old" in the instant between your last Step D
-- pass and the Step E commit (there's always a small window) need one more
-- copy pass, now reading from "TABLE_old" and writing to "TABLE" (which is
-- now the new partitioned table). Then compare row counts:
--   SELECT count(*) FROM "TABLE_old";
--   SELECT count(*) FROM "TABLE";
-- They should match (or "TABLE" >= "TABLE_old" if the app kept writing
-- during Step F, since new writes go to "TABLE" after the Step E swap).

-- ── Step G: keep "TABLE_old" for N days, then drop ─────────────────────────
-- Recommended N = 14 days minimum for messages/notifications (user-facing —
-- a silent data gap would be reported quickly). N = 30 days for
-- audit_logs/transaction_logs (compliance/financial — slower to notice a
-- gap, higher cost if you're wrong). Don't DROP in this same pass; that's
-- a separate, deliberate follow-up once you've verified the new table in
-- production.
```

---

## 3. Which indexes need to be recreated per-partition vs. inherited

Since PostgreSQL 11, `CREATE INDEX ON <partitioned parent>` automatically
creates a matching index on every **existing** partition and is
automatically applied to every **future** partition created afterward — you
do not need to manually create the same index N times. This applies to all
the `@@index([...])` entries on these 4 models: create them once on the
parent (see each `.sql` file's "Step B.2 — indexes on the parent" section)
and PostgreSQL propagates them.

What does **not** propagate automatically and needs explicit thought per
table:

- **Primary key**: must include the partition column (`createdAt`) as
  discussed above. This changes `id` from a standalone PK to a composite
  `(id, createdAt)` PK. `id` alone stops being guaranteed globally unique
  *to Postgres* (uniqueness is only enforced per-partition combined with
  the range), though in practice UUIDv4 collision risk is negligible.
  **Prisma impact**: `prisma.message.findUnique({ where: { id } })` still
  works fine (Prisma can use `id` in a `WHERE` even without it being the
  sole PK) — this only matters for FK *references into* the table (below).

- **Foreign keys referencing INTO the partitioned table** (i.e., other
  tables whose FK points at this table's `id`): this is where the real
  complexity is. See section 4.

## 4. The one FK complication: `messages` ← `message_read_receipts`

Of the 4 tables, only `messages` is referenced by another table's foreign
key: `MessageReadReceipt.messageId → Message.id`. PostgreSQL (12+) does
allow a FK to reference a partitioned table, but the referenced
constraint must be the partitioned table's PK/UNIQUE constraint — which,
per section 3, is now the **composite** `(id, createdAt)`, not `id` alone.
That means `message_read_receipts.messageId` alone can no longer satisfy a
FK into `messages` — the FK would need to become a composite FK
`(messageId, messageCreatedAt) → messages(id, "createdAt")`, which means
adding a `messageCreatedAt` column to `message_read_receipts` and
populating it (denormalizing the parent's createdAt onto the child) purely
to satisfy the FK.

**Recommendation** (this is a judgment call, flagging it rather than
silently picking one): drop the DB-level FK constraint from
`message_read_receipts.messageId` and rely on Prisma's application-level
`onDelete: Cascade` behavior plus the existing `@@unique([messageId, userId])`
index for correctness, instead of denormalizing `createdAt` onto
`message_read_receipts`. This is the more common pattern for high-throughput
partitioned parent tables with child tables — Prisma's cascade delete is a
generated `DELETE FROM message_read_receipts WHERE "messageId" = $1`
executed by the app/Prisma layer, not a DB-enforced `ON DELETE CASCADE`
that depends on the FK constraint existing. If DB-level enforcement of that
relationship is a hard requirement (e.g. for a compliance reason), the
denormalized composite-FK route is the alternative, at the cost of a schema
change to `message_read_receipts` too.

`partition-messages.sql` implements the drop-FK approach; the composite-FK
alternative is documented inline as a commented-out block in that file if
you'd rather do it that way instead.

---

## 4. Running order

1. Run `partition-audit-logs.sql`, `partition-transaction-logs.sql`,
   `partition-notifications.sql` first — no FK complications, lowest risk.
2. Verify each (Step F counts) and let them sit for a few days before
   touching `messages`.
3. Run `partition-messages.sql` last, after deciding on the FK approach in
   section 4 above.
4. Deploy the BullMQ partition-maintenance job
   (`apps/worker/src/processors/partition-maintenance.processor.ts`) — it
   needs the tables to already be partitioned to do anything, so deploy it
   after step 3, not before.

## 5. What to monitor after the swap

- Query plans on the hot paths (chat thread pagination, admin audit log
  search, notification feed, payment transaction history) — confirm
  PostgreSQL is doing partition pruning (`EXPLAIN` should show it touching
  only the relevant month's partition(s), not scanning all of them).
- Partition count over time — confirm the BullMQ maintenance job is
  actually creating next month's partition ahead of time (check for a
  `partition_maintenance` job completing monthly in the queue dashboard/logs).
- Old-table (`TABLE_old`) row count staying flat after the swap — if it's
  still growing, something is still writing to the old table and the swap
  didn't fully take effect.
