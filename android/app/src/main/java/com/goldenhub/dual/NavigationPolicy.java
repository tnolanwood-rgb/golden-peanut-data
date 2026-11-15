package com.goldenhub.dual;

import java.net.URI;
import java.util.Locale;

/** Exact origin checks. Never grant internal navigation to a host suffix or userinfo. */
public final class NavigationPolicy {
    private NavigationPolicy() { }
    public static boolean isHttps(String value) {
        try {
            URI uri = new URI(value);
            return "https".equalsIgnoreCase(uri.getScheme()) && uri.getHost() != null
                    && uri.getRawUserInfo() == null && (uri.getPort() == -1 || uri.getPort() == 443);
        } catch (Exception ignored) { return false; }
    }
    public static boolean isInternal(String value) {
        if (!isHttps(value)) return false;
        try {
            String host = new URI(value).getHost().toLowerCase(Locale.ROOT);
            return host.equals("thegoldenpeanut.pages.dev")
                    || host.equals("private-dual-hub-preview.thegoldenpeanut.pages.dev");
        } catch (Exception ignored) { return false; }
    }
    public static boolean isOwnBlob(String value) {
        return value != null && value.startsWith("blob:") && isInternal(value.substring(5));
    }
}
