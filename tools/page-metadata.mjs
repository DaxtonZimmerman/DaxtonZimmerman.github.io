import { readFile } from 'node:fs/promises';
import sharp from 'sharp';

const escapeAttribute = (value) =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');

export function pageUrl(file, origin) {
  const path = file === 'index.html' ? '/' : '/' + file;
  return new URL(path, origin).href;
}

// The output filename determines its URL. Project pages use their real screenshot.
export async function pageMetadata(file, { site, projects, root }) {
  const project = projects.find((item) => file === `work/${item.id}.html`);
  const image = project ? `assets/${project.image}` : site.shareImage;
  const imageAlt = project ? `Screenshot of the ${project.name} website` : site.shareImageAlt;
  const imageData = await readFile(new URL(`dist/${image}`, root));
  const isPng = image.endsWith('.png');
  const { width, height } = await sharp(imageData).metadata();
  const url = pageUrl(file, site.origin);
  const imageUrl = new URL(image, site.origin + '/').href;
  const canonical =
    file === '404.html'
      ? '<meta name="robots" content="noindex,follow" />'
      : `<link rel="canonical" href="${escapeAttribute(url)}" />`;
  return `${canonical}
    <meta property="og:url" content="${escapeAttribute(url)}" />
    <meta property="og:site_name" content="${escapeAttribute(site.name)}" />
    <meta property="og:locale" content="en_US" />
    <meta property="og:image" content="${escapeAttribute(imageUrl)}" />
    <meta property="og:image:alt" content="${escapeAttribute(imageAlt)}" />
    <meta property="og:image:type" content="${isPng ? 'image/png' : 'image/jpeg'}" />
    <meta property="og:image:width" content="${width}" />
    <meta property="og:image:height" content="${height}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:image" content="${escapeAttribute(imageUrl)}" />
    <meta name="twitter:image:alt" content="${escapeAttribute(imageAlt)}" />`;
}
