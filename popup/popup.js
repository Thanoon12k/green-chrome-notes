/* =========================================================
   AI Notes — Popup Logic
   ========================================================= */

const $ = id => document.getElementById(id);

let currentType = 'text';
let quickTags   = [];
let allNotes    = [];
let allGroups   = [];

/* ---- Init ---- */
document.addEventListener('DOMContentLoaded', async () => {
  await loadGroups();
  await loadNotes();
  bindEvents();
  prefillFromTab();
});

async function loadGroups() {
  allGroups = await msg('getGroups');
  const sel = $('group-select');
  sel.innerHTML = '<option value="">📂 Group…</option>';
  allGroups.forEach(g => {
    const o = document.createElement('option');
    o.value = g.name;
    o.textContent = (g.emoji || '📂') + ' ' + g.name;
    sel.appendChild(o);
  });
}

async function loadNotes(notes) {
  allNotes = notes || await msg('getNotes');
  renderNotes(allNotes);
}

function bindEvents() {
  // Type tabs
  document.querySelectorAll('.type-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.type-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentType = tab.dataset.type;
      $('text-input-area').classList.toggle('hidden', currentType !== 'text');
      $('screenshot-area').classList.toggle('hidden', currentType !== 'screenshot');
      $('link-input-area').classList.toggle('hidden', currentType !== 'link');
    });
  });

  // Quick tag input
  $('tag-quick').addEventListener('keydown', e => {
    if ((e.key === 'Enter' || e.key === ',') && e.target.value.trim()) {
      e.preventDefault();
      addQuickTag(e.target.value.trim().replace(/[,#]/g, '').toLowerCase());
      e.target.value = '';
    }
  });

  // "/" in note-input triggers group hint
  $('note-input').addEventListener('input', e => {
    const val = e.target.value;
    if (val.includes('/')) {
      const slashPart = val.split('/').pop();
      if (slashPart) {
        const match = allGroups.find(g => g.name.toLowerCase().startsWith(slashPart.toLowerCase()));
        if (match) $('group-select').value = match.name;
      }
    }
  });

  // Save button
  $('btn-save').addEventListener('click', handleSave);

  // Search
  $('search-input').addEventListener('input', async e => {
    const q = e.target.value.trim();
    $('clear-search').classList.toggle('hidden', !q);
    if (q) {
      const results = await msg('searchNotes', { query: q });
      $('notes-label').textContent = 'Search Results';
      renderNotes(results);
    } else {
      $('notes-label').textContent = 'Recent Notes';
      renderNotes(allNotes);
    }
  });
  $('clear-search').addEventListener('click', () => {
    $('search-input').value = '';
    $('clear-search').classList.add('hidden');
    $('notes-label').textContent = 'Recent Notes';
    renderNotes(allNotes);
  });

  // Header buttons
  $('btn-sidebar').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    await msg('openSidePanel', { tabId: tab.id });
    window.close();
  });
  $('btn-dashboard').addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('dashboard/dashboard.html') });
    window.close();
  });
  $('btn-settings').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
    window.close();
  });
}

async function prefillFromTab() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.url && !tab.url.startsWith('chrome://')) {
      const linkInput = $('link-input');
      if (linkInput) linkInput.value = tab.url;
    }
  } catch {}
}

function addQuickTag(tag) {
  if (!tag || quickTags.includes(tag)) return;
  quickTags.push(tag);
  renderQuickTags();
}

function renderQuickTags() {
  const wrap = $('quick-tags');
  wrap.innerHTML = '';
  quickTags.forEach((tag, i) => {
    const chip = document.createElement('span');
    chip.className = 'quick-tag';
    chip.innerHTML = `#${Helpers.escapeHtml(tag)} <span class="rm" data-i="${i}">✕</span>`;
    chip.querySelector('.rm').addEventListener('click', () => {
      quickTags.splice(i, 1);
      renderQuickTags();
    });
    wrap.appendChild(chip);
  });
}

async function handleSave() {
  const btn = $('btn-save');
  const label = $('save-label');
  const spinner = $('save-spinner');

  btn.disabled = true;
  label.classList.add('hidden');
  spinner.classList.remove('hidden');

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    let content = '', type = currentType, imageUrl = null, linkUrl = null;

    if (type === 'text') {
      content = $('note-input').value.trim();
      if (!content) { showStatus('Please write something first.', 'error'); return; }
    } else if (type === 'screenshot') {
      // handled by service worker
    } else if (type === 'link') {
      linkUrl = $('link-input').value.trim() || tab.url;
      content = linkUrl;
    }

    const data = {
      type, content, imageUrl, linkUrl,
      url: tab.url, title: tab.title, tabId: tab.id,
      manualTags: quickTags,
      manualGroup: $('group-select').value || ''
    };

    const res = await msg(type === 'screenshot' ? 'captureScreenshot' : 'processCapture', { data });
    if (res?.error) throw new Error(res.error);

    showStatus('✅ Note sent to AI for processing!', 'success');
    $('note-input').value = '';
    quickTags = [];
    renderQuickTags();
    setTimeout(() => loadNotes(), 1500);

  } catch (err) {
    showStatus('❌ ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    label.classList.remove('hidden');
    spinner.classList.add('hidden');
  }
}

function renderNotes(notes) {
  const list  = $('notes-list');
  const empty = $('empty-state');
  const count = $('notes-count');
  count.textContent = notes.length;

  if (!notes.length) {
    list.innerHTML = '';
    if (empty) empty.classList.remove('hidden');
    return;
  }

  if (empty) empty.classList.add('hidden');
  list.innerHTML = notes.slice(0, 30).map(n => noteCardHTML(n)).join('');

  // Bind delete / md export
  list.querySelectorAll('[data-delete]').forEach(btn => {
    btn.addEventListener('click', async e => {
      e.stopPropagation();
      await msg('deleteNote', { id: btn.dataset.delete });
      loadNotes();
    });
  });
  list.querySelectorAll('[data-md]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const note = notes.find(n => n.id === btn.dataset.md);
      if (note) downloadMarkdown(note);
    });
  });
}

function noteCardHTML(n) {
  const g   = allGroups.find(g => g.name === n.group);
  const dot = g ? `<span class="note-group-dot" style="background:${g.color}"></span>` : '';
  const tags = (n.tags || []).slice(0, 2).map(t => `<span class="note-tag">#${Helpers.escapeHtml(t)}</span>`).join('');
  const fav  = n.url ? `<img src="${Helpers.getFavicon(n.url)}" onerror="this.style.display='none'"/>` : '';
  const domain = Helpers.getDomain(n.url || '');
  const isImg  = (n.type === 'image' || n.type === 'screenshot') && n.imageUrl;

  return `<div class="note-card" data-id="${n.id}">
    <div class="note-card-top">
      <span class="note-type-icon">${Helpers.noteTypeIcon(n.type)}</span>
      <span class="note-caption">${Helpers.escapeHtml(Helpers.truncate(n.caption || n.content, 90))}</span>
      <button class="note-md-btn"    data-md="${n.id}"     title="Export as Markdown">⬇MD</button>
      <button class="note-delete"    data-delete="${n.id}" title="Delete">✕</button>
    </div>
    ${isImg ? `<img class="note-img-thumb" src="${Helpers.escapeHtml(n.imageUrl)}" alt=""/>` : ''}
    <div class="note-card-meta">
      ${dot}
      <span class="note-domain">${fav}${Helpers.escapeHtml(Helpers.truncate(domain, 22))}</span>
      ${tags}
      <span class="note-time">${Helpers.formatDate(n.createdAt)}</span>
    </div>
  </div>`;
}

function showStatus(text, type) {
  let el = document.querySelector('.status-msg');
  if (!el) { el = document.createElement('div'); el.className = 'status-msg'; $('btn-save').after(el); }
  el.textContent = text;
  el.className   = 'status-msg ' + type;
  setTimeout(() => el?.remove(), 3000);
}

/* ---- Markdown Export ---- */
function noteToMarkdown(n) {
  const tags  = (n.tags || []).map(t => '`#' + t + '`').join(' ');
  const date  = n.createdAt ? new Date(n.createdAt).toLocaleDateString('en-US', { year:'numeric', month:'short', day:'numeric' }) : '';
  return `# Note from ${Helpers.getDomain(n.url || '') || 'web'}

**Type**: ${n.type || 'text'}
**Source**: ${n.url || 'N/A'}
**Saved**: ${date}
**Group**: ${n.group || 'Uncategorized'}
**Tags**: ${tags || 'none'}

${n.caption ? `> ${n.caption}\n` : ''}
---

${n.content || (n.linkUrl ? `[${n.linkUrl}](${n.linkUrl})` : '')}
`;
}

function downloadMarkdown(note) {
  const md    = noteToMarkdown(note);
  const blob  = new Blob([md], { type: 'text/markdown' });
  const url   = URL.createObjectURL(blob);
  const a     = document.createElement('a');
  a.href      = url;
  a.download  = `note_${note.id.slice(0,10)}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ---- Messaging helper ---- */
function msg(action, extra = {}) {
  return chrome.runtime.sendMessage({ action, ...extra });
}
