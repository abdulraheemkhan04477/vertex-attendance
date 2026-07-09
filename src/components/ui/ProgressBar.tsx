interface ProgressBarProps {
  value: number; // 0-100
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  colorClass?: string;
}

function getColor(value: number): string {
  if (value >= 90) return 'bg-green-500';
  if (value >= 75) return 'bg-indigo-500';
  if (value >= 60) return 'bg-yellow-500';
  return 'bg-red-500';
}

const HEIGHTS = { sm: 'h-1.5', md: 'h-2.5', lg: 'h-4' };

export function ProgressBar({ value, showLabel = false, size = 'md', colorClass }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));
  const color = colorClass ?? getColor(clamped);
  return (
    <div className="w-full">
      <div className={`w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden ${HEIGHTS[size]}`}>
        <div
          className={`${HEIGHTS[size]} rounded-full transition-all duration-700 ease-out ${color}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
      {showLabel && (
        <p className="text-xs text-right mt-1 font-semibold text-gray-600 dark:text-gray-400">{clamped}%</p>
      )}
    </div>
  );
}
