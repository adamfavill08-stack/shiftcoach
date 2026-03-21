'use client'

import { useState, useEffect } from 'react'
import { getPurchasePlatform, isNativePurchaseAvailable, purchaseProduct, restorePurchases, type PurchaseResult } from '@/lib/purchases/native-purchases'
import { showToast } from '@/components/ui/Toast'

export function useNativePurchases() {
  const [platform, setPlatform] = useState<'ios' | 'android' | 'web' | null>(null)
  const [isAvailable, setIsAvailable] = useState(false)
  const [isPurchasing, setIsPurchasing] = useState(false)
  const [isRestoring, setIsRestoring] = useState(false)

  useEffect(() => {
    const currentPlatform = getPurchasePlatform()
    setPlatform(currentPlatform)
    setIsAvailable(isNativePurchaseAvailable())
  }, [])

  const purchaseSubscription = async (plan: 'monthly' | 'yearly'): Promise<PurchaseResult> => {
    if (!isAvailable) {
      return {
        success: false,
        error: 'Native purchases not available on this platform'
      }
    }

    setIsPurchasing(true)
    try {
      const productId = `shiftcoach_${plan}`
      const result = await purchaseProduct(productId)
      
      if (result.success && result.receipt) {
        // Send receipt to backend for validation
        const response = await fetch('/api/revenuecat/validate-receipt', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            receipt: result.receipt,
            platform: platform,
            productId: productId,
          }),
        })

        const data = await response.json()
        
        if (response.ok && data.success) {
          showToast('Subscription activated successfully!', 'success')
          // Dispatch event to refresh subscription status
          window.dispatchEvent(new CustomEvent('subscription-updated'))
          return { success: true, transactionId: result.transactionId }
        } else {
          showToast(data.error || 'Failed to activate subscription', 'error')
          return { success: false, error: data.error || 'Validation failed' }
        }
      } else {
        showToast(result.error || 'Purchase failed', 'error')
        return result
      }
    } catch (error: any) {
      console.error('[useNativePurchases] Purchase error:', error)
      showToast(error.message || 'Purchase failed', 'error')
      return { success: false, error: error.message || 'Purchase failed' }
    } finally {
      setIsPurchasing(false)
    }
  }

  const restore = async (): Promise<void> => {
    if (!isAvailable) {
      showToast('Restore not available on this platform', 'error')
      return
    }

    setIsRestoring(true)
    try {
      const results = await restorePurchases()
      
      if (results.length > 0) {
        // Send receipts to backend for validation
        for (const result of results) {
          if (result.success && result.receipt) {
            await fetch('/api/revenuecat/validate-receipt', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                receipt: result.receipt,
                platform: platform,
                productId: result.productId,
              }),
            })
          }
        }
        showToast('Purchases restored successfully', 'success')
        window.dispatchEvent(new CustomEvent('subscription-updated'))
      } else {
        showToast('No previous purchases found', 'info')
      }
    } catch (error: any) {
      console.error('[useNativePurchases] Restore error:', error)
      showToast(error.message || 'Failed to restore purchases', 'error')
    } finally {
      setIsRestoring(false)
    }
  }

  return {
    platform,
    isAvailable,
    isPurchasing,
    isRestoring,
    purchaseSubscription,
    restore,
  }
}
