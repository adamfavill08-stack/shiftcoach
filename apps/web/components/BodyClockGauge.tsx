"use client"

import React from "react"
import { cn } from "@/lib/utils"

type BodyClockGaugeProps = {
  value: number // 0–100, body clock score
  className?: string
  showLabel?: boolean // Whether to show the numeric label below
}

const MIN_ANGLE = -135
const MAX_ANGLE = 135
const VIEWBOX_SIZE = 200
const CENTER_X = VIEWBOX_SIZE / 2
const CENTER_Y = VIEWBOX_SIZE / 2
const OUTER_RADIUS = 80
const INNER_RADIUS = 60
const NEEDLE_LENGTH = 70
const CENTER_RADIUS = 6

export function BodyClockGauge({ 
  value, 
  className,
  showLabel = true 
}: BodyClockGaugeProps) {
  // Clamp value between 0 and 100
  const clampedValue = Math.max(0, Math.min(100, value))
  
  // Calculate needle angle
  const angle = MIN_ANGLE + ((MAX_ANGLE - MIN_ANGLE) * clampedValue) / 100
  
  // Calculate arc path for outer gauge (semi-circle from -135° to 135°)
  const startAngle = -135
  const endAngle = 135
  const startRad = (startAngle * Math.PI) / 180
  const endRad = (endAngle * Math.PI) / 180
  
  const outerStartX = CENTER_X + OUTER_RADIUS * Math.cos(startRad)
  const outerStartY = CENTER_Y + OUTER_RADIUS * Math.sin(startRad)
  const outerEndX = CENTER_X + OUTER_RADIUS * Math.cos(endRad)
  const outerEndY = CENTER_Y + OUTER_RADIUS * Math.sin(endRad)
  const outerLargeArc = 1 // Large arc flag for 270° sweep
  
  const innerStartX = CENTER_X + INNER_RADIUS * Math.cos(startRad)
  const innerStartY = CENTER_Y + INNER_RADIUS * Math.sin(startRad)
  const innerEndX = CENTER_X + INNER_RADIUS * Math.cos(endRad)
  const innerEndY = CENTER_Y + INNER_RADIUS * Math.sin(endRad)
  
  // Outer arc path
  const outerArcPath = `M ${outerStartX} ${outerStartY} A ${OUTER_RADIUS} ${OUTER_RADIUS} 0 ${outerLargeArc} 1 ${outerEndX} ${outerEndY}`
  
  // Inner arc path
  const innerArcPath = `M ${innerStartX} ${innerStartY} A ${INNER_RADIUS} ${INNER_RADIUS} 0 ${outerLargeArc} 1 ${innerEndX} ${innerEndY}`
  
  // Generate tick marks (11 ticks for 0-100 scale)
  const tickMarks = Array.from({ length: 11 }).map((_, i) => {
    const tickAngle = startAngle + (i * (endAngle - startAngle)) / 10
    const tickRad = (tickAngle * Math.PI) / 180
    const tickInnerRadius = INNER_RADIUS - 2
    const tickOuterRadius = INNER_RADIUS + 8
    
    const x1 = CENTER_X + tickInnerRadius * Math.cos(tickRad)
    const y1 = CENTER_Y + tickInnerRadius * Math.sin(tickRad)
    const x2 = CENTER_X + tickOuterRadius * Math.cos(tickRad)
    const y2 = CENTER_Y + tickOuterRadius * Math.sin(tickRad)
    
    return { x1, y1, x2, y2 }
  })
  
  // Needle coordinates (pointing upward initially, will be rotated)
  const needleTipX = CENTER_X
  const needleTipY = CENTER_Y - NEEDLE_LENGTH
  const needleBaseLeftX = CENTER_X - 4
  const needleBaseLeftY = CENTER_Y - NEEDLE_LENGTH + 12
  const needleBaseRightX = CENTER_X + 4
  const needleBaseRightY = CENTER_Y - NEEDLE_LENGTH + 12
  
  return (
    <div className={cn("relative w-[280px] h-[280px] select-none flex flex-col items-center", className)}>
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`}
        className="overflow-visible"
      >
        <defs>
          {/* Outer arc gradient: green → yellow → orange → red → blue */}
          <linearGradient id="outerGaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22C55E" /> {/* Green */}
            <stop offset="25%" stopColor="#FCD34D" /> {/* Yellow */}
            <stop offset="50%" stopColor="#F97316" /> {/* Orange */}
            <stop offset="75%" stopColor="#EF4444" /> {/* Red */}
            <stop offset="100%" stopColor="#3B82F6" /> {/* Blue */}
          </linearGradient>
          
          {/* Inner arc gradient: blue → purple */}
          <linearGradient id="innerGaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3B82F6" /> {/* Blue */}
            <stop offset="100%" stopColor="#A855F7" /> {/* Purple */}
          </linearGradient>
          
          {/* Needle gradient: orange → red */}
          <linearGradient id="needleGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#F97316" /> {/* Orange */}
            <stop offset="100%" stopColor="#EF4444" /> {/* Red */}
          </linearGradient>
          
          {/* Drop shadow filter */}
          <filter id="gaugeShadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.15"/>
          </filter>
        </defs>
        
        {/* Outer arc (main gauge) */}
        <path
          d={outerArcPath}
          fill="none"
          stroke="url(#outerGaugeGradient)"
          strokeWidth="16"
          strokeLinecap="round"
          filter="url(#gaugeShadow)"
        />
        
        {/* Inner arc (sub-gauge) */}
        <path
          d={innerArcPath}
          fill="none"
          stroke="url(#innerGaugeGradient)"
          strokeWidth="8"
          strokeLinecap="round"
        />
        
        {/* Tick marks */}
        <g stroke="#D1D5DB" strokeWidth="1.5" strokeLinecap="round" opacity="0.6">
          {tickMarks.map((tick, i) => (
            <line
              key={i}
              x1={tick.x1}
              y1={tick.y1}
              x2={tick.x2}
              y2={tick.y2}
            />
          ))}
        </g>
        
        {/* Center circle (yellow/orange) */}
        <circle
          cx={CENTER_X}
          cy={CENTER_Y}
          r={CENTER_RADIUS}
          fill="#F97316"
          filter="url(#gaugeShadow)"
        />
        
        {/* Needle group - rotates based on value */}
        <g
          transform={`translate(${CENTER_X}, ${CENTER_Y}) rotate(${angle})`}
          style={{
            transition: "transform 0.5s ease-out",
          }}
        >
          {/* Needle line (from center pointing upward) */}
          <line
            x1="0"
            y1="0"
            x2="0"
            y2={-NEEDLE_LENGTH}
            stroke="url(#needleGradient)"
            strokeWidth="3"
            strokeLinecap="round"
            filter="url(#gaugeShadow)"
          />
          
          {/* Needle tip (sharp triangle pointing upward) */}
          <path
            d={`M 0 ${-NEEDLE_LENGTH} L -4 ${-NEEDLE_LENGTH + 12} L 0 0 L 4 ${-NEEDLE_LENGTH + 12} Z`}
            fill="url(#needleGradient)"
            filter="url(#gaugeShadow)"
          />
        </g>
      </svg>
      
      {/* Optional numeric label */}
      {showLabel && (
        <div className="mt-2 text-center">
          <span className="text-2xl font-bold text-slate-900">{Math.round(clampedValue)}</span>
          <span className="text-sm text-slate-500 ml-1">/ 100</span>
        </div>
      )}
    </div>
  )
}

