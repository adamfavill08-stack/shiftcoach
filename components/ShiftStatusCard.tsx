type ShiftStatusCardProps = {
  shiftStatus?: string;
  shiftText?: string;
  rhythm?: number;
};

export default function ShiftStatusCard({
  shiftStatus = 'Off shift',
  shiftText = 'No shift today',
  rhythm = 100,
}: ShiftStatusCardProps) {
  const progress = Math.min((rhythm ?? 0) / 100, 1)
  const radius = 36
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - progress)

  return (
    <div className="relative w-full rounded-3xl overflow-hidden h-[220px] shadow-md">
      {/* Day-night background */}
      <div className="absolute inset-0 bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-800" />
      <div className="absolute inset-0 bg-[url('/day-night-blend.jpg')] bg-cover bg-center opacity-80" />

      <div className="relative z-10 flex h-full items-center justify-between px-6 text-white">
        {/* Left side text */}
        <div className="flex flex-col">
          <p className="text-3xl font-semibold drop-shadow-md">{shiftStatus}</p>
          <p className="text-lg opacity-90">{shiftText}</p>
        </div>

        {/* Right side circular rhythm meter */}
        <div className="flex flex-col items-center justify-center">
          <div className="relative w-28 h-28">
            <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r={radius}
                fill="transparent"
                stroke="rgba(255,255,255,0.2)"
                strokeWidth="8"
              />
              <circle
                cx="50"
                cy="50"
                r={radius}
                fill="transparent"
                stroke="#3b82f6"
                strokeWidth="8"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-white font-semibold text-xl">
              {Math.round(rhythm ?? 0)}
            </div>
          </div>
          <p className="mt-2 text-sm opacity-90 font-medium">Shift Rhythm™</p>
        </div>
      </div>
    </div>
  )
}


