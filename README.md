# Inline AI Branches

Inline AI Branches is a Chrome extension prototype for branching conversations inside AI chat pages. Instead of sending every follow-up to the bottom of the main thread, it lets you open a small secondary conversation beside the answer you are reading.

The first target is ChatGPT. The interaction model is intentionally simple: create a branch next to an answer, keep or delete it, and jump back to saved branches from a sticky top bar.

## Why

Long AI conversations become hard to navigate when every clarification, side question, or correction is appended to the end of the page. This project explores an alternate interface:

- Ask follow-up questions beside the answer they refer to
- Keep the main conversation readable
- Preserve useful side branches
- Delete temporary branches when they are no longer useful
- Jump between branches from a compact branch index

## Features

- Adds a "旁边提问" button beside detected AI answers
- Opens an inline secondary conversation panel
- Shows saved branches in a sticky top bar
- Supports keep, temporary, close, and delete actions
- Stores branch data locally in the current page's `localStorage`
- Runs without a build step

## Install Locally

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select this project folder
5. Open or refresh ChatGPT

Supported pages:

- `https://chatgpt.com/*`
- `https://chat.openai.com/*`

## Development

This prototype has no package dependencies. You can validate the extension files with:

```bash
npm test
```

Or directly:

```bash
node scripts/validate.js
```

## Project Structure

```text
.
├── content.css        # Injected UI styles
├── content.js         # Content script and branch logic
├── manifest.json      # Chrome extension manifest
├── scripts/
│   └── validate.js    # Lightweight project validation
└── README.md
```

## Roadmap

- Connect branch replies to the OpenAI Responses API
- Add an options page for API keys, model selection, and defaults
- Replace `localStorage` with `chrome.storage.local`
- Add branch title editing, export, and search
- Improve answer anchoring when the source page changes
- Add adapters for other AI chat products

## Current Limitations

- Branch AI replies are placeholders, not real model responses yet.
- ChatGPT's DOM can change; this MVP uses broad selectors.
- Local storage is suitable for prototyping, not long-term sync.
- The extension cannot modify the Codex desktop chat UI directly.

## Privacy

The current prototype does not send data to any server. Branches are stored locally in the page's `localStorage`. If model integration is added later, the project should make outbound data flow explicit and configurable.

## License

MIT
