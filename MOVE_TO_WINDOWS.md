# Move Everything to Windows (Simpler!)

## Option 1: Copy Android Folder to Windows (Easiest)

### Step 1: Copy Android Folder
In WSL terminal:
```bash
# Copy android folder to Windows
cp -r /home/growli/shiftcali/shiftcali/android /mnt/c/dev/shiftcoach/
```

### Step 2: Open in Android Studio
- **File → Open**
- Navigate to: `C:\dev\shiftcoach\android`
- Click OK

### Step 3: Use Windows JDK
- **File → Settings → Build Tools → Gradle**
- **Gradle JVM** → Select: `C:\Program Files\Android\Android Studio\jbr`
- Click **Apply** and **OK**

### Step 4: Sync After Changes
When you make changes in WSL:
```bash
# Build in WSL
npm run build
npx cap sync android

# Then copy android folder to Windows
cp -r /home/growli/shiftcali/shiftcali/android /mnt/c/dev/shiftcoach/
```

Then refresh in Android Studio: **File → Sync Project with Gradle Files**

---

## Option 2: Move Entire Project to Windows (Best Long-term)

### Step 1: Copy Project
In Windows PowerShell:
```powershell
# Copy entire project from WSL to Windows
xcopy \\wsl.localhost\Ubuntu\home\growli\shiftcali\shiftcali C:\dev\shiftcoach\ /E /I /H
```

### Step 2: Work from Windows
- Open project in VS Code/editor from `C:\dev\shiftcoach\`
- Run `npm install` in Windows
- Run `npm run dev` from Windows
- Open Android Studio from `C:\dev\shiftcoach\android`

### Step 3: No More WSL Paths!
- Everything is on Windows
- Android Studio uses Windows JDK (no configuration needed)
- No path issues

---

## Option 3: Keep WSL, But Use Windows Android Folder

Keep developing in WSL, but:
1. Always copy android folder to Windows after syncing
2. Always open Android Studio from Windows path
3. Use Windows JDK in Android Studio

---

## Recommendation

**Option 2** (Move entire project to Windows) is simplest long-term:
- ✅ No WSL path issues
- ✅ Android Studio works normally
- ✅ Everything in one place
- ✅ Easier to manage

**Option 1** (Copy android folder) is quickest right now:
- ✅ Keep working in WSL
- ✅ Just copy android folder when needed
- ✅ Use Windows JDK in Android Studio

Choose what works best for you!
