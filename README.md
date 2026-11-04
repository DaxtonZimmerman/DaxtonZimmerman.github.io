# Daxton’s portfolio

My room, projects, and website services. Built with HTML, CSS, and JavaScript, with a small page builder for shared layouts.

**Live website:** https://daxtonzimmerman.github.io/

## Work on the site

Open this folder in VS Code: `Documents/GitHub/DaxtonZimmerman.github.io`.

1. Edit the page in `templates/`, or a project description or link in `content/projects.json`.
2. Press **Option–Shift–F** to format it. Format on Save is enabled too.
3. Run **Terminal → Run Build Task → Build pages**.
4. Run **Preview website** and open `http://127.0.0.1:8777`.

The order in `content/projects.json` controls the project list; Home shows the first two. Instrument buttons are normal HTML in `templates/home.html`, and the project-preview layout lives in `templates/shared/project-dialog.html`.

The build writes formatted HTML into `dist/`. Edit the templates for page content; rebuilding replaces generated HTML. CSS and JavaScript in `dist/` are edited directly.

## Find the right file

| What to change | File |
| --- | --- |
| Home and room dialogs | `templates/home.html` |
| Work, About, Services, Contact | Matching file in `templates/` |
| Project stories | `templates/triaswear.html`, `flow.html`, `codepath.html`, `vector.html` |
| Header, navigation, footer, project cards and previews | `templates/shared/` |
| Project descriptions and links | `content/projects.json` |
| Public URL and sharing image | `content/site.json` |
| Room outlines | `content/room-targets.json` |
| Home, room, base styles | `dist/room.css` |
| Other pages and supporting styles | `dist/portfolio.css` |
| Shared navigation, email copy, and gallery | `dist/site.js` |
| Home room dialogs and tabs | `dist/room.js`, `dist/tabs.js` |
| Original tracks and audio controls | `dist/tracks.js`, `dist/arcade-music.js` |
| Instruments and arcade | `dist/piano.js`, `dist/guitar.js`, `dist/arcade.js` |
| Editable Codepath example | `templates/codepath.html`, `dist/lesson.js` |
| Contact form and email receiver | `dist/contact.js`, `integrations/google-mail/Code.gs` |
| Page builder and metadata | `tools/build.mjs`, `tools/page-metadata.mjs` |

For a full explanation and practice exercises, use [the code walkthrough](docs/CODE_WALKTHROUGH.md).

## Commands

Use Node 24 and run `npm ci` to install the project tools.

```sh
npm run build         # Generate the pages
npm run preview       # Serve the local preview
npm run check         # Check pages, links, assets, and metadata
npm test              # Check game, audio, and contact behavior
npm run format        # Format the source and output
npm run format:check  # Check formatting
npm run images        # Rebuild WebP images after changing original images
npm run deploy        # Check and publish dist/ to GitHub Pages
```

## Contact form

The on-site form sends inquiries to `daxtonmz0021@gmail.com` through the deployed Google Apps Script receiver. Chrome, macOS Safari, and a real Gmail delivery were checked on November 3, 2026.

- `dist/contact.js` sends the fields and waits for an explicit acceptance before showing success.
- `integrations/google-mail/Code.gs` validates the message, limits sends, and uses MailApp to email the fixed owner address. The visitor’s email becomes Reply-To.
- The public receiver URL in `contact.js` is configuration, not a password. The receiver does not read Gmail.
- Local changes to `Code.gs` must also be updated and deployed in the Google Apps Script project **Daxton Portfolio — Inquiry Receiver**.

Use a clearly named test message when checking delivery; repeated tests are rate-limited. The preview server only serves files.

## Publishing and checks

The public site is hosted by GitHub Pages at https://daxtonzimmerman.github.io/.

Pushing to `main` runs `.github/workflows/pages.yml` to build and check the source. GitHub Pages serves the separate `gh-pages` branch. The deployment command copies only the checked `dist/` files there and requests a Pages build. It uses your existing Git and GitHub CLI sign-in; it does not store a token.

1. Edit the source and format it.
2. Run `npm run build`, `npm run check`, and `npm test`.
3. Review changed layouts locally at desktop and phone widths.
4. Commit and push to `main`.
5. Run `npm run deploy`. It builds, checks, tests, and publishes the website files.
6. Check the Pages build with `gh api repos/DaxtonZimmerman/DaxtonZimmerman.github.io/pages/builds/latest`, then open the public site once its status is `built`.

This branch-based route replaces the artifact deployment that repeatedly timed out on November 4, 2026. Changes to `main` alone do not update the live website.

Canonical page links use `.html` filenames so they work directly on GitHub Pages. The contact form uses the existing Google Apps Script receiver. Physical iPhone/iOS Safari and VoiceOver checks remain separate from browser viewport checks.

Original artwork and screenshots remain in `dist/assets/`. Self-hosted font files include their required licenses in `dist/assets/fonts/`.
