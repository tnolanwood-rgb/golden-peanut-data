package com.goldenhub.dual;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

public final class MainActivity extends Activity {
    private WebView desk;
    private static final String PREVIEW_HOST = "private-dual-hub-preview.thegoldenpeanut.pages.dev";
    private static final String PRODUCTION_HOST = "thegoldenpeanut.pages.dev";

    @Override public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(Color.rgb(14, 25, 20));
        getWindow().setNavigationBarColor(Color.rgb(14, 25, 20));
        getWindow().getDecorView().setSystemUiVisibility(0);
        desk = new WebView(this);
        desk.setBackgroundColor(Color.rgb(14, 25, 20));
        desk.setOverScrollMode(View.OVER_SCROLL_NEVER);
        WebSettings settings = desk.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setSupportMultipleWindows(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setSafeBrowsingEnabled(true);
        desk.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri url = request.getUrl();
                if (!"https".equalsIgnoreCase(url.getScheme())) return true;
                String host = url.getHost();
                if (PREVIEW_HOST.equalsIgnoreCase(host) || PRODUCTION_HOST.equalsIgnoreCase(host)) return false;
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, url));
                } catch (ActivityNotFoundException ex) {
                    Toast.makeText(MainActivity.this, "No browser can open this link.", Toast.LENGTH_SHORT).show();
                }
                return true;
            }
        });
        setContentView(desk);
        if (savedInstanceState == null || desk.restoreState(savedInstanceState) == null) {
            desk.loadUrl(BuildConfig.HUB_URL);
        }
    }

    @Override protected void onSaveInstanceState(Bundle outState) {
        desk.saveState(outState);
        super.onSaveInstanceState(outState);
    }

    @Override public void onBackPressed() {
        if (desk.canGoBack()) desk.goBack();
        else super.onBackPressed();
    }

    @Override protected void onDestroy() {
        if (desk != null) {
            desk.stopLoading();
            desk.setWebViewClient(null);
            desk.destroy();
            desk = null;
        }
        super.onDestroy();
    }
}
