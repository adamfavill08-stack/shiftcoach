'use client'

import { useState } from 'react'

type BarcodeScannerSheetProps = {
  onClose: () => void
  onDetected: (barcode: string) => void
}

// Placeholder sheet for barcode scanning. TODO: integrate camera-based scanner.
export function BarcodeScannerSheet({ onClose, onDetected }: BarcodeScannerSheetProps) {
  const [barcode, setBarcode] = useState('')

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-slate-900/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-[430px] rounded-t-3xl md:rounded-3xl bg-black/70 border border-white/20 px-4 pt-4 pb-6 flex flex-col gap-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-semibold text-white">Scan barcode</p>
          <button type="button" onClick={onClose} className="text-slate-300 hover:text-white text-lg">✕</button>
        </div>

        {/* Placeholder input until real scanner is integrated */}
        <div className="rounded-2xl bg-white/10 border border-white/20 p-3">
          <label className="text-xs text-slate-300">Enter or scan a barcode</label>
          <input
            className="mt-1 w-full rounded-xl bg-white/90 text-slate-900 px-3 py-2 text-sm outline-none"
            placeholder="e.g. 5000112637922"
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
          />
          <button
            type="button"
            onClick={() => { if (barcode.trim()) onDetected(barcode.trim()) }}
            className="mt-3 inline-flex items-center justify-center rounded-full bg-gradient-to-r from-sky-500 to-violet-500 px-4 py-2 text-sm font-medium text-white hover:brightness-110 active:scale-95 transition-all"
          >
            Use barcode
          </button>
          <p className="mt-2 text-[11px] text-slate-300/80">Camera scanning coming soon. This is a preview flow.</p>
        </div>
      </div>
    </div>
  )
}


