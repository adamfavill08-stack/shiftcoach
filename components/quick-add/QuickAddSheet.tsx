"use client";

import { useRouter } from "next/navigation";
import { useQuickAdd } from "@/lib/quickAddContext";
import { motion, AnimatePresence } from "framer-motion";
import { Moon, Utensils, Droplets, Coffee, SmilePlus, Activity, MessageCircle, X } from "lucide-react";

type QuickAction = {
  id: string;
  label: string;
  subtitle: string;
  icon: React.ReactNode;
  onClick: () => void;
};

export function QuickAddSheet() {
  const { isOpen, close } = useQuickAdd();
  const router = useRouter();

  const go = (path: string) => {
    close();
    router.push(path);
  };

  const actions: QuickAction[] = [
    { id: "sleep", label: "Log sleep", subtitle: "Main sleep or nap", icon: <Moon className="h-6 w-6" />, onClick: () => go("/sleep") },
    { id: "water", label: "Water", subtitle: "Add a quick drink", icon: <Droplets className="h-6 w-6" />, onClick: () => go("/progress?section=hydration") },
    { id: "caffeine", label: "Caffeine", subtitle: "Coffee, tea, energy", icon: <Coffee className="h-6 w-6" />, onClick: () => go("/progress?section=hydration") },
    { id: "mood", label: "Mood & focus", subtitle: "Today's check-in", icon: <SmilePlus className="h-6 w-6" />, onClick: () => go("/progress?section=mood") },
    { id: "steps", label: "Steps", subtitle: "Update your activity", icon: <Activity className="h-6 w-6" />, onClick: () => go("/steps") },
    { id: "coach", label: "Ask coach", subtitle: "Chat about anything", icon: <MessageCircle className="h-6 w-6" />, onClick: () => { close(); router.push("/coach"); } },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={close}
        >
          <motion.div
            className="w-full max-w-md rounded-t-3xl bg-white/95 dark:bg-slate-950/95 shadow-2xl border border-white/40 dark:border-white/10 px-4 pt-4 pb-6"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-center">
              <div className="h-1 w-10 rounded-full bg-slate-200 dark:bg-slate-700" />
            </div>

            <div className="mt-3 mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Quick add</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Log what matters in seconds.</p>
              </div>
              <button
                onClick={close}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 mt-1">
              {actions.map((action) => (
                <button
                  key={action.id}
                  onClick={action.onClick}
                  className="group flex flex-col items-center rounded-2xl bg-slate-50/80 dark:bg-slate-900/60 px-2.5 py-3 hover:bg-sky-50 hover:shadow-sm dark:hover:bg-sky-900/40 transition"
                >
                  <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-indigo-500 text-white shadow-md shadow-sky-500/30 group-hover:scale-105 transition-transform">
                    {action.icon}
                  </div>
                  <span className="text-xs font-medium text-slate-900 dark:text-slate-50 text-center">{action.label}</span>
                  <span className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400 text-center leading-tight">{action.subtitle}</span>
                </button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}


