/* AI Notes — Sidebar JS */
const $ = id => document.getElementById(id);
let allNotes = [], allGroups = [], activeGroup = '';

document.addEventListener('DOMContentLoaded', async () => {
  await loadData();
  bindEvents();
});

async function loadData() {
  [allNotes, allGroups] = await Promise.all([msg('getNotes'), msg('getGroups')]);
  buildFilterTabs();
  buildGroupSelect();
  renderNotes(allNotes);
}

function buildFilterTabs() {
  const wrap = $('sb-filter-tabs');
  wrap.innerHTML = '<button class="sb-filter-tab active" data-group="">All</button>';
  allGroups.forEach(g => {
    const btn = document.createElement('button');
    btn.className = 'sb-filter-tab';
    btn.dataset.group = g.name;
    btn.textContent = (g.emoji || '📂') + ' ' + g.name;
    wrap.appendChild(btn);
  });
  wrap.querySelectorAll('.sb-filter-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      wrap.querySelectorAll('.sb-filter-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeGroup = btn.dataset.group;
      const filtered = activeGroup ? allNotes.filter(n => n.group === activeGroup) : allNotes;
      renderNotes(filtered);
    });
  });
}

function buildGroupSelect() {
  const sel = $('sb-group-sel');
  sel.innerHTML = '<option value="">📂 Group…</option>';
  allGroups.forEach(g => {
    const o = document.createElement('option');
    o.value = g.name;
    o.textContent = (g.emoji || '') + ' ' + g.name;
    sel.appendChild(o);
  });
}

function bindEvents() {
  $('sb-search').addEventListener('input', async e => {
    const q = e.target.value.trim();
    const results = q ? await msg('searchNotes', { query: q }) : allNotes;
    renderNotes(results);
  });

  $('sb-save-btn').addEventListener('click', handleSave);
  $('sb-shot-btn').addEventListener('click', () => msg('captureScreenshot', {}));

  $('sb-textarea').addEventListener('input', e => {
    const val = e.target.value;
    if (val.includes('/')) {
      const slashPart = val.split('/').pop();
      if (slashPart) {
        const match = allGroups.find(g => g.name.toLowerCase().startsWith(slashPart.toLowerCase()));
        if (match) $('sb-group-sel').value = match.name;
      }
    }
  });

  $('sb-dashboard-btn').addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('../dashboard/dashboard.html') });
  });
  $('sb-settings-btn').addEventListener('click', () => chrome.runtime.openOptionsPage());
  $('sb-export-md').addEventListener('click', exportAllMarkdown);
}

async function handleSave() {
  const content = $('sb-textarea').value.trim();
  if (!content) return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  await msg('processCapture', {
    data: { type: 'text', content, url: tab.url, title: tab.title, tabId: tab.id,
            manualGroup: $('sb-group-sel').value || '' }
  });
  $('sb-textarea').value = '';
  setTimeout(loadData, 1500);
}

function renderNotes(notes) {
  const wrap = $('sb-notes');
  $('sb-count').textContent = notes.length + ' note' + (notes.length !== 1 ? 's' : '');
  if (!notes.length) {
    wrap.innerHTML = `<div class="sb-empty"><div class="sb-empty-icon">🌿</div>No notes here yet.</div>`;
    return;
  }
  wrap.innerHTML = notes.map(n => {
    const tags = (n.tags || []).slice(0, 2).map(t => `<span class="sb-note-tag">#${Helpers.escapeHtml(t)}</span>`).join('');
    const isImg = (n.type === 'image' || n.type === 'screenshot') && n.imageUrl;
    return `<div class="sb-note-card">
      <div class="sb-note-top">
        <span class="sb-note-icon">${Helpers.noteTypeIcon(n.type)}</span>
        <span class="sb-note-caption">${Helpers.escapeHtml(Helpers.truncate(n.caption || n.content, 90))}</span>
        <button class="sb-note-delete" data-id="${n.id}">✕</button>
      </div>
      ${isImg ? `<img class="sb-note-img" src="${Helpers.escapeHtml(n.imageUrl)}" alt=""/>` : ''}
      <div class="sb-note-meta">
        ${n.group ? `<span class="sb-note-group">${Helpers.escapeHtml(n.group)}</span>` : ''}
        ${tags}
        <span class="sb-note-time">${Helpers.formatDate(n.createdAt)}</span>
      </div>
    </div>`;
  }).join('');

  wrap.querySelectorAll('[data-id]').forEach(btn => {
    btn.addEventListener('click', async () => {
      await msg('deleteNote', { id: btn.dataset.id });
      loadData();
    });
  });
}

async function exportAllMarkdown() {
  const notes = await msg('getNotes');
  const md = notes.map(n => {
    const tags = (n.tags || []).map(t => '`#' + t + '`').join(' ');
    const date = n.createdAt ? new Date(n.createdAt).toLocaleDateString() : '';
    return `# ${Helpers.getDomain(n.url || '') || 'Note'}\n**Type**: ${n.type} | **Group**: ${n.group || 'None'} | **Saved**: ${date}\n**Tags**: ${tags || 'none'}\n${n.url ? `**Source**: ${n.url}` : ''}\n\n${n.caption ? `> ${n.caption}\n\n` : ''}${n.content || ''}\n\n---\n`;
  }).join('\n');
  const blob = new Blob([md], { type: 'text/markdown' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = 'ai-notes-export.md'; a.click();
  URL.revokeObjectURL(url);
}

function msg(action, extra = {}) {
  return chrome.runtime.sendMessage({ action, ...extra });
}
