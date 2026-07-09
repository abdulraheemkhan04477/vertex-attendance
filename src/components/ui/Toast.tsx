import { AnimatePresence, motion } from 'framer-motion';
import { FiCheck, FiX, FiAlertTriangle, FiInfo } from 'react-icons/fi';
import { useStore } from '../../store/useStore';
import type { ToastMessage } from '../../types';

const ICONS = {
  success: <FiCheck className="w-5 h-5" />,
  error: <FiX className="w-5 h-5" />,
  warning: <FiAlertTriangle className="w-5 h-5" />,
  info: <FiInfo className="w-5 h-5" />,
};

const COLORS = {
  success: 'bg-green-500 border-green-600',
  error: 'bg-red-500 border-red-600',
  warning: 'bg-yellow-500 border-yellow-600',
  info: 'bg-blue-500 border-blue-600',
};

function ToastItem({ toast }: { toast: ToastMessage }) {
  const removeToast = useStore((s) => s.removeToast);
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 60, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 60, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-white shadow-2xl border ${COLORS[toast.type]} min-w-[280px] max-w-[380px] cursor-pointer select-none`}
      onClick={() => removeToast(toast.id)}
    >
      <span className="flex-shrink-0">{ICONS[toast.type]}</span>
      <p className="text-sm font-medium flex-1">{toast.message}</p>
      <button
        className="flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity"
        onClick={(e) => { e.stopPropagation(); removeToast(toast.id); }}
      >
        <FiX className="w-4 h-4" />
      </button>
    </motion.div>
  );
}

export function ToastContainer() {
  const toasts = useStore((s) => s.toasts);
  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <ToastItem toast={t} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}
