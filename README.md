<img src="logo-white.png" width="80" />

# BUNON — ERD Visualizer

BUNON is a zero-dependency, client-side ERD visualizer that runs entirely in the browser. No build tools, no server, no npm — just open `index.html` and start designing.

Built with the help of AI with human supervision and modification

## Features

- **Live Editing** — left sidebar editor with real-time canvas preview
- **Syntax Highlighting** — color-coded tokens for entities, fields, relationships, and properties
- **Drag & Drop** — reposition entities on the canvas; overlap detection nudges them apart
- **Crow's Foot Notation** — standard `<>`, `>`, `<` symbols for Many-to-Many, Many-to-One, One-to-Many
- **Zoom & Pan** — mouse wheel to pan, Ctrl/Cmd+wheel to zoom, plus zoom buttons and Fit
- **Icon Support** — six built-in SVG icons to visually distinguish entities
- **Color Coding** — six entity colors with matching header tints
- **PNG Export** — download the diagram at 2× resolution
- **Text Export** — download the ERD definition as `.txt`
- **Session Persistence** — editor text, entity positions, and legend position saved to `localStorage`
- **Collapsible Sidebar** — toggle the editor panel to maximize canvas space
- **Legend Card** — draggable legend explaining relationship notations
- **Comments** — `//` single-line comments in the ERD definition

## Quick Start

### Easy: Download & Open

1. Download the `index.html`
2. Open the `index.html` in any modern browser

👍 It's ready!

### Advanced: Git + Local Server

1. Clone the repo:
   ```bash
   git clone https://github.com/yourusername/erd.git
   cd erd
   ```

2. Open `index.html` in any modern browser:
   ```bash
   # macOS
   open index.html

   # Or with a quick local server (optional)
   python3 -m http.server 8080
   # then visit http://localhost:8080
   ```

That's it. No install step.

## ERD Syntax

### Entity Definition

```
EntityName [icon: iconname, color: colorname] {
  fieldName fieldType [pk]
}
```

**Example:**
```
users [icon: user, color: blue] {
  id string pk
  displayName string
  team_role string
  teams string
}
```

### Field Syntax

```
fieldName fieldType [pk]
```

- `fieldName` — column/field name
- `fieldType` — data type (`string`, `number`, `timestamp`, etc.)
- `pk` (optional) — marks the field as Primary Key (shows a PK badge)

### Entity Metadata

Inside the `[...]` block after the entity name:

| Property | Values | Default |
|----------|---------|---------|
| `icon` | `user`, `users`, `home`, `folder`, `message-circle`, `mail` | `home` |
| `color` | `blue`, `green`, `red`, `grey`/`gray`, `purple`, `orange` | `grey` |

### Relationship Definition

```
fromTable.fromField <symbol> toTable.toField [: properties]
```

**Symbols (Crow's Foot Notation):**

| Symbol | Meaning |
|--------|---------|
| `<>` | Many to Many |
| `>` | Many to One |
| `<` | One to Many |

**Examples:**
```
users.teams <> teams.id
workspaces.folderId > folders.id
invite.inviterId > users.id
```

**Relationship Properties (optional):**
```
users.teams <> teams.id [color: green]
```

### Diagram-Level Properties

Set these at the top level (outside any entity block):

```
colorMode pastel
styleMode default
typeface default
notation crowfoot
title My Diagram
```

### Legend Definition

```
legend {
  [connection: <>, label: Many to Many]
  [connection: >, label: Many to One]
  [connection: <, label: One to Many]
}
```

The legend card is draggable — place it anywhere on the canvas.

### Comments

Use `//` for single-line comments. These are ignored by the parser.

```
// This is a comment
users [icon: user] {
  id string pk
}
```

## Keyboard & Mouse Controls

| Action | Control |
|--------|---------|
| Pan canvas | Scroll wheel |
| Zoom in/out | Ctrl/Cmd + Scroll wheel |
| Zoom buttons | Toolbar +/− buttons |
| Fit all entities | Fit button in toolbar |
| Drag entity | Click and drag an entity box |
| Drag canvas | Click and drag empty space |
| Toggle sidebar | Sidebar toggle button |

## Session Management

The **Session** dropdown (top-right) provides:

- **Reset Session** — restores the default example diagram
- **Empty Session** — clears the canvas and editor completely

All work is auto-saved to `localStorage` as you type and drag.

## Export Options

- **Export as PNG** — bottom-left of canvas; downloads `erd-diagram.png` at 2× resolution
- **Export as Text** — bottom of editor panel; downloads `erd.txt` with your ERD definition

## Browser Support

Any modern browser with support for:
- Canvas API
- `localStorage`
- ES5+ JavaScript
- SVG rendering
- CSS Custom Properties

Tested on Chrome, Firefox, Safari, and Edge (latest versions).

## Project Structure

```
erd/
├── index.html          # Entire application (HTML + CSS + JS)
├── logo.png           # Colored logo (browser tab)
├── logo-white.png     # White logo (toolbar)
├── fonts/             # Kohinoor Bangla font files (optional)
│   ├── KohinoorBangla-Regular.* 
│   └── KohinoorBangla-Bold.*
├── .gitignore
├── README.md          # This file
└── CONTRIBUTING.md    # Contribution guidelines
```

## License

MIT
