"use client"

import React, { useState } from "react"
import { BodyClockGauge } from "@/components/BodyClockGauge"

export default function BodyClockGaugeDemo() {
  const [score, setScore] = useState(72)

  return (
    <div className="flex flex-col items-center gap-6 p-8 bg-slate-50 min-h-screen">
      <BodyClockGauge value={score} />

      <div className="flex flex-col items-center gap-4 w-full max-w-md">
        <input
          type="range"
          min={0}
          max={100}
          value={score}
          onChange={(e) => setScore(Number(e.target.value))}
          className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
        />

        <p className="text-sm text-slate-600">
          Body clock score: <span className="font-semibold text-slate-900">{score}</span>
        </p>
      </div>
    </div>
  )
}

