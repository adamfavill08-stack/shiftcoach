type StepsCardProps = {
  steps: number;
  goal?: number;
  showEditLink?: boolean;
  onEditClick?: () => void;
  recommendation?: { min: number; max: number; suggested: number; reason: string } | null;
};

export default function StepsCard({ steps, goal = 10000, showEditLink = false, onEditClick, recommendation }: StepsCardProps) {
  const progress = Math.min(steps / goal, 1); // clamp at 100%
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - progress)

  // Optional hint based on recommendation
  const hint = recommendation && steps > 0 ? (() => {
    if (steps < recommendation.min) {
      return "You're below today's gentle goal – short walks still count."
    } else if (steps > recommendation.max) {
      return "You've gone past today's recommended range – make sure recovery is planned too."
    }
    return null
  })() : null

  return (
    <div
      className="w-full rounded-3xl backdrop-blur-2xl border flex items-center justify-between px-5 py-4 min-h-[120px]"
      style={{
        backgroundColor: 'var(--card)',
        borderColor: 'var(--border-subtle)',
        boxShadow: 'var(--shadow-soft)',
      }}
    >
      <div className="flex flex-col justify-center">
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-semibold" style={{ color: 'var(--text-main)' }}>{steps.toLocaleString()}</span>
          <span className="text-sm" style={{ color: 'var(--text-soft)' }}>/{goal.toLocaleString()}</span>
        </div>
        <p className="text-sm mt-1" style={{ color: 'var(--text-soft)' }}>Steps today</p>
        {showEditLink && (
          <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>
            Goal: {goal.toLocaleString()} steps ·{' '}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onEditClick?.()
              }}
              className="text-[11px] font-medium hover:opacity-80 transition-opacity"
              style={{ color: 'var(--accent-blue)' }}
            >
              Edit
            </button>
          </p>
        )}
        {hint && (
          <p className="text-[11px] mt-1 leading-snug" style={{ color: 'var(--text-muted)' }}>
            {hint}
          </p>
        )}
      </div>

      <div className="flex-shrink-0 ml-4">
        <div className="relative h-20 w-20">
          <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100" aria-hidden="true">
            {/* background ring */}
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="transparent"
              style={{ stroke: 'var(--ring-bg)' }}
              strokeWidth="10"
            />
            {/* progress ring */}
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="transparent"
              style={{ stroke: 'var(--text-main)' }}
              strokeWidth="10"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
            />
          </svg>
          {/* footsteps icon in the middle */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className="h-8 w-8 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'var(--card-subtle)' }}
            >
              <span className="text-base">👣</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


