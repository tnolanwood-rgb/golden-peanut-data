package com.goldenhub.dual;
import org.junit.Test;
import static org.junit.Assert.*;

public class NavigationPolicyTest {
    @Test public void internalOriginsAreExact() {
        assertTrue(NavigationPolicy.isInternal("https://thegoldenpeanut.pages.dev/"));
        assertTrue(NavigationPolicy.isInternal("https://private-dual-hub-preview.thegoldenpeanut.pages.dev/index.html?game=osrs"));
        for (String url : new String[]{"http://thegoldenpeanut.pages.dev", "https://thegoldenpeanut.pages.dev.evil.test", "https://user@thegoldenpeanut.pages.dev", "https://thegoldenpeanut.pages.dev:8443", "file:///sdcard/a", "intent://app", "javascript:alert(1)", "https://evil.test/", "not a uri"})
            assertFalse(url, NavigationPolicy.isInternal(url));
    }
    @Test public void publicBrowserLinksRejectCredentialsAndUnsafeSchemes() {
        assertTrue(NavigationPolicy.isHttps("https://example.com/a"));
        assertFalse(NavigationPolicy.isHttps("https://user:password@example.com"));
        assertFalse(NavigationPolicy.isHttps("javascript:alert(1)"));
    }
    @Test public void backupBlobsStayWithinTheAppsOrigins() {
        assertTrue(NavigationPolicy.isOwnBlob("blob:https://thegoldenpeanut.pages.dev/1234"));
        assertFalse(NavigationPolicy.isOwnBlob("blob:https://thegoldenpeanut.pages.dev.evil.test/1234"));
        assertFalse(NavigationPolicy.isOwnBlob("https://thegoldenpeanut.pages.dev/1234"));
        assertFalse(NavigationPolicy.isOwnBlob(null));
    }
}
