/* =========================================================
   AI Notes — Content Script
   Injects the tag-confirmation overlay into active pages
   ========================================================= */

(function () {
  if (window.__aiNotesInjected) return;
  window.__aiNotesInjected = true;

  let overlayEl = null;
  let pendingDraft = null;

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    console.log('[AI Notes] content.js received message:', msg.action);
    if (msg.action === 'showTagConfirm') {
      console.log('[AI Notes] Showing tag confirm overlay for draft:', msg.draft?.id);
      showTagConfirmOverlay(msg.draft);
      sendResponse({ ok: true });
    }
  });

  function showTagConfirmOverlay(draft) {
    pendingDraft = draft;
    removeOverlay();

    const overlay = document.createElement('div');
    overlay.id = '__ainotes_overlay';
    overlay.innerHTML = buildOverlayHTML(draft);
    document.body.appendChild(overlay);
    overlayEl = overlay;

    // Animate in
    requestAnimationFrame(() => overlay.classList.add('__ainotes_visible'));

    // Wire events
    overlay.querySelector('#__ainotes_accept').addEventListener('click', () => acceptNote());
    overlay.querySelector('#__ainotes_discard').addEventListener('click', () => removeOverlay());

    // Tag chips toggle
    overlay.querySelectorAll('.__ainotes_tag_chip').forEach(chip => {
      chip.addEventListener('click', () => chip.classList.toggle('__ainotes_tag_off'));
    });

    // Add custom tag
    overlay.querySelector('#__ainotes_tag_input')?.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault();
        addCustomTag(e.target.value.trim().replace(/,/g, ''));
        e.target.value = '';
      }
    });

    // Group select
    overlay.querySelector('#__ainotes_group_sel')?.addEventListener('change', e => {
      pendingDraft.group = e.target.value;
    });

    // Auto-remove after 30s
    setTimeout(() => removeOverlay(), 30000);
  }

  function buildOverlayHTML(draft) {
    const tagChips = (draft.tags || []).map(t =>
      `<span class="__ainotes_tag_chip" data-tag="${escHtml(t)}">#${escHtml(t)}</span>`
    ).join('');

    const typeIcon = { text:'📝', image:'🖼️', screenshot:'📸', link:'🔗', snippet:'💻' }[draft.type] || '📝';
    const domain = getDomain(draft.url);

    return `
<div class="__ainotes_panel">
  <div class="__ainotes_header">
    <span class="__ainotes_logo">🌿 AI Notes</span>
    <button class="__ainotes_close" id="__ainotes_discard">✕</button>
  </div>

  <div class="__ainotes_type_badge">${typeIcon} ${draft.type || 'note'}</div>
  <div class="__ainotes_source">🔗 ${escHtml(domain)}</div>

  ${draft.caption ? `<div class="__ainotes_caption">"${escHtml(draft.caption)}"</div>` : ''}

  ${draft.type === 'image' || draft.type === 'screenshot' ? `
    <div class="__ainotes_thumb_wrap">
      <img class="__ainotes_thumb" src="${escHtml(draft.imageUrl || '')}" alt="preview"/>
    </div>` : `
    <div class="__ainotes_preview">${escHtml((draft.content || '').slice(0, 180))}${draft.content?.length > 180 ? '…' : ''}</div>
  `}

  <div class="__ainotes_section_label">🏷️ AI Suggested Tags — click to toggle</div>
  <div class="__ainotes_tags" id="__ainotes_tags_wrap">${tagChips}</div>

  <div class="__ainotes_add_tag_row">
    <input id="__ainotes_tag_input" class="__ainotes_tag_input" placeholder="+ add tag, press Enter" maxlength="32"/>
  </div>

  <div class="__ainotes_section_label">📂 Group</div>
  <div id="__ainotes_group_display" class="__ainotes_group_badge">${escHtml(draft.group || 'Research')}</div>

  <div class="__ainotes_actions">
    <button id="__ainotes_discard2" class="__ainotes_btn __ainotes_btn_ghost">Discard</button>
    <button id="__ainotes_accept"   class="__ainotes_btn __ainotes_btn_primary">✅ Save Note</button>
  </div>
</div>`;
  }

  // Save directly to chrome.storage.local — avoids the sleeping MV3 service worker bug
  async function acceptNote() {
    console.log('[AI Notes] acceptNote() called. pendingDraft:', pendingDraft);
    if (!pendingDraft) {
      console.warn('[AI Notes] acceptNote: pendingDraft is null — nothing to save!');
      return;
    }

    const activeTags = [];
    overlayEl?.querySelectorAll('.__ainotes_tag_chip:not(.__ainotes_tag_off)').forEach(c => {
      activeTags.push(c.dataset.tag);
    });
    console.log('[AI Notes] Active tags collected:', activeTags);

    const finalNote = { ...pendingDraft, tags: activeTags, updatedAt: Date.now() };
    console.log('[AI Notes] Final note to save:', finalNote);

    try {
      console.log('[AI Notes] Reading chrome.storage.local...');
      const result = await chrome.storage.local.get('ainotes_notes');
      console.log('[AI Notes] Current notes in storage:', (result['ainotes_notes'] || []).length);

      const notes = result['ainotes_notes'] || [];
      notes.unshift(finalNote);

      console.log('[AI Notes] Writing to storage, total notes will be:', notes.length);
      await chrome.storage.local.set({ 'ainotes_notes': notes });

      console.log('[AI Notes] ✅ Save successful!');
      removeOverlay();
      showSavedToast();
    } catch (err) {
      console.error('[AI Notes] ❌ Save FAILED:', err.message, err);
      showErrorToast('Save failed: ' + err.message);
    }
  }

  function addCustomTag(tag) {
    if (!tag) return;
    const wrap = overlayEl?.querySelector('#__ainotes_tags_wrap');
    if (!wrap) return;
    const chip = document.createElement('span');
    chip.className = '__ainotes_tag_chip __ainotes_custom';
    chip.dataset.tag = tag;
    chip.textContent = '#' + tag;
    chip.addEventListener('click', () => chip.classList.toggle('__ainotes_tag_off'));
    wrap.appendChild(chip);
    if (pendingDraft) pendingDraft.tags.push(tag);
  }

  function showSavedToast() {
    const toast = document.createElement('div');
    toast.id = '__ainotes_toast';
    toast.textContent = '✅ Note saved to AI Notes!';
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('__ainotes_toast_show'));
    setTimeout(() => { toast.classList.remove('__ainotes_toast_show'); setTimeout(() => toast.remove(), 400); }, 2500);
  }

  function showErrorToast(msg) {
    const toast = document.createElement('div');
    toast.id = '__ainotes_toast';
    toast.style.cssText = 'background:rgba(180,40,40,0.95)!important;border-color:#ff6b6b!important;color:#fff!important;';
    toast.textContent = '❌ ' + msg;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('__ainotes_toast_show'));
    setTimeout(() => { toast.classList.remove('__ainotes_toast_show'); setTimeout(() => toast.remove(), 400); }, 4000);
  }

  function removeOverlay() {
    const el = document.getElementById('__ainotes_overlay');
    if (el) { el.classList.remove('__ainotes_visible'); setTimeout(() => el.remove(), 300); }
    overlayEl = null;
    pendingDraft = null;
  }

  function escHtml(s) {
    if (!s) return '';
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function getDomain(url) {
    try { return new URL(url).hostname.replace('www.', ''); } catch { return url || ''; }
  }

  // Also wire discard2 after render
  document.addEventListener('click', e => {
    if (e.target.id === '__ainotes_discard2') removeOverlay();
  });
})();
