/* =========================================================
   AI Notes — Storage Utility
   Works in: popup, sidebar, dashboard, settings, service-worker
   ========================================================= */

const KEYS = {
  NOTES: 'ainotes_notes',
  GROUPS: 'ainotes_groups',
  SETTINGS: 'ainotes_settings'
};

const DEFAULT_GROUPS = [
  { id: 'grp_research',  name: 'Research',      color: '#4A7C59', emoji: '🔬', subgroups: [], order: 0 },
  { id: 'grp_ideas',     name: 'Ideas',         color: '#8B5A2B', emoji: '💡', subgroups: [], order: 1 },
  { id: 'grp_links',     name: 'Links',         color: '#5C6BC0', emoji: '🔗', subgroups: [], order: 2 },
  { id: 'grp_snippets',  name: 'Code Snippets', color: '#2E7D6B', emoji: '💻', subgroups: [], order: 3 },
  { id: 'grp_images',    name: 'Images',        color: '#7B3F6E', emoji: '🖼️', subgroups: [], order: 4 }
];

const DEFAULT_SETTINGS = {
  groqApiKey: '',
  model: 'llama-3.1-8b-instant',
  autoCaption: true,
  autoTag: true,
  confirmTags: true
};

const Storage = {
  /* ---- NOTES ---- */
  async getNotes() {
    const d = await chrome.storage.local.get(KEYS.NOTES);
    return d[KEYS.NOTES] || [];
  },

  async saveNote(note) {
    const notes = await this.getNotes();
    notes.unshift(note);
    await chrome.storage.local.set({ [KEYS.NOTES]: notes });
    return note;
  },

  async updateNote(id, updates) {
    const notes = await this.getNotes();
    const i = notes.findIndex(n => n.id === id);
    if (i !== -1) {
      notes[i] = { ...notes[i], ...updates, updatedAt: Date.now() };
      await chrome.storage.local.set({ [KEYS.NOTES]: notes });
      return notes[i];
    }
    return null;
  },

  async deleteNote(id) {
    const notes = await this.getNotes();
    await chrome.storage.local.set({ [KEYS.NOTES]: notes.filter(n => n.id !== id) });
  },

  async searchNotes(query) {
    const notes = await this.getNotes();
    const q = query.toLowerCase();
    return notes.filter(n => {
      return [n.content || '', n.caption || '', n.pageTitle || '',
              n.url || '', ...(n.tags || []), n.group || '']
        .join(' ').toLowerCase().includes(q);
    });
  },

  async getNotesByGroup(groupName) {
    const notes = await this.getNotes();
    return groupName ? notes.filter(n => n.group === groupName) : notes;
  },

  async getAllTags() {
    const notes = await this.getNotes();
    const set = new Set();
    notes.forEach(n => (n.tags || []).forEach(t => set.add(t)));
    return Array.from(set);
  },

  /* ---- GROUPS ---- */
  async getGroups() {
    const d = await chrome.storage.local.get(KEYS.GROUPS);
    const groups = d[KEYS.GROUPS];
    if (!groups || groups.length === 0) {
      await chrome.storage.local.set({ [KEYS.GROUPS]: DEFAULT_GROUPS });
      return DEFAULT_GROUPS;
    }
    return groups;
  },

  async saveGroup(group) {
    const groups = await this.getGroups();
    groups.push(group);
    await chrome.storage.local.set({ [KEYS.GROUPS]: groups });
    return group;
  },

  async updateGroup(id, updates) {
    const groups = await this.getGroups();
    const i = groups.findIndex(g => g.id === id);
    if (i !== -1) {
      groups[i] = { ...groups[i], ...updates };
      await chrome.storage.local.set({ [KEYS.GROUPS]: groups });
      return groups[i];
    }
    return null;
  },

  async deleteGroup(id) {
    const groups = await this.getGroups();
    await chrome.storage.local.set({ [KEYS.GROUPS]: groups.filter(g => g.id !== id) });
  },

  /* ---- SETTINGS ---- */
  async getSettings() {
    const d = await chrome.storage.local.get(KEYS.SETTINGS);
    return { ...DEFAULT_SETTINGS, ...(d[KEYS.SETTINGS] || {}) };
  },

  async saveSettings(settings) {
    const current = await this.getSettings();
    const updated = { ...current, ...settings };
    await chrome.storage.local.set({ [KEYS.SETTINGS]: updated });
    return updated;
  }
};

if (typeof window !== 'undefined') window.Storage = Storage;
