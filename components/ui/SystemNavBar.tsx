'use client'

export function SystemNavBar() {
  return (
    <div className="fixed bottom-0 inset-x-0 flex justify-center items-center pb-[calc(env(safe-area-inset-bottom)+20px)] z-50">
      <div className="flex items-center gap-3 px-4 py-2 rounded-full backdrop-blur-xl bg-white/20 shadow-lg animate-fade-in">
        <div className="h-1 w-10 rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400" />
        <div className="flex items-center gap-2 ml-1">
          <div className="h-2 w-2 rounded-full bg-white/50" />
          <div className="h-2 w-2 rounded-full bg-white/40" />
          <div className="h-2 w-2 rounded-full bg-white/30" />
        </div>
      </div>
    </div>
  )
}
