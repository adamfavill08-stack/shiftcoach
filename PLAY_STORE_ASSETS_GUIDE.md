# Play Store Assets Guide - Step 4

## What You Need for Play Store Submission

### ✅ **What You Already Have**

1. **Android App Icons** - Already configured in:
   - `android/app/src/main/res/mipmap-*/ic_launcher.png`
   - Multiple sizes for different screen densities

2. **Logo Files** - Found in `public/`:
   - `/Faviconnew.png` - Used in dashboard
   - `/scpremium-logo.svg` - Used in sign-in
   - `/scnew-logo.svg` - Used in welcome page
   - `/faviconsvg.svg` - Favicon

---

## 📋 **What You Need to Create**

### 1. **App Icon for Play Store** ⚡ REQUIRED
**Requirements:**
- **Size:** 512x512 pixels
- **Format:** PNG
- **Background:** No transparency (must have solid background)
- **Content:** Your app icon/logo

**What to do:**
1. Use your existing logo (`/Faviconnew.png` or create from `/scpremium-logo.svg`)
2. Resize to 512x512 pixels
3. Add a solid background color if your logo has transparency
4. Save as `play-store-icon-512x512.png`

**Tools:**
- Online: [Canva](https://www.canva.com), [Figma](https://www.figma.com)
- Desktop: Photoshop, GIMP, or any image editor
- Quick: Use your existing favicon and resize it

---

### 2. **Feature Graphic** ⚡ REQUIRED
**Requirements:**
- **Size:** 1024x500 pixels
- **Format:** PNG
- **Content:** Promotional graphic showcasing your app

**What to include:**
- App name: "ShiftCoach"
- Tagline: "Health App for Shift Workers" or similar
- Key features or app screenshot
- Your branding/colors

**What to do:**
1. Create a 1024x500 image
2. Add your logo, app name, and tagline
3. Include a screenshot or key visual
4. Save as `play-store-feature-graphic-1024x500.png`

**Tools:**
- Canva has Play Store feature graphic templates
- Figma templates available
- Or design from scratch

---

### 3. **Screenshots** ⚡ REQUIRED (At least 2, up to 8)
**Requirements:**
- **Phone screenshots:**
  - Aspect ratio: 16:9 or 9:16
  - Minimum: 320px (shortest side)
  - Maximum: 3840px (longest side)
  - Recommended: 1080x1920 (portrait) or 1920x1080 (landscape)
- **Format:** PNG or JPEG
- **Content:** Actual app screenshots

**What screenshots to take:**
1. **Dashboard/Home screen** - Main view showing body clock score
2. **Sleep tracking screen** - Sleep logs or overview
3. **Shift calendar** - Rota/calendar view
4. **Settings/Profile** - User profile or settings
5. **AI Coach** - Coach chat interface
6. **Activity/Steps** - Activity tracking view
7. **Nutrition/Calories** - Adjusted calories page
8. **Shift Rhythm** - Body clock score card

**How to take screenshots:**
1. **Android Emulator:**
   - Open your app in Android Studio emulator
   - Use the screenshot tool (camera icon in toolbar)
   - Or press `Ctrl+S` (Windows) / `Cmd+S` (Mac)

2. **Real Android Device:**
   - Install your app via USB debugging
   - Navigate to each screen
   - Take screenshots (Power + Volume Down)
   - Transfer to computer

3. **Web Browser (for web version):**
   - Open your app in Chrome
   - Use DevTools (F12) → Device Toolbar
   - Set to phone dimensions (e.g., Pixel 5: 393x851)
   - Take screenshots

**Recommended screenshots (priority order):**
1. Dashboard with body clock score ⭐ (Most important)
2. Sleep tracking/overview
3. Shift calendar/rota
4. AI Coach interface
5. Activity/Steps page

---

## 🎨 **Design Tips**

### App Icon (512x512)
- **Keep it simple** - Should be recognizable at small sizes
- **Use your brand colors** - Match your app's color scheme
- **No text** - Or minimal text (icon should speak for itself)
- **Test at small size** - Should look good at 48x48 pixels too

### Feature Graphic (1024x500)
- **Showcase key features** - What makes your app unique?
- **Use your branding** - Colors, fonts, style
- **Include tagline** - "Health App for Shift Workers"
- **Make it eye-catching** - First thing users see

### Screenshots
- **Show real content** - Use actual app screens, not mockups
- **Highlight key features** - What makes your app valuable?
- **Add captions** (optional) - Can add text overlays explaining features
- **Consistent style** - All screenshots should feel cohesive

---

## 📁 **File Organization**

Create a folder: `play-store-assets/`

```
play-store-assets/
├── icon-512x512.png
├── feature-graphic-1024x500.png
├── screenshots/
│   ├── 01-dashboard.png
│   ├── 02-sleep-tracking.png
│   ├── 03-shift-calendar.png
│   ├── 04-ai-coach.png
│   ├── 05-activity.png
│   └── ...
└── README.md (this guide)
```

---

## 🚀 **Quick Start Options**

### Option A: Use Existing Assets (Fastest)
1. Take your `/Faviconnew.png`
2. Resize to 512x512 (add background if needed)
3. Use as Play Store icon
4. Take 2-3 screenshots from your app
5. Create simple feature graphic

**Time:** 1-2 hours

### Option B: Professional Design (Best Results)
1. Hire a designer on Fiverr/Upwork ($50-200)
2. Provide your logo and app screenshots
3. Get professional assets back

**Time:** 2-3 days

### Option C: DIY with Templates
1. Use Canva Play Store templates
2. Customize with your branding
3. Export at correct sizes

**Time:** 2-3 hours

---

## ✅ **Checklist**

Before submitting to Play Store:

- [ ] App icon (512x512 PNG, no transparency)
- [ ] Feature graphic (1024x500 PNG)
- [ ] At least 2 phone screenshots (1080x1920 recommended)
- [ ] All assets saved in organized folder
- [ ] Assets match your app's branding
- [ ] Screenshots show actual app functionality

---

## 🛠️ **Tools & Resources**

### Free Tools:
- **Canva** - [canva.com](https://www.canva.com) - Templates for Play Store
- **Figma** - [figma.com](https://www.figma.com) - Design tool
- **GIMP** - Free image editor
- **Photopea** - Free online Photoshop alternative

### Paid Tools:
- **Adobe Photoshop** - Professional design
- **Sketch** - Mac design tool
- **Affinity Designer** - One-time purchase alternative

### Online Resizers:
- **Squoosh** - [squoosh.app](https://squoosh.app) - Image optimization
- **TinyPNG** - Compress images

---

## 📝 **Next Steps**

1. **Decide on approach** (Option A, B, or C above)
2. **Create/gather assets**
3. **Organize in folder**
4. **Test that sizes are correct**
5. **Ready for Play Console upload!**

---

## 💡 **Pro Tips**

- **Start with screenshots** - Easiest to create, shows real app
- **Icon can be simple** - Your favicon resized works fine
- **Feature graphic is important** - First impression matters
- **You can update later** - Don't overthink it, get something up first
- **Use your brand colors** - Consistency is key

---

**Estimated Time:** 1-4 hours depending on approach

