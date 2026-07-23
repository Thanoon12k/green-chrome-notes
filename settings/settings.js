/* AI Notes — Settings JS */
const $ = id => document.getElementById(id);

document.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();
  bindEvents();
});

async function loadSettings() {
  const s = await msg('getSettings');
  $('api-key-input').value     = s.groqApiKey || '';
  $('model-select').value      = s.model || 'llama-3.1-8b-instant';
  $('auto-caption').checked    = s.autoCaption !== false;
  $('auto-tag').checked        = s.autoTag !== false;
  $('confirm-tags').checked    = s.confirmTags !== false;
  showKeyStatus(s.groqApiKey);
}

function showKeyStatus(key) {
  const el = $('key-status');
  if (key && key.startsWith('gsk_')) {
    el.textContent = '✅ API key set';
    el.className = 'set-key-status ok';
    el.classList.remove('hidden');
  } else if (key) {
    el.textContent = '⚠️ Key saved but format looks unusual';
    el.className = 'set-key-status err';
    el.classList.remove('hidden');
  } else {
    el.classList.add('hidden');
  }
}

function bindEvents() {
  // Toggle key visibility
  $('toggle-key').addEventListener('click', () => {
    const inp = $('api-key-input');
    inp.type = inp.type === 'password' ? 'text' : 'password';
  });

  // Save settings
  $('save-settings-btn').addEventListener('click', async () => {
    const settings = {
      groqApiKey:   $('api-key-input').value.trim(),
      model:        $('model-select').value,
      autoCaption:  $('auto-caption').checked,
      autoTag:      $('auto-tag').checked,
      confirmTags:  $('confirm-tags').checked
    };
    await msg('saveSettings', { settings });
    showKeyStatus(settings.groqApiKey);
    showSaveStatus('✅ Settings saved!', 'ok');
  });

  // Test API
  $('test-api-btn').addEventListener('click', async () => {
    const key   = $('api-key-input').value.trim();
    const model = $('model-select').value;
    const res   = $('test-result');
    res.textContent = '⏳ Testing…';
    res.className   = 'set-test-result ok';
    res.classList.remove('hidden');
    try {
      const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
        body: JSON.stringify({ model, messages: [{ role: 'user', content: 'Say "OK" only.' }], max_tokens: 5 })
      });
      if (r.ok) {
        res.textContent = '✅ Groq connection successful! Model: ' + model;
        res.className = 'set-test-result ok';
      } else {
        const err = await r.json().catch(() => ({}));
        res.textContent = '❌ Error: ' + (err?.error?.message || r.status);
        res.className = 'set-test-result err';
      }
    } catch (e) {
      res.textContent = '❌ Network error: ' + e.message;
      res.className = 'set-test-result err';
    }
  });

  // Export all
  $('export-all-btn').addEventListener('click', async () => {
    const notes = await msg('getNotes');
    const md = '# AI Notes Export\n\n' + notes.map(n => {
      const tags = (n.tags||[]).map(t=>'`#'+t+'`').join(' ');
      const date = n.createdAt ? new Date(n.createdAt).toLocaleDateString() : '';
      return `## ${(n.caption || Helpers.getDomain(n.url||'') || 'Note')}\n**Type**: ${n.type} | **Group**: ${n.group||'None'} | **Date**: ${date}\n**Tags**: ${tags||'none'}\n${n.url?`**Source**: ${n.url}`:''}\n\n${n.content||''}\n\n---\n`;
    }).join('\n');
    const blob = new Blob([md], { type: 'text/markdown' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'ai-notes-export.md'; a.click();
    URL.revokeObjectURL(url);
  });

  // Clear all
  $('clear-all-btn').addEventListener('click', async () => {
    if (!confirm('Delete ALL notes permanently? This cannot be undone.')) return;
    await chrome.storage.local.remove('ainotes_notes');
    showSaveStatus('🗑 All notes deleted.', 'err');
  });
}

function showSaveStatus(text, type) {
  const el = $('save-status');
  el.textContent = text;
  el.className = 'set-save-status ' + type;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 3000);
}

function msg(action, extra = {}) { return chrome.runtime.sendMessage({ action, ...extra }); }
