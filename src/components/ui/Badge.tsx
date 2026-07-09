import type { AttendanceStatus } from '../../types';

type Variant = AttendanceStatus | 'default' | 'info';

const STYLES: Record<Variant, string> = {
  present: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
  absent:  'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
  late:    'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800',
  leave:   'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
  default: 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600',
  info:    'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400',
};

const DOTS: Record<Variant, string> = {
  present: 'bg-green-500',
  absent:  'bg-red-500',
  late:    'bg-yellow-500',
  leave:   'bg-blue-500',
  default: 'bg-gray-400',
  info:    'bg-indigo-500',
};

interface BadgeProps {
  variant?: Variant;
  label: string;
  dot?: boolean;
  size?: 'sm' | 'md';
}

export function Badge({ variant = 'default', label, dot = false, size = 'md' }: BadgeProps) {
  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';
  return (
    <span className={`inline-flex items-center gap-1.5 font-semibold rounded-full border ${STYLES[variant]} ${sizeClass}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${DOTS[variant]}`} />}
      {label.charAt(0).toUpperCase() + label.slice(1)}
    </span>
  );
}
