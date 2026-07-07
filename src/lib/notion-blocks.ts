/**
 * Fetches the child blocks of a Notion page and renders them to a
 * self-contained HTML string. Runs only at build time (scripts/fetch-notion.ts);
 * the resulting HTML is baked into src/data/generated/*.json.
 *
 * Supported blocks: paragraph, heading_1–3, bulleted/numbered lists (nested),
 * quote, callout, toggle, code, divider, image, video, embed, bookmark, table.
 * Unknown blocks degrade to their plain text — they never break the build.
 *
 * Notion-hosted files use signed URLs that expire after ~1 hour, so images are
 * downloaded into public/ (see MediaOptions) and referenced by a stable path.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { notion } from './notion.js';

export type MediaOptions = {
  /** Absolute filesystem dir where downloaded media is written (inside public/). */
  dir: string;
  /** Public URL prefix for that dir, e.g. "/news-media" (no trailing slash). */
  urlPrefix: string;
};

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

const esc = (s: string): string =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

function plain(rt: any[]): string {
  return (rt ?? []).map((t) => t.plain_text).join('').trim();
}

/** Rich text → inline HTML honouring bold/italic/code/strike/underline/links. */
function renderRichText(rt: any[]): string {
  return (rt ?? [])
    .map((t) => {
      let html = esc(t.plain_text);
      const a = t.annotations ?? {};
      if (a.code) html = `<code>${html}</code>`;
      if (a.bold) html = `<strong>${html}</strong>`;
      if (a.italic) html = `<em>${html}</em>`;
      if (a.strikethrough) html = `<s>${html}</s>`;
      if (a.underline) html = `<u>${html}</u>`;
      if (t.href) html = `<a href="${esc(t.href)}" target="_blank" rel="noopener">${html}</a>`;
      return html;
    })
    .join('');
}

/** All children of a block/page, following pagination. */
async function listChildren(blockId: string): Promise<any[]> {
  const blocks: any[] = [];
  let cursor: string | undefined;
  do {
    const res: any = await notion.blocks.children.list({
      block_id: blockId,
      start_cursor: cursor,
      page_size: 100,
    });
    blocks.push(...res.results);
    cursor = res.has_more ? res.next_cursor ?? undefined : undefined;
  } while (cursor);
  return blocks;
}

/** Download a Notion-hosted file to public/, return its stable public URL. */
async function saveMedia(url: string, blockId: string, media: MediaOptions): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    const fromPath = new URL(url).pathname.match(/\.(png|jpe?g|gif|webp|svg|avif)$/i)?.[0];
    const ct = res.headers.get('content-type') ?? '';
    const fromCt =
      ct.includes('png') ? '.png' :
      ct.includes('gif') ? '.gif' :
      ct.includes('webp') ? '.webp' :
      ct.includes('svg') ? '.svg' : '.jpg';
    const filename = `${blockId}${(fromPath ?? fromCt).toLowerCase()}`;
    mkdirSync(media.dir, { recursive: true });
    writeFileSync(join(media.dir, filename), buf);
    return `${media.urlPrefix}/${filename}`;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Block renderers                                                    */
/* ------------------------------------------------------------------ */

async function renderChildrenOf(b: any, media: MediaOptions): Promise<string> {
  return b.has_children ? renderBlocks(await listChildren(b.id), media) : '';
}

async function renderListItem(b: any, media: MediaOptions): Promise<string> {
  const inner = renderRichText(b[b.type].rich_text);
  const children = await renderChildrenOf(b, media);
  return `<li>${inner}${children}</li>`;
}

async function renderBlock(b: any, media: MediaOptions): Promise<string> {
  switch (b.type) {
    case 'paragraph': {
      const t = renderRichText(b.paragraph.rich_text);
      return t ? `<p>${t}</p>` : '';
    }
    // Page h1 is the news title, so shift Notion headings down one level.
    case 'heading_1':
      return `<h2>${renderRichText(b.heading_1.rich_text)}</h2>`;
    case 'heading_2':
      return `<h3>${renderRichText(b.heading_2.rich_text)}</h3>`;
    case 'heading_3':
      return `<h4>${renderRichText(b.heading_3.rich_text)}</h4>`;
    case 'quote':
      return `<blockquote><p>${renderRichText(b.quote.rich_text)}</p>${await renderChildrenOf(b, media)}</blockquote>`;
    case 'callout': {
      const icon = b.callout.icon?.type === 'emoji' ? `${b.callout.icon.emoji} ` : '';
      return `<aside class="callout"><p>${icon}${renderRichText(b.callout.rich_text)}</p>${await renderChildrenOf(b, media)}</aside>`;
    }
    case 'toggle':
      return `<details><summary>${renderRichText(b.toggle.rich_text)}</summary>${await renderChildrenOf(b, media)}</details>`;
    case 'code': {
      const lang = b.code.language ?? '';
      return `<pre><code class="language-${esc(lang)}">${esc(plain(b.code.rich_text))}</code></pre>`;
    }
    case 'divider':
      return '<hr />';
    case 'image': {
      const src = b.image.type === 'external' ? b.image.external.url : b.image.file.url;
      // Notion-hosted URLs expire → persist a local copy.
      const finalSrc = b.image.type === 'file' ? (await saveMedia(src, b.id, media)) ?? src : src;
      const caption = renderRichText(b.image.caption);
      const alt = plain(b.image.caption);
      return (
        `<figure><img src="${esc(finalSrc)}" alt="${esc(alt)}" loading="lazy" />` +
        (caption ? `<figcaption>${caption}</figcaption>` : '') +
        `</figure>`
      );
    }
    case 'video': {
      const url = b.video.type === 'external' ? b.video.external.url : b.video.file.url;
      return `<p><a href="${esc(url)}" target="_blank" rel="noopener">▶ Watch video</a></p>`;
    }
    case 'embed':
      return `<p><a href="${esc(b.embed.url)}" target="_blank" rel="noopener">${esc(b.embed.url)}</a></p>`;
    case 'bookmark': {
      const cap = renderRichText(b.bookmark.caption);
      return `<p><a href="${esc(b.bookmark.url)}" target="_blank" rel="noopener">${cap || esc(b.bookmark.url)}</a></p>`;
    }
    case 'table': {
      const rows = await listChildren(b.id);
      const hasHeader = !!b.table?.has_column_header;
      const trs = rows
        .filter((r) => r.type === 'table_row')
        .map((r, idx) => {
          const tag = hasHeader && idx === 0 ? 'th' : 'td';
          const cells = r.table_row.cells
            .map((c: any[]) => `<${tag}>${renderRichText(c)}</${tag}>`)
            .join('');
          return `<tr>${cells}</tr>`;
        })
        .join('');
      return `<table>${trs}</table>`;
    }
    default: {
      // Graceful degradation for anything unexpected.
      const rt = b[b.type]?.rich_text;
      const t = rt ? renderRichText(rt) : '';
      return t ? `<p>${t}</p>` : '';
    }
  }
}

/** Render a flat block array, grouping consecutive list items into ul/ol. */
async function renderBlocks(blocks: any[], media: MediaOptions): Promise<string> {
  const out: string[] = [];
  let i = 0;
  while (i < blocks.length) {
    const type = blocks[i].type;
    if (type === 'bulleted_list_item' || type === 'numbered_list_item') {
      const tag = type === 'bulleted_list_item' ? 'ul' : 'ol';
      const items: string[] = [];
      while (i < blocks.length && blocks[i].type === type) {
        items.push(await renderListItem(blocks[i], media));
        i++;
      }
      out.push(`<${tag}>${items.join('')}</${tag}>`);
      continue;
    }
    const html = await renderBlock(blocks[i], media);
    if (html) out.push(html);
    i++;
  }
  return out.join('\n');
}

/** Public entry point: full page body → HTML string ('' if the page is empty). */
export async function renderPageBody(pageId: string, media: MediaOptions): Promise<string> {
  return renderBlocks(await listChildren(pageId), media);
}
