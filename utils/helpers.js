/* =========================================================
   AI Notes — Helpers
   ========================================================= */

const Helpers = {
  generateId() {
    return 'note_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
  },

  generateGroupId() {
    return 'grp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
  },

  formatDate(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    const now = new Date();
    const diff = now - d;
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
    if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
    if (diff < 604800000) return Math.floor(diff / 86400000) + 'd ago';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  },

  truncate(text, max = 120) {
    if (!text) return '';
    return text.length > max ? text.slice(0, max) + '…' : text;
  },

  getDomain(url) {
    try { return new URL(url).hostname.replace('www.', ''); }
    catch { return url || ''; }
  },

  getFavicon(url) {
    try {
      const domain = new URL(url).origin;
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
    } catch { return ''; }
  },

  escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
              .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  },

  noteTypeIcon(type) {
    const icons = { text: '📝', image: '🖼️', screenshot: '📸', link: '🔗', snippet: '💻' };
    return icons[type] || '📝';
  },

  colorForString(str) {
    const colors = ['#4A7C59','#8B5A2B','#5C6BC0','#2E7D6B','#7B3F6E','#C0784A','#3D7B8E'];
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  }
};

if (typeof window !== 'undefined') window.Helpers = Helpers;
