/**
 * Typography System for Shift Coach
 * 
 * Provides consistent typography classes and utilities
 * to ensure uniform font sizes, weights, and spacing
 * throughout the application.
 */

/**
 * Standard heading sizes
 */
export const headingSizes = {
  h1: 'text-2xl font-bold tracking-tight', // 24px, bold, -0.01em
  h2: 'text-xl font-semibold tracking-tight', // 20px, semibold, -0.005em
  h3: 'text-lg font-semibold', // 18px, semibold
  h4: 'text-base font-semibold', // 16px, semibold
} as const

/**
 * Body text sizes
 */
export const bodySizes = {
  base: 'text-[15px] font-normal leading-relaxed', // 15px, normal, 1.5
  sm: 'text-sm font-normal leading-relaxed', // 14px, normal, 1.5
  xs: 'text-xs font-normal leading-relaxed', // 12px, normal, 1.5
} as const

/**
 * Label sizes
 */
export const labelSizes = {
  base: 'text-sm font-medium', // 14px, medium
  sm: 'text-xs font-medium', // 12px, medium
} as const

/**
 * Caption sizes
 */
export const captionSizes = {
  base: 'text-xs font-normal', // 12px, normal
  xs: 'text-[10px] font-normal', // 10px, normal
} as const

/**
 * Uppercase label sizes (for section headers)
 */
export const uppercaseLabelSizes = {
  base: 'text-[13px] font-bold uppercase tracking-[0.15em]', // 13px, bold, uppercase, 0.15em
  sm: 'text-[11px] font-bold uppercase tracking-[0.18em]', // 11px, bold, uppercase, 0.18em
} as const

/**
 * Text color utilities
 */
export const textColors = {
  main: 'text-slate-900', // var(--text-main)
  soft: 'text-slate-600', // var(--text-soft)
  muted: 'text-slate-400', // var(--text-muted)
} as const

/**
 * Combined typography classes for common use cases
 */
export const typography = {
  // Headings
  h1: `${headingSizes.h1} ${textColors.main}`,
  h2: `${headingSizes.h2} ${textColors.main}`,
  h3: `${headingSizes.h3} ${textColors.main}`,
  h4: `${headingSizes.h4} ${textColors.main}`,
  
  // Body
  body: `${bodySizes.base} ${textColors.main}`,
  bodySm: `${bodySizes.sm} ${textColors.main}`,
  bodyXs: `${bodySizes.xs} ${textColors.soft}`,
  
  // Labels
  label: `${labelSizes.base} ${textColors.main}`,
  labelSm: `${labelSizes.sm} ${textColors.soft}`,
  
  // Captions
  caption: `${captionSizes.base} ${textColors.soft}`,
  captionXs: `${captionSizes.xs} ${textColors.muted}`,
  
  // Uppercase labels
  uppercaseLabel: `${uppercaseLabelSizes.base} ${textColors.soft}`,
  uppercaseLabelSm: `${uppercaseLabelSizes.sm} ${textColors.soft}`,
} as const

/**
 * Helper function to combine typography classes
 */
export function combineTypography(
  size: keyof typeof typography,
  color?: keyof typeof textColors
): string {
  const base = typography[size]
  if (color) {
    return `${base} ${textColors[color]}`
  }
  return base
}

