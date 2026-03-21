# Install Java in WSL (Simple)

## Step 1: Install Java
Run this in WSL:
```bash
sudo apt update
sudo apt install openjdk-17-jdk -y
```

## Step 2: Verify It Worked
```bash
java -version
```

You should see something like:
```
openjdk version "17.0.x"
```

## Step 3: Find the Path
```bash
ls /usr/lib/jvm/
```

Now you should see: `java-17-openjdk-amd64`

## Step 4: Use in Android Studio
1. **File → Settings → Build Tools → Gradle**
2. **Gradle JVM → folder icon**
3. Paste: `\\wsl.localhost\Ubuntu\usr\lib\jvm\java-17-openjdk-amd64`
4. **OK → Apply → OK**
5. **File → Sync Project with Gradle Files**

Done! ✅
