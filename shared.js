(function () {
    'use strict';

    var APP_VERSION = '20260524-2';

    var FIREBASE_CONFIG = {
        apiKey:     'AIzaSyBO6TBjvtZE8_OdSsEH6c2_CKOB_4GMnnk',
        authDomain: 'helper-tool-tech.firebaseapp.com',
        projectId:  'helper-tool-tech'
    };

    var fbApp  = firebase.apps.length ? firebase.app() : firebase.initializeApp(FIREBASE_CONFIG);
    var fbAuth = firebase.auth(fbApp);
    var fbDb   = firebase.firestore(fbApp);

    window.htFirebase = { app: fbApp, auth: fbAuth, db: fbDb, config: FIREBASE_CONFIG };
    window.htAuth     = { user: null, role: null, permissions: {}, prefs: {} };

    var SIDEBAR_W = '240px';
    var _sidebarActive = false;
    var _currentPage   = (window.location.pathname.split('/').pop() || 'index.html').split('?')[0];

    // ── Helpers ───────────────────────────────────────────────────────────────
    function esc(str) {
        return String(str)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    window.htCan = function (perm) {
        var a = window.htAuth;
        if (!a || !a.user) return false;
        if (a.role === 'admin') return true;
        return a.permissions[perm] === true;
    };

    // ── Preferences ───────────────────────────────────────────────────────────
    window.htGetPref = function (key, def) {
        var prefs = (window.htAuth && window.htAuth.prefs) || {};
        if (prefs[key] !== undefined && prefs[key] !== '') return prefs[key];
        var local = localStorage.getItem(key);
        return (local !== null && local !== '') ? local : (def !== undefined ? def : '');
    };

    window.htSavePref = function (key, value) {
        localStorage.setItem(key, value);
        if (window.htAuth && window.htAuth.user) {
            var upd = {};
            upd['preferences.' + key] = value;
            fbDb.collection('users').doc(window.htAuth.user.uid).update(upd).catch(function () {});
        }
    };

    // ── Sidebar ───────────────────────────────────────────────────────────────
    function _navLink(href, svgPath, label) {
        var active = (_currentPage === href);
        var baseStyle = 'display:flex;align-items:center;gap:0.625rem;padding:0.45rem 0.75rem;border-radius:0.5rem;font-size:0.8125rem;font-weight:' + (active ? '600' : '500') + ';text-decoration:none;transition:background 0.15s,color 0.15s;color:' + (active ? 'var(--primary)' : 'var(--text-muted)') + ';background:' + (active ? 'rgba(59,130,246,0.1)' : 'transparent') + ';';
        var hoverAttr = active ? '' : ' onmouseover="this.style.background=\'var(--bg-surface)\';this.style.color=\'var(--text-main)\'" onmouseout="this.style.background=\'transparent\';this.style.color=\'var(--text-muted)\'"';
        return '<a href="' + href + '" style="' + baseStyle + '"' + hoverAttr + '>' +
            '<svg style="width:0.9375rem;height:0.9375rem;flex-shrink:0;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="' + svgPath + '"/></svg>' +
            '<span>' + label + '</span></a>';
    }

    function _buildSidebar(data) {
        var name     = data.name || data.email || 'User';
        var email    = data.email || '';
        var initials = name.charAt(0).toUpperCase();
        var isAdmin  = data.role === 'admin';
        var isDark   = document.documentElement.classList.contains('dark');
        var welcome  = data.welcomeMessage
            ? '<p style="font-size:0.68rem;color:var(--text-muted);margin:0.25rem 0 0;line-height:1.3;">Welcome to ' + esc(data.welcomeMessage) + ' helper tool</p>'
            : '';

        return '<div id="ht-sidebar" style="position:fixed;top:0;left:0;bottom:0;width:' + SIDEBAR_W + ';background:var(--bg-card);border-right:1px solid var(--border-color);display:flex;flex-direction:column;z-index:30;overflow-y:auto;">' +
            '<div style="padding:1rem 1rem 0.875rem;border-bottom:1px solid var(--border-color);flex-shrink:0;">' +
            '<a href="index.html" style="font-size:0.9375rem;font-weight:800;color:var(--text-main);text-decoration:none;">Helper Tools</a>' +
            welcome +
            '</div>' +
            '<nav style="padding:0.625rem;flex:1;display:flex;flex-direction:column;gap:0.125rem;">' +
            _navLink('index.html',    'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6', 'Home') +
            '<div style="flex:1;min-height:0.5rem;"></div>' +
            _navLink('settings.html', 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z', 'Settings') +
            '</nav>' +
            '<div style="padding:0.875rem 1rem;border-top:1px solid var(--border-color);flex-shrink:0;display:flex;flex-direction:column;gap:0.625rem;">' +
            '<div style="display:flex;align-items:center;gap:0.625rem;">' +
            '<div style="width:2rem;height:2rem;border-radius:50%;background:rgba(59,130,246,0.12);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:0.8125rem;color:var(--primary);flex-shrink:0;">' + esc(initials) + '</div>' +
            '<div style="min-width:0;flex:1;">' +
            '<p style="font-size:0.8125rem;font-weight:600;color:var(--text-main);margin:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="' + esc(name) + '">' + esc(name) + '</p>' +
            '<p style="font-size:0.7rem;color:var(--text-muted);margin:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="' + esc(email) + '">' + esc(email) + '</p>' +
            '</div>' +
            (isAdmin ? '<span style="font-size:0.65rem;font-weight:700;padding:0.1rem 0.4rem;border-radius:9999px;background:rgba(59,130,246,0.12);color:var(--primary);flex-shrink:0;">Admin</span>' : '') +
            '</div>' +
            '<div style="display:flex;gap:0.5rem;">' +
            '<button id="ht-sb-theme" style="flex:1;display:flex;align-items:center;justify-content:center;gap:0.375rem;font-size:0.75rem;color:var(--text-muted);background:var(--bg-surface);border:1px solid var(--border-color);border-radius:0.375rem;padding:0.35rem 0.5rem;cursor:pointer;" onmouseover="this.style.color=\'var(--text-main)\'" onmouseout="this.style.color=\'var(--text-muted)\'">' +
            '<svg id="ht-sb-sun" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width:0.875rem;height:0.875rem;display:' + (isDark ? 'block' : 'none') + ';flex-shrink:0;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/></svg>' +
            '<svg id="ht-sb-moon" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width:0.875rem;height:0.875rem;display:' + (isDark ? 'none' : 'block') + ';flex-shrink:0;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/></svg>' +
            '<span id="ht-sb-theme-lbl">' + (isDark ? 'Dark' : 'Light') + '</span>' +
            '</button>' +
            '<button id="ht-sb-signout" style="flex:1;font-size:0.75rem;color:var(--text-muted);background:var(--bg-surface);border:1px solid var(--border-color);border-radius:0.375rem;padding:0.35rem 0.5rem;cursor:pointer;transition:color 0.15s,border-color 0.15s;" onmouseover="this.style.color=\'#ef4444\';this.style.borderColor=\'rgba(239,68,68,0.3)\'" onmouseout="this.style.color=\'var(--text-muted)\';this.style.borderColor=\'var(--border-color)\'">Sign out</button>' +
            '</div>' +
            '</div>' +
            '</div>';
    }

    function _showSidebar(data) {
        var existing = document.getElementById('ht-sidebar');
        if (existing) existing.remove();

        var tmp = document.createElement('div');
        tmp.innerHTML = _buildSidebar(data);
        document.body.appendChild(tmp.firstElementChild);

        if (!_sidebarActive) {
            _sidebarActive = true;
            document.body.style.paddingLeft = SIDEBAR_W;
        }

        var signout = document.getElementById('ht-sb-signout');
        if (signout) signout.addEventListener('click', function () { fbAuth.signOut(); });

        var themeBtn = document.getElementById('ht-sb-theme');
        if (themeBtn) {
            themeBtn.addEventListener('click', function () {
                var isDark = document.documentElement.classList.toggle('dark');
                localStorage.setItem('ostrom_theme', isDark ? 'dark' : 'light');
                var sun   = document.getElementById('ht-sb-sun');
                var moon  = document.getElementById('ht-sb-moon');
                var lbl   = document.getElementById('ht-sb-theme-lbl');
                if (sun)  sun.style.display  = isDark ? 'block' : 'none';
                if (moon) moon.style.display = isDark ? 'none'  : 'block';
                if (lbl)  lbl.textContent    = isDark ? 'Dark'  : 'Light';
                var pSun  = document.getElementById('icon-sun');
                var pMoon = document.getElementById('icon-moon');
                if (pSun)  pSun.classList.toggle('hidden', !isDark);
                if (pMoon) pMoon.classList.toggle('hidden', isDark);
            });
        }
    }

    function _hideSidebar() {
        var sb = document.getElementById('ht-sidebar');
        if (sb) sb.remove();
        document.body.style.paddingLeft = '';
        _sidebarActive = false;
    }

    function _showLoginButton() {
        if (document.getElementById('ht-login-btn')) return;
        var toggle = document.getElementById('theme-toggle');
        if (!toggle) return;
        var a = document.createElement('a');
        a.id   = 'ht-login-btn';
        a.href = 'login.html';
        a.textContent = 'Sign in';
        a.style.cssText = 'font-size:0.8125rem;font-weight:600;color:var(--primary);background:rgba(59,130,246,0.08);border:1px solid rgba(59,130,246,0.25);border-radius:0.375rem;padding:0.3rem 0.75rem;text-decoration:none;white-space:nowrap;transition:background 0.15s;';
        a.onmouseover = function () { this.style.background = 'rgba(59,130,246,0.15)'; };
        a.onmouseout  = function () { this.style.background = 'rgba(59,130,246,0.08)'; };
        toggle.parentNode.insertBefore(a, toggle);
    }

    function _hideLoginButton() {
        var btn = document.getElementById('ht-login-btn');
        if (btn) btn.remove();
    }

    // ── Disabled account overlay ──────────────────────────────────────────────
    function _showDisabled() {
        var el = document.createElement('div');
        el.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.55);backdrop-filter:blur(4px);';
        el.innerHTML = '<div style="background:var(--bg-card);border:1px solid var(--border-color);border-radius:0.75rem;padding:2rem;max-width:22rem;width:calc(100% - 2rem);text-align:center;"><p style="font-weight:700;font-size:1rem;color:var(--text-main);margin:0 0 0.5rem;">Account Disabled</p><p style="font-size:0.875rem;color:var(--text-muted);margin:0;line-height:1.5;">Your account has been disabled. Contact an administrator.</p></div>';
        document.body.appendChild(el);
    }

    // ── Auth init ─────────────────────────────────────────────────────────────
    function initAuth() {
        var resolved = false;

        fbAuth.onAuthStateChanged(function (user) {
            if (!user) {
                window.htAuth = { user: null, role: null, permissions: {}, prefs: {} };
                if (resolved) _hideSidebar();
                resolved = true;
                _showLoginButton();
                if (typeof window.htOnAuthReady === 'function') window.htOnAuthReady(window.htAuth);
                return;
            }
            if (resolved) return;

            fbDb.collection('users').doc(user.uid).get()
                .then(function (snap) {
                    if (!snap.exists) { fbAuth.signOut(); return; }
                    var data = snap.data();
                    if (data.disabled) { fbAuth.signOut(); _showDisabled(); return; }

                    var prefs = data.preferences || {};
                    var migrations = {};
                    ['ostrom_user', 'ostrom_prefix'].forEach(function (k) {
                        var local = localStorage.getItem(k);
                        if (local && prefs[k] === undefined) {
                            prefs[k] = local;
                            migrations['preferences.' + k] = local;
                        }
                    });
                    if (Object.keys(migrations).length) {
                        fbDb.collection('users').doc(user.uid).update(migrations).catch(function () {});
                    }

                    window.htAuth = {
                        user:        user,
                        role:        data.role || 'member',
                        permissions: data.permissions || {},
                        prefs:       prefs
                    };
                    resolved = true;

                    fbDb.collection('settings').doc('app').get()
                        .then(function (appSnap) {
                            var wm = appSnap.exists ? (appSnap.data().welcomeMessage || '') : '';
                            _hideLoginButton();
                            _showSidebar({ name: data.name, email: user.email, role: data.role, welcomeMessage: wm });
                            if (typeof window.htOnAuthReady === 'function') window.htOnAuthReady(window.htAuth);
                        })
                        .catch(function () {
                            _hideLoginButton();
                            _showSidebar({ name: data.name, email: user.email, role: data.role, welcomeMessage: '' });
                            if (typeof window.htOnAuthReady === 'function') window.htOnAuthReady(window.htAuth);
                        });
                })
                .catch(function () { fbAuth.signOut(); });
        });
    }

    // ── Update Checker ────────────────────────────────────────────────────────
    function initUpdateChecker() {
        var loadedVersion = APP_VERSION;
        var dismissed     = false;
        var lastCheck     = 0;

        if (/[?&]_r=/.test(window.location.search)) {
            history.replaceState(null, '', window.location.pathname);
        }

        function doCheck() {
            if (dismissed) return;
            var now = Date.now();
            if (now - lastCheck < 30000) return;
            lastCheck = now;
            fetch('shared.js?_=' + now, { cache: 'no-store' })
                .then(function (r) { return r.text(); })
                .then(function (txt) {
                    var m = txt.match(/APP_VERSION\s*=\s*['"]([^'"]+)['"]/);
                    if (m && m[1] !== loadedVersion) showBanner();
                })
                .catch(function () {});
        }

        function showBanner() {
            if (document.getElementById('ht-update-banner')) return;
            var b = document.createElement('div');
            b.id = 'ht-update-banner';
            b.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9998;background:var(--primary);color:#fff;padding:0.55rem 1rem;display:flex;align-items:center;justify-content:center;gap:0.75rem;font-size:0.8125rem;font-family:inherit;box-shadow:0 2px 10px rgba(59,130,246,0.4);';
            b.innerHTML =
                '<span>A new version of Helper Tools is available.</span>' +
                '<button id="ht-reload-btn" style="background:#fff;color:var(--primary);border:none;padding:0.25rem 0.875rem;border-radius:0.375rem;font-weight:700;font-size:0.8125rem;cursor:pointer;">Reload</button>' +
                '<button id="ht-dismiss-btn" style="background:transparent;border:none;color:rgba(255,255,255,0.75);cursor:pointer;padding:0.2rem;display:flex;align-items:center;" aria-label="Dismiss"><svg style="width:0.875rem;height:0.875rem" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/></svg></button>';
            document.body.prepend(b);
            document.getElementById('ht-reload-btn').onclick = function () {
                window.location.replace(window.location.pathname + '?_r=' + Date.now());
            };
            document.getElementById('ht-dismiss-btn').onclick = function () { b.remove(); dismissed = true; };
        }

        window.addEventListener('focus', doCheck);
        setInterval(doCheck, 2 * 60 * 1000);
        setTimeout(doCheck, 2000);
    }

    // ── Bootstrap ─────────────────────────────────────────────────────────────
    document.addEventListener('DOMContentLoaded', function () {
        initUpdateChecker();
        if (_currentPage !== 'login.html') initAuth();
    });

}());
