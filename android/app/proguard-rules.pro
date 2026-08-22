# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# ── Capacitor WebView Bridge (must keep for JS<->Native communication) ──────
-keep class com.getcapacitor.** { *; }
-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }
-keep class com.spendtrack.app.** { *; }

# ── Suppress missing Facebook SDK (optional dependency in firebase-auth plugin) ──
-dontwarn com.facebook.**
-keep class com.facebook.** { *; }

# ── Google Sign-In ────────────────────────────────────────────────────────────
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.android.gms.**

# ── Firebase ──────────────────────────────────────────────────────────────────
-keep class com.google.firebase.** { *; }
-dontwarn com.google.firebase.**

# ── Capacitor Firebase Auth plugin ────────────────────────────────────────────
-keep class io.capawesome.capacitorjs.plugins.firebase.** { *; }
-dontwarn io.capawesome.capacitorjs.plugins.firebase.**

# ── Keep WebView JavaScript interface names ───────────────────────────────────
-keepattributes JavascriptInterface
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# ── Keep line numbers for crash reports ──────────────────────────────────────
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
