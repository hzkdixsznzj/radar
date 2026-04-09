'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import clsx from 'clsx';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
}

export function Modal({ open, onClose, title, children, className }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      dialog.showModal();
    } else {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => onClose();
    dialog.addEventListener('close', handleClose);
    return () => dialog.removeEventListener('close', handleClose);
  }, [onClose]);

  // Close on backdrop click
  const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (e.target === dialogRef.current) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <dialog
          ref={dialogRef}
          onClick={handleBackdropClick}
          className="fixed inset-0 z-50 bg-transparent backdrop:bg-black/60 backdrop:backdrop-blur-sm open:flex open:items-center open:justify-center m-auto max-h-[85dvh] max-w-lg w-[calc(100%-2rem)] p-0 rounded-2xl overflow-visible"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className={clsx(
              'w-full rounded-2xl border border-border bg-bg-card p-6 shadow-2xl',
              className,
            )}
          >
            <div className="flex items-center justify-between mb-4">
              {title && (
                <h2 className="text-lg font-semibold font-display text-text-primary">
                  {title}
                </h2>
              )}
              <button
                onClick={onClose}
                className={clsx(
                  'shrink-0 size-8 rounded-lg flex items-center justify-center',
                  'text-text-muted hover:text-text-primary hover:bg-bg-card-hover',
                  'transition-colors duration-150 cursor-pointer',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-blue',
                  !title && 'ml-auto',
                )}
                aria-label="Fermer"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="overflow-y-auto max-h-[calc(85dvh-5rem)]">
              {children}
            </div>
          </motion.div>
        </dialog>
      )}
    </AnimatePresence>
  );
}
