# 🌿 AI Notes — Smart Tab Capture

> A premium Chrome extension powered by Groq AI to capture, organize, and tag notes from any browser tab.

![Version](https://img.shields.io/badge/version-1.0.0-C8A96E?style=flat-square)
![MV3](https://img.shields.io/badge/Chrome-Manifest%20V3-4A7C59?style=flat-square)
![Groq](https://img.shields.io/badge/AI-Groq%20llama3-8B5A2B?style=flat-square)

---

## ✨ Features

| Feature | Description |
|---|---|
| 📝 **Text Capture** | Select any text → right-click → Save to AI Notes |
| 🖼️ **Image Saving** | Right-click any image → Save to AI Notes |
| 📸 **Screenshots** | Capture the visible page area instantly |
| 🔗 **Link Saving** | Save URLs with AI-generated descriptions |
| 🏷️ **AI Auto-Tagging** | Groq AI suggests tags — you confirm, edit, or add your own |
| 📂 **Smart Grouping** | AI groups notes by topic (Research, Ideas, Links, etc.) |
| 🗂️ **Trello-like Board** | Drag & drop notes across groups in the dashboard |
| 🔍 **Full-text Search** | Instant search across all notes, captions, and tags |
| 📤 **Markdown Export** | Export any note or all notes as `.md` files |
| 🌿 **Dark Earthy UI** | Premium forest-green / warm-brown aesthetic |

---

## 🚀 Getting Started

### 1. Load the Extension in Chrome

1. Clone this repo:
   ```bash
   git clone https://github.com/Thanoon12k/green-chrome-notes.git
   cd green-chrome-notes
   ```

2. Open Chrome and go to `chrome://extensions/`
3. Enable **Developer Mode** (top-right toggle)
4. Click **"Load unpacked"** → select this folder
5. The 🌿 AI Notes icon appears in your toolbar

### 2. Configure Your Groq API Key

1. Click the extension icon → **⚙️ Settings**
2. Paste your Groq API key (get one free at [console.groq.com/keys](https://console.groq.com/keys))
3. Click **Save Settings**

---

## 📖 How to Use

### Capturing Notes

| Method | How |
|---|---|
| **Text** | Select text on any page → right-click → *💾 Save to AI Notes* |
| **Image** | Right-click any image → *🖼️ Save Image to AI Notes* |
| **Link** | Right-click any link → *🔗 Save Link to AI Notes* |
| **Screenshot** | Click extension icon → *📸 Screenshot* button |
| **Manual** | Click extension icon → type in the capture form |

### After Capture

A confirmation overlay appears showing:
- ✅ AI-generated **caption**
- 🏷️ **Suggested tags** (click to toggle on/off, type to add custom)
- 📂 **Suggested group**

Click **Save Note** to confirm or **Discard** to cancel.

### Dashboard (Trello Board)

- Click the **🗂️ Board** button in the popup or sidebar
- Notes appear as cards in group columns
- Drag & drop cards between groups
- Click **+** to add new groups or subgroups
- Use `/` prefix when typing to quickly assign groups (e.g. `/Research`)

### Search

- Use the search bar in the popup or sidebar
- Searches through content, captions, tags, URLs, and group names

### Export as Markdown

- In the dashboard or sidebar, click the **⬇️ MD** button on any note card
- Or use **Export All → Markdown** to download all notes as a `.md` file

---

## 📁 Project Structure

```
chrome_extension_ai_notes/
├── manifest.json              # Chrome MV3 manifest
├── background/
│   └── service-worker.js      # Core logic, Groq calls, context menus
├── content/
│   ├── content.js             # Tag-confirmation overlay injected into pages
│   └── content.css            # Overlay styles
├── popup/
│   ├── popup.html             # Quick-capture popup
│   ├── popup.js
│   └── popup.css
├── sidebar/
│   ├── sidebar.html           # Chrome Side Panel notes browser
│   ├── sidebar.js
│   └── sidebar.css
├── dashboard/
│   ├── dashboard.html         # Trello-like board view
│   ├── dashboard.js
│   └── dashboard.css
├── settings/
│   ├── settings.html          # API key & preferences
│   ├── settings.js
│   └── settings.css
├── utils/
│   ├── storage.js             # Chrome storage abstraction
│   ├── groq.js                # Groq API wrapper
│   └── helpers.js             # Shared utilities
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

---

## 🛠️ Tech Stack

- **Chrome Extension** — Manifest V3
- **AI** — [Groq API](https://console.groq.com) with `llama-3.1-8b-instant`
- **Storage** — `chrome.storage.local`
- **UI** — Vanilla HTML/CSS/JS with Inter font
- **Design** — Dark earthy theme (forest green + warm brown + gold)

---

## 🔑 Groq API

Get your free API key at [console.groq.com/keys](https://console.groq.com/keys).

The extension uses:
- **Model**: `llama-3.1-8b-instant` (fast, free-tier friendly)
- **Features**: Caption generation, tag suggestion, topic grouping

---

## 📤 Markdown Export Format

Exported notes look like this:

```markdown
# Note from example.com

**Type**: text  
**Source**: https://example.com/article  
**Saved**: 2026-07-23  
**Group**: Research  
**Tags**: `#ai` `#notes` `#web`

> AI Caption: A detailed explanation of how neural networks learn patterns.

---

Selected text content appears here...
```

---

## 📜 License

MIT — free to use and modify.

---

*Built with 🌿 and AI by Thanoon*
