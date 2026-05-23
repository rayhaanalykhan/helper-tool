(function () {
    'use strict';

    // ── Config ────────────────────────────────────────────────────────────────
    // Direct submission via Formspree (free, no email client needed on submitter side).
    // Setup: create a free account at https://formspree.io → New Form → copy the
    // form ID (e.g. 'xbjnkpvq') and paste it below.
    var FORMSPREE_ID = 'YOUR_FORM_ID';
    var COOLDOWN_MS  = 60 * 60 * 1000; // 1 hour between submissions
    var LS_KEY       = 'ht_last_fb_submit';

    // ── Rate-limit helpers ─────────────────────────────────────────────────────
    function getRemainingMs() {
        var last = parseInt(localStorage.getItem(LS_KEY) || '0', 10);
        return Math.max(0, last + COOLDOWN_MS - Date.now());
    }
    function isOnCooldown() { return getRemainingMs() > 0; }
    function fmtRemaining() {
        var mins = Math.ceil(getRemainingMs() / 60000);
        return mins === 1 ? '1 minute' : mins + ' minutes';
    }

    // ── Feedback FAB ──────────────────────────────────────────────────────────
    var cooldownTimer = null;

    function initFeedback() {
        var style = document.createElement('style');
        style.textContent = [
            '#ht-fab{position:fixed;bottom:1.5rem;right:1.5rem;z-index:1000;',
            'width:3.25rem;height:3.25rem;border-radius:50%;',
            'background:var(--primary);color:#fff;border:none;cursor:pointer;',
            'display:flex;align-items:center;justify-content:center;',
            'box-shadow:0 4px 16px rgba(59,130,246,0.45);',
            'transition:transform 0.18s ease,box-shadow 0.18s ease;}',
            '#ht-fab:hover{transform:scale(1.1);box-shadow:0 6px 22px rgba(59,130,246,0.55);}',
            '#ht-fab:active{transform:scale(0.96);}',

            '#ht-feedback-panel{position:fixed;bottom:5.5rem;right:1.5rem;z-index:1001;',
            'width:min(24rem,calc(100vw - 3rem));',
            'background:var(--bg-card);border:1px solid var(--border-color);',
            'border-radius:1rem;padding:1.25rem;',
            'box-shadow:0 16px 48px rgba(0,0,0,0.2);',
            'display:none;flex-direction:column;gap:0.875rem;',
            'transform-origin:bottom right;}',

            '#ht-feedback-panel.open{display:flex;animation:ht-fadein 0.18s ease;}',
            '@keyframes ht-fadein{',
            'from{opacity:0;transform:scale(0.92) translateY(6px);}',
            'to{opacity:1;transform:scale(1) translateY(0);}}',

            '#ht-feedback-ta{width:100%;box-sizing:border-box;',
            'background:var(--bg-card);border:1px solid var(--border-color);',
            'color:var(--text-main);border-radius:0.5rem;',
            'padding:0.625rem 0.75rem;font-size:0.875rem;font-family:inherit;',
            'resize:vertical;min-height:7rem;',
            'transition:border-color 0.15s,box-shadow 0.15s;outline:none;}',
            '#ht-feedback-ta:focus{border-color:var(--border-focus);',
            'box-shadow:0 0 0 1px var(--border-focus);}',
            '#ht-feedback-ta.ht-err{border-color:#ef4444;',
            'box-shadow:0 0 0 1px #ef4444;}',
            '#ht-send-btn:disabled{opacity:0.5;cursor:not-allowed;}',
        ].join('');
        document.head.appendChild(style);

        var fab = document.createElement('button');
        fab.id = 'ht-fab';
        fab.title = 'Suggest a change or new tool';
        fab.setAttribute('aria-label', 'Open feedback form');
        fab.innerHTML = '<svg style="width:1.25rem;height:1.25rem" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/></svg>';

        var panel = document.createElement('div');
        panel.id = 'ht-feedback-panel';
        panel.setAttribute('role', 'dialog');
        panel.setAttribute('aria-modal', 'true');
        panel.setAttribute('aria-labelledby', 'ht-feedback-title');
        panel.innerHTML = [
            '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:0.5rem;">',
                '<div style="display:flex;align-items:center;gap:0.625rem;min-width:0;">',
                    '<div style="padding:0.45rem;border-radius:0.5rem;',
                    'background:rgba(59,130,246,0.12);flex-shrink:0;">',
                        '<svg style="width:0.95rem;height:0.95rem;color:var(--primary)"',
                        ' fill="none" stroke="currentColor" viewBox="0 0 24 24">',
                            '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"',
                            ' d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3',
                            'm1.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547',
                            'A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531',
                            'c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>',
                        '</svg>',
                    '</div>',
                    '<div style="min-width:0;">',
                        '<p id="ht-feedback-title"',
                        ' style="font-size:0.875rem;font-weight:700;color:var(--text-main);',
                        'margin:0;line-height:1.2;">Suggest a Change or New Tool</p>',
                        '<p style="font-size:0.75rem;color:var(--text-muted);',
                        'margin:0.15rem 0 0;line-height:1.4;">',
                        'What would you like to see added or changed?</p>',
                    '</div>',
                '</div>',
                '<button id="ht-feedback-x"',
                ' style="flex-shrink:0;padding:0.25rem;border-radius:0.375rem;border:none;',
                'background:transparent;color:var(--text-muted);cursor:pointer;',
                'display:flex;align-items:center;" aria-label="Close">',
                    '<svg style="width:1rem;height:1rem" fill="none" stroke="currentColor"',
                    ' viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round"',
                    ' stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>',
                '</button>',
            '</div>',

            // Rate-limit notice (hidden until cooldown is active)
            '<div id="ht-cooldown-notice"',
            ' style="display:none;padding:0.5rem 0.625rem;border-radius:0.5rem;',
            'background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.3);',
            'align-items:center;gap:0.5rem;">',
                '<svg style="width:0.875rem;height:0.875rem;flex-shrink:0;color:#f59e0b"',
                ' fill="none" stroke="currentColor" viewBox="0 0 24 24">',
                    '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"',
                    ' d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>',
                '</svg>',
                '<span id="ht-cooldown-text"',
                ' style="font-size:0.75rem;color:var(--text-main);line-height:1.4;"></span>',
            '</div>',

            '<textarea id="ht-feedback-ta"',
            ' placeholder="e.g. I\'d love a tool to auto-generate JIRA descriptions from tickets,',
            ' or could the Version Control page support multiple prefix formats?"></textarea>',

            '<p id="ht-feedback-err"',
            ' style="display:none;font-size:0.75rem;color:#ef4444;margin:-0.375rem 0 0;">',
            'Please write your feedback before submitting.</p>',

            '<p id="ht-submit-err"',
            ' style="display:none;font-size:0.75rem;color:#ef4444;margin:-0.375rem 0 0;"></p>',

            '<div style="display:flex;justify-content:flex-end;gap:0.5rem;">',
                '<button id="ht-feedback-cancel"',
                ' style="font-size:0.8125rem;padding:0.4rem 1rem;border-radius:0.375rem;',
                'border:1px solid var(--border-color);background:transparent;',
                'color:var(--text-muted);cursor:pointer;font-weight:500;">Cancel</button>',
                '<button id="ht-send-btn"',
                ' style="font-size:0.8125rem;padding:0.4rem 1.25rem;border-radius:0.375rem;',
                'border:none;background:var(--primary);color:#fff;cursor:pointer;',
                'font-weight:600;min-width:7.5rem;transition:opacity 0.15s;">',
                'Send Feedback</button>',
            '</div>',
        ].join('');

        document.body.appendChild(fab);
        document.body.appendChild(panel);

        fab.addEventListener('click', function () {
            var isOpen = panel.classList.contains('open');
            panel.classList.toggle('open', !isOpen);
            if (!isOpen) {
                refreshCooldownUI();
                if (!isOnCooldown()) {
                    setTimeout(function () {
                        var ta = document.getElementById('ht-feedback-ta');
                        if (ta) ta.focus();
                    }, 50);
                }
            }
        });

        document.getElementById('ht-feedback-x').addEventListener('click', closePanel);
        document.getElementById('ht-feedback-cancel').addEventListener('click', closePanel);
        document.getElementById('ht-send-btn').addEventListener('click', sendFeedback);

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && panel.classList.contains('open')) closePanel();
        });

        document.addEventListener('click', function (e) {
            if (!panel.classList.contains('open')) return;
            if (!panel.contains(e.target) && !fab.contains(e.target)) closePanel();
        });
    }

    function refreshCooldownUI() {
        var notice   = document.getElementById('ht-cooldown-notice');
        var coolText = document.getElementById('ht-cooldown-text');
        var sendBtn  = document.getElementById('ht-send-btn');
        if (!notice || !coolText || !sendBtn) return;

        if (isOnCooldown()) {
            var left = fmtRemaining();
            notice.style.display = 'flex';
            coolText.textContent = 'You can submit 1 feedback per hour. Next submission available in ' + left + '.';
            sendBtn.disabled = true;
            sendBtn.textContent = 'Try again in ' + left;

            if (!cooldownTimer) {
                cooldownTimer = setInterval(function () {
                    var panel = document.getElementById('ht-feedback-panel');
                    if (!panel || !panel.classList.contains('open')) return;
                    if (!isOnCooldown()) {
                        clearInterval(cooldownTimer);
                        cooldownTimer = null;
                        refreshCooldownUI();
                    } else {
                        refreshCooldownUI();
                    }
                }, 30000);
            }
        } else {
            notice.style.display = 'none';
            sendBtn.disabled = false;
            sendBtn.textContent = 'Send Feedback';
            if (cooldownTimer) { clearInterval(cooldownTimer); cooldownTimer = null; }
        }
    }

    function closePanel() {
        var panel = document.getElementById('ht-feedback-panel');
        var err   = document.getElementById('ht-feedback-err');
        var serr  = document.getElementById('ht-submit-err');
        var ta    = document.getElementById('ht-feedback-ta');
        if (panel) panel.classList.remove('open');
        if (err)   err.style.display = 'none';
        if (serr)  serr.style.display = 'none';
        if (ta)    ta.classList.remove('ht-err');
    }

    function sendFeedback() {
        var ta   = document.getElementById('ht-feedback-ta');
        var err  = document.getElementById('ht-feedback-err');
        var serr = document.getElementById('ht-submit-err');
        var btn  = document.getElementById('ht-send-btn');
        var text = ta.value.trim();
        serr.style.display = 'none';

        if (!text) {
            ta.classList.add('ht-err');
            err.style.display = 'block';
            ta.addEventListener('input', function clear() {
                ta.classList.remove('ht-err');
                err.style.display = 'none';
                ta.removeEventListener('input', clear);
            });
            return;
        }

        if (isOnCooldown()) { refreshCooldownUI(); return; }

        if (FORMSPREE_ID === 'YOUR_FORM_ID') {
            serr.textContent = 'Feedback not configured yet — ask the admin to set up the Formspree endpoint.';
            serr.style.display = 'block';
            return;
        }

        btn.disabled = true;
        btn.textContent = 'Sending…';

        fetch('https://formspree.io/f/' + FORMSPREE_ID, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body:    JSON.stringify({
                feedback: text,
                page: window.location.pathname,
            }),
        })
        .then(function (r) {
            if (!r.ok) throw new Error('HTTP ' + r.status);
            return r.json();
        })
        .then(function () {
            localStorage.setItem(LS_KEY, String(Date.now()));
            ta.value = '';
            closePanel();
            showSuccessToast();
        })
        .catch(function () {
            btn.disabled = false;
            btn.textContent = 'Send Feedback';
            serr.textContent = 'Submission failed — please try again.';
            serr.style.display = 'block';
        });
    }

    function showSuccessToast() {
        var toast = document.createElement('div');
        toast.style.cssText = [
            'position:fixed;bottom:6rem;right:1.5rem;z-index:1002;',
            'background:#10b981;color:#fff;',
            'padding:0.625rem 1rem;border-radius:0.625rem;',
            'font-size:0.8125rem;font-weight:600;font-family:inherit;',
            'display:flex;align-items:center;gap:0.5rem;',
            'box-shadow:0 4px 14px rgba(16,185,129,0.4);',
            'animation:ht-fadein 0.2s ease;',
        ].join('');
        toast.innerHTML = [
            '<svg style="width:1rem;height:1rem;flex-shrink:0" fill="none"',
            ' stroke="currentColor" viewBox="0 0 24 24">',
                '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5"',
                ' d="M5 13l4 4L19 7"/>',
            '</svg>',
            '<span>Feedback sent — thank you!</span>',
        ].join('');
        document.body.appendChild(toast);
        setTimeout(function () {
            toast.style.transition = 'opacity 0.4s';
            toast.style.opacity = '0';
            setTimeout(function () { toast.remove(); }, 420);
        }, 2800);
    }

    // ── Update Checker ────────────────────────────────────────────────────────
    function initUpdateChecker() {
        if (typeof APP_VERSION === 'undefined') return;
        var loadedVersion = APP_VERSION;
        var dismissed = false;

        function doCheck() {
            if (dismissed) return;
            fetch('changelog.js?_=' + Date.now(), { cache: 'no-store' })
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
            banner.style.cssText = [
                'position:fixed;top:0;left:0;right:0;z-index:9998;',
                'background:var(--primary);color:#fff;',
                'padding:0.55rem 1rem;',
                'display:flex;align-items:center;justify-content:center;gap:0.75rem;',
                'font-size:0.8125rem;font-family:inherit;',
                'box-shadow:0 2px 10px rgba(59,130,246,0.4);',
            ].join('');
            banner.innerHTML = [
                '<svg style="width:0.9rem;height:0.9rem;flex-shrink:0;opacity:0.9"',
                ' fill="none" stroke="currentColor" viewBox="0 0 24 24">',
                    '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"',
                    ' d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11',
                    ' 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>',
                '</svg>',
                '<span>A new version of Helper Tools is available.</span>',
                '<button id="ht-reload-btn"',
                ' style="background:#fff;color:var(--primary);border:none;',
                'padding:0.25rem 0.875rem;border-radius:0.375rem;',
                'font-weight:700;font-size:0.8125rem;cursor:pointer;">Reload</button>',
                '<button id="ht-dismiss-btn"',
                ' style="background:transparent;border:none;color:rgba(255,255,255,0.75);',
                'cursor:pointer;padding:0.2rem;margin-left:0.25rem;',
                'display:flex;align-items:center;" aria-label="Dismiss">',
                    '<svg style="width:0.875rem;height:0.875rem" fill="none"',
                    ' stroke="currentColor" viewBox="0 0 24 24">',
                        '<path stroke-linecap="round" stroke-linejoin="round"',
                        ' stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/>',
                    '</svg>',
                '</button>',
            ].join('');
            document.body.prepend(banner);
            document.getElementById('ht-reload-btn').addEventListener('click', function () {
                window.location.reload();
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
        initFeedback();
        initUpdateChecker();
    });

}());
