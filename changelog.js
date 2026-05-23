// ─────────────────────────────────────────────────────────────────────────────
// APP VERSION  →  bump this string each time you deploy so users with stale
//                 tabs see the "new version available" banner automatically.
const APP_VERSION = '20260523-1';

// ─────────────────────────────────────────────────────────────────────────────
// TOOL CHANGELOG
// Edit this file to update the "What's new" section on every page.
//
// HOW TO ADD A NEW RELEASE:
//   1. Replace the entries below with your new release notes.
//   2. Save the file and push — all three pages update automatically.
//
// CATEGORIES  →  use any label you like, e.g. "New", "Improved", "Fixed"
// COLORS       →  new: '#10b981' (green)  |  improved: 'var(--primary)' (blue)
//                 fixed: '#f59e0b' (amber)  |  or any CSS colour
// ─────────────────────────────────────────────────────────────────────────────

const TOOL_CHANGELOG = [
    {
        label: 'New',
        color: '#10b981',
        bg:    'rgba(16,185,129,0.12)',
        items: [
            "Suggest a change or request a new tool using the chat button in the bottom-right corner — no email needed, just type and send",
            "Stale tab? A banner now appears at the top when a new version is available, so you never miss an update",
        ]
    },
    {
        label: 'Improved',
        color: 'var(--primary)',
        bg:    'rgba(59,130,246,0.12)',
        items: [
            "Hovering the info icon on a change type now shows read-only examples — clicking them does nothing, so no accidental type selections",
        ]
    },
];

// ─────────────────────────────────────────────────────────────────────────────
// Renderer — no need to touch this
// ─────────────────────────────────────────────────────────────────────────────
function renderToolChangelog(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '';

    TOOL_CHANGELOG.forEach(section => {
        if (!section.items || !section.items.length) return;

        const wrapper = document.createElement('div');

        const label = document.createElement('p');
        label.style.cssText = 'font-size:0.7rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-muted);margin:0 0 0.625rem;';
        label.textContent = section.label;

        const ul = document.createElement('ul');
        ul.style.cssText = 'list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:0.625rem;';

        section.items.forEach(text => {
            const li = document.createElement('li');
            li.style.cssText = 'display:flex;align-items:flex-start;gap:0.625rem;font-size:0.875rem;';

            const dot = document.createElement('span');
            dot.style.cssText = `margin-top:3px;width:1.125rem;height:1.125rem;flex-shrink:0;border-radius:50%;background:${section.bg};display:inline-flex;align-items:center;justify-content:center;`;
            dot.innerHTML = `<svg style="width:0.5rem;height:0.5rem;color:${section.color};" fill="currentColor" viewBox="0 0 8 8"><circle cx="4" cy="4" r="3"/></svg>`;

            const span = document.createElement('span');
            span.style.color = 'var(--text-main)';
            span.textContent = text;

            li.appendChild(dot);
            li.appendChild(span);
            ul.appendChild(li);
        });

        wrapper.appendChild(label);
        wrapper.appendChild(ul);
        container.appendChild(wrapper);
    });
}
