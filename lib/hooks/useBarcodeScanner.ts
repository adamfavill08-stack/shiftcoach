'use client'

import { useState, useRef, useCallback } from 'react'

// Dynamic import for ZXing to avoid build errors if package isn't installed
let BrowserMultiFormatReader: any = null
let NotFoundException: any = null

// Lazy load ZXing library
async function loadZXing() {
  if (BrowserMultiFormatReader) return
  
  try {
    const zxing = await import('@zxing/library')
    BrowserMultiFormatReader = zxing.BrowserMultiFormatReader
    NotFoundException = zxing.NotFoundException
  } catch (err) {
    console.error('Failed to load @zxing/library:', err)
    throw new Error('Barcode scanner library not installed. Please run: npm install @zxing/library')
  }
}

export function useBarcodeScanner() {
  const [isActive, setIsActive] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const readerRef = useRef<any>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const stop = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current)
      scanIntervalRef.current = null
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track: MediaStreamTrack) => track.stop())
      streamRef.current = null
    }

    if (readerRef.current) {
      readerRef.current.reset()
      readerRef.current = null
    }

    setIsActive(false)
  }, [])

  const start = useCallback(async (videoElement: HTMLVideoElement): Promise<string> => {
    // Load ZXing library first
    await loadZXing()
    
    if (!BrowserMultiFormatReader) {
      throw new Error('Barcode scanner library not available')
    }

    return new Promise((resolve, reject) => {
      if (!videoElement) {
        reject(new Error('Video element is required'))
        return
      }

      const reader = new BrowserMultiFormatReader()
      readerRef.current = reader

      setIsActive(true)
      setError(null)

      navigator.mediaDevices
        .getUserMedia({
          video: {
            facingMode: 'environment', // Use back camera on mobile
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        })
        .then((stream) => {
          streamRef.current = stream
          videoElement.srcObject = stream
          videoElement.play().catch((err) => {
            console.error('Video play error:', err)
          })

          // Use decodeFromVideoDevice with proper callback
          reader
            .decodeFromVideoDevice(null, videoElement, (result: any, err: any) => {
              if (result) {
                stop()
                resolve(result.getText())
              } else if (err && !(err instanceof NotFoundException)) {
                stop()
                setError(err.message)
                reject(err)
              }
            })
            .catch((err: any) => {
              stop()
              setError(err.message || 'Failed to start scanning')
              reject(err)
            })
        })
        .catch((err) => {
          setIsActive(false)
          const errorMsg = err.message || 'Failed to access camera'
          setError(errorMsg)
          reject(new Error(errorMsg))
        })
    })
  }, [stop])

  return { start, stop, isActive, error }
}

