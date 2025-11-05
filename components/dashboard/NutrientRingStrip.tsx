'use client'

import { useMemo, useState } from 'react'
import { PremiumQuickLogSheet } from '@/components/ui/PremiumQuickLogSheet'

type RingTheme = 'default' | 'maxIsBad'

type NutrientRingProps = {
	label: string
	value: number // consumed
	unit: string
	target?: number            // used to compute progress
	centerLabel?: string       // optional center text override
	theme?: RingTheme
}

function getRingStroke(progress: number, theme: RingTheme) {
	// progress can be > 1 for color purposes
	if (progress >= 1.0) {
		return theme === 'maxIsBad' ? { stroke: '#ef4444' } : { stroke: '#f59e0b' } // red vs strong amber
	}
	if (progress >= 0.8) {
		return { stroke: '#fbbf24' } // amber
	}
	if (progress >= 0.6) {
		return { stroke: 'url(#ring-primary-grad)' } // brand gradient
	}
	return { stroke: '#94a3b8' } // neutral slate-400
}

function NutrientRing({ label, value, unit, target, centerLabel, theme = 'default' }: NutrientRingProps) {
	const rawProgress = target && target > 0 ? value / target : 0
	const colorForState = getRingStroke(rawProgress, theme)
	const arcProgress = Math.min(Math.max(rawProgress, 0), 1)
	const radius = 18
	const circumference = 2 * Math.PI * radius
	const offset = circumference - arcProgress * circumference

	return (
		<div className="flex flex-col items-center gap-1 transition-transform duration-150 hover:scale-[1.03] active:scale-[0.97]">
			<div className="relative h-16 w-16">
				{/* halo */}
				<div className="absolute inset-0 rounded-full opacity-10 blur-xl pointer-events-none" />
				{/* ring */}
				<svg className="h-16 w-16 -rotate-90" viewBox="0 0 40 40">
					<defs>
						{/* Brand primary gradient used for 60–80% range */}
						<linearGradient id="ring-primary-grad" x1="0%" y1="0%" x2="100%" y2="100%">
							<stop offset="0%" stopColor="#0ea5e9"/>
							<stop offset="100%" stopColor="#6366f1"/>
						</linearGradient>
					</defs>
					<circle cx="20" cy="20" r={radius} strokeWidth="4" fill="transparent" style={{ stroke: 'var(--ring-bg)' }} />
					{target && target > 0 && (
						<circle
							cx="20"
							cy="20"
							r={radius}
							strokeWidth="4"
							strokeDasharray={circumference}
							strokeDashoffset={offset}
							strokeLinecap="round"
							fill="transparent"
							stroke={colorForState.stroke}
						/>
					)}
				</svg>
				<div className="absolute inset-0 flex items-center justify-center text-xs font-semibold" style={{ color: 'var(--text-main)' }}>
					{centerLabel ? <span>{centerLabel}</span> : <span>{Math.round(value)} {unit}</span>}
				</div>
			</div>
			<p className="text-xs font-medium" style={{ color: 'var(--text-soft)' }}>{label}</p>
		</div>
	)
}

export function NutrientRingStrip({
	protein,
	carbs,
	fats,
	satFat,
	waterMl,
	waterGoalMl,
	caffeineMg,
	caffeineLimitMg,
	adjustedKcal,
	sleepHoursLast24,
	mainSleepStart,
	mainSleepEnd,
	shiftType,
	consumedProteinG,
	consumedCarbG,
	consumedFatG,
	onRefreshNutrition,
}: {
	protein: number
	carbs: number
	fats: number
	satFat: number
	waterMl: number
	waterGoalMl: number
	caffeineMg: number
	caffeineLimitMg: number
	adjustedKcal?: number
	sleepHoursLast24?: number
	mainSleepStart?: string | Date
	mainSleepEnd?: string | Date
	shiftType?: 'day' | 'late' | 'night' | 'off'
	consumedProteinG?: number
	consumedCarbG?: number
	consumedFatG?: number
	onRefreshNutrition?: () => void
}) {
	const [showMacroInfo, setShowMacroInfo] = useState(false)
	const [openWater, setOpenWater] = useState(false)
	const [openCaffeine, setOpenCaffeine] = useState(false)
	const sleepH = sleepHoursLast24 ?? 0

	const sleepTiming: 'nightAligned' | 'daySleep' | 'mixed' = useMemo(() => {
		if (!mainSleepStart || !mainSleepEnd) return 'mixed'
		const s = new Date(mainSleepStart)
		const e = new Date(mainSleepEnd)
		if (isNaN(s.getTime()) || isNaN(e.getTime())) return 'mixed'
		const mid = new Date((s.getTime() + e.getTime()) / 2)
		const h = mid.getHours()
		if (h >= 22 || h < 6) return 'nightAligned'
		if (h >= 8 && h <= 15) return 'daySleep'
		return 'mixed'
	}, [mainSleepStart, mainSleepEnd])

	let targets = {
		proteinTargetG: Math.round(protein || 0),
		carbTargetG: Math.round(carbs || 0),
		fatTargetG: Math.round(fats || 0),
		saturatedFatMaxG: Math.round(satFat || 0),
		hydrationTargetMl: Math.round(waterGoalMl || 0),
	}

	try {
		const { getAdjustedMacroTargets } = require('@/lib/nutrition/getAdjustedMacroTargets')
		targets = getAdjustedMacroTargets({
			adjustedCalories: adjustedKcal ?? 0,
			baseProteinG: protein,
			baseCarbG: carbs,
			baseFatG: fats,
			baseHydrationMl: waterGoalMl,
			sleepHoursLast24,
			mainSleepStart,
			mainSleepEnd,
			shiftType,
		})
	} catch {}

	// Sat fat dynamic: consumed currently approximated by total fat consumed; swap with consumed sat fat when available
	const satConsumedG = Math.round(consumedFatG ?? 0)
	const satTargetG = targets.saturatedFatMaxG

	async function submitWater(amount: number) {
		await fetch('/api/logs/water', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ ml: amount }),
		})
		onRefreshNutrition?.()
	}
	async function submitCaffeine(amount: number) {
		await fetch('/api/logs/caffeine', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ mg: amount }),
		})
		onRefreshNutrition?.()
	}

	return (
		<section
			className="rounded-3xl backdrop-blur-2xl border px-5 py-5 flex flex-col gap-3"
			style={{
				backgroundColor: 'var(--card)',
				borderColor: 'var(--border-subtle)',
				boxShadow: 'var(--shadow-soft)',
			}}
		>
			<div className="flex items-center justify-between">
				<div className="flex flex-col">
					<p className="text-sm font-medium" style={{ color: 'var(--text-main)' }}>Macros</p>
					<p className="text-xs" style={{ color: 'var(--text-soft)' }}>g for today</p>
				</div>
				<button
					type="button"
					onClick={() => setShowMacroInfo(true)}
					className="flex h-6 w-6 items-center justify-center rounded-full text-xs transition-colors"
					style={{
						backgroundColor: 'var(--card-subtle)',
						color: 'var(--text-soft)',
					}}
					onMouseEnter={(e) => {
						e.currentTarget.style.backgroundColor = 'var(--ring-bg)'
						e.currentTarget.style.color = 'var(--text-main)'
					}}
					onMouseLeave={(e) => {
						e.currentTarget.style.backgroundColor = 'var(--card-subtle)'
						e.currentTarget.style.color = 'var(--text-soft)'
					}}
					aria-label="How we set your macros today"
				>
					i
				</button>
			</div>
			<div className="mt-1 grid grid-cols-3 gap-4">
				<NutrientRing label="Protein" value={Math.round(consumedProteinG ?? 0)} unit="g" target={targets.proteinTargetG} centerLabel={`${targets.proteinTargetG} g`} theme="default" />
				<NutrientRing label="Carbs" value={Math.round(consumedCarbG ?? 0)} unit="g" target={targets.carbTargetG} centerLabel={`${targets.carbTargetG} g`} theme="default" />
				<NutrientRing label="Fats" value={Math.round(consumedFatG ?? 0)} unit="g" target={targets.fatTargetG} centerLabel={`${targets.fatTargetG} g`} theme="default" />
				<NutrientRing label={`Sat fat (max)`} value={satConsumedG} unit="g" target={satTargetG} theme="maxIsBad" centerLabel={`${satTargetG} g`} />
				<button type="button" onClick={() => setOpenWater(true)} className="contents">
					<NutrientRing label="Water" value={Math.round(waterMl)} unit="ml" target={targets.hydrationTargetMl} theme="default" centerLabel={`${(targets.hydrationTargetMl/1000).toFixed(1)} L`} />
				</button>
				<button type="button" onClick={() => setOpenCaffeine(true)} className="contents">
					<NutrientRing label="Caffeine" value={Math.round(caffeineMg)} unit="mg" target={caffeineLimitMg} theme="maxIsBad" centerLabel={`${Math.round(caffeineLimitMg)} mg`} />
				</button>
			</div>

			{/* Water quick log */}
			<PremiumQuickLogSheet
				open={openWater}
				onClose={() => setOpenWater(false)}
				title="Log water"
				subtitle="Add how much you’ve just had to drink."
				unit="ml"
				suggestedOptions={[250, 350, 500]}
				todayLogged={waterMl}
				todayTarget={targets.hydrationTargetMl}
				onSubmit={submitWater}
			/>

			{/* Caffeine quick log */}
			<PremiumQuickLogSheet
				open={openCaffeine}
				onClose={() => setOpenCaffeine(false)}
				title="Log caffeine"
				subtitle="Log the caffeine in your coffee, tea or energy drink."
				unit="mg"
				suggestedOptions={[50, 80, 120]}
				todayLogged={caffeineMg}
				todayTarget={caffeineLimitMg}
				onSubmit={submitCaffeine}
			/>

			{showMacroInfo && (
				<div
					className="fixed inset-0 z-40 flex items-end justify-center md:items-center backdrop-blur-sm"
					style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
					onClick={() => setShowMacroInfo(false)}
				>
					<div
						className="w-full max-w-[430px] rounded-t-3xl md:rounded-3xl backdrop-blur-2xl border px-5 pt-4 pb-6 animate-slide-up"
						style={{
							backgroundColor: 'var(--card)',
							borderColor: 'var(--border-subtle)',
							boxShadow: 'var(--shadow-soft)',
						}}
						onClick={(e) => e.stopPropagation()}
					>
						<div className="flex items-center justify-between mb-3">
							<div className="flex items-center gap-2">
								<div className="h-7 w-7 rounded-full bg-gradient-to-br from-sky-500 to-violet-500 flex items-center justify-center text-xs text-white">⚖️</div>
								<div className="flex flex-col">
									<p className="text-sm font-semibold" style={{ color: 'var(--text-main)' }}>How we set your macros today</p>
									<p className="text-xs" style={{ color: 'var(--text-soft)' }}>Personalised to your sleep and shift</p>
								</div>
							</div>
							<button
								type="button"
								onClick={() => setShowMacroInfo(false)}
								className="transition-colors text-lg leading-none"
								style={{ color: 'var(--text-muted)' }}
								onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-main)' }}
								onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)' }}
								aria-label="Close"
							>
								✕
							</button>
						</div>

						{/* Section A */}
						<section className="mb-3">
							<p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--text-soft)' }}>Today's plan</p>
							<p className="text-sm" style={{ color: 'var(--text-main)' }}>
								We've set your macros for <span className="font-semibold">{(adjustedKcal ?? 0).toLocaleString()} kcal</span> today:
							</p>
							<ul className="mt-1.5 space-y-0.5 text-sm" style={{ color: 'var(--text-main)' }}>
								<li>• Protein: <span className="font-semibold">{targets.proteinTargetG}g</span></li>
								<li>• Carbs: <span className="font-semibold">{targets.carbTargetG}g</span></li>
								<li>• Fats: <span className="font-semibold">{targets.fatTargetG}g</span></li>
								<li>• Saturated fat: <span className="font-semibold">keep under {targets.saturatedFatMaxG}g</span></li>
								<li>• Hydration: <span className="font-semibold">{(targets.hydrationTargetMl / 1000).toFixed(1)}L</span></li>
							</ul>
						</section>

						{/* Section B */}
						<section className="mb-3">
							<p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--text-soft)' }}>Sleep & timing</p>
							<p className="text-sm" style={{ color: 'var(--text-main)' }}>
								You logged <span className="font-semibold">{sleepH.toFixed(1)} hours</span> of sleep in the last 24 hours, mostly as{' '}
								<span className="font-semibold">{sleepTiming === 'daySleep' ? 'daytime sleep after nights' : sleepTiming === 'nightAligned' ? 'night-time sleep' : 'a mixed pattern'}</span>.
							</p>
							<ul className="mt-1.5 space-y-1 text-sm" style={{ color: 'var(--text-main)' }}>
								<li>• On shorter or broken sleep, we nudge protein up slightly and carbs down a touch.</li>
								<li>• After daytime recovery sleep from nights, we keep carbs lighter and push hydration higher.</li>
							</ul>
						</section>

						{/* Section C */}
						<section className="mb-3">
							<p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--text-soft)' }}>Saturated fat</p>
							<p className="text-sm" style={{ color: 'var(--text-main)' }}>
								Saturated fat is a <span className="font-semibold">limit, not a target</span>. We set a low cap for today ({targets.saturatedFatMaxG}g) based on your calories and fat intake, and encourage you to stay under it.
							</p>
						</section>

						{/* Section D */}
						<section>
							<p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--text-soft)' }}>Designed for shift work</p>
							<ul className="space-y-1 text-sm" style={{ color: 'var(--text-main)' }}>
								<li>• On nights, we aim more of your carbs earlier in the shift and less during deep "body night".</li>
								<li>• On recovery days, we gently bring your macros back towards a more daytime pattern.</li>
								<li>• The goal is steady energy, fewer crashes, and better recovery around shifts.</li>
							</ul>
							<p className="mt-2 text-[11px]" style={{ color: 'var(--text-muted)' }}>This is general guidance only and not medical advice.</p>
						</section>
					</div>
				</div>
			)}
		</section>
	)
}
