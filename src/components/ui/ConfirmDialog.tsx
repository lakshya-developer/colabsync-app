'use client';

import { useEffect, useRef } from 'react';
import { AlertTriangle, LogOut, Trash2, X } from 'lucide-react';
import { useTheme } from 'next-themes';

export type ConfirmDialogVariant = 'danger' | 'warning' | 'info';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmDialogVariant;
  icon?: 'logout' | 'delete' | 'warning';
  onConfirm: () => void;
  onCancel: () => void;
}

const ICON_MAP = {
  logout: LogOut,
  delete: Trash2,
  warning: AlertTriangle,
};

const VARIANT_STYLES = {
  danger: {
    iconBg: 'bg-red-500/10',
    iconColor: 'text-red-400',
    confirmBtn:
      'bg-red-500 hover:bg-red-600 active:bg-red-700 text-white shadow-red-500/20 shadow-md',
    confirmRing: 'focus:ring-red-400/30',
  },
  warning: {
    iconBg: 'bg-amber-500/10',
    iconColor: 'text-amber-400',
    confirmBtn:
      'bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white shadow-amber-500/20 shadow-md',
    confirmRing: 'focus:ring-amber-400/30',
  },
  info: {
    iconBg: 'bg-brand-blue/10',
    iconColor: 'text-brand-blue',
    confirmBtn:
      'bg-brand-blue hover:bg-brand-blue-dark active:bg-brand-blue-dark text-white shadow-brand-blue/20 shadow-md',
    confirmRing: 'focus:ring-brand-blue/30',
  },
};

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  icon = 'warning',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  const styles = VARIANT_STYLES[variant];
  const IconComponent = ICON_MAP[icon];

  // Focus the cancel button when dialog opens (safer default)
  useEffect(() => {
    if (open) {
      setTimeout(() => cancelRef.current?.focus(), 50);
    }
  }, [open]);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onCancel]);

  // Trap focus within dialog
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const focusable = [cancelRef.current, confirmRef.current].filter(Boolean) as HTMLElement[];
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  if (!open) return null;

  const dialogBg = isDark
    ? 'bg-zinc-900 border-zinc-800'
    : 'bg-white border-zinc-200';
  const cancelBtn = isDark
    ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700'
    : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border border-zinc-200';

  return (
    /* Backdrop */
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      className="fixed inset-0 z-[999] flex items-center justify-center p-4"
      style={{ backdropFilter: 'blur(6px)', background: 'rgba(0,0,0,0.45)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      {/* Panel */}
      <div
        className={`relative w-full max-w-md rounded-2xl border p-6 shadow-2xl transition-all
          ${dialogBg}
          animate-in fade-in zoom-in-95 duration-150`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close X */}
        <button
          onClick={onCancel}
          className={`absolute right-4 top-4 rounded-lg p-1.5 transition
            ${isDark
              ? 'text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300'
              : 'text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600'
            }`}
          aria-label="Close dialog"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Icon + Title */}
        <div className="flex items-start gap-4 pr-8">
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${styles.iconBg}`}>
            <IconComponent className={`h-5 w-5 ${styles.iconColor}`} />
          </div>
          <div>
            <h2
              id="confirm-dialog-title"
              className="text-base font-semibold leading-snug"
            >
              {title}
            </h2>
            {description && (
              <p className={`mt-1 text-sm leading-relaxed ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                {description}
              </p>
            )}
          </div>
        </div>

        {/* Brand accent line */}
        <div
          className="my-5 h-px w-full"
          style={{ background: 'linear-gradient(90deg, #2E7DC5 0%, #4ABF6A 100%)' }}
        />

        {/* Action buttons */}
        <div className="flex items-center justify-end gap-3">
          <button
            ref={cancelRef}
            onClick={onCancel}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-brand-blue/30 ${cancelBtn}`}
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            onClick={onConfirm}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition focus:outline-none focus:ring-2
              ${styles.confirmBtn} ${styles.confirmRing}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
