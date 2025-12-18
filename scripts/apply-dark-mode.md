# Dark Mode Application Pattern

This document outlines the pattern for applying premium dark mode to all components.

## Standard Premium Card Pattern

Replace:
```tsx
bg-white/90 backdrop-blur-xl border border-white/90 shadow-[0_8px_24px_rgba(15,23,42,0.08)]
```

With:
```tsx
bg-white/90 dark:bg-slate-900/95 backdrop-blur-xl border border-white/90 dark:border-slate-700/50 shadow-[0_8px_24px_rgba(15,23,42,0.08)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.5),0_0_0_1px_rgba(59,130,246,0.1)]
```

## Gradient Overlays

Replace:
```tsx
bg-gradient-to-b from-white/98 via-white/90 to-white/85
```

With:
```tsx
bg-gradient-to-b from-white/98 via-white/90 to-white/85 dark:from-slate-950/98 dark:via-slate-900/90 dark:to-slate-950/85
```

## Text Colors

- `text-slate-900` → `text-slate-900 dark:text-slate-50`
- `text-slate-700` → `text-slate-700 dark:text-slate-300`
- `text-slate-600` → `text-slate-600 dark:text-slate-400`
- `text-slate-500` → `text-slate-500 dark:text-slate-400`
- `text-slate-400` → `text-slate-400 dark:text-slate-500`

## Gradient Text

Replace:
```tsx
bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900
```

With:
```tsx
bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 dark:from-slate-50 dark:via-slate-100 dark:to-slate-50
```

## Borders

- `border-slate-200` → `border-slate-200 dark:border-slate-700`
- `border-white/90` → `border-white/90 dark:border-slate-700/50`

## Background Gradients

- `from-slate-50 via-blue-50/30 to-slate-50` → `from-slate-50 via-blue-50/30 to-slate-50 dark:from-slate-950 dark:via-slate-900/50 dark:to-slate-950`
- `from-blue-50/20` → `from-blue-50/20 dark:from-blue-950/20`

## Ambient Glows

Add:
```tsx
<div className="absolute -inset-1 bg-gradient-to-br from-blue-100/30 via-indigo-100/20 to-purple-100/30 dark:from-blue-500/10 dark:via-indigo-500/8 dark:to-purple-500/10 blur-xl opacity-60 dark:opacity-40" />
```

