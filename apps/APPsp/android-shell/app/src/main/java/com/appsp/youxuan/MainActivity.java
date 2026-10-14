package com.appsp.youxuan;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.view.Window;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

public class MainActivity extends Activity {
    private WebView webView;
    /** 启动地址外置在 res/values/strings.xml 的 start_url，换部署域名不必改代码 */
    private String startUrl;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Window w = getWindow();
        w.setStatusBarColor(Color.parseColor("#FF5A1F"));

        startUrl = getString(R.string.start_url);

        webView = new WebView(this);
        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setUseWideViewPort(true);
        s.setLoadWithOverviewMode(true);
        s.setAllowFileAccess(true);
        s.setAllowContentAccess(true);
        s.setAllowFileAccessFromFileURLs(true);
        s.setAllowUniversalAccessFromFileURLs(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView view, String url) {
                // 自动跳过 CloudBase 测试域名拦截页
                view.evaluateJavascript(
                    "(function(){" +
                    "var btns=document.querySelectorAll('button,a,div,span');" +
                    "for(var i=0;i<btns.length;i++){" +
                    "  var t=(btns[i].textContent||'').trim();" +
                    "  if(t==='确定访问'||t.indexOf('确定访问')>=0){btns[i].click();return;}" +
                    "}" +
                    "})()", null);
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                if (url == null) return false;
                String lower = url.toLowerCase();
                // 非 http/https 协议（tel / mailto / 各 App scheme）交给系统处理，
                // 否则 WebView 会把它当网页加载导致白屏
                if (!lower.startsWith("http://") && !lower.startsWith("https://")) {
                    try {
                        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                        view.getContext().startActivity(intent);
                        return true;
                    } catch (Exception e) {
                        return true;
                    }
                }
                view.loadUrl(url);
                return true;
            }
        });

        setContentView(webView);
        // 只在首次创建时加载，避免每次 onCreate 都清缓存并重新拉取首页
        if (savedInstanceState != null) {
            webView.restoreState(savedInstanceState);
        } else {
            webView.loadUrl(startUrl);
        }
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        if (webView != null) webView.saveState(outState);
    }

    @Override
    protected void onPause() {
        super.onPause();
        if (webView != null) webView.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (webView != null) webView.onResume();
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.setWebViewClient(null);
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}