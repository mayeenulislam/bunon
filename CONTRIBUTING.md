# Contributing to BŪNŌN

Thank you for your interest in contributing to BŪNŌN! This guide will help you get started.

## Code of Conduct

Be respectful, inclusive, and constructive in all interactions.

## How to Contribute

There are many ways to contribute:

- Report bugs
- Suggest new features
- Submit pull requests for bug fixes or enhancements
- Improve documentation
- Share feedback on the syntax or UX

## Project Structure

BŪNŌN is a **single-file application**. Everything lives in `index.html`:

```
index.html  ← HTML structure + CSS styles + JavaScript logic
```

There is no build step, no bundler, and no external dependencies. The app is entirely self-contained.

## Development Workflow

### 1. Make Your Changes

Since the app is a single HTML file, open `index.html` in your editor and make changes directly.

### 2. Test Locally

Open `index.html` in your browser:
```bash
open index.html
# or
python3 -m http.server 8080
```

Test your changes by:
- Verifying the editor syntax highlighting works
- Adding/editing entities and relationships
- Testing zoom, pan, and drag behaviors
- Exporting to PNG and text
- Checking session persistence (reset/empty)
- Testing with the default example and with an empty canvas

### 3. Keep It Simple

- **No new dependencies.** BŪNŌN is proudly zero-dependency.
- **Maintain backward compatibility.** Don't break the existing ERD syntax.
- **Preserve existing comments and code.** Only remove code if it's truly unused or buggy.
- **Test in multiple browsers** when making CSS or JS changes.

### 4. Commit Guidelines

- Write clear, concise commit messages
- Use the present tense ("Add feature" not "Added feature")
- Reference issue numbers if applicable: `Fix #42: Correct zoom behavior`

### 5. Submit a Pull Request

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Commit your changes
4. Push to your fork: `git push origin feature/your-feature-name`
5. Open a Pull Request against the `main` branch

In your PR description, include:
- What the change does
- Why it's needed
- How to test it
- Screenshots if the change affects the UI

## Coding Standards

### JavaScript
- Use `var` (not `let`/`const`) for broad browser compatibility
- Use function declarations or `function()` expressions
- Keep functions focused and well-commented
- Use the existing comment style: `// ════════════════` for section dividers

### CSS
- Follow the existing custom property pattern: `--property-name: value;`
- Use the existing color scheme variables (`--bg`, `--surface`, `--border`, etc.)
- Maintain the dark theme aesthetic

### HTML
- Keep the single-file structure — don't split into separate files
- Maintain accessibility attributes (`aria-label`, `aria-expanded`, etc.)

## Reporting Bugs

When reporting a bug, please include:

1. **Browser and version** (Chrome 120, Firefox 121, etc.)
2. **Steps to reproduce** — be specific
3. **Expected behavior** vs. **actual behavior**
4. **ERD code** that triggers the issue (if applicable)
5. **Screenshot** if the issue is visual

## Suggesting Features

For feature suggestions:

1. Check existing issues first to avoid duplicates
2. Describe the feature and its use case
3. Explain why it would be valuable to BŪNŌN users
4. Consider the zero-dependency philosophy — can it be done without external libs?

## Questions?

Open an issue with your question — we're happy to help!

---

Thank you for contributing to BŪNŌN! 🚀
