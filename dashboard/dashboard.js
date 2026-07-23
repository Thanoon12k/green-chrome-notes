/* AI Notes — Dashboard (Trello Board) JS */
const $ = id => document.getElementById(id);
let allNotes = [], allGroups = [];
let dragNote = null, dragSourceGroup = null;
let selectedColor = '#4A7C59';
let openedNote = null;

const GROUP_COLORS = ['#4A7C59','#8B5A2B','#5C6BC0','#2E7D6B','#7B3F6E','#C0784A','#3D7B8E','#7B6E1E','#8E3D3D','#3D608E'];

document.addEventListener('DOMContentLoaded', async () => {
  await loadAll();
  bindEvents();
});

async function loadAll(filter) {
  [allNotes, allGroups] = await Promise.all([msg('getNotes'), msg('getGroups')]);
  const notes = filter ? allNotes.filter(n =>
    [n.content, n.caption, n.pageTitle, n.url, ...(n.tags||[]), n.group].join(' ').toLowerCase().includes(filter.toLowerCase())
  ) : allNotes;
  renderStats(notes);
  renderBoard(notes, allGroups);
}

function renderStats(notes) {
  const groups = [...new Set(notes.map(n => n.group).filter(Boolean))];
  const tags   = [...new Set(notes.flatMap(n => n.tags || []))];
  $('dash-stats').innerHTML = `
    <div class="stat-chip">📝 <strong>${notes.length}</strong> notes</div>
    <div class="stat-chip">📂 <strong>${allGroups.length}</strong> groups</div>
    <div class="stat-chip">🏷️ <strong>${tags.length}</strong> tags</div>
    ${notes.filter(n=>n.type==='image'||n.type==='screenshot').length ? `<div class="stat-chip">🖼️ <strong>${notes.filter(n=>n.type==='image'||n.type==='screenshot').length}</strong> images</div>` : ''}
  `;
}

function renderBoard(notes, groups) {
  const board = $('dash-board');
  $('dash-loading')?.remove();

  const groupMap = {};
  groups.forEach(g => { groupMap[g.name] = []; });
  // Uncategorized bucket
  notes.forEach(n => {
    const grp = n.group || 'Uncategorized';
    if (!groupMap[grp]) groupMap[grp] = [];
    groupMap[grp].push(n);
  });

  board.innerHTML = '';
  groups.forEach(g => {
    const colNotes = groupMap[g.name] || [];
    board.appendChild(buildColumn(g, colNotes));
  });

  // Uncategorized column if needed
  if (groupMap['Uncategorized']?.length) {
    board.appendChild(buildColumn({ id: 'grp_unc', name: 'Uncategorized', color: '#555', emoji: '📌' }, groupMap['Uncategorized']));
  }

  // "+ Add Group" column stub
  const addCol = document.createElement('div');
  addCol.className = 'board-col';
  addCol.style.cssText = 'min-width:80px;width:80px;justify-content:center;align-items:center;cursor:pointer;opacity:0.5;border-style:dashed;';
  addCol.innerHTML = '<div style="font-size:28px;color:#7A6E55;">＋</div>';
  addCol.addEventListener('click', () => openGroupModal());
  board.appendChild(addCol);
}

function buildColumn(group, notes) {
  const col = document.createElement('div');
  col.className = 'board-col';
  col.dataset.group = group.name;

  col.innerHTML = `
    <div class="col-header">
      <span class="col-color-dot" style="background:${group.color}"></span>
      <span class="col-emoji">${group.emoji || '📂'}</span>
      <span class="col-name">${Helpers.escapeHtml(group.name)}</span>
      <span class="col-count">${notes.length}</span>
      ${group.id !== 'grp_unc' ? `<button class="col-menu-btn" data-del-group="${group.id}" title="Delete group">⋯</button>` : ''}
    </div>
    <div class="col-cards" data-group="${group.name}"></div>
    <div class="col-add-card" data-group="${group.name}">＋ Add note</div>
  `;

  const cardsEl = col.querySelector('.col-cards');
  notes.forEach(n => cardsEl.appendChild(buildCard(n)));

  // Drag & drop on column
  col.addEventListener('dragover', e => { e.preventDefault(); col.classList.add('drag-over'); });
  col.addEventListener('dragleave', () => col.classList.remove('drag-over'));
  col.addEventListener('drop', async e => {
    e.preventDefault();
    col.classList.remove('drag-over');
    if (dragNote && dragNote.group !== group.name) {
      await msg('updateNote', { id: dragNote.id, updates: { group: group.name } });
      loadAll();
    }
  });

  col.querySelector('.col-add-card').addEventListener('click', () => {
    const text = prompt(`Add a quick note to "${group.name}":`);
    if (text) quickAddNote(text, group.name);
  });

  if (col.querySelector('[data-del-group]')) {
    col.querySelector('[data-del-group]').addEventListener('click', async () => {
      if (confirm(`Delete group "${group.name}"? Notes won't be deleted.`)) {
        await msg('deleteGroup', { id: group.id });
        loadAll();
      }
    });
  }

  return col;
}

function buildCard(note) {
  const card = document.createElement('div');
  card.className = 'board-card';
  card.draggable = true;
  card.dataset.id = note.id;
  const isImg = (note.type === 'image' || note.type === 'screenshot') && note.imageUrl;
  const tags  = (note.tags || []).slice(0, 3).map(t => `<span class="card-tag">#${Helpers.escapeHtml(t)}</span>`).join('');
  card.innerHTML = `
    ${isImg ? `<img class="card-img" src="${Helpers.escapeHtml(note.imageUrl)}" alt=""/>` : ''}
    <div class="card-type-row">
      <span class="card-type-icon">${Helpers.noteTypeIcon(note.type)}</span>
      <span class="card-caption">${Helpers.escapeHtml(Helpers.truncate(note.caption || note.content, 80))}</span>
    </div>
    ${tags ? `<div class="card-tags">${tags}</div>` : ''}
    <div class="card-footer">
      <span class="card-domain">${Helpers.escapeHtml(Helpers.getDomain(note.url || ''))}</span>
      <span class="card-time">${Helpers.formatDate(note.createdAt)}</span>
      <div class="card-actions">
        <button class="card-action-btn md" data-md="${note.id}" title="Export MD">⬇MD</button>
        <button class="card-action-btn"    data-del="${note.id}" title="Delete">✕</button>
      </div>
    </div>
  `;

  // Click to open detail
  card.addEventListener('click', e => {
    if (e.target.closest('[data-del]') || e.target.closest('[data-md]')) return;
    openNoteModal(note);
  });

  card.querySelector('[data-del]')?.addEventListener('click', async e => {
    e.stopPropagation();
    if (confirm('Delete this note?')) { await msg('deleteNote', { id: note.id }); loadAll(); }
  });
  card.querySelector('[data-md]')?.addEventListener('click', e => {
    e.stopPropagation();
    downloadNoteMarkdown(note);
  });

  // Drag
  card.addEventListener('dragstart', () => { dragNote = note; card.classList.add('dragging'); });
  card.addEventListener('dragend',   () => { dragNote = null; card.classList.remove('dragging'); });

  return card;
}

function bindEvents() {
  $('dash-search').addEventListener('input', e => {
    const q = e.target.value.trim();
    $('dash-clear-search').classList.toggle('hidden', !q);
    loadAll(q || undefined);
  });
  $('dash-clear-search').addEventListener('click', () => {
    $('dash-search').value = '';
    $('dash-clear-search').classList.add('hidden');
    loadAll();
  });
  $('dash-add-group').addEventListener('click', openGroupModal);
  $('dash-settings').addEventListener('click',  () => chrome.runtime.openOptionsPage());
  $('dash-export-md').addEventListener('click', exportAll);
  $('modal-close').addEventListener('click',     closeGroupModal);
  $('modal-save').addEventListener('click',      saveGroup);
  $('note-modal-close').addEventListener('click',() => $('note-modal').classList.add('hidden'));
  $('note-modal-md').addEventListener('click',   () => openedNote && downloadNoteMarkdown(openedNote));
  buildColorPicker();
}

function buildColorPicker() {
  const wrap = $('modal-colors');
  GROUP_COLORS.forEach(c => {
    const dot = document.createElement('div');
    dot.className = 'color-dot' + (c === selectedColor ? ' selected' : '');
    dot.style.background = c;
    dot.addEventListener('click', () => {
      selectedColor = c;
      wrap.querySelectorAll('.color-dot').forEach(d => d.classList.remove('selected'));
      dot.classList.add('selected');
    });
    wrap.appendChild(dot);
  });
}

function openGroupModal() { $('group-modal').classList.remove('hidden'); $('modal-group-name').focus(); }
function closeGroupModal() { $('group-modal').classList.add('hidden'); }

async function saveGroup() {
  const name = $('modal-group-name').value.trim();
  const emoji = $('modal-group-emoji').value.trim() || '📂';
  if (!name) { $('modal-group-name').focus(); return; }
  await msg('saveGroup', { group: { id: Helpers.generateGroupId(), name, emoji, color: selectedColor, subgroups: [], order: allGroups.length } });
  closeGroupModal();
  $('modal-group-name').value = '';
  $('modal-group-emoji').value = '';
  loadAll();
}

async function quickAddNote(content, group) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  await msg('processCapture', { data: { type: 'text', content, url: tab?.url, title: tab?.title, tabId: tab?.id, manualGroup: group } });
  setTimeout(loadAll, 1500);
}

function openNoteModal(note) {
  openedNote = note;
  $('note-modal-title').textContent = Helpers.noteTypeIcon(note.type) + ' ' + (note.group || 'Note');
  const isImg = (note.type === 'image' || note.type === 'screenshot') && note.imageUrl;
  const tags  = (note.tags || []).map(t => `<span class="note-modal-tag">#${Helpers.escapeHtml(t)}</span>`).join('');
  const date  = note.createdAt ? new Date(note.createdAt).toLocaleString() : '';
  $('note-modal-body').innerHTML = `
    ${note.caption ? `<div class="note-modal-caption">${Helpers.escapeHtml(note.caption)}</div>` : ''}
    <div class="note-modal-meta-row">
      <span>📂 ${Helpers.escapeHtml(note.group || 'None')}</span>
      <span>${Helpers.noteTypeIcon(note.type)} ${note.type}</span>
      <span>🕐 ${date}</span>
    </div>
    ${isImg ? `<img class="note-modal-img" src="${Helpers.escapeHtml(note.imageUrl)}" alt=""/>` : ''}
    ${note.content ? `<div class="note-modal-section"><div class="note-modal-label">Content</div><div class="note-modal-text">${Helpers.escapeHtml(note.content)}</div></div>` : ''}
    ${note.url ? `<div class="note-modal-section"><div class="note-modal-label">Source</div><a class="note-modal-link" href="${Helpers.escapeHtml(note.url)}" target="_blank">${Helpers.escapeHtml(note.url)}</a></div>` : ''}
    ${tags ? `<div class="note-modal-section"><div class="note-modal-label">Tags</div><div class="note-modal-tags">${tags}</div></div>` : ''}
  `;
  $('note-modal').classList.remove('hidden');
}

function downloadNoteMarkdown(n) {
  const tags = (n.tags || []).map(t => '`#' + t + '`').join(' ');
  const date = n.createdAt ? new Date(n.createdAt).toLocaleDateString() : '';
  const md   = `# Note from ${Helpers.getDomain(n.url||'')||'web'}\n\n**Type**: ${n.type} | **Group**: ${n.group||'None'} | **Saved**: ${date}\n**Tags**: ${tags||'none'}\n${n.url?`**Source**: ${n.url}`:''}  \n\n${n.caption?`> ${n.caption}\n\n`:''}---\n\n${n.content||''}`;
  const blob = new Blob([md], { type: 'text/markdown' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `note_${n.id.slice(0,10)}.md`; a.click();
  URL.revokeObjectURL(url);
}

async function exportAll() {
  const notes = await msg('getNotes');
  const md = '# AI Notes Export\n\n' + notes.map(n => {
    const tags = (n.tags||[]).map(t=>'`#'+t+'`').join(' ');
    const date = n.createdAt ? new Date(n.createdAt).toLocaleDateString() : '';
    return `## ${Helpers.escapeHtml(Helpers.getDomain(n.url||'')||'Note')}\n**Type**: ${n.type} | **Group**: ${n.group||'None'} | **Saved**: ${date}\n**Tags**: ${tags||'none'}\n${n.url?`**Source**: ${n.url}`:''}\n\n${n.caption?`> ${n.caption}\n\n`:''}${n.content||''}\n\n---\n`;
  }).join('\n');
  const blob = new Blob([md], { type: 'text/markdown' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = 'ai-notes-full-export.md'; a.click();
  URL.revokeObjectURL(url);
}

function msg(action, extra = {}) { return chrome.runtime.sendMessage({ action, ...extra }); }
