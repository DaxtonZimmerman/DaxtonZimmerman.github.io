import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { format, resolveConfig } from 'prettier';
import { pageMetadata, pageUrl } from './page-metadata.mjs';

const root = new URL('../', import.meta.url);
const formatOptions = await resolveConfig(new URL('.prettierrc.json', root).pathname);
const site = JSON.parse(await readFile(new URL('content/site.json', root), 'utf8'));
const projects = JSON.parse(await readFile(new URL('content/projects.json', root), 'utf8'));
const room = JSON.parse(await readFile(new URL('content/room-targets.json', root), 'utf8'));

const shared = {};
for (const name of [
  'header',
  'footer',
  'page',
  'navigation',
  'project-card',
  'project-dialog',
  'project-tab',
  'project-panel',
]) {
  shared[name] = await readFile(new URL(`templates/shared/${name}.html`, root), 'utf8');
}

function fillTemplate(template, values) {
  return template.replace(/\{\{([A-Z_]+)\}\}/g, (_, name) => {
    if (!(name in values)) throw new Error(`Missing template value: ${name}`);
    return values[name];
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

// A changed stylesheet, script, or screenshot gives browsers a new asset URL.
const versionFiles = [
  'room.css',
  'portfolio.css',
  'site.js',
  'room.js',
  'contact.js',
  'lesson.js',
  'store-details.js',
  'tabs.js',
  'piano.js',
  'guitar.js',
  'arcade.js',
  'arcade-music.js',
  ...projects.map((project) => `assets/${project.image}`),
  'assets/triaswear-product.png',
  'assets/daxton-portrait.webp',
  'assets/daxton-wordmark.svg',
];
const versionData = await Promise.all(
  versionFiles.map((file) => readFile(new URL(`dist/${file}`, root))),
);
const version = createHash('sha256').update(Buffer.concat(versionData)).digest('hex').slice(0, 10);

function projectValues(project) {
  return {
    ID: escapeHtml(project.id),
    NAME: escapeHtml(project.name),
    TYPE: escapeHtml(project.type),
    IMAGE: escapeHtml(project.image),
    SUMMARY: escapeHtml(project.summary),
  };
}

function projectCard(project, heading = 'h3') {
  const html = fillTemplate(shared['project-card'], {
    ...projectValues(project),
    COLOR: escapeHtml(project.color),
    PROJECT_LABEL: escapeHtml(project.name.toLowerCase().replaceAll(' ', '')),
    TAGS: project.stack.map((tool) => `<span>${escapeHtml(tool)}</span>`).join(''),
    RESULT:
      project.id === 'triaswear'
        ? '<p class="project-result">$2,000+ in team sales in one month</p>'
        : '',
  });
  // Work cards follow h1; Home cards follow the projects section's h2.
  return heading === 'h2' ? html.replace('<h3', '<h2').replace('</h3>', '</h2>') : html;
}

function projectDialog() {
  const tabs = projects
    .map((project, index) =>
      fillTemplate(shared['project-tab'], {
        ...projectValues(project),
        NUMBER: String(index + 1).padStart(2, '0'),
        SELECTED: String(index === 0),
        TAB_INDEX: index === 0 ? '0' : '-1',
      }),
    )
    .join('\n');
  const panels = projects
    .map((project, index) =>
      fillTemplate(shared['project-panel'], {
        ...projectValues(project),
        HIDDEN: index === 0 ? '' : 'hidden',
      }),
    )
    .join('\n');
  return fillTemplate(shared['project-dialog'], { PROJECT_TABS: tabs, PROJECT_PANELS: panels });
}

function roomTarget(target) {
  const [stageX, stageY, stageWidth, stageHeight] = room.stage;
  const [x, y, width, height] = target.box;
  const tag = target.href ? 'a' : 'button';
  const attributes = [
    target.href ? `href="${target.href}"` : `type="button" data-open-${target.action}`,
    target.preview ? `data-preview-project="${target.preview}"` : '',
    target.instrument ? `data-music-instrument="${target.instrument}"` : '',
  ]
    .filter(Boolean)
    .join(' ');
  const left = ((x - stageX) / stageWidth) * 100;
  const top = ((y - stageY) / stageHeight) * 100;
  const targetWidth = (width / stageWidth) * 100;
  const targetHeight = (height / stageHeight) * 100;
  return `<${tag} class="room-object object-${target.id}" ${attributes}
    aria-label="${escapeHtml(target.label)}" data-room-hint="${escapeHtml(target.hint)}"
    style="left:${left}%;top:${top}%;width:${targetWidth}%;height:${targetHeight}%">
    <svg class="object-outline" viewBox="0 0 ${target.view.join(' ')}" aria-hidden="true" focusable="false">
      <path d="${target.path}" vector-effect="non-scaling-stroke"/>
    </svg>
  </${tag}>`;
}

const pages = [
  {
    file: 'index.html',
    template: 'home',
    title: 'Daxton Zimmerman — Web Developer',
    description:
      'Selected websites, applications, and creative work by Daxton Zimmerman. Open to part-time web development roles, internships, and select projects.',
    scripts: ['room'],
    values: {
      PROJECTS: projects
        .slice(0, 2)
        .map((project) => projectCard(project))
        .join('\n'),
      PROJECT_PREVIEW: projectDialog(),
      ROOM_TARGETS: room.targets.map(roomTarget).join('\n'),
    },
  },
  {
    file: 'work.html',
    template: 'work',
    title: 'Work — Daxton Zimmerman',
    active: 'work',
    description:
      'Websites, applications, and a real Shopify store. Explore Daxton Zimmerman’s projects, contributions, and code.',
    values: { PROJECTS: projects.map((project) => projectCard(project, 'h2')).join('\n') },
  },
  {
    file: 'about.html',
    template: 'about',
    title: 'About — Daxton Zimmerman',
    active: 'about',
    description:
      'Web development student, TriasWear co-founder, and music maker. Open to part-time roles, internships, and website projects.',
  },
  {
    file: 'build-notes.html',
    template: 'build-notes',
    title: 'How this portfolio works — Daxton Zimmerman',
    description:
      'The implementation behind the interactive room, playable music keyboard, TV arcade, and project walkthroughs.',
  },
  {
    file: 'services.html',
    template: 'services',
    title: 'Website services — Daxton Zimmerman',
    active: 'services',
    description:
      'Website projects, part-time roles, and internships. Get in touch with Daxton Zimmerman.',
  },
  {
    file: 'contact.html',
    template: 'contact',
    title: 'Contact — Daxton Zimmerman',
    active: 'contact',
    description:
      'Website projects, part-time roles, and internships. Get in touch with Daxton Zimmerman.',
    scripts: ['contact'],
  },
  {
    file: '404.html',
    template: '404',
    title: 'Page not found — Daxton Zimmerman',
    base: '/',
    description: 'Find your way back to the portfolio.',
  },
  ...projects.map((project) => ({
    file: `work/${project.id}.html`,
    template: project.id,
    base: '../',
    active: 'work',
    scripts:
      project.id === 'codepath' ? ['lesson'] : project.id === 'triaswear' ? ['store-details'] : [],
    title:
      project.id === 'triaswear'
        ? 'TriasWear — Design & Shopify Development by Daxton Zimmerman'
        : `${project.name} — A project by Daxton Zimmerman`,
    description: project.summary,
    values: { LIVE_URL: escapeHtml(project.live), SOURCE_URL: escapeHtml(project.source || '') },
  })),
];

const screenshotNames = new Set([
  ...projects.map((project) => project.image.replace(/\.png$/, '')),
  'triaswear-product',
]);
await mkdir(new URL('dist/work/', root), { recursive: true });
for (const page of pages) {
  const base = page.base || '';
  const template = await readFile(new URL(`templates/${page.template}.html`, root), 'utf8');
  let content = fillTemplate(template, page.values || {});
  content = content.replace(
    /<img\b[^>]*\bsrc="((?:\.\.\/)?assets\/([\w-]+)\.png)"[^>]*>/g,
    (image, path, name) => {
      if (!screenshotNames.has(name)) return image;
      const folder = path.slice(0, path.lastIndexOf('/') + 1);
      const sizes = base === '../' ? '100vw' : '(max-width:760px) calc(100vw - 80px), 45vw';
      return `<picture><source type="image/webp" srcset="${folder}${name}-480.webp 480w, ${folder}${name}-960.webp 960w, ${folder}${name}-1536.webp 1536w" sizes="${sizes}" />${image}</picture>`;
    },
  );
  content = content.replace(/(assets\/[\w-]+\.(?:png|jpg|webp))(?=["\s,])/g, `$1?v=${version}`);
  let navigation = fillTemplate(shared.navigation, { BASE: base });
  if (page.active)
    navigation = navigation.replace(
      `href="${base}${page.active}.html"`,
      `href="${base}${page.active}.html" aria-current="page"`,
    );
  const html = fillTemplate(shared.page, {
    TITLE: escapeHtml(page.title),
    DESCRIPTION: escapeHtml(page.description),
    BASE: base,
    VERSION: version,
    HEADER: fillTemplate(shared.header, { BASE: base, NAV_LINKS: navigation, VERSION: version }),
    FOOTER: fillTemplate(shared.footer, { BASE: base, VERSION: version }),
    CONTENT: content,
    PAGE_SCRIPTS: (page.scripts || [])
      .map((script) => `<script type="module" src="${base}${script}.js?v=${version}"></script>`)
      .join('\n'),
  }).replace('<!-- PAGE_METADATA -->', await pageMetadata(page.file, { site, projects, root }));
  await writeFile(
    new URL(`dist/${page.file}`, root),
    await format(html, { ...formatOptions, parser: 'html' }),
  );
}

const sitemapUrls = pages
  .filter((page) => page.file !== '404.html')
  .map((page) => pageUrl(page.file, site.origin));
await writeFile(
  new URL('dist/sitemap.xml', root),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapUrls.map((url) => `  <url><loc>${escapeHtml(url)}</loc></url>`).join('\n')}
</urlset>
`,
);
await writeFile(
  new URL('dist/robots.txt', root),
  `User-agent: *\nAllow: /\nSitemap: ${site.origin}/sitemap.xml\n`,
);
console.log(`Built ${pages.length} formatted portfolio pages.`);
