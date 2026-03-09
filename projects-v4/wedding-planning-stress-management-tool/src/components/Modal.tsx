"use client";

import { ReactNode, useEffect, useRef } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open) {
      el.showModal();
    } else {
      el.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="w-full max-w-lg rounded-xl border border-border bg-surface p-0 shadow-lg backdrop:bg-black/40"
    >
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <h2 className="font-heading text-lg font-semibold text-text-primary">
          {title}
        </h2>
        <button
          onClick={onClose}
          className="text-text-secondary hover:text-text-primary transition-colors"
          aria-label="Close"
        >
          ✕
        </button>
      </div>
      <div className="px-6 py-5">{children}</div>
    </dialog>
  );
}
