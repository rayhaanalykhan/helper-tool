(function () {
    'use strict';

    var APP_VERSION = '20260523-4';

    // ── Firebase ──────────────────────────────────────────────────────────────
    var FIREBASE_CONFIG = {
        apiKey:     'AIzaSyBO6TBjvtZE8_OdSsEH6c2_CKOB_4GMnnk',
        authDomain: 'helper-tool-tech.firebaseapp.com',
        projectId:  'helper-tool-tech'
    };

    var fbApp  = firebase.apps.length ? firebase.app() : firebase.initializeApp(FIREBASE_CONFIG);
    var fbAuth = firebase.auth(fbApp);
    var fbDb   = firebase.firestore(fbApp);

    // Expose for admin.html (secondary-app user creation) and login.html
    window.htFirebase = { app: fbApp, auth: fbAuth, db: fbDb, config: FIREBASE_CONFIG };
    window.htAuth     = { user: null, role: null, permissions: {} };

    // ── Helpers ───────────────────────────────────────────────────────────────
    function escHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    // ── Public permission check ───────────────────────────────────────────────
    window.htCan = function (permission) {
        var a = window.htAuth;
        if (!a || !a.user) return false;
        if (a.role === 'admin') return true;
        return a.permissions[permission] === true;
    };

    // ── Auth header widget ────────────────────────────────────────────────────
    function renderAuthHeader(userData) {
        var toggle = document.getElementById('theme-toggle');
        if (!toggle) return;

        var widget = document.getElementById('ht-auth-widget');
        if (!widget) {
            widget = document.createElement('div');
            widget.id = 'ht-auth-widget';
            widget.style.cssText = 'display:flex;align-items:center;gap:0.5rem;flex-shrink:0;';
            toggle.parentNode.insertBefore(widget, toggle);
        }

        if (!userData) {
            widget.innerHTML =
                '<a href="login.html" id="ht-signin-btn"' +
                ' onclick="sessionStorage.setItem(\'ht_return_to\',location.href)"' +
                ' style="font-size:0.8125rem;font-weight:600;color:var(--primary);text-decoration:none;' +
                'padding:0.3rem 0.75rem;border:1px solid var(--primary);border-radius:0.375rem;' +
                'transition:background 0.15s;"' +
                ' onmouseover="this.style.background=\'rgba(59,130,246,0.08)\'"' +
                ' onmouseout="this.style.background=\'\'">Sign in</a>';
        } else {
            var isAdmin = (userData.role === 'admin');
            widget.innerHTML =
                (isAdmin
                    ? '<a href="settings.html" style="font-size:0.75rem;font-weight:600;' +
                      'color:var(--primary);text-decoration:none;padding:0.2rem 0.5rem;' +
                      'border:1px solid var(--primary);border-radius:0.3rem;opacity:0.8;' +
                      'transition:opacity 0.15s;" onmouseover="this.style.opacity=\'1\'"' +
                      ' onmouseout="this.style.opacity=\'0.8\'">Admin</a>'
                    : '') +
                '<span style="font-size:0.8125rem;color:var(--text-muted);max-width:8rem;' +
                'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="' +
                escHtml(userData.name || '') + '">' +
                escHtml(userData.name || userData.email || 'User') + '</span>' +
                '<button id="ht-signout-btn"' +
                ' style="font-size:0.8125rem;color:var(--text-muted);background:none;border:none;' +
                'cursor:pointer;padding:0.25rem 0.5rem;border-radius:0.25rem;transition:color 0.15s;"' +
                ' onmouseover="this.style.color=\'#ef4444\'"' +
                ' onmouseout="this.style.color=\'var(--text-muted)\'">Sign out</button>';
            document.getElementById('ht-signout-btn').addEventListener('click', function () {
                fbAuth.signOut();
            });
        }
    }

    // ── Permission dispatcher ─────────────────────────────────────────────────
    function applyPermissions() {
        if (typeof window.htOnAuthReady === 'function') {
            window.htOnAuthReady(window.htAuth);
        }
    }

    // ── Disabled account overlay ──────────────────────────────────────────────
    function showDisabledMessage() {
        var overlay = document.createElement('div');
        overlay.style.cssText =
            'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;' +
            'justify-content:center;background:rgba(0,0,0,0.55);backdrop-filter:blur(4px);';
        overlay.innerHTML =
            '<div style="background:var(--bg-card);border:1px solid var(--border-color);' +
            'border-radius:0.75rem;padding:2rem;max-width:22rem;width:calc(100% - 2rem);text-align:center;">' +
            '<p style="font-weight:700;font-size:1rem;color:var(--text-main);margin:0 0 0.5rem;">Account Disabled</p>' +
            '<p style="font-size:0.875rem;color:var(--text-muted);margin:0;line-height:1.5;">' +
            'Your account has been disabled. Contact an administrator.</p>' +
            '</div>';
        document.body.appendChild(overlay);
    }

    // ── Auth init ─────────────────────────────────────────────────────────────
    function initAuth() {
        renderAuthHeader(null); // instant "Sign in" — no flash while Firebase resolves

        fbAuth.onAuthStateChanged(function (user) {
            if (!user) {
                window.htAuth = { user: null, role: null, permissions: {} };
                renderAuthHeader(null);
                applyPermissions();
                return;
            }

            fbDb.collection('users').doc(user.uid).get()
                .then(function (snap) {
                    if (!snap.exists) { fbAuth.signOut(); return; }
                    var data = snap.data();
                    if (data.disabled) { fbAuth.signOut(); showDisabledMessage(); return; }
                    window.htAuth = {
                        user:        user,
                        role:        data.role || 'member',
                        permissions: data.permissions || {}
                    };
                    renderAuthHeader(data);
                    applyPermissions();
                })
                .catch(function () { fbAuth.signOut(); });
        });
    }

    // ── Update Checker ────────────────────────────────────────────────────────
    function initUpdateChecker() {
        var loadedVersion = APP_VERSION;
        var dismissed = false;

        if (window.location.search && /[?&]_r=/.test(window.location.search)) {
            history.replaceState(null, '', window.location.pathname);
        }

        function doCheck() {
            if (dismissed) return;
            fetch('shared.js?_=' + Date.now(), { cache: 'no-store' })
                .then(function (r) { return r.text(); })
                .then(function (text) {
                    var m = text.match(/APP_VERSION\s*=\s*['"]([^'"]+)['"]/);
                    if (m && m[1] !== loadedVersion) showUpdateBanner();
                })
                .catch(function () {});
        }

        function showUpdateBanner() {
            if (document.getElementById('ht-update-banner')) return;
            var banner = document.createElement('div');
            banner.id = 'ht-update-banner';
            banner.style.cssText =
                'position:fixed;top:0;left:0;right:0;z-index:9998;' +
                'background:var(--primary);color:#fff;padding:0.55rem 1rem;' +
                'display:flex;align-items:center;justify-content:center;gap:0.75rem;' +
                'font-size:0.8125rem;font-family:inherit;' +
                'box-shadow:0 2px 10px rgba(59,130,246,0.4);';
            banner.innerHTML =
                '<svg style="width:0.9rem;height:0.9rem;flex-shrink:0;opacity:0.9"' +
                ' fill="none" stroke="currentColor" viewBox="0 0 24 24">' +
                '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"' +
                ' d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581' +
                'm0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>' +
                '<span>A new version of Helper Tools is available.</span>' +
                '<button id="ht-reload-btn" style="background:#fff;color:var(--primary);' +
                'border:none;padding:0.25rem 0.875rem;border-radius:0.375rem;' +
                'font-weight:700;font-size:0.8125rem;cursor:pointer;">Reload</button>' +
                '<button id="ht-dismiss-btn" style="background:transparent;border:none;' +
                'color:rgba(255,255,255,0.75);cursor:pointer;padding:0.2rem;margin-left:0.25rem;' +
                'display:flex;align-items:center;" aria-label="Dismiss">' +
                '<svg style="width:0.875rem;height:0.875rem" fill="none" stroke="currentColor"' +
                ' viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round"' +
                ' stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/></svg></button>';
            document.body.prepend(banner);
            document.getElementById('ht-reload-btn').addEventListener('click', function () {
                window.location.replace(window.location.pathname + '?_r=' + Date.now());
            });
            document.getElementById('ht-dismiss-btn').addEventListener('click', function () {
                banner.remove();
                dismissed = true;
            });
        }

        window.addEventListener('focus', doCheck);
        setInterval(doCheck, 2 * 60 * 1000);
        setTimeout(doCheck, 2000);
    }

    // ── Bootstrap ─────────────────────────────────────────────────────────────
    document.addEventListener('DOMContentLoaded', function () {
        initUpdateChecker();
        initAuth();
    });

}());
