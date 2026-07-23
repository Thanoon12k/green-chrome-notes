/* =========================================================
   AI Notes — Background Service Worker
   ========================================================= */

importScripts('../utils/storage.js', '../utils/groq.js', '../utils/helpers.js');

/* ---------- Context Menus ---------- */
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({ id: 'save_selection', title: '💾 Save to AI Notes', contexts: ['selection'] });
    chrome.contextMenus.create({ id: 'save_image',     title: '🖼️ Save Image to AI Notes', contexts: ['image'] });
    chrome.contextMenus.create({ id: 'save_link',      title: '🔗 Save Link to AI Notes', contexts: ['link'] });
    chrome.contextMenus.create({ id: 'save_page',      title: '📄 Save This Page to AI Notes', contexts: ['page'] });
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const tabInfo = { url: tab.url, title: tab.title, tabId: tab.id };
  if (info.menuItemId === 'save_selection') {
    await processCapture({ type: 'text', content: info.selectionText, ...tabInfo });
  } else if (info.menuItemId === 'save_image') {
    await processCapture({ type: 'image', content: info.srcUrl, imageUrl: info.srcUrl, ...tabInfo });
  } else if (info.menuItemId === 'save_link') {
    await processCapture({ type: 'link', content: info.linkUrl, linkUrl: info.linkUrl, ...tabInfo });
  } else if (info.menuItemId === 'save_page') {
    await processCapture({ type: 'link', content: tab.title, linkUrl: tab.url, ...tabInfo });
  }
});

/* ---------- Message Router ---------- */
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  handleMessage(msg, sender).then(sendResponse).catch(err => sendResponse({ error: err.message }));
  return true; // keep channel open
});

async function handleMessage(msg, sender) {
  switch (msg.action) {
    case 'captureScreenshot':    return captureScreenshot(msg.tabId);
    case 'processCapture':       return processCapture(msg.data);
    case 'confirmAndSaveNote':   return confirmAndSaveNote(msg.noteData);
    case 'saveNote':             return Storage.saveNote(msg.note);
    case 'getNotes':             return Storage.getNotes();
    case 'updateNote':           return Storage.updateNote(msg.id, msg.updates);
    case 'deleteNote':           return Storage.deleteNote(msg.id);
    case 'searchNotes':          return Storage.searchNotes(msg.query);
    case 'getNotesByGroup':      return Storage.getNotesByGroup(msg.group);
    case 'getAllTags':            return Storage.getAllTags();
    case 'getGroups':            return Storage.getGroups();
    case 'saveGroup':            return Storage.saveGroup(msg.group);
    case 'updateGroup':          return Storage.updateGroup(msg.id, msg.updates);
    case 'deleteGroup':          return Storage.deleteGroup(msg.id);
    case 'getSettings':          return Storage.getSettings();
    case 'saveSettings':         return Storage.saveSettings(msg.settings);
    case 'openSidePanel':        return openSidePanel(msg.tabId);
    default: throw new Error('Unknown action: ' + msg.action);
  }
}

/* ---------- Core Capture Flow ---------- */
async function processCapture({ type, content, imageUrl, linkUrl, url, title, tabId }) {
  console.log('[AI Notes SW] processCapture called:', { type, url, title, tabId });
  const settings = await Storage.getSettings();
  const groups   = await Storage.getGroups();
  console.log('[AI Notes SW] API key set?', !!settings.groqApiKey, '| confirmTags:', settings.confirmTags);

  const noteId = 'note_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  const draft = {
    id: noteId, type, content: content || '',
    imageUrl: imageUrl || null, linkUrl: linkUrl || null,
    url, pageTitle: title,
    caption: '', tags: [], group: groups[0]?.name || 'Research',
    subgroup: '', label: '', createdAt: Date.now(), updatedAt: Date.now()
  };

  // --- Step 1: AI analysis ---
  let aiResult = { caption: '', tags: [], group: draft.group };
  if (settings.autoCaption || settings.autoTag) {
    try {
      console.log('[AI Notes SW] Calling Groq API...');
      aiResult = await GroqAPI.analyzeNote({
        content: content || linkUrl || imageUrl || url,
        url, pageTitle: title, type,
        apiKey: settings.groqApiKey,
        model: settings.model,
        existingGroups: groups
      });
      console.log('[AI Notes SW] Groq result:', aiResult);
    } catch (err) {
      console.warn('[AI Notes SW] Groq failed (continuing without AI):', err.message);
    }
  }

  draft.caption = aiResult.caption || '';
  draft.tags    = aiResult.tags   || [];
  draft.group   = aiResult.group  || draft.group;

  // --- Step 2: ALWAYS save immediately — note is never lost ---
  await Storage.saveNote(draft);
  console.log('[AI Notes SW] Note saved to storage:', draft.id);
  showNotification('✅ Note saved!', draft.caption || 'Saved from ' + (title || url));

  // --- Step 3: Show overlay to allow optional tag editing ---
  if (settings.confirmTags && tabId) {
    try {
      await chrome.scripting.executeScript({ target: { tabId }, files: ['content/content.js'] });
    } catch (e) {
      console.warn('[AI Notes SW] executeScript skipped:', e.message);
    }
    try {
      await chrome.tabs.sendMessage(tabId, { action: 'showTagEdit', draft });
      console.log('[AI Notes SW] Tag-edit overlay sent OK');
    } catch (err) {
      console.warn('[AI Notes SW] Could not show tag overlay (note already saved):', err.message);
    }
  }

  return { success: true };
}

async function confirmAndSaveNote(noteData) {
  await Storage.saveNote(noteData);
  showNotification('✅ Note saved!', noteData.caption || 'Note added to ' + noteData.group);
  return { success: true };
}

/* ---------- Screenshot ---------- */
async function captureScreenshot(tabId) {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const targetTab = tabId ? { id: tabId } : tab;
    const dataUrl = await chrome.tabs.captureVisibleTab(targetTab.windowId || chrome.windows.WINDOW_ID_CURRENT, { format: 'png' });
    return await processCapture({
      type: 'screenshot',
      content: targetTab.title || 'Screenshot',
      imageUrl: dataUrl,
      url: targetTab.url,
      title: targetTab.title,
      tabId: targetTab.id
    });
  } catch (err) {
    throw new Error('Screenshot failed: ' + err.message);
  }
}

/* ---------- Side Panel ---------- */
async function openSidePanel(tabId) {
  try {
    if (tabId) {
      await chrome.sidePanel.open({ tabId });
    }
    return { success: true };
  } catch (err) {
    return { error: err.message };
  }
}

/* ---------- Notifications ---------- */
function showNotification(title, message) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: chrome.runtime.getURL('icons/icon48.png'),
    title,
    message: (message || '').slice(0, 100)
  });
}
