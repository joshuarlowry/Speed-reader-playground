# Speed Reader

A complete, offline-first RSVP (Rapid Serial Visual Presentation) speed reader web application. Read text, markdown, PDF, and EPUB files with ORP-centered word display, chapter navigation, and progress tracking.

## Features

- **Multiple File Formats**: Supports `.txt`, `.md`, `.pdf`, and `.epub` files
- **ORP-Centered Display**: Optimal Recognition Point (ORP) letter highlighted in red, centered on screen
- **Smart Timing**: Adjustable WPM (100-1000) with length and punctuation-based timing
- **Speed Selection**: Choose your reading speed when opening a book (150, 300, 500, 700, or 900 WPM)
- **Chapter Navigation**: Jump to chapters/sections or read specific sections
- **Progress Tracking**: Automatic progress saving with anchor-window matching for reliable resume
- **Sample Books**: Includes public domain books from Standard Ebooks to try immediately
- **Offline-First**: Works completely offline after first load (PWA with service worker)
- **Accessible**: Full keyboard navigation, screen reader support, ARIA labels, and WCAG-compliant contrast
- **Mobile-First Design**: Responsive, touch-friendly interface
- **GitHub Pages Ready**: Configured for deployment to GitHub Pages with subpath support

## Sample Books

The app includes three public domain books from [Standard Ebooks](https://standardebooks.org):

- **Pride and Prejudice** by Jane Austen
- **The Brooklyn Murders** by G.D.H. Cole
- **The Princess and the Goblin** by George MacDonald

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

### Opening a Book

1. Click "Upload File" to select a document, or click a sample book
2. Choose your reading speed (150-900 WPM)
3. For books with chapters, the table of contents opens automatically

### Reading Controls

Controls appear faded at the bottom of the screen and become fully visible on mouse movement or touch.

- **Play/Pause**: Large center button (or spacebar)
- **Rewind/Forward**: Skip 5 seconds worth of words
- **Previous/Next Section**: Jump between chapters
- **Speed Adjustment**: +/- buttons to change WPM by 50
- **Progress Scrubber**: Drag to jump to any position
- **Contents**: Open table of contents

### Chapter Navigation

1. Click the Contents button (list icon) in the controls
2. View the document outline (chapters for EPUB, headings for Markdown)
3. Click any section to start reading from there

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

The ORP letter is highlighted in red and centered on screen.

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

### Accessibility

The app follows WCAG 2.1 guidelines:
- Full keyboard navigation with visible focus indicators
- Screen reader support with ARIA labels and live regions
- Skip link for keyboard users
- Proper heading hierarchy and semantic HTML
- Color contrast ratios meeting AA standards
- Reduced motion support via `prefers-reduced-motion`

## Project Structure

```
/
├── index.html              # Main HTML with modals and UI structure
├── src/
│   ├── main.js            # App orchestration and event handling
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
│   │   ├── controls.js    # Playback controls with auto-fade
│   │   ├── contents.js    # Table of contents drawer
│   │   ├── resumeModal.js # Resume/start over dialog
│   │   └── scopePill.js   # Section indicator
│   └── styles.css         # Tailwind-based stylesheet
├── public/
│   ├── manifest.webmanifest
│   ├── books/             # Sample EPUB files and covers
│   ├── icons/             # PWA icons
│   └── demo.txt           # Demo content
├── sw.js                  # Service worker for offline support
├── vite.config.js         # Vite configuration
├── tailwind.config.js     # Tailwind CSS configuration
└── package.json
```

## Browser Support

- Modern browsers with ES6+ support
- IndexedDB support required
- Service Worker support for offline functionality
- CSS `:has()` selector support (Chrome 105+, Safari 15.4+, Firefox 121+)

## Future Improvements

Some ideas for future development:

- [ ] Bookmark management UI
- [ ] Custom themes / light mode
- [ ] Font size and family options
- [ ] Reading statistics and history
- [ ] Import/export progress data
- [ ] Keyboard shortcuts help overlay
- [ ] Word highlighting mode (alternative to RSVP)

## License

MIT
