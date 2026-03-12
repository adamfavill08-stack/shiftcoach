"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { CoachChatModal } from "@/components/modals/CoachChatModal";
import { NotificationModal } from "@/components/notifications/NotificationModal";
import { useNotifications } from "@/lib/hooks/useNotifications";

export function FloatingCoachBubble() {
  const pathname = usePathname();
  const [isCoachChatOpen, setIsCoachChatOpen] = useState(false);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllAsRead, loading } =
    useNotifications();

  // Show only on the main home dashboard (Google Fit–style)
  const isHome = pathname === "/dashboard" || pathname === "/";
  if (!isHome) {
    return null;
  }

  const hasUnread = unreadCount > 0;

  return (
    <>
      {isCoachChatOpen && (
        <CoachChatModal onClose={() => setIsCoachChatOpen(false)} />
      )}

      {isNotificationModalOpen && (
        <NotificationModal
          isOpen={isNotificationModalOpen}
          onClose={() => setIsNotificationModalOpen(false)}
          notifications={notifications}
          markAsRead={markAsRead}
          markAllAsRead={markAllAsRead}
          loading={loading}
        />
      )}

      {/* Google Fit–style floating FAB */}
      <div className="fixed inset-x-0 bottom-20 z-[90] flex justify-end pointer-events-none">
        <div className="w-full max-w-[430px] mx-auto flex justify-end px-4">
          <button
            type="button"
            onClick={() => setIsCoachChatOpen(true)}
            className="relative flex h-11 w-11 items-center justify-center rounded-full bg-white text-slate-900 shadow-md shadow-slate-900/15 border border-slate-200 active:scale-95 transition pointer-events-auto"
            aria-label="Open ShiftCoach chat"
          >
            <MessageCircle className="h-5 w-5 text-indigo-500" />
            {hasUnread && (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  setIsNotificationModalOpen(true);
                }}
                className="absolute -top-1 -right-1 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold leading-none text-white shadow-sm"
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </>
  );
}

