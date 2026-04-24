/**
 * Thin wrappers around the official Notion SDK + helpers to normalise rich text
 * and property values into plain TypeScript shapes our pages can consume.
 */
import { Client } from '@notionhq/client';
import type {
  PageObjectResponse,
  QueryDatabaseResponse,
} from '@notionhq/client/build/src/api-endpoints.js';

const token = process.env.NOTION_TOKEN;
if (!token) {
  console.warn(
    '[notion] NOTION_TOKEN is not set. Copy .env.example to .env and set it.',
  );
}

export const notion = new Client({ auth: token });

/** Fetch ALL pages of a database (handles pagination). */
export async function queryAll(databaseId: string): Promise<PageObjectResponse[]> {
  const pages: PageObjectResponse[] = [];
  let cursor: string | undefined;
  do {
    const res: QueryDatabaseResponse = await notion.databases.query({
      database_id: databaseId,
      start_cursor: cursor,
      page_size: 100,
    });
    for (const r of res.results) {
      if ('properties' in r) pages.push(r as PageObjectResponse);
    }
    cursor = res.has_more ? res.next_cursor ?? undefined : undefined;
  } while (cursor);
  return pages;
}

/* ------------------------------------------------------------------ */
/* Property readers — tolerant to missing/empty fields                */
/* ------------------------------------------------------------------ */

type Props = PageObjectResponse['properties'];

export function getTitle(props: Props, name: string): string {
  const p = props[name];
  if (p?.type === 'title') {
    return p.title.map((t) => t.plain_text).join('').trim();
  }
  return '';
}

export function getRichText(props: Props, name: string): string {
  const p = props[name];
  if (p?.type === 'rich_text') {
    return p.rich_text.map((t) => t.plain_text).join('').trim();
  }
  return '';
}

export function getSelect(props: Props, name: string): string | null {
  const p = props[name];
  if (p?.type === 'select') return p.select?.name ?? null;
  return null;
}

/** Reads a Select OR falls back to rich_text if the column has been left as text. */
export function getSelectOrText(props: Props, name: string): string | null {
  const p = props[name];
  if (!p) return null;
  if (p.type === 'select') return p.select?.name ?? null;
  if (p.type === 'rich_text') {
    const t = p.rich_text.map((x) => x.plain_text).join('').trim();
    return t || null;
  }
  return null;
}

export function getMultiSelect(props: Props, name: string): string[] {
  const p = props[name];
  if (p?.type === 'multi_select') return p.multi_select.map((s) => s.name);
  return [];
}

/** Reads a Multi-select OR splits a rich_text field on commas/semicolons. */
export function getMultiSelectOrCsv(props: Props, name: string): string[] {
  const p = props[name];
  if (!p) return [];
  if (p.type === 'multi_select') return p.multi_select.map((s) => s.name);
  if (p.type === 'rich_text') {
    const t = p.rich_text.map((x) => x.plain_text).join('').trim();
    if (!t) return [];
    return t.split(/[,;]/).map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

/** Reads a Files column, or falls back to url / rich_text containing a URL. */
export function getFileOrUrl(props: Props, name: string): string | null {
  const p = props[name];
  if (!p) return null;
  if (p.type === 'files') {
    const first = p.files[0];
    if (!first) return null;
    if (first.type === 'external') return first.external.url;
    if (first.type === 'file') return first.file.url;
    return null;
  }
  if (p.type === 'url') return p.url;
  if (p.type === 'rich_text') {
    const t = p.rich_text.map((x) => x.plain_text).join('').trim();
    return t || null;
  }
  return null;
}

export function getUrl(props: Props, name: string): string | null {
  const p = props[name];
  if (p?.type === 'url') return p.url;
  return null;
}

export function getEmail(props: Props, name: string): string | null {
  const p = props[name];
  if (p?.type === 'email') return p.email;
  return null;
}

export function getCheckbox(props: Props, name: string): boolean {
  const p = props[name];
  if (p?.type === 'checkbox') return p.checkbox;
  return false;
}

export function getNumber(props: Props, name: string): number | null {
  const p = props[name];
  if (p?.type === 'number') return p.number;
  return null;
}

export function getDateStart(props: Props, name: string): string | null {
  const p = props[name];
  if (p?.type === 'date') return p.date?.start ?? null;
  return null;
}

export function getDateEnd(props: Props, name: string): string | null {
  const p = props[name];
  if (p?.type === 'date') return p.date?.end ?? null;
  return null;
}

export function getRelationIds(props: Props, name: string): string[] {
  const p = props[name];
  if (p?.type === 'relation') return p.relation.map((r) => r.id);
  return [];
}

export function getFiles(props: Props, name: string): string[] {
  const p = props[name];
  if (p?.type !== 'files') return [];
  return p.files
    .map((f) => {
      if (f.type === 'external') return f.external.url;
      if (f.type === 'file') return f.file.url;
      return null;
    })
    .filter((u): u is string => !!u);
}

/** Turn "Jane Doe" into "jane-doe" for URL slugs. */
export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}
