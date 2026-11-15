import type { UploadProgress } from '@/lib/types';

interface ProgressBarProps {
  progress: number;
  status: UploadProgress['status'];
}

export default function ProgressBar({ progress, status }: ProgressBarProps) {
  const color =
    status === 'error'
      ? 'bg-red-500'
      : status === 'done'
      ? 'bg-green-500'
      : 'bg-[var(--neon-primary)] shadow-[0_0_8px_rgba(var(--neon-primary-rgb),0.5)]';

  return (
    <div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
      <div
        className={`h-full rounded-full transition-all duration-300 ${color}`}
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
