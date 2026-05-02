# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

-keep class androidx.health.connect.** { *; }
-dontwarn androidx.health.connect.**

# Keep Capacitor classes (required for Capacitor to work)
-keep class com.getcapacitor.** { *; }
-keep class com.capacitorjs.** { *; }
-keep class ee.forgr.capacitor_navigation_bar.** { *; }
-dontwarn com.getcapacitor.**
-dontwarn com.capacitorjs.**

# Keep WebView JavaScript interface classes
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Keep native methods
-keepclasseswithmembernames class * {
    native <methods>;
}

# Keep JavaScript bridge classes
-keep class * extends android.webkit.WebViewClient { *; }
-keep class * extends android.webkit.WebChromeClient { *; }

# Keep Supabase classes (if using native modules)
-keep class io.supabase.** { *; }
-dontwarn io.supabase.**

# Google Play In-App Review
-keep class com.google.android.play.core.review.** { *; }
-dontwarn com.google.android.play.core.review.**

# Preserve line numbers for better crash reports (optional - remove for smaller size)
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
