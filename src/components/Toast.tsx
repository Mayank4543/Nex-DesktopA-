import React, { useEffect } from 'react';
import { useAssistantStore } from '../store/assistantStore';

const TOAST_ICONS: Record<string, string> = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ',
};

const TOAST_COLORS: Record<string, string> = {
  success: 'border-nexa-success/30 bg-nexa-success/10',
  error: 'border-nexa-error/30 bg-nexa-error/10',
  warning: 'border-nexa-warning/30 bg-nexa-warning/10',
  info: 'border-nexa-accent/30 bg-nexa-accent/10',
};

const ICON_COLORS: Record<string, string> = {
  success: 'text-nexa-success',
  error: 'text-nexa-error',
  warning: 'text-nexa-warning',
  info: 'text-nexa-accent',
};

export const Toast: React.FC = () => {
  const toasts = useAssistantStore((s) => s.toasts);
  const removeToast = useAssistantStore((s) => s.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-3 right-3 z-[9999] flex flex-col gap-2 no-drag">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border ${TOAST_COLORS[toast.type]} animate-slide-down shadow-nexa backdrop-blur-md`}
        >
          <span className={`text-sm font-medium ${ICON_COLORS[toast.type]}`}>
            {TOAST_ICONS[toast.type]}
          </span>
          <span className="text-xs text-nexa-text/90 max-w-[240px]">{toast.message}</span>
          <button
            onClick={() => removeToast(toast.id)}
            className="ml-1 text-nexa-text-muted hover:text-nexa-text transition-colors text-xs"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
};
