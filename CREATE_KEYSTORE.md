# Create New Keystore - Step by Step

## 🎯 Goal: Create a keystore file to sign your Android app

---

## Step 1: Open Generate Signed Bundle Dialog

1. In Android Studio, click **Build** (top menu)
2. Click **Generate Signed Bundle / APK**
3. Select **Android App Bundle** (or APK - doesn't matter for keystore creation)
4. Click **Next**

---

## Step 2: Create New Keystore

1. In the "Key store path" section, click **Create new...** button
2. A new dialog opens: "New Key Store"

---

## Step 3: Fill in Keystore Details

### Keystore Information:
- **Key store path**: 
  ```
  C:\dev\shiftcoach\android\app\shiftcoach-release.keystore
  ```
  (Click folder icon to browse and select location)

- **Password**: 
  - Create a **strong password** (save it somewhere safe!)
  - Example: `YourStrongPassword123!`
  - **⚠️ IMPORTANT: Don't lose this password!**

- **Confirm**: Enter password again

---

## Step 4: Fill in Key Information

### Key:
- **Alias**: `shiftcoach-key` (or any name you want)
  - Example: `release-key`, `shiftcoach-release`, etc.

- **Password**: 
  - Can be same as keystore password (easier)
  - Or different (more secure)
  - **⚠️ Save this password too!**

- **Validity (years)**: `25` (default is fine)

---

## Step 5: Fill in Certificate Information

Fill in your details (required by Google Play):

- **First and Last Name**: Your name or company name
  - Example: `Shift Coach` or `Your Name`

- **Organizational Unit**: Department (optional)
  - Example: `Development`

- **Organization**: Company name (optional)
  - Example: `Shift Coach App` or your company

- **City or Locality**: Your city
  - Example: `London`

- **State or Province**: Your state/province
  - Example: `England` or leave blank

- **Country Code (XX)**: Your 2-letter country code
  - Example: `GB` (UK), `US` (USA), `AU` (Australia)
  - [Find your code](https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2)

---

## Step 6: Create Keystore

1. Click **OK**
2. Android Studio creates the keystore file
3. You'll see the keystore path filled in
4. Click **Next** to continue building, or **Cancel** if you just wanted to create the keystore

---

## Step 7: Save Your Information! ⚠️

**CRITICAL: Save this information somewhere safe!**

Create a file or note with:
```
Keystore Location: C:\dev\shiftcoach\android\app\shiftcoach-release.keystore
Keystore Password: [your password]
Key Alias: shiftcoach-key
Key Password: [your password]
```

**Why this matters:**
- You'll need this for **every future update**
- If you lose it, you **cannot update your app** on Play Store
- You'll have to create a new app listing (lose all downloads/reviews)

---

## Step 8: Verify Keystore Created

Check that the file exists:
- Location: `C:\dev\shiftcoach\android\app\shiftcoach-release.keystore`
- File should be created (usually 1-2 KB)

---

## Example Values (Fill with Your Info)

```
Key store path: C:\dev\shiftcoach\android\app\shiftcoach-release.keystore
Password: MySecurePassword123!
Key alias: shiftcoach-key
Key password: MySecurePassword123! (same as keystore)
Validity: 25 years

Certificate:
First/Last Name: Shift Coach
Organization: Shift Coach App
City: London
Country Code: GB
```

---

## Next Steps

After creating keystore:
1. **Save the passwords** somewhere safe
2. **Backup the keystore file** to a safe location
3. You can now build signed AAB files
4. Use this keystore for all future releases

---

## Security Tips

- ✅ **Use strong passwords** (mix of letters, numbers, symbols)
- ✅ **Save passwords securely** (password manager, encrypted file)
- ✅ **Backup keystore file** (cloud storage, USB drive)
- ✅ **Don't commit to Git** (add to `.gitignore`)
- ❌ **Don't share passwords** publicly
- ❌ **Don't lose the keystore** - you can't recover it!

---

## That's It! 🎉

Your keystore is created and ready to use for signing your app!
