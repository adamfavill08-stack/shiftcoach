# Setting JAVA_HOME for Android Builds

## Quick Fix (Current Session Only)

Run this in PowerShell before building:

```powershell
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
$env:PATH = "$env:JAVA_HOME\bin;$env:PATH"
```

## Permanent Fix (Recommended)

Set JAVA_HOME permanently so you don't have to do this every time:

### Option 1: Using PowerShell (Easy)

1. Open PowerShell as Administrator
2. Run:
```powershell
[System.Environment]::SetEnvironmentVariable('JAVA_HOME', 'C:\Program Files\Android\Android Studio\jbr', 'User')
```

3. Add to PATH:
```powershell
$currentPath = [System.Environment]::GetEnvironmentVariable('Path', 'User')
$jdkPath = "C:\Program Files\Android\Android Studio\jbr\bin"
if ($currentPath -notlike "*$jdkPath*") {
    [System.Environment]::SetEnvironmentVariable('Path', "$currentPath;$jdkPath", 'User')
}
```

4. Close and reopen your terminal/PowerShell

### Option 2: Using Windows GUI

1. Press `Win + R`, type `sysdm.cpl`, press Enter
2. Click "Environment Variables"
3. Under "User variables", click "New"
4. Variable name: `JAVA_HOME`
5. Variable value: `C:\Program Files\Android\Android Studio\jbr`
6. Click OK
7. Find "Path" in User variables, click "Edit"
8. Click "New" and add: `%JAVA_HOME%\bin`
9. Click OK on all dialogs
10. Close and reopen your terminal

### Verify It Works

After setting it, verify:
```powershell
echo $env:JAVA_HOME
java -version
```

You should see the Java version.

---

## Alternative: Use Android Studio's Terminal

Android Studio's built-in terminal already has JAVA_HOME configured. You can:
1. Open Android Studio
2. Use the terminal at the bottom
3. Run `.\gradlew bundleRelease` from there

This avoids needing to set JAVA_HOME manually.

