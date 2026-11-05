# Walk through the whole portfolio

Follow the actual files, with one small exercise per section. Use this guide to trace a feature, explain how it works, and practice a change before walking someone else through it.

## 1. Find the pages

Open `templates/home.html`. HTML supplies the content and its structure: headings, links, sections, images, and buttons. The room image is an image; the clickable controls are separate HTML elements over it.

The other page sources are next to it: `work.html`, `about.html`, `services.html`, `contact.html`, and each project's file. Public HTML is generated into `dist/`.

**Try:** Find your exact sentence “I love making music, games, websites... just about anything.” Find which elements contain it. Change another sentence locally, format, build, and inspect the result. Page wording lives in the matching HTML template; project-card descriptions live in `content/projects.json`.

**Explain:** Why should a navigation link be an `a`, and a control that opens a dialog be a `button`?

## 2. Follow a class into CSS

A class connects HTML to its styling. `room-object` identifies the common clickable object behavior. `object-tv` identifies the TV. Project cards have direct classes such as `triaswear-card` and `vector-card`, so their styles are easy to find. `button` gives ordinary action links/buttons a shared appearance.

`dist/room.css` contains base styles, the homepage, room, and arcade. `dist/portfolio.css` contains other pages and supporting dialogs. Section comments make them easier to find. `:root` contains the colors and font names. Media queries adjust layout at smaller widths.

The room's small monitor targets are replaced by full-size Projects and TriasWear controls on phones. The desktop silhouettes stay traced to the art.

**Try:** Find `.button` and trace its colors to the variables. Temporarily adjust one spacing value locally, reload, and then restore it. Check both a narrow and wide page.

**Explain:** What is inherited, and when does a more specific selector win? Avoid solving every change by adding another override at the end.

## 3. Understand the page builder

Open `tools/build.mjs`. It reads the templates and data, fills placeholders, and writes the final HTML. `fillTemplate()` replaces named values; it throws if a value is missing. The shared header, navigation, footer, document shell, project cards, and project previews live in `templates/shared/`. Project titles use h2 on Work and h3 under Home’s projects heading, while the shared `project-title` class keeps their appearance consistent.

`content/projects.json` supplies project names, summaries, tools, links, and screenshot names. Its order is the display order; Home shows the first two. Cards, room previews, and project links use that data. The longer stories stay in their individual HTML templates. The guitar-string and piano-key buttons are written directly in `templates/home.html`.

`npm run build` generates the pages and formats the result with the same Prettier settings as VS Code's Option–Shift–F. Editing generated `dist/*.html` directly is temporary; the next build replaces it. CSS and browser JavaScript in `dist/` are maintained directly.

**Try:** Find one project summary in JSON and trace it into `projectCard()`. See where `{{PROJECTS}}` is replaced on Home and Work.

**Explain:** How does editing one shared header change every page without copying it eleven times?

## 4. Trace a room click

Open `content/room-targets.json` and find the TV entry. Its coordinates describe a shape in the artwork's coordinate system. `roomTarget()` in the builder creates the matching SVG path and button. That control gets `data-open-arcade`.

`dist/site.js` handles shared navigation, email copying, and the TriasWear gallery. `dist/room.js` loads only on Home and starts the room features. `dist/contact.js` loads only on Contact. `mountArcade()` in `dist/arcade.js` attaches the arcade's controls and opens its native dialog. The music and project previews have similar opening/closing paths.

The illustration, logo overlay, labels, and targets share `.room-layer`. Moving that layer shifts them together; moving them separately would lose alignment. Motion is limited and switches off for reduced-motion preferences and touch pointers.

**Try:** Trace the TV from JSON → generated HTML → `mountArcade()` → `showModal()`. Then trace the Piano shortcut into the music dialog.

**Explain:** Which parts are a picture, which are real controls, and why are full-size alternative controls useful on a phone?

## 5. Understand dialogs and tabs

A native `dialog` handles modal behavior and Escape. The code also stops activity and returns focus to the element that opened it. The visible Close button is important for people who do not use Escape.

`dist/tabs.js` contains `setupTabs()`. It changes `aria-selected`, each tab's `tabIndex`, and the related panel's `hidden` state. Horizontal tabs use Left/Right; vertical project tabs use Up/Down. The same small function supports instruments, project previews, and the store screenshot gallery.

**Try:** Open a dialog using the keyboard. Move between its tabs, close with Escape, and locate the restored focus. Watch the selected tab and hidden panel in the HTML inspector.

**Explain:** Why is only one tab in a tab group normally in the Tab sequence?

## 6. Follow the instruments

`dist/piano.js` creates tones with Web Audio after a visitor plays a note. A note's frequency changes by semitone; an envelope controls its attack and decay. A separate master gain controls the output volume, including true zero mute.

`dist/guitar.js` builds a plucked-string sound from a small noisy buffer that loses energy over time. Strum schedules the six strings with small offsets. These are generated sounds, not recordings of your playing.

Audio permission may resume asynchronously. Generation counters and pending-note tracking prevent a delayed response from starting sound after the visitor releases a key or closes the dialog. Close, blur, and page hiding stop sound.

**Try:** Follow `startNote()` in the room script to `PianoPlayer.start()`, then `endNote()` to `stop()`. Find the regression in `tools/piano.test.mjs` that releases a note before audio resumes.

**Explain:** Why does each note need its own envelope when there is also a master volume?

## 7. Follow the arcade model

`newRound()` in `dist/arcade.js` creates the ball, paddle, bricks, score, lives, and phase. `advance()` changes that state using elapsed time. Drawing renders the current state into the canvas.

The phases include ready, running, paused, serve, won, and over. Physics uses short steps so a fast ball does not skip a brick. Losing focus or closing pauses the round. The best score is stored only in the current browser, and storage failure should not break play.

**Try:** Find the paddle's `width: 84` in `newRound()`. Temporarily try a wider paddle locally, check movement bounds and bounces, then restore it. Run `npm test`.

**Explain:** What is the difference between pausing, resetting, and waiting to serve after losing a life?

## 8. Follow the form all the way to Gmail

`templates/contact.html` supplies the fields. `dist/contact.js` checks them, prevents repeat clicks while sending, and posts their JSON data in a plain-text body to the public receiver URL. It waits for an explicit accepted response before showing success.

`integrations/google-mail/Code.gs` is the receiving Google Apps Script. It validates the fields, checks a honeypot, limits sends, and sends only to your fixed email address. The visitor's address becomes Reply-To. It does not read Gmail. The public URL is not a password or API key.

Failure preserves the message. A successful request also preserves any newer edits made while it was sending. The visitor stays on the portfolio; no Google Form or mail composer appears.

**Try:** Enter an invalid email locally and see native validation. Trace `sendInquiry()` to the receiver's `doPost()`. Find the fixed `to` address and the `replyTo` field. Use a clearly labeled test if sending; repeated tests are rate-limited.

**Explain:** Why is HTTP 200 alone insufficient proof that a message was accepted?

## 9. Find sharing and loading settings

`content/site.json` stores the public origin. `tools/page-metadata.mjs` gives each page its preferred URL and gives project pages their actual screenshot for sharing. The 404 is marked not to index. The build also writes `sitemap.xml` and `robots.txt`.

The original artwork and PNG screenshots stay in `dist/assets/`. `npm run images` uses `tools/prepare-images.mjs` to make smaller WebP versions without changing those originals. The browser selects an appropriate size through `picture`, `srcset`, and `sizes`. Local font files and their licenses are in `dist/assets/fonts/`.

**Try:** Inspect a project page's head and find its canonical URL and share image. At a phone width, inspect the room image's selected source. Compare file sizes with the original.

**Explain:** Why does a phone card need fewer pixels than the full project screenshot?

## 10. Work through checks and ownership

`npm run check` verifies page structure, links, responsive image files, resume output, canonical URLs, and project share images. `npm test` checks game/audio behavior and contact acceptance/receiver protections. Browser checks cover the actual controls and layout; a test pass does not mean a human has reviewed every experience.

The credits reflect your creative direction, projects, and personal writing, with a short note about assistance. Describe the decisions you made and the implementation you understand. If a feature is still new to you, trace it and change something small before presenting it as a skill you can explain confidently.

**Your final exercise:** Pick one feature, explain the event → function → changed state → visible result, show a relevant check, and make one small local change. We can repeat that for every section rather than trying to memorize the whole codebase at once.

## 11. Edit the Codepath example

`templates/codepath.html` holds the HTML and CSS textareas and a preview iframe. `dist/lesson.js` reads the two fields and updates the preview after a short typing pause. Reset restores the original values and cancels any pending update. This script only loads on the Codepath project page.

The iframe has an empty `sandbox` attribute: it cannot run scripts or access the portfolio. Its content policy also blocks network requests and form submissions. The example is temporary and does not save your edits. The full Codepath app has its own progress and saving features.

**Try:** Change the heading and background color. Reset the example, then check both fields return to their original values.

**Explain:** Why should someone else's HTML render inside an isolated iframe instead of being inserted into the portfolio itself?

The TriasWear page's numbered buttons open native dialog popups through `dist/store-details.js`. They keep the page position and URL, support Escape, and return focus to the button when closed. Its expandable code example comes from the saved Halloween theme's `triaswear-home-hero.liquid`. The internship description in About is based on your account of client conversations, teamwork, and building business websites.

## 12. Room details and the visual theme

The blue accent, white text, and navy background are set in the variables at the top of `dist/room.css`. The shared button class is `button-primary`. Decorative arrow glyphs and the old pixel spark have been removed from the templates and styles.

The original room artwork and the coordinates in `content/room-targets.json` stay unchanged. The room keeps its original illustrated console; the separate Xbox overlay has been removed. The SVG in `templates/home.html` only places the original TriasWear logo onto the monitor.

The About photo is the image you supplied from `IMG_2058.PNG`. `dist/assets/daxton-portrait.webp` is an optimized copy; CSS in `.about-portrait` controls its frame. Your face and the original photo were not generated or retouched.

The mobile menu uses native `details` and `summary`. Its three icon lines animate with CSS transforms into an X when `details` is open, then reverse when closed. The middle line fades out. Reduced-motion preferences turn that animation off. The existing navigation script handles outside clicks, link selection, and Escape; a toggle listener updates the button's accessible name.

## 13. Publish through GitHub

This folder is the GitHub working copy. Push changes to `main` to run `.github/workflows/pages.yml` for source checks. Run `npm run deploy` to build, check, test, and publish the website files to the `gh-pages` branch. GitHub Pages serves that branch; pushing `main` by itself does not change the live website. Only `dist/` becomes the public website. The repository also holds the templates and source for employers who want to inspect the code. Page metadata uses .html filenames for GitHub Pages. The older Sites copy is separate and does not automatically receive GitHub edits.

## 14. The arcade soundtrack

Your original OGG files are in `dist/assets/audio/`, alongside MP3 playback copies for broad browser support. The music credit and controls are in `templates/home.html`. `dist/arcade-music.js` controls one audio element and a Web Audio volume gain. It starts only after the visitor starts or resumes a round; pausing, losing focus, closing, losing a life, or ending a round pauses the music. Resume keeps the track position, while Reset returns it to the start. Track selection switches between Swinging Pants and Retro Beat. Music failure never stops the game.

**Try:** Start, pause, resume, mute, change tracks, and close the game. Confirm music never continues after closing. Change the volume using arrow keys while the slider has focus; those keys must change volume instead of moving the game paddle.

## 15. Original music in the room

`dist/tracks.js` adds My tracks to the existing music dialog. The list and credits live in `templates/home.html`: After Hours is credited to Daxton & Easton; the other three tracks are credited to Daxton. Original WAV files stay in Downloads; the website uses smaller MP3 copies.

The player reuses the audio controller in `arcade-music.js` for volume and delayed-play protection. A Web Audio analyser supplies real samples to the waveform canvas; reduced motion shows a still line. Seeking is enabled when duration metadata loads. Changing tracks pauses first, and choosing Guitar/Piano or closing stops playback. Nothing starts just from opening the dialog.

The new poster target is appended to `content/room-targets.json`; existing targets and room artwork remain unchanged. The poster selects the Stranger Things Type Beat, and the normal Music button opens My tracks. The guitar/piano shortcuts still open their own tabs.

The blue Music callout stays visible before the room scripts load so the older gold label baked into the illustration never flashes through. Its HTML button starts disabled; `room.js` enables it when the room is ready. The other interactive targets stay hidden until initialization.
# Agent Flyers

The separate design page starts in `templates/agent-flyers.html`. Its shell is `templates/shared/flyers-page.html`, and its styles are all in `dist/flyers.css`. It does not load the room or portfolio styles.

In `dist/flyers.js`, `data-preview` buttons open the native HTML dialog. The browser handles Escape and keyboard focus inside the dialog. `data-choose` links select a sample in the contact form. `flyerInquiry()` combines the selected sample and optional project link with the visitor’s message. `sendInquiry()` from `contact.js` handles delivery to the existing Gmail receiver.

To change a flyer, edit its SVG in `designs/flyers/` and run `node tools/export-flyers.mjs`. The script adds the real photo to the artwork and exports a full-size PNG and a smaller WebP for the gallery. `content/flyers.json` feeds both the gallery cards and the inquiry options.
