package com.ecoverify.app;

import android.os.Bundle;
import android.os.SystemClock;
import android.webkit.WebView;
import android.widget.Toast;
import androidx.activity.OnBackPressedCallback;
import com.getcapacitor.BridgeActivity;
import java.util.Locale;

public class MainActivity extends BridgeActivity {

    /** Time window for the second tap of "press back again to exit". */
    private static final long EXIT_WINDOW_MS = 2000;

    private long lastBackAtRootMs = 0;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Android back button / gesture: go back to the previous screen of the app instead of closing it.
        // On the first screen (no history), a second tap within 2 s sends the app to the background
        // (it stays open, so coming back is instant and keeps the session).
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                WebView webView = getBridge() != null ? getBridge().getWebView() : null;
                if (webView != null && webView.canGoBack()) {
                    webView.goBack();
                    return;
                }
                long now = SystemClock.elapsedRealtime();
                if (now - lastBackAtRootMs < EXIT_WINDOW_MS) {
                    lastBackAtRootMs = 0;
                    moveTaskToBack(true);
                } else {
                    lastBackAtRootMs = now;
                    Toast.makeText(MainActivity.this, exitHint(), Toast.LENGTH_SHORT).show();
                }
            }
        });
    }

    /** "Press back again to exit" in the phone's language (pt / es / en). */
    private static String exitHint() {
        String language = Locale.getDefault().getLanguage();
        if ("pt".equals(language)) return "Toque em voltar de novo para sair";
        if ("es".equals(language)) return "Toca atrás de nuevo para salir";
        return "Press back again to exit";
    }
}
