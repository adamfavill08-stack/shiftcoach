# Ultra Premium Dark Mode Styling Guide

## Design Philosophy

Dark mode should feel **luxurious, sophisticated, and premium** - not just an inverted light mode. Think of it like a high-end watch or luxury car interior: rich, deep, with subtle glows and refined details.

## Key Principles

### 1. **Deep, Rich Backgrounds**
- Use very dark navy/slate backgrounds (`slate-950`, `slate-900`)
- Avoid pure black - it's too harsh and loses depth
- Add subtle gradients for depth

### 2. **Glassmorphism in Dark Mode**
- Dark glass cards: `rgba(15, 23, 42, 0.95)` with backdrop blur
- Slightly lighter overlays: `rgba(30, 41, 59, 0.5)` for depth
- Maintain the frosted glass effect

### 3. **Colored Glows & Accents**
- Use **subtle blue/indigo/purple glows** that are visible in dark mode
- Glows should be **softer and more ambient** than light mode
- Accent colors should be **brighter** (sky-400, indigo-400, violet-400)

### 4. **Multi-Layer Gradients**
- Dark base with lighter overlays
- Colored gradient hints (blue/indigo/purple) at low opacity
- Create depth through layering

### 5. **Borders & Rings**
- Use lighter borders: `border-slate-700/50` or `border-white/10`
- Inner rings: `ring-1 ring-white/20` or `ring-slate-600/30`
- Maintain the premium layered ring effect

## Component Patterns

### Premium Card Container (Dark Mode)

```tsx
<div className="relative overflow-hidden rounded-2xl 
  bg-slate-900/95 dark:bg-slate-950/95 
  backdrop-blur-xl 
  border border-white/90 dark:border-slate-700/50 
  shadow-[0_8px_24px_rgba(15,23,42,0.08)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.5)]
  dark:shadow-[0_0_0_1px_rgba(59,130,246,0.1)]">
  
  {/* Multi-layer gradient overlays */}
  <div className="absolute inset-0 bg-gradient-to-b from-slate-900/98 via-slate-900/90 to-slate-950/85 dark:from-slate-950/98 dark:via-slate-900/90 dark:to-slate-950/85" />
  <div className="absolute inset-0 bg-gradient-to-br from-blue-50/20 via-transparent to-indigo-50/20 dark:from-blue-950/20 dark:via-transparent dark:to-indigo-950/20" />
  
  {/* Enhanced inner glow */}
  <div className="absolute inset-0 rounded-2xl ring-1 ring-white/60 dark:ring-slate-700/50" />
  <div className="absolute inset-[1px] rounded-[15px] ring-1 ring-white/30 dark:ring-slate-600/20" />
  
  {/* Ambient glow effect - subtle colored glow in dark mode */}
  <div className="absolute -inset-1 bg-gradient-to-br from-blue-100/30 via-indigo-100/20 to-purple-100/30 dark:from-blue-500/10 dark:via-indigo-500/8 dark:to-purple-500/10 blur-xl opacity-60 dark:opacity-40" />
  
  {/* Content */}
  <div className="relative z-10">
    {/* Your content here */}
  </div>
</div>
```

### Text Colors (Dark Mode)

```tsx
// Headings
className="text-slate-900 dark:text-slate-50"

// Body text
className="text-slate-700 dark:text-slate-300"

// Muted text
className="text-slate-500 dark:text-slate-400"

// Gradient text (works in both modes)
className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 dark:from-slate-50 dark:via-slate-100 dark:to-slate-50 bg-clip-text text-transparent"
```

### Premium Buttons (Dark Mode)

```tsx
<button className="
  px-6 py-2.5 rounded-full font-semibold text-white
  bg-gradient-to-r from-blue-500 to-indigo-600
  dark:from-blue-500 dark:to-indigo-500
  shadow-[0_4px_16px_rgba(14,165,233,0.3)]
  dark:shadow-[0_4px_16px_rgba(59,130,246,0.4),0_0_0_1px_rgba(59,130,246,0.2)]
  hover:shadow-[0_8px_24px_rgba(14,165,233,0.4)]
  dark:hover:shadow-[0_8px_24px_rgba(59,130,246,0.5),0_0_0_1px_rgba(59,130,246,0.3)]
  transition-all duration-300
">
  Button Text
</button>
```

### Settings Section Cards (Dark Mode)

```tsx
<div className="relative overflow-hidden rounded-xl
  bg-gradient-to-br from-white/90 to-white/70
  dark:from-slate-800/90 dark:to-slate-900/70
  backdrop-blur-sm
  border border-white/90 dark:border-slate-700/50
  shadow-[0_4px_12px_rgba(15,23,42,0.04)]
  dark:shadow-[0_4px_12px_rgba(0,0,0,0.3),0_0_0_1px_rgba(59,130,246,0.1)]">
  
  {/* Gradient overlay */}
  <div className="absolute inset-0 bg-gradient-to-br from-purple-50/30 via-transparent to-transparent dark:from-purple-950/20 dark:via-transparent dark:to-transparent" />
  
  {/* Content */}
  <div className="relative z-10">
    {/* Your content */}
  </div>
</div>
```

## Specific Component Updates Needed

### 1. Profile Page
- Update card backgrounds to dark slate
- Adjust gradient text colors
- Update avatar ring colors
- Adjust modal backgrounds

### 2. Settings Page
- Update section cards with dark variants
- Adjust icon backgrounds
- Update theme modal

### 3. Bottom Navigation
- Dark glassmorphism background
- Adjust icon colors
- Update active state indicators

### 4. Dashboard Cards
- All premium cards need dark variants
- Maintain the multi-layer gradient approach
- Adjust shadows and glows

### 5. Modals & Sheets
- Dark backdrop with subtle glow
- Dark card backgrounds
- Adjust text colors

## Color Palette for Dark Mode

### Backgrounds
- **Base**: `slate-950` (#020617)
- **Soft**: `slate-900` (#0f172a)
- **Card**: `slate-900/95` with backdrop blur
- **Card Subtle**: `slate-800/90`

### Text
- **Main**: `slate-50` (#f8fafc)
- **Soft**: `slate-300` (#cbd5e1)
- **Muted**: `slate-400` (#94a3b8)

### Accents (Brighter for visibility)
- **Blue**: `sky-400` (#38bdf8)
- **Indigo**: `indigo-400` (#818cf8)
- **Purple**: `violet-400` (#a78bfa)

### Borders & Rings
- **Border**: `slate-700/50` or `white/10`
- **Ring**: `slate-600/30` or `white/20`
- **Inner Ring**: `slate-500/20`

### Glows (Subtle)
- **Blue Glow**: `blue-500/10` to `blue-500/20`
- **Indigo Glow**: `indigo-500/8` to `indigo-500/15`
- **Purple Glow**: `purple-500/10` to `purple-500/20`

## Shadow Patterns

### Light Mode
```css
shadow-[0_8px_24px_rgba(15,23,42,0.08)]
```

### Dark Mode
```css
dark:shadow-[0_8px_24px_rgba(0,0,0,0.5),0_0_0_1px_rgba(59,130,246,0.1)]
```

The dark mode shadow should be:
- **Deeper** (more black, higher opacity)
- **With colored rim** (subtle blue/indigo border glow)
- **More dramatic** for depth

## Implementation Strategy

1. **Update globals.css** - Enhance dark mode CSS variables
2. **Create utility classes** - Reusable dark mode patterns
3. **Update components systematically** - Start with most visible (profile, settings, dashboard)
4. **Test contrast** - Ensure text is readable
5. **Maintain consistency** - Use the same patterns throughout

## Quick Wins

### 1. Update CSS Variables (globals.css)
Add richer dark mode variables with better contrast and glows.

### 2. Create Dark Mode Utility Classes
Create reusable classes for common patterns.

### 3. Update Premium Components
Start with:
- Profile page cards
- Settings sections
- Bottom navigation
- Dashboard cards
- Modals

## Testing Checklist

- [ ] All text is readable (WCAG AA contrast)
- [ ] Cards have proper depth and layering
- [ ] Glows are visible but not overwhelming
- [ ] Borders are visible but subtle
- [ ] Transitions are smooth
- [ ] Premium feel is maintained
- [ ] No pure black backgrounds (too harsh)
- [ ] Colored accents are bright enough to see

