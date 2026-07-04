// apps/web/src/app/[locale]/dashboard/messages/loading.tsx
//
// Route-level fallback for the chat page, shown during initial navigation
// (before MessagesPage mounts and takes over with its own react-query-driven
// ConvSkeleton/message skeletons). Mirrors the two-pane conversation-list +
// chat-window layout so there's no layout shift on mount.

import { Skeleton } from '@/components/ui/Skeleton';

export default function MessagesLoading() {
  return (
    <div className="flex h-[calc(100vh-60px)] md:h-full" aria-busy="true" aria-label="Loading messages">
      {/* Conversation list rail */}
      <div className="hidden md:flex w-80 flex-col border-r border-white/[0.06] p-3 space-y-3">
        <Skeleton height="2.5rem" rounded="rounded-xl" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-1 py-2">
            <Skeleton width="2.5rem" height="2.5rem" rounded="rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton height="0.75rem" width="70%" />
              <Skeleton height="0.625rem" width="45%" />
            </div>
          </div>
        ))}
      </div>

      {/* Chat pane */}
      <div className="flex-1 flex flex-col p-4 space-y-4">
        <Skeleton height="2.5rem" width="50%" />
        <div className="flex-1 space-y-3 py-4">
          <Skeleton height="2.5rem" width="60%" rounded="rounded-2xl" />
          <Skeleton height="2.5rem" width="40%" rounded="rounded-2xl" className="ml-auto" />
          <Skeleton height="2.5rem" width="55%" rounded="rounded-2xl" />
        </div>
        <Skeleton height="3rem" rounded="rounded-xl" />
      </div>
    </div>
  );
}
