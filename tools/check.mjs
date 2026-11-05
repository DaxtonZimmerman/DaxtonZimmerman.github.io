import { readFile, readdir, stat } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import assert from 'node:assert/strict';
const root = resolve(new URL('../dist/', import.meta.url).pathname);
async function walk(path) {
  const found = [];
  for (const name of await readdir(path)) {
    const p = resolve(path, name);
    if ((await stat(p)).isDirectory()) found.push(...(await walk(p)));
    else found.push(p);
  }
  return found;
}
const files = await walk(root);
const site = JSON.parse(await readFile(new URL('../content/site.json', import.meta.url), 'utf8'));
const projects = JSON.parse(
  await readFile(new URL('../content/projects.json', import.meta.url), 'utf8'),
);
let links = 0;
for (const file of files.filter((f) => f.endsWith('.html'))) {
  const html = await readFile(file, 'utf8');
  assert.equal((html.match(/<h1[\s>]/g) || []).length, 1, `${file}: exactly one h1`);
  let previousHeading = 0;
  for (const match of html.matchAll(/<h([1-6])[\s>]/g)) {
    const level = Number(match[1]);
    assert(level <= previousHeading + 1, `${file}: heading levels must not skip`);
    previousHeading = level;
  }
  assert(html.includes('lang="en"'), `${file}: language`);
  assert(html.includes('name="viewport"'), `${file}: viewport`);
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
  assert.equal(ids.length, new Set(ids).size, `${file}: duplicate ids`);
  assert(!/\{\{[A-Z_]+\}\}/.test(html), `${file}: unresolved template`);
  assert(!html.includes('PAGE_METADATA'), `${file}: unresolved page metadata`);
  const relativeFile = file.slice(root.length + 1);
  if (relativeFile === '404.html') {
    assert(html.includes('content="noindex,follow"'), '404 must not be indexed');
    assert(!html.includes('rel="canonical"'), '404 must not canonicalize to a real page');
  } else {
    const canonical = html.match(/rel="canonical"\s+href="([^"]+)"/);
    const path = relativeFile === 'index.html' ? '/' : '/' + relativeFile;
    assert.equal(canonical?.[1], new URL(path, site.origin).href, `${file}: canonical URL`);
  }
  const project = projects.find((item) => relativeFile === `work/${item.id}.html`);
  if (project)
    assert(
      html.includes(`${site.origin}/assets/${project.image}`),
      `${file}: project-specific share image`,
    );
  assert(html.includes('site.js?v='), `${file}: shared page controls`);
  if (html.includes('id="music-dialog"'))
    assert(html.includes('room.js?v='), `${file}: room controls must load`);
  if (html.includes('id="inquiry-form"'))
    assert(html.includes('contact.js?v='), `${file}: contact submission must load`);
  const resources = [...html.matchAll(/\b(?:href|src)="([^"]+)"/g)].map((match) => match[1]);
  for (const match of html.matchAll(/\bsrcset="([^"]+)"/g)) {
    resources.push(...match[1].split(',').map((source) => source.trim().split(/\s+/)[0]));
  }
  for (const value of resources) {
    if (/^(https?:|mailto:|data:)/.test(value)) continue;
    const [resource, fragment] = value.split('#');
    const path = resource.split('?')[0];
    const target = path
      ? resolve(
          path.startsWith('/') ? root : dirname(file),
          decodeURIComponent(path.replace(/^\//, '')),
        )
      : file;
    assert(target.startsWith(root), `${file}: escaped path`);
    assert(files.includes(target), `${file}: missing ${value}`);
    if (fragment && target.endsWith('.html')) {
      const targetHtml = target === file ? html : await readFile(target, 'utf8');
      assert(targetHtml.includes(`id="${fragment}"`), `${file}: missing fragment ${value}`);
    }
    links++;
  }
}
const index = await readFile(resolve(root, 'index.html'), 'utf8');
assert.equal((index.match(/data-note="\d+"/g) || []).length, 13, '13 piano keys including sharps');
assert.equal(
  (index.match(/<article class="project-card /g) || []).length,
  2,
  'two homepage highlights',
);
assert(index.includes('triaswear-wordmark.png'), 'exact monitor wordmark asset');
assert(!index.includes('id="sculpture"'), 'removed rejected visual direction');
const pdf = await readFile(resolve(root, 'assets/Daxton-Zimmerman-Resume.pdf'));
assert(pdf.subarray(0, 5).toString() === '%PDF-', 'working resume download');
console.log(
  `Passed: ${files.filter((f) => f.endsWith('.html')).length} HTML pages, ${links} local links/assets, project structure, keyboard controls, and resume file.`,
);

const sitemap = await readFile(resolve(root, 'sitemap.xml'), 'utf8');
assert.equal((sitemap.match(/<loc>/g) || []).length, 11, 'eleven indexable pages in sitemap');
assert(sitemap.includes('/agent-flyers.html'), 'Agent Flyers included in sitemap');
assert(!sitemap.includes('/404'), '404 excluded from sitemap');
