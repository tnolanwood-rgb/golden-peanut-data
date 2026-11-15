Golden Trading Hub Android *preview* wrapper
=========================================

A deliberately thin, single-WebView Android shell for the existing Cloudflare app. There are NO duplicated game switching buttons or native trading UI. Debug points to the isolated Cloudflare preview, and is deliberately a separate Android package (com.goldenhub.dual.preview) so it cannot overwrite the original Golden Peanut or Golden Exchange data.

Run GitHub Actions workflow **Golden Hub — Build Separate Android Preview** to obtain the debug APK artifact. A green build only verifies packaging and signing. Physical Android testing is still needed, and the existing OSRS v4 advanced research engine has not yet been migrated to the site. Do not publish this prototype to the Play Store or switch production users to it.

The WebView shares storage with the Cloudflare origin inside this APK, NOT with Chrome or any older Android package. No API key or trade ledger is silently copied. Export backups before migrating. The WebView permits the Golden Peanut production and preview Pages hosts and hands other HTTPS links to an external browser. Only HTTPS is permitted.
