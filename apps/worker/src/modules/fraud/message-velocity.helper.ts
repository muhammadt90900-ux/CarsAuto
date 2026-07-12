/**
 * apps/worker/src/modules/fraud/message-velocity.helper.ts
 * Mirror of apps/api's — see that file's header and
 * apps/worker/README.md's duplication convention.
 */

export interface MessageCountClient {
  message: {
    count(args: any): Promise<number>;
  };
}

/**
 * NOTE ON THE `any` BELOW — see apps/api's identical helper's comment for
 * the full explanation: this is a sandbox-only stub-client typing
 * artifact, not a real design choice. Re-tighten to the structural
 * MessageCountClient interface once a real client is generated and this
 * still typechecks.
 */
export async function countRecentMessages(
  client: any,
  userId: string,
  windowHours: number,
): Promise<number> {
  const since = new Date(Date.now() - windowHours * 3600 * 1000);
  return client.message.count({ where: { senderId: userId, createdAt: { gte: since } } });
}
