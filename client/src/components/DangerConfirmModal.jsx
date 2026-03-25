import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

export default function DangerConfirmModal({
  open,
  title,
  description,
  subjectLabel = '',
  impacts = [],
  errorMessage = '',
  busy = false,
  confirmLabel = '确认删除',
  cancelLabel = '先不删除',
  onConfirm,
  onCancel,
  testId = 'danger-confirm-modal'
}) {
  const onConfirmRef = useRef(onConfirm);
  const onCancelRef = useRef(onCancel);

  useEffect(() => {
    onConfirmRef.current = onConfirm;
    onCancelRef.current = onCancel;
  }, [onCancel, onConfirm]);

  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (event) => {
      if (busy) return;

      if (event.key === 'Escape') {
        onCancelRef.current?.();
      }

      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        onConfirmRef.current?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [busy, open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[1100] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"
          onClick={() => !busy && onCancel?.()}
        >
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.94 }}
            transition={{ type: 'spring', stiffness: 260, damping: 24 }}
            className="w-full max-w-[560px] overflow-hidden rounded-[32px] border border-white/70 bg-[linear-gradient(180deg,#fffdf8_0%,#fff4f2_50%,#f8fbff_100%)] shadow-[0_28px_80px_rgba(15,23,42,0.28)]"
            data-testid={testId}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="border-b border-rose-100 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.24),transparent_48%),linear-gradient(135deg,rgba(255,255,255,0.92),rgba(255,241,242,0.9))] px-6 py-6">
              <div className="inline-flex items-center gap-2 rounded-full bg-rose-100 px-3 py-1 text-[11px] font-black tracking-[0.16em] text-rose-600 shadow-sm">
                <span>危险操作</span>
                <span>不可撤回</span>
              </div>
              <h3 className="mt-4 text-2xl font-black text-slate-800">{title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">{description}</p>
              {subjectLabel && (
                <div className="mt-4 inline-flex max-w-full items-center rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm">
                  <span className="truncate">{subjectLabel}</span>
                </div>
              )}
            </div>

            <div className="px-6 py-5">
              <div className="rounded-[24px] border border-amber-100 bg-white/88 px-4 py-4 shadow-sm">
                <div className="text-[11px] font-black tracking-[0.18em] text-slate-400">删除后将立即发生</div>
                <div className="mt-3 space-y-2.5">
                  {impacts.map((impact) => (
                    <div
                      key={impact}
                      className="flex items-start gap-3 rounded-2xl bg-slate-50/90 px-3 py-3 text-sm text-slate-600"
                    >
                      <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-rose-100 text-xs font-black text-rose-600">
                        !
                      </span>
                      <span className="leading-6">{impact}</span>
                    </div>
                  ))}
                </div>
              </div>

              {errorMessage && (
                <div className="mt-4 rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-600">
                  {errorMessage}
                </div>
              )}

              <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => onCancel?.()}
                  disabled={busy}
                  data-testid={`${testId}-cancel`}
                  className="rounded-full bg-slate-100 px-5 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {cancelLabel}
                </button>
                <button
                  type="button"
                  onClick={() => onConfirm?.()}
                  disabled={busy}
                  data-testid={`${testId}-confirm`}
                  className="rounded-full bg-[linear-gradient(135deg,#fb7185_0%,#f97316_100%)] px-6 py-3 text-sm font-black text-white shadow-[0_14px_30px_rgba(249,115,22,0.28)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {busy ? '正在处理...' : confirmLabel}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
