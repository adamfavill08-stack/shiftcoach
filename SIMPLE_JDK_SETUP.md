# Simple JDK Setup for Android Studio

## ✅ Java is Installed!
You have: `java-17-openjdk-amd64`

## Fix the Error (Follow These Steps)

### Step 1: Open Settings
- Click **File → Settings** (or press `Ctrl+Alt+S`)

### Step 2: Go to Gradle
- Left sidebar: **Build, Execution, Deployment → Build Tools → Gradle**

### Step 3: Change Gradle JVM
- Find **"Gradle JVM"** dropdown (near top)
- Click the dropdown arrow
- Click the **folder icon** (Add JDK...)

### Step 4: Paste This Path
Copy and paste this EXACT path:
```
\\wsl.localhost\Ubuntu\usr\lib\jvm\java-17-openjdk-amd64
```
- Click **OK**

### Step 5: Apply
- Click **Apply** (bottom right)
- Click **OK** (bottom right)

### Step 6: Sync
- Click **File → Sync Project with Gradle Files**

## Done! ✅

If error persists:
- Close Android Studio completely
- Reopen it
- Try again
