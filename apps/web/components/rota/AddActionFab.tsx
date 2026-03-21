"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Calendar, CheckCircle, Plus } from "lucide-react";

type AddActionFabProps = {
  onAddTask?: () => void;
  onAddEvent?: () => void;
};

export default function AddActionFab({ onAddTask, onAddEvent }: AddActionFabProps) {
  const [open, setOpen] = useState(false);

  const close = () => setOpen(false);

  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="Close add actions"
          onClick={close}
          className="fixed inset-0 z-40 bg-transparent"
        />
      )}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-center">
        <AnimatePresence>
          {open && (
            <motion.div
              key="actions"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.2 }}
              className="mb-3 flex flex-col gap-3"
            >
              <button
                type="button"
                onClick={() => {
                  close();
                  onAddTask?.();
                }}
                className="flex h-14 w-14 items-center justify-center rounded-full bg-sky-500 text-white shadow-md transition active:scale-95"
                aria-label="Add task"
              >
                <CheckCircle className="h-6 w-6" />
              </button>
              <button
                type="button"
                onClick={() => {
                  close();
                  onAddEvent?.();
                }}
                className="flex h-14 w-14 items-center justify-center rounded-full bg-sky-500 text-white shadow-md transition active:scale-95"
                aria-label="Add event"
              >
                <Calendar className="h-6 w-6" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-500 text-white shadow-lg transition active:scale-95"
          aria-label="Toggle add actions"
        >
          <Plus className="h-7 w-7" />
        </button>
      </div>
    </>
  );
}
