# Fix Gradle JDK Error - Step by Step

## The Error
```
Gradle JVM option is incorrect: 'C:\Program Files\Android\Android Studio\jbr'.
Use the JDK installed on the same WSL distribution.
```

## Fix It (Follow Exactly)

### Step 1: Open Gradle Settings
1. In Android Studio, click **File** (top menu)
2. Click **Settings** (or press `Ctrl+Alt+S`)

### Step 2: Navigate to Gradle
1. In the left sidebar, expand **Build, Execution, Deployment**
2. Click **Build Tools**
3. Click **Gradle**

### Step 3: Change Gradle JVM
1. Look for **"Gradle JVM"** dropdown (near the top)
2. Click the dropdown arrow
3. Click the **folder icon** (looks like a folder with a + sign)
   - It says "Add JDK..." when you hover

### Step 4: Enter WSL JDK Path
1. In the path box that appears, paste this EXACT path:
   ```
   \\wsl.localhost\Ubuntu\usr\lib\jvm\java-17-openjdk-amd64
   ```
2. Click **OK**

### Step 5: Apply Changes
1. Click **Apply** (bottom right)
2. Click **OK** (bottom right)

### Step 6: Sync Project
1. Click **File → Sync Project with Gradle Files**
2. Wait for sync to complete

## Done! ✅

The error should be gone. If you still see it:
- Close and reopen Android Studio
- Try **File → Invalidate Caches / Restart**
