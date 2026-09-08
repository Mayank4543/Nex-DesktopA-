# Nexa — Production-Quality Desktop AI Assistant

Nexa is a floating, transparent, dark-themed AI assistant for desktop productivity and learning. Powered by OpenAI and Tesseract OCR, it allows you to easily ask questions, analyze screen context, simplify concepts, generate follow-ups, and listen to responses.

![Nexa Screenshot Placeholder](build/icon.ico)

---

## Key Features

- 🛸 **Compact Floating UI**: Modern dark theme with smooth rounded corners (`600x500`), draggable header, pin-on-top mode, and glassmorphic styling.
- 🎯 **Action-Oriented AI**: Quick buttons for "What to answer?", "Clarify", "Recap", "Follow Up Question", and "Listen".
- 📷 **User-Initiated Screenshot & OCR**: Explicit, user-driven region capture with Tesseract.js OCR text extraction.
- 🔒 **Secure Architecture**: Context isolation enabled, Node integration disabled, API keys securely handled in the main process and never exposed to the renderer.
- 💬 **Rich Markdown & Syntax Highlighting**: Full GFM markdown support with code block syntax highlighting and one-click copy.
- 🔊 **Text-to-Speech**: Read responses aloud using system speech synthesis.
- ⚙️ **Customizable Settings**: Choose OpenAI models (`gpt-4o-mini`, `gpt-4o`, etc.), adjust temperature, response length, screenshot quality, and pin-to-top.
- ⌨️ **Global Desktop Shortcuts**:
  - `Ctrl + Shift + H`: Trigger user-initiated screenshot capture
  - `Ctrl + Shift + Space`: Focus assistant window
  - `Esc`: Cancel screenshot region selection

---

## Tech Stack

- **Electron** — Desktop runtime container
- **React 18** — User Interface library
- **TypeScript** — Type-safe codebase
- **Vite** — Fast renderer bundler and HMR
- **Tailwind CSS** — Utility-first styling with custom dark theme tokens
- **Zustand** — Lightweight state management
- **OpenAI API** — Backend AI capabilities
- **Tesseract.js** — Local OCR abstraction for text extraction

---

## Installation & Getting Started

### Prerequisites
- Node.js 18+ and `npm`

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/your-repo/nexa.git
cd nexa
npm install
```

### 2. Environment Setup

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Add your OpenAI API Key:

```env
OPENAI_API_KEY=sk-proj-...
```

*(Alternatively, you can enter your API Key via the UI Settings panel within the app!)*

---

## Development

Run the application in development mode (starts Vite + Electron):

```bash
npm run dev
```

---

## Packaging / Production Build

To build the TypeScript files and package the app for distribution:

### Compile TypeScript & Build Renderer
```bash
npm run build
```

### Package into Executable (Windows NSIS & Portable)
```bash
npm run package
```
The output installer/portable binary will be created in the `release/` folder.

---

## Project Architecture

```
Nexa/
├── electron/
│   ├── main.ts              # Main process (Window management, security, IPC listeners)
│   ├── preload.ts           # Secure bridge exposing typed electronAPI to renderer
│   └── ipc/                 # IPC handlers
│       ├── ai.ts            # Secure OpenAI API execution & system prompts
│       ├── screenshot.ts    # Desktop capturer service
│       ├── settings.ts      # Persistent settings management
│       └── shortcuts.ts     # Global keyboard shortcut registrations
├── src/
│   ├── components/          # Modular React UI components
│   │   ├── ActionButtons.tsx
│   │   ├── AnswerPanel.tsx
│   │   ├── AskInput.tsx
│   │   ├── ControlBar.tsx
│   │   ├── FloatingAssistant.tsx
│   │   ├── ScreenshotSelector.tsx
│   │   ├── SettingsPanel.tsx
│   │   └── Toast.tsx
│   ├── services/            # Service layer abstractions
│   │   ├── ai/              # AIProvider & OpenAIProvider implementation
│   │   ├── ocr/             # OCRProvider & Tesseract implementation
│   │   └── screenshot/      # Screenshot capture & cropping service
│   ├── store/
│   │   └── assistantStore.ts# Zustand global state store
│   ├── types/
│   │   └── assistant.ts     # Core TypeScript types & electronAPI definitions
│   ├── App.tsx              # App root
│   ├── main.tsx             # React entrypoint
│   └── index.css            # Tailwind directives & global styling
├── tailwind.config.js       # Custom theme colors and utilities
├── vite.config.ts           # Vite + vite-plugin-electron build config
├── electron-builder.config.js # Electron Builder configuration
└── package.json
```

---

## Security Considerations

1. **API Key Isolation**: The OpenAI API key is held exclusively in memory in the Electron main process. It is never logged, saved to plain text settings files, or passed to the React renderer.
2. **Context Isolation**: `contextIsolation: true` and `nodeIntegration: false` prevent untrusted web code from executing system calls.
3. **Content Security Policy (CSP)**: Strict HTTP CSP headers restrict network requests to authorized endpoints (`api.openai.com`).
4. **Navigation Restrictions**: External URL navigation is disabled, and opening new popup windows is denied.
5. **Ethical Desktop Tool**: Screen capture is strictly user-initiated via an explicit overlay. Silent background screen or audio recording is not implemented.

---

## License

MIT License.
