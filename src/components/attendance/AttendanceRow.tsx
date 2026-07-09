import type { Student, AttendanceStatus } from '../../types';

interface AttendanceRowProps {
  student: Student;
  index: number;
  status: AttendanceStatus | null;
  remark: string;
  onStatusChange: (rollNumber: string, status: AttendanceStatus) => void;
  onRemarkChange: (rollNumber: string, remark: string) => void;
  onStudentClick: (student: Student) => void;
}

const STATUS_BTNS: { status: AttendanceStatus; label: string; activeClass: string; hoverClass: string }[] = [
  { status: 'present', label: 'P', activeClass: 'bg-green-500 text-white border-green-500',   hoverClass: 'hover:bg-green-50 hover:border-green-300 hover:text-green-700 dark:hover:bg-green-900/20' },
  { status: 'absent',  label: 'A', activeClass: 'bg-red-500 text-white border-red-500',       hoverClass: 'hover:bg-red-50 hover:border-red-300 hover:text-red-700 dark:hover:bg-red-900/20' },
  { status: 'late',    label: 'L', activeClass: 'bg-yellow-400 text-white border-yellow-400', hoverClass: 'hover:bg-yellow-50 hover:border-yellow-300 hover:text-yellow-700 dark:hover:bg-yellow-900/20' },
  { status: 'leave',   label: 'Lv', activeClass: 'bg-blue-500 text-white border-blue-500',   hoverClass: 'hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 dark:hover:bg-blue-900/20' },
];

const ROW_STATUS_BG: Record<string, string> = {
  present: 'bg-green-50/50 dark:bg-green-900/5',
  absent:  'bg-red-50/50 dark:bg-red-900/5',
  late:    'bg-yellow-50/50 dark:bg-yellow-900/5',
  leave:   'bg-blue-50/50 dark:bg-blue-900/5',
};

export function AttendanceRow({
  student, index, status, remark, onStatusChange, onRemarkChange, onStudentClick,
}: AttendanceRowProps) {
  return (
    <tr className={`border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50/80 dark:hover:bg-gray-800/60 transition-colors ${status ? ROW_STATUS_BG[status] : ''}`}>
      {/* Index */}
      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 w-10 text-center">
        {index}
      </td>
      {/* Roll */}
      <td className="px-4 py-3">
        <span className="text-xs font-mono font-semibold text-indigo-600 dark:text-indigo-400">
          {student.rollNumber}
        </span>
      </td>
      {/* Name */}
      <td className="px-4 py-3">
        <button
          onClick={() => onStudentClick(student)}
          className="text-sm font-semibold text-gray-800 dark:text-gray-200 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors text-left"
        >
          {student.name}
        </button>
      </td>
      {/* Status indicator */}
      <td className="px-4 py-3">
        {status ? (
          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full border
            ${status === 'present' ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800' : ''}
            ${status === 'absent'  ? 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800' : ''}
            ${status === 'late'    ? 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800' : ''}
            ${status === 'leave'   ? 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800' : ''}
          `}>
            <span className={`w-1.5 h-1.5 rounded-full
              ${status === 'present' ? 'bg-green-500' : ''}
              ${status === 'absent'  ? 'bg-red-500'   : ''}
              ${status === 'late'    ? 'bg-yellow-500' : ''}
              ${status === 'leave'   ? 'bg-blue-500'   : ''}
            `} />
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </span>
        ) : (
          <span className="text-xs text-gray-400 italic">Not marked</span>
        )}
      </td>
      {/* Action buttons */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-1">
          {STATUS_BTNS.map(({ status: s, label, activeClass, hoverClass }) => (
            <button
              key={s}
              onClick={() => onStatusChange(student.rollNumber, s)}
              className={`w-8 h-8 rounded-lg text-xs font-bold border transition-all duration-150
                ${status === s
                  ? activeClass
                  : `border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 ${hoverClass}`
                }
              `}
              title={s.charAt(0).toUpperCase() + s.slice(1)}
            >
              {label}
            </button>
          ))}
        </div>
      </td>
      {/* Remark */}
      <td className="px-4 py-3">
        <input
          type="text"
          value={remark}
          onChange={(e) => onRemarkChange(student.rollNumber, e.target.value)}
          placeholder="Add remark..."
          className="w-full text-xs px-2 py-1.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-400 text-gray-700 dark:text-gray-300 placeholder-gray-400 min-w-[120px]"
        />
      </td>
    </tr>
  );
}
