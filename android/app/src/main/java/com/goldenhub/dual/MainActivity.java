package com.goldenhub.dual;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.res.Configuration;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.util.Base64;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.Toast;
import android.view.ViewGroup;
import android.window.OnBackInvokedDispatcher;
import org.json.JSONTokener;
import java.io.OutputStream;

public final class MainActivity extends Activity {
    private WebView desk;
    private ValueCallback<Uri[]> fileCallback;
    private byte[] pendingDownload;
    private boolean downloadBusy;
    private String downloadSlot;
    private static final int PICK_FILE = 17, SAVE_FILE = 18;
    private static final int MAX_BACKUP_BYTES = 24 * 1024 * 1024;

    @Override public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(Color.rgb(14, 25, 20));
        getWindow().setNavigationBarColor(Color.rgb(14, 25, 20));
        if (Build.VERSION.SDK_INT >= 33) {
            getOnBackInvokedDispatcher().registerOnBackInvokedCallback(
                    OnBackInvokedDispatcher.PRIORITY_DEFAULT, this::navigateBack);
        }
        createDesk(savedInstanceState);
    }

    private void createDesk(Bundle savedInstanceState) {
        // Debug-only CDP is for a fresh isolated emulator, never release builds.
        if (BuildConfig.DEBUG) WebView.setWebContentsDebuggingEnabled(true);
        desk = new WebView(this);
        desk.setBackgroundColor(Color.rgb(14, 25, 20));
        desk.setOverScrollMode(WebView.OVER_SCROLL_NEVER);
        WebSettings settings = desk.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setSupportMultipleWindows(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setSafeBrowsingEnabled(true);
        desk.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback,
                                                       FileChooserParams params) {
                if (!NavigationPolicy.isInternal(view.getUrl())) return false;
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = callback;
                try { startActivityForResult(params.createIntent(), PICK_FILE); return true; }
                catch (ActivityNotFoundException error) {
                    fileCallback.onReceiveValue(null); fileCallback = null;
                    message("No file picker available."); return false;
                }
            }
        });
        desk.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (!"GET".equals(request.getMethod()) || !NavigationPolicy.isInternal(uri.toString())
                        || !Uri.parse(BuildConfig.HUB_URL).getHost().equals(uri.getHost())) return null;
                String path = uri.getPath();
                if (path == null || path.equals("/")) path = "/index.html";
                if (!path.matches("/[A-Za-z0-9_./-]+") || path.contains("..")) return null;
                try {
                    java.io.InputStream stream = getAssets().open("hub" + path);
                    String type = path.endsWith(".js") ? "text/javascript" : path.endsWith(".css") ? "text/css"
                            : path.endsWith(".html") ? "text/html" : path.endsWith(".webmanifest") ? "application/manifest+json"
                            : java.net.URLConnection.guessContentTypeFromName(path);
                    if (type == null) type = "application/octet-stream";
                    return new WebResourceResponse(type, type.startsWith("text/") ? "UTF-8" : null,
                            200, "OK", java.util.Collections.singletonMap("Cache-Control", "no-store"), stream);
                } catch (java.io.IOException missingAsset) {
                    // Frontend code is intentionally version-locked to the
                    // embedded release. Only dynamic API/market responses
                    // may use the network when no packaged asset exists.
                    if (NavigationPolicy.isBundledFrontendAsset(path)) {
                        byte[] body = "Bundled Golden Hub preview file missing. The app will not load a different website version."
                                .getBytes(java.nio.charset.StandardCharsets.UTF_8);
                        return new WebResourceResponse("text/plain", "UTF-8", 404, "Not Found",
                                java.util.Collections.singletonMap("Cache-Control", "no-store"),
                                new java.io.ByteArrayInputStream(body));
                    }
                    return null;
                }
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();
                if (NavigationPolicy.isInternal(url)) return false;
                if (request.isForMainFrame() && request.hasGesture() && NavigationPolicy.isHttps(url)) {
                    try { startActivity(new Intent(Intent.ACTION_VIEW, request.getUrl())); }
                    catch (ActivityNotFoundException error) { message("No browser can open this link."); }
                }
                return true;
            }
            @Override public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
                // A dead renderer cannot be reused. Recovery is explicit, never an automatic reload loop.
                if (view.getParent() instanceof ViewGroup) ((ViewGroup) view.getParent()).removeView(view);
                view.destroy(); desk = null; pendingDownload = null; downloadBusy = false;
                if (fileCallback != null) { fileCallback.onReceiveValue(null); fileCallback = null; }
                LinearLayout recovery = new LinearLayout(MainActivity.this);
                Button retry = new Button(MainActivity.this);
                retry.setText("Trading screen stopped. Reopen saved desk");
                retry.setOnClickListener(v -> createDesk(null)); recovery.addView(retry);
                setContentView(recovery); return true;
            }
        });
        // Blob downloads never leave the trusted origin or enter a JavaScript credential bridge.
        // A system document picker lets the owner choose the external backup destination.
        desk.setDownloadListener((url, agent, disposition, mime, length) -> {
            if (!NavigationPolicy.isInternal(desk.getUrl()) || !NavigationPolicy.isOwnBlob(url)) {
                message("Only in-app backup downloads are supported."); return;
            }
            if (downloadBusy) { message("Finish saving the current backup first."); return; }
            downloadBusy = true;
            String script = "(async()=>{try{const b=await(await fetch(" + org.json.JSONObject.quote(url)
                    + ")).blob();if(b.size>" + MAX_BACKUP_BYTES + ")return null;"
                    + "return await new Promise(r=>{const f=new FileReader();f.onload=()=>r(f.result);f.onerror=()=>r(null);f.readAsDataURL(b)})}catch{return null}})()";
            // evaluateJavascript does not await Promises. Resolve via a short-lived DOM value,
            // then poll a bounded number of times; no addJavascriptInterface is exposed.
            String slot = "__goldenHubBackup" + Long.toHexString(System.nanoTime());
            downloadSlot = slot;
            desk.evaluateJavascript("window." + slot + "=null;" + script
                    + ".then(v=>{if(Object.prototype.hasOwnProperty.call(window,'" + slot
                    + "'))window." + slot + "=v||'ERROR'})", null);
            readDownload(slot, 0);
        });
        setContentView(desk);
        if (savedInstanceState == null || desk.restoreState(savedInstanceState) == null) desk.loadUrl(BuildConfig.HUB_URL);
    }

    private void readDownload(String slot, int attempts) {
        if (desk == null || isFinishing()) return;
        desk.evaluateJavascript("window." + slot, result -> {
            if (desk == null || !slot.equals(downloadSlot)) return;
            try {
                Object value = new JSONTokener(result).nextValue();
                if (!(value instanceof String)) {
                    if (attempts < 40) desk.postDelayed(() -> readDownload(slot, attempts + 1), 100);
                    else { downloadBusy = false; downloadSlot = null; desk.evaluateJavascript("delete window." + slot, null); message("Backup preparation timed out. Try again."); }
                    return;
                }
                desk.evaluateJavascript("delete window." + slot, null); downloadSlot = null;
                String data = (String) value;
                int comma = data.indexOf(',');
                if (!data.startsWith("data:") || comma < 0 || data.length() > MAX_BACKUP_BYTES * 4L / 3 + 2048) {
                    downloadBusy = false; message("Backup unavailable or exceeds the 24 MB Android export limit."); return;
                }
                pendingDownload = Base64.decode(data.substring(comma + 1), Base64.DEFAULT);
                if (pendingDownload.length > MAX_BACKUP_BYTES) { pendingDownload = null; downloadBusy = false; return; }
                String type = data.substring(5, data.indexOf(';'));
                Intent save = new Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE)
                        .setType(type.isEmpty() ? "application/octet-stream" : type)
                        .putExtra(Intent.EXTRA_TITLE, "Golden-Trading-Hub-Backup-" + System.currentTimeMillis()
                                + (type.contains("json") ? ".json" : type.contains("gzip") ? ".json.gz" : ".bin"));
                startActivityForResult(save, SAVE_FILE);
            } catch (Exception error) { pendingDownload = null; downloadBusy = false; downloadSlot = null; desk.evaluateJavascript("delete window." + slot, null); message("Backup could not be prepared."); }
        });
    }

    private void navigateBack() {
        if (desk == null) { finish(); return; }
        desk.evaluateJavascript("(()=>{const d=document.querySelector('dialog[open]');if(d){d.close();return true}return window.GoldenDualHub?.back?.()||false})()", result -> {
            if (desk == null || "true".equals(result)) return;
            if (desk.canGoBack()) desk.goBack(); else finish();
        });
    }
    @Override @SuppressWarnings("deprecation") public void onBackPressed() { navigateBack(); }
    @Override public void onConfigurationChanged(Configuration config) {
        super.onConfigurationChanged(config); // Retain the live DOM, chart gestures and drafts.
    }
    @Override protected void onPause() { if (desk != null) desk.onPause(); super.onPause(); }
    @Override protected void onResume() { super.onResume(); if (desk != null) desk.onResume(); }
    @Override protected void onSaveInstanceState(Bundle outState) {
        if (desk != null) desk.saveState(outState); super.onSaveInstanceState(outState);
    }
    @Override @SuppressWarnings("deprecation") protected void onActivityResult(int code, int result, Intent data) {
        super.onActivityResult(code, result, data);
        if (code == PICK_FILE && fileCallback != null) {
            fileCallback.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(result, data)); fileCallback = null;
        }
        if (code == SAVE_FILE) {
            byte[] bytes = pendingDownload; pendingDownload = null; downloadBusy = false;
            if (result != RESULT_OK || data == null || data.getData() == null || bytes == null) return;
            final Uri destination = data.getData(); downloadBusy = true;
            new Thread(() -> {
                boolean saved = false;
                try (OutputStream out = getContentResolver().openOutputStream(destination, "w")) {
                    if (out == null) throw new java.io.IOException("No output stream");
                    out.write(bytes); out.flush(); saved = true;
                } catch (Exception error) { saved = false; }
                final boolean complete = saved;
                runOnUiThread(() -> {
                    downloadBusy = false;
                    if (!isFinishing() && !isDestroyed()) message(complete ? "Backup saved. Verify it before any migration."
                            : "Backup could not be saved. Original app data is unchanged.");
                });
            }, "GoldenHub-BackupSave").start();
        }
    }
    private void message(String value) { Toast.makeText(this, value, Toast.LENGTH_LONG).show(); }
    @Override protected void onDestroy() {
        if (fileCallback != null) { fileCallback.onReceiveValue(null); fileCallback = null; }
        pendingDownload = null;
        if (desk != null) { desk.stopLoading(); desk.setWebChromeClient(null); desk.setWebViewClient(null); if (desk.getParent() instanceof ViewGroup) ((ViewGroup) desk.getParent()).removeView(desk); desk.destroy(); desk = null; }
        super.onDestroy();
    }
}
