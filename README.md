# Speed Reader

A complete, offline-first RSVP (Rapid Serial Visual Presentation) speed reader web application. Read text, markdown, PDF, and EPUB files with ORP-centered word display, chapter navigation, and progress tracking.

## Features

- **Multiple File Formats**: Supports `.txt`, `.md`, `.pdf`, and `.epub` files
- **ORP-Centered Display**: Optimal Recognition Point (ORP) letter highlighted in red, centered on screen
- **Smart Timing**: Adjustable WPM with length and punctuation-based timing
- **Chapter Navigation**: Jump to chapters/sections or read specific sections
- **Progress Tracking**: Automatic progress saving with anchor-window matching for reliable resume
- **Offline-First**: Works completely offline after first load (PWA with service worker)
- **Mobile-First Design**: Responsive, touch-friendly interface
- **GitHub Pages Ready**: Configured for deployment to GitHub Pages with subpath support

## Local Development

### Prerequisites

- Node.js 20+ and npm

### Setup

1. Install dependencies:
```bash
npm install
```

2. Start development server:
```bash
npm run dev
```

3. Open your browser to the URL shown (typically `http://localhost:5173`)

### Build

Build for production:
```bash
npm run build
```

Preview production build:
```bash
npm run preview
```

## GitHub Pages Deployment

### Automatic Deployment

The repository includes a GitHub Actions workflow that automatically builds and deploys to GitHub Pages when you push to the `main` branch.

1. **Enable GitHub Pages**:
   - Go to your repository Settings → Pages
   - Under "Source", select "GitHub Actions"

2. **Push to main branch**:
   - The workflow will automatically build and deploy
   - Your app will be available at `https://username.github.io/repo-name/`

### Manual Configuration

The app automatically detects the GitHub repository name from the `GITHUB_REPOSITORY` environment variable during build. If you need to set a custom base path, you can modify `vite.config.js`:

```javascript
base: '/your-custom-path/'
```

## Usage

### Uploading Files

1. Click "Choose File" or drag and drop a file
2. Supported formats: `.txt`, `.md`, `.pdf`, `.epub`
3. The file will be processed and tokenized automatically

### Reading Controls

- **Tap reader area**: Show/hide controls
- **Play/Pause**: Large center button
- **Rewind/Forward**: Skip 10 words backward/forward
- **Progress Scrubber**: Drag to jump to any position
- **Settings**: Adjust WPM (100-1000), access Contents

### Chapter Navigation

1. Open Settings and click "Contents"
2. View the document outline (chapters for EPUB, headings for Markdown)
3. **Jump**: Navigate to that section
4. **Read**: Set scope to read only that section

### Resuming

When you reload the app with a previously opened document:
- **Resume**: Continue from where you left off (with anchor matching)
- **Start Over**: Begin from the beginning
- **Choose Bookmark**: Select a saved bookmark (coming soon)

### Scope Reading

When reading a specific section:
- A scope indicator shows which section you're reading
- Playback automatically stops at the end of the section
- Options: Replay, Next Section, or Clear Scope

## Technical Details

### ORP Calculation

The Optimal Recognition Point (ORP) is calculated based on word length:
- 0-1 chars: index 0
- 2-5 chars: index 1
- 6-9 chars: index 2
- 10-13 chars: index 3
- 14+ chars: index 4

The ORP letter is highlighted in red and centered on screen using canvas-based text measurement.

### Timing Model

Base timing: `60000 / WPM` milliseconds per word

Length factor:
- 1.0 for words ≤6 characters
- +0.03 per character beyond 6
- Maximum 1.6x

Punctuation additions:
- `,` `:` `;`: +0.35× base
- `.` `!` `?`: +0.9× base
- `--` or em-dash: +0.5× base
- Paragraph break: +1.2× base

### Storage

All data is stored locally in IndexedDB:
- **Documents**: File metadata and content hash
- **Progress**: Current token index and anchor window (10-15 words)
- **Bookmarks**: Saved positions with preview text

### Offline Support

The service worker caches all assets for offline use. After the first load, the app works completely offline.

## Project Structure

```
/
├── index.html              # Main HTML
├── src/
│   ├── main.js            # App orchestration
│   ├── reader/            # Reading engine
│   │   ├── orp.js         # ORP calculation & rendering
│   │   ├── timing.js      # Timing calculations
│   │   ├── playback.js    # RAF-based playback controller
│   │   └── tokenize.js    # Word tokenization
│   ├── ingest/            # File ingestion
│   │   ├── txt.js
│   │   ├── markdown.js
│   │   ├── pdf.js
│   │   └── epub.js
│   ├── outline/           # Outline building
│   │   ├── markers.js
│   │   └── outlineBuilder.js
│   ├── storage/           # IndexedDB storage
│   │   ├── db.js
│   │   ├── documents.js
│   │   ├── progress.js
│   │   └── bookmarks.js
│   ├── ui/                # UI components
│   │   ├── controls.js
│   │   ├── contents.js
│   │   ├── resumeModal.js
│   │   └── scopePill.js
│   └── styles.css         # Main stylesheet
├── public/
│   ├── manifest.webmanifest
│   ├── icons/             # PWA icons (add icon-192.png, icon-512.png)
│   └── demo.txt           # Demo content
├── sw.js                  # Service worker
├── vite.config.js         # Vite configuration
└── package.json

```

## Browser Support

- Modern browsers with ES6+ support
- IndexedDB support required
- Service Worker support for offline functionality

## License

MIT
