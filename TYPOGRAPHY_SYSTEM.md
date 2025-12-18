# Typography System - Shift Coach

## Overview

This document defines the consistent typography system for Shift Coach. All headings, body text, labels, and captions should follow these standards.

---

## Typography Scale

### **Headings**

| Level | Size | Weight | Line Height | Usage |
|-------|------|--------|-------------|-------|
| **H1** | `text-2xl` (24px) | `font-bold` (700) | `leading-tight` (1.2) | Main page titles, Settings page |
| **H2** | `text-xl` (20px) | `font-semibold` (600) | `leading-tight` (1.2) | Page headers, Section titles |
| **H3** | `text-lg` (18px) | `font-semibold` (600) | `leading-normal` (1.4) | Card titles, Subsection headers |
| **H4** | `text-base` (16px) | `font-semibold` (600) | `leading-normal` (1.4) | Small card titles |

### **Body Text**

| Type | Size | Weight | Line Height | Usage |
|------|------|--------|-------------|-------|
| **Body** | `text-[15px]` (15px) | `font-normal` (400) | `leading-relaxed` (1.5) | Main body text |
| **Body Small** | `text-sm` (14px) | `font-normal` (400) | `leading-relaxed` (1.5) | Secondary body text |
| **Body XS** | `text-xs` (12px) | `font-normal` (400) | `leading-relaxed` (1.5) | Small descriptions, helper text |

### **Labels**

| Type | Size | Weight | Usage |
|------|------|--------|-------|
| **Label** | `text-sm` (14px) | `font-medium` (500) | Form labels, Button text |
| **Label Small** | `text-xs` (12px) | `font-medium` (500) | Small labels, Badges |

### **Captions**

| Type | Size | Weight | Usage |
|------|------|--------|-------|
| **Caption** | `text-xs` (12px) | `font-normal` (400) | Captions, Metadata |
| **Caption XS** | `text-[10px]` (10px) | `font-normal` (400) | Tiny captions, Timestamps |

### **Uppercase Labels** (Section Headers)

| Type | Size | Weight | Tracking | Usage |
|------|------|--------|----------|-------|
| **Uppercase Label** | `text-[13px]` (13px) | `font-bold` (700) | `tracking-[0.15em]` | Section headers (e.g., "BODY CLOCK") |
| **Uppercase Label Small** | `text-[11px]` (11px) | `font-bold` (700) | `tracking-[0.18em]` | Small section headers |

---

## Color System

| Color | Class | Usage |
|-------|-------|-------|
| **Main** | `text-slate-900` | Primary text, Headings |
| **Soft** | `text-slate-600` | Secondary text, Body |
| **Muted** | `text-slate-400` | Tertiary text, Captions |

---

## Common Patterns

### **Page Header**
```tsx
<h1 className="text-xl font-semibold tracking-tight text-slate-900">
  Page Title
</h1>
```

### **Settings/Modal Title**
```tsx
<h1 className="text-2xl font-bold tracking-tight text-slate-900">
  Settings
</h1>
```

### **Card Title (Main)**
```tsx
<h2 className="text-lg font-semibold text-slate-900">
  Card Title
</h2>
```

### **Card Title (Large)**
```tsx
<h1 className="text-lg font-bold tracking-tight text-slate-900 leading-tight">
  Large Card Title
</h1>
```

### **Section Label (Uppercase)**
```tsx
<p className="text-[13px] font-bold tracking-[0.15em] text-slate-400 uppercase">
  SECTION LABEL
</p>
```

### **Body Text**
```tsx
<p className="text-sm text-slate-600 leading-relaxed">
  Body text content
</p>
```

### **Small Description**
```tsx
<p className="text-xs text-slate-500 leading-relaxed">
  Small description text
</p>
```

---

## Migration Guide

### **Replace These Patterns:**

**Old → New:**
- `text-[17px] font-bold tracking-[-0.01em]` → `text-lg font-bold tracking-tight`
- `text-xl font-semibold` → `text-xl font-semibold tracking-tight` (add tracking)
- `text-2xl font-bold` → `text-2xl font-bold tracking-tight` (add tracking)
- `text-[13px] font-bold tracking-[0.15em] uppercase` → Keep as is (standard)
- `text-[12px]` → `text-xs` (standardize)
- `text-[15px]` → `text-[15px]` (keep, but use consistently)

---

## Implementation

1. **Use CSS classes from `globals.css`** where possible
2. **Use Tailwind classes** for consistency
3. **Follow the scale** - don't use arbitrary sizes
4. **Maintain color hierarchy** - main > soft > muted

---

## Examples

### **Before (Inconsistent):**
```tsx
<h1 className="text-xl font-semibold">Title</h1>
<h2 className="text-[17px] font-bold tracking-[-0.01em]">Card Title</h2>
<p className="text-[12px] text-slate-500">Description</p>
```

### **After (Consistent):**
```tsx
<h1 className="text-xl font-semibold tracking-tight text-slate-900">Title</h1>
<h2 className="text-lg font-bold tracking-tight text-slate-900">Card Title</h2>
<p className="text-xs text-slate-500 leading-relaxed">Description</p>
```

---

**Last Updated:** Current  
**Status:** Active standard for all new code

