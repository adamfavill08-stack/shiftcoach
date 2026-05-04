import type { SubscriptionPlan } from '@/lib/subscription/access'

export type FeatureKey =
  | 'shift_logging'
  | 'event_logging'
  | 'shift_event_history'
  | 'adjusted_calories'
  | 'next_meal_window'
  | 'shift_lag'
  | 'calorie_profile_settings'
  | 'full_blog_access'

export type SubscriptionAccess = {
  isPro: boolean
  plan: SubscriptionPlan
}

export const FREE_HISTORY_LIMIT_DAYS = 31
export const FREE_BLOG_ARTICLE_LIMIT = 1

const FREE_FEATURES: FeatureKey[] = [
  'shift_logging',
  'event_logging',
  'shift_event_history',
  /** Body metrics & goals — free users can complete profile; Pro still gates adjusted targets / meal window UI. */
  'calorie_profile_settings',
]

export function canUseFeature(
  feature: FeatureKey,
  access: SubscriptionAccess,
): boolean {
  if (access.plan === 'tester') return true
  if (FREE_FEATURES.includes(feature)) return true
  return access.isPro
}

export function getHistoryLimitDays(
  access: SubscriptionAccess,
): number | null {
  if (access.isPro || access.plan === 'tester') {
    return null
  }
  return FREE_HISTORY_LIMIT_DAYS
}

export function getBlogArticleLimit(
  access: SubscriptionAccess,
): number | null {
  if (access.isPro || access.plan === 'tester') {
    return null
  }
  return FREE_BLOG_ARTICLE_LIMIT
}
