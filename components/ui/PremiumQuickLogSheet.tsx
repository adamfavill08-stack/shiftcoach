"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"

type PremiumQuickLogSheetProps = {
	open: boolean
	onClose: () => void
	title: string
	subtitle?: string
	unit: "ml" | "mg"
	suggestedOptions: number[]
	todayLogged: number
	todayTarget: number
	onSubmit: (amount: number) => Promise<void>
}

export function PremiumQuickLogSheet({
	open,
	onClose,
	title,
	subtitle,
	unit,
	suggestedOptions,
	todayLogged,
	todayTarget,
	onSubmit,
}: PremiumQuickLogSheetProps) {
	const [amount, setAmount] = useState<string>("")
	const [loading, setLoading] = useState(false)
	const inputRef = useRef<HTMLInputElement | null>(null)

	useEffect(() => {
		if (open) {
			setAmount("")
			setTimeout(() => inputRef.current?.focus(), 150)
		}
	}, [open])

	const progress = useMemo(() => {
		if (!todayTarget || todayTarget <= 0) return 0
		return Math.min(1, (todayLogged || 0) / todayTarget)
	}, [todayLogged, todayTarget])

	const prettyTarget = useMemo(() => {
		if (unit === "ml") return `${(todayTarget / 1000).toFixed(1)} L`
		if (unit === "mg") return `${Math.round(todayTarget)} mg`
		return `${Math.round(todayTarget)} ${unit}`
	}, [todayTarget, unit])

	const prettyLogged = useMemo(() => {
		if (unit === "ml") return `${(todayLogged / 1000).toFixed(1)} L`
		if (unit === "mg") return `${Math.round(todayLogged)} mg`
		return `${Math.round(todayLogged)} ${unit}`
	}, [todayLogged, unit])

	const disabled = loading || !amount || isNaN(Number(amount)) || Number(amount) <= 0

	const handleSubmit = async () => {
		if (disabled) return
		try {
			setLoading(true)
			await onSubmit(Number(amount))
			onClose()
		} finally {
			setLoading(false)
		}
	}

	return (
		<AnimatePresence>
			{open && (
				<motion.div
					className="fixed inset-0 z-50"
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
				>
					{/* Backdrop */}
					<div
						className="absolute inset-0 bg-black/40 backdrop-blur-sm"
						onClick={onClose}
					/>
					{/* Sheet */}
					<div className="absolute inset-x-0 bottom-0 md:inset-0 md:flex md:items-center md:justify-center p-3 md:p-6">
						<motion.div
							initial={{ y: 30, opacity: 0, scale: 0.98 }}
							animate={{ y: 0, opacity: 1, scale: 1 }}
							exit={{ y: 40, opacity: 0, scale: 0.98 }}
							transition={{ type: "spring", stiffness: 260, damping: 25 }}
							className="mx-auto w-full max-w-md rounded-3xl border backdrop-blur-2xl shadow-2xl p-4 md:p-5"
							style={{
								backgroundColor: "var(--card)",
								borderColor: "var(--border-subtle)",
								boxShadow: "var(--shadow-soft)",
							}}
						>
							{/* Header */}
							<div className="flex items-start justify-between mb-2">
								<div className="flex flex-col">
									<p className="text-[15px] font-semibold" style={{ color: 'var(--text-main)' }}>{title}</p>
									{subtitle && (
										<p className="text-[12px]" style={{ color: 'var(--text-soft)' }}>{subtitle}</p>
									)}
								</div>
								<button
									className="h-7 w-7 rounded-full grid place-items-center text-sm"
									onClick={onClose}
									style={{ backgroundColor: 'var(--card-subtle)', color: 'var(--text-soft)' }}
									aria-label="Close"
								>
									×
								</button>
							</div>

							{/* Presets */}
							<div className="flex gap-2 mb-3">
								{suggestedOptions.map((opt) => (
									<button
										key={opt}
										onClick={() => setAmount(String(opt))}
										className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${Number(amount)===opt ? 'bg-gradient-to-r from-sky-500/10 to-violet-500/10 border-white/30' : ''}`}
										style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-main)' }}
									>
										{opt} {unit}
									</button>
								))}
							</div>

							{/* Numeric input */}
							<div className="mb-2">
								<div className="flex items-center justify-between rounded-full border px-4 py-3 text-sm" style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--card-subtle)', color: 'var(--text-main)' }}>
									<input
										ref={inputRef}
										inputMode="numeric"
										pattern="[0-9]*"
										className="flex-1 bg-transparent outline-none"
										placeholder="Custom amount"
										value={amount}
										onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ''))}
									/>
									<span className="ml-3 text-xs" style={{ color: 'var(--text-soft)' }}>{unit}</span>
								</div>
							</div>

							{/* Context row */}
							<p className="text-[11px] mb-3" style={{ color: 'var(--text-soft)' }}>
								{prettyLogged} of {prettyTarget} logged today
							</p>

							{/* Primary button */}
							<button
								disabled={disabled}
								onClick={handleSubmit}
								className={`w-full rounded-full h-11 text-white font-medium shadow-md transition-opacity ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
								style={{ backgroundImage: 'linear-gradient(90deg, #0ea5e9, #8b5cf6)' }}
							>
								{loading ? 'Saving…' : `Save ${title.toLowerCase().includes('caffeine') ? 'caffeine' : 'water'}`}
							</button>
						</motion.div>
					</div>
				</motion.div>
			)}
		</AnimatePresence>
	)
}
