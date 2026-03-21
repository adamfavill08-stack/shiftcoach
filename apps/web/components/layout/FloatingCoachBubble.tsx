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

  // Show only on the main home dashboard (Google Fit–style), not on splash
  const isHome = pathname === "/dashboard";
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

      {/* Google Fit–style floating FAB - hidden while chat is open */}
      {!isCoachChatOpen && (
        <div
          className="fixed inset-x-0 z-[90] flex justify-end pointer-events-none"
          style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 88px)" }}
        >
          <div className="w-full max-w-[430px] mx-auto flex justify-end px-4">
            <button
              type="button"
              onClick={() => setIsCoachChatOpen(true)}
              className="relative flex h-14 w-14 items-center justify-center rounded-full bg-white text-slate-900 shadow-md shadow-slate-900/15 border border-slate-200 active:scale-95 transition pointer-events-auto"
              aria-label="Open ShiftCoach chat"
            >
              <MessageCircle className="h-6 w-6 text-indigo-500" />
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
      )}
    </>
  );
}

