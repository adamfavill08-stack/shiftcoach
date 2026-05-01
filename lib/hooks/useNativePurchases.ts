'use client'

import { useState, useEffect } from 'react'
import {
  getPurchasePlatform,
  isNativePurchaseAvailable,
  purchaseProduct,
  restorePurchases,
  getAvailableProducts,
  type PurchaseResult,
  type PurchaseProduct,
} from '@/lib/purchases/native-purchases'
import { showToast } from '@/components/ui/Toast'
import { createClientComponentClient } from '@/lib/supabase'

const PRODUCT_ID_BY_PLAN: Record<'monthly' | 'yearly', string> = {
  monthly: 'pro_monthly',
  yearly: 'pro_annual',
}

export function useNativePurchases() {
  const supabase = createClientComponentClient()
  const [platform, setPlatform] = useState<'ios' | 'android' | 'web' | null>(null)
  const [isAvailable, setIsAvailable] = useState(false)
  const [isPurchasing, setIsPurchasing] = useState(false)
  const [isRestoring, setIsRestoring] = useState(false)
  const [products, setProducts] = useState<PurchaseProduct[]>([])
  const [storeConfigWarning, setStoreConfigWarning] = useState<string | null>(null)
  const [appUserId, setAppUserId] = useState<string | null>(null)

  useEffect(() => {
    const currentPlatform = getPurchasePlatform()
    setPlatform(currentPlatform)
    setIsAvailable(isNativePurchaseAvailable())
  }, [])

  useEffect(() => {
    let cancelled = false
    const loadAppUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!cancelled) {
        setAppUserId(user?.id ?? null)
      }
    }
    void loadAppUser()
    return () => {
      cancelled = true
    }
  }, [supabase])

  useEffect(() => {
    let cancelled = false
    const loadProducts = async () => {
      try {
        const { products: nextProducts, configWarning } = await getAvailableProducts(appUserId)
        if (!cancelled) {
          setProducts(Array.isArray(nextProducts) ? nextProducts : [])
          setStoreConfigWarning(configWarning ?? null)
        }
      } catch {
        if (!cancelled) {
          setProducts([])
          setStoreConfigWarning('Could not load subscription options.')
        }
      }
    }
    void loadProducts()
    return () => {
      cancelled = true
    }
  }, [appUserId])

  const getProductForPlan = (plan: 'monthly' | 'yearly') => {
    const productId = PRODUCT_ID_BY_PLAN[plan]
    return products.find((product) => product.id === productId) ?? null
  }

  const getPlanPriceLabel = (plan: 'monthly' | 'yearly') => {
    return getProductForPlan(plan)?.price ?? null
  }

  const getPlanPriceAmount = (plan: 'monthly' | 'yearly') => {
    const amount = getProductForPlan(plan)?.priceAmount
    return typeof amount === 'number' ? amount : null
  }

  const purchaseSubscription = async (plan: 'monthly' | 'yearly'): Promise<PurchaseResult> => {
    if (!isAvailable) {
      return {
        success: false,
        error: 'Native purchases not available on this platform'
      }
    }

    setIsPurchasing(true)
    try {
      // RevenueCat product identifiers configured in dashboard.
      const productId = PRODUCT_ID_BY_PLAN[plan]
      const result = await purchaseProduct(productId, appUserId)
      
      if (result.success) {
        showToast('Subscription activated successfully!', 'success')
        // Trigger subscription status refresh from server/source of truth.
        window.dispatchEvent(new CustomEvent('subscription-updated'))
        return result
      }
      showToast(result.error || 'Purchase failed', 'error')
      return result
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
      const results = await restorePurchases(appUserId)
      
      if (results.length > 0) {
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
    products,
    storeConfigWarning,
    getPlanPriceLabel,
    getPlanPriceAmount,
    purchaseSubscription,
    restore,
  }
}
