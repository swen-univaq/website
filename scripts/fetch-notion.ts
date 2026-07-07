/**
 * Pulls all 8 Notion databases, normalises them into typed JSON, and writes
 * them to src/data/generated/ where Astro picks them up at build time.
 *
 * Run manually:  pnpm fetch:notion
 * Run as part of build: pnpm build  (invokes this first, then `astro build`)
 *
 * Requires NOTION_TOKEN in env (load via dotenv locally, GitHub Secrets on CI).
 */
import 'dotenv/config';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { NOTION_DB_IDS } from '../src/config/notion.js';
import {
  queryAll,
  getTitle,
  getRichText,
  getSelect,
  getSelectOrText,
  getMultiSelect,
  getMultiSelectOrCsv,
  getUrl,
  getEmail,
  getCheckbox,
  getNumber,
  getDateStart,
  getDateEnd,
  getRelationIds,
  getFiles,
  getFileOrUrl,
  slugify,
} from '../src/lib/notion.js';
import { renderPageBody } from '../src/lib/notion-blocks.js';

/** Filter leftover CSV placeholder rows (e.g. "website-notion-events" imported by mistake). */
function isPlaceholder(name: string): boolean {
  const n = name.toLowerCase().trim();
  return n.startsWith('website-notion') ||
         n.startsWith('(example') ||
         n === '' ||
         n.startsWith('placeholder');
}

const OUT_DIR = resolve(process.cwd(), 'src/data/generated');
mkdirSync(OUT_DIR, { recursive: true });

// ---------------------------------------------------------------------------
// Per-DB mappers. Each takes a PageObjectResponse and returns a typed row.
// Adapt column names to match what you set in Notion (case-sensitive).
// ---------------------------------------------------------------------------

async function fetchPeople() {
  const pages = await queryAll(NOTION_DB_IDS.people);
  const rows = pages
    .map((p) => {
      const name = getTitle(p.properties, 'Name');
      return {
        id: p.id,
        slug: slugify(name),
        name,
        role: getSelectOrText(p.properties, 'Role'),
        email: getEmail(p.properties, 'Email'),
        shortBio: getRichText(p.properties, 'Short bio (EN)'),
        longBio: getRichText(p.properties, 'Long bio (EN)'),
        interests: getMultiSelectOrCsv(p.properties, 'Research interests'),
        website: getUrl(p.properties, 'Website') ?? getRichText(p.properties, 'Website') ?? null,
        scholar: getUrl(p.properties, 'Scholar') ?? getRichText(p.properties, 'Scholar') ?? null,
        dblpPid: getRichText(p.properties, 'DBLP PID'),
        orcid: getRichText(p.properties, 'ORCID'),
        github: getRichText(p.properties, 'GitHub'),
        linkedin: getUrl(p.properties, 'LinkedIn') ?? getRichText(p.properties, 'LinkedIn') ?? null,
        status: getSelectOrText(p.properties, 'Status') ?? 'Active',
        order: getNumber(p.properties, 'Order') ?? 999,
        photo: getFileOrUrl(p.properties, 'Photo'),
        notes: getRichText(p.properties, 'Notes'),
      };
    })
    .filter((p) => !isPlaceholder(p.name));
  rows.sort((a, b) => a.order - b.order);
  return rows;
}

async function fetchLabs() {
  const pages = await queryAll(NOTION_DB_IDS.labs);
  return pages
    .map((p) => {
      const name = getTitle(p.properties, 'Name');
      return {
        id: p.id,
        slug: slugify(name),
        name,
        acronym: getRichText(p.properties, 'Acronym'),
        description: getRichText(p.properties, 'Description (EN)'),
        location: getRichText(p.properties, 'Location'),
        headIds: getRelationIds(p.properties, 'Head'),
        headText: getRichText(p.properties, 'Head'),
        researchLines: getMultiSelectOrCsv(p.properties, 'Research lines'),
        website: getUrl(p.properties, 'Website') ?? getRichText(p.properties, 'Website') ?? null,
        order: getNumber(p.properties, 'Order') ?? 999,
        status: getSelectOrText(p.properties, 'Status') ?? 'Active',
      };
    })
    .filter((l) => !isPlaceholder(l.name))
    .sort((a, b) => a.order - b.order);
}

async function fetchProjects() {
  const pages = await queryAll(NOTION_DB_IDS.projects);
  return pages
    .map((p) => {
      const name = getTitle(p.properties, 'Name');
      return {
        id: p.id,
        slug: slugify(getRichText(p.properties, 'Acronym') || name),
        name,
        acronym: getRichText(p.properties, 'Acronym'),
        funding: getSelectOrText(p.properties, 'Funding'),
        grantId: getRichText(p.properties, 'Grant ID'),
        periodStart: getDateStart(p.properties, 'Period start') ?? null,
        periodEnd: getDateEnd(p.properties, 'Period end') ?? getDateStart(p.properties, 'Period end'),
        description: getRichText(p.properties, 'Description (EN)'),
        website: getUrl(p.properties, 'Website') ?? getRichText(p.properties, 'Website') ?? null,
        piIds: getRelationIds(p.properties, 'PI'),
        piText: getRichText(p.properties, 'PI'),
        teamIds: getRelationIds(p.properties, 'Team'),
        labIds: getRelationIds(p.properties, 'Lab'),
        labText: getRichText(p.properties, 'Lab'),
        partners: getRichText(p.properties, 'Partners'),
        status: getSelectOrText(p.properties, 'Status') ?? 'Active',
      };
    })
    .filter((p) => !isPlaceholder(p.name));
}

async function fetchSoftware() {
  const pages = await queryAll(NOTION_DB_IDS.software);
  return pages
    .map((p) => {
      const name = getTitle(p.properties, 'Name');
      return {
        id: p.id,
        slug: slugify(name),
        name,
        shortDescription: getRichText(p.properties, 'Short description (EN)'),
        longDescription: getRichText(p.properties, 'Long description (EN)'),
        category: getSelectOrText(p.properties, 'Category'),
        language: getMultiSelectOrCsv(p.properties, 'Language'),
        repository: getUrl(p.properties, 'Repository') ?? getRichText(p.properties, 'Repository') ?? null,
        documentation: getUrl(p.properties, 'Documentation') ?? getRichText(p.properties, 'Documentation') ?? null,
        website: getUrl(p.properties, 'Website') ?? getRichText(p.properties, 'Website') ?? null,
        paper: getUrl(p.properties, 'Paper') ?? getRichText(p.properties, 'Paper') ?? null,
        pkg: getUrl(p.properties, 'Package') ?? getRichText(p.properties, 'Package') ?? null,
        license: getSelectOrText(p.properties, 'License'),
        maintainerIds: getRelationIds(p.properties, 'Maintainers'),
        maintainersText: getRichText(p.properties, 'Maintainers'),
        relatedProjectIds: getRelationIds(p.properties, 'Related projects'),
        relatedLabIds: getRelationIds(p.properties, 'Related labs'),
        relatedLabsText: getRichText(p.properties, 'Related labs'),
        status: getSelectOrText(p.properties, 'Status') ?? 'Active',
        featured: getCheckbox(p.properties, 'Featured'),
        order: getNumber(p.properties, 'Order') ?? 999,
      };
    })
    .filter((s) => !isPlaceholder(s.name))
    .sort((a, b) => a.order - b.order);
}

async function fetchTalks() {
  const pages = await queryAll(NOTION_DB_IDS.talks);
  return pages
    .map((p) => {
      const title = getTitle(p.properties, 'Title');
      // Some imports may interpret "External speaker" as text "TRUE"/"FALSE" instead of checkbox
      let external = getCheckbox(p.properties, 'External speaker');
      if (!external) {
        const asText = getRichText(p.properties, 'External speaker').toUpperCase();
        if (asText === 'TRUE') external = true;
      }
      return {
        id: p.id,
        slug: slugify(title).slice(0, 80),
        title,
        speaker: getRichText(p.properties, 'Speaker'),
        affiliation: getRichText(p.properties, 'Speaker affiliation'),
        external,
        date: getDateStart(p.properties, 'Date') ?? getRichText(p.properties, 'Date') ?? null,
        timeStart: getRichText(p.properties, 'Time start'),
        timeEnd: getRichText(p.properties, 'Time end'),
        location: getRichText(p.properties, 'Location'),
        abstract: getRichText(p.properties, 'Abstract'),
        relatedLabIds: getRelationIds(p.properties, 'Related lab'),
        relatedLabText: getRichText(p.properties, 'Related lab'),
        relatedPeopleIds: getRelationIds(p.properties, 'Related people'),
        postUrl: getUrl(p.properties, 'Post URL') ?? getRichText(p.properties, 'Post URL') ?? null,
        recordingUrl: getUrl(p.properties, 'Recording URL') ?? null,
        slidesUrl: getUrl(p.properties, 'Slides URL') ?? getRichText(p.properties, 'Slides URL') ?? null,
        status: getSelectOrText(p.properties, 'Status') ?? 'Past',
        featured: getCheckbox(p.properties, 'Featured'),
      };
    })
    .filter((t) => !isPlaceholder(t.title))
    .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
}

/** Where downloaded news images end up (Notion file URLs expire after ~1h). */
const NEWS_MEDIA_DIR = resolve(process.cwd(), 'public/news-media');
const NEWS_MEDIA_PREFIX = `${(process.env.SITE_BASE ?? '/').replace(/\/+$/, '')}/news-media`;

async function fetchNews() {
  const pages = await queryAll(NOTION_DB_IDS.news);
  const rows = pages
    .map((p) => {
      const title = getTitle(p.properties, 'Title');
      return {
        id: p.id,
        slug: slugify(title),
        title,
        date: getDateStart(p.properties, 'Date') ?? null,
        excerpt: getRichText(p.properties, 'Excerpt'),
        category: getSelectOrText(p.properties, 'Category'),
        featured: getCheckbox(p.properties, 'Featured'),
        status: getSelectOrText(p.properties, 'Status') ?? 'Published',
        bodyHtml: '',
      };
    })
    .filter((r) => !isPlaceholder(r.title))
    .filter((r) => r.status === 'Published')
    .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));

  // Page bodies: sequential to stay well within Notion rate limits (~3 req/s).
  for (const r of rows) {
    r.bodyHtml = await renderPageBody(r.id, {
      dir: NEWS_MEDIA_DIR,
      urlPrefix: NEWS_MEDIA_PREFIX,
    });
  }
  return rows;
}

async function fetchEvents() {
  const pages = await queryAll(NOTION_DB_IDS.events);
  return pages
    .map((p) => ({
      id: p.id,
      slug: slugify(getTitle(p.properties, 'Title')),
      title: getTitle(p.properties, 'Title'),
      dateStart: getDateStart(p.properties, 'Date start') ?? null,
      dateEnd: getDateEnd(p.properties, 'Date start') ?? null,
      location: getRichText(p.properties, 'Location'),
      type: getSelectOrText(p.properties, 'Type'),
      speaker: getRichText(p.properties, 'Speaker'),
      abstract: getRichText(p.properties, 'Abstract'),
      link: getUrl(p.properties, 'Link') ?? getRichText(p.properties, 'Link') ?? null,
      status: getSelectOrText(p.properties, 'Status') ?? 'Upcoming',
    }))
    .filter((e) => !isPlaceholder(e.title));
}

async function fetchTeaching() {
  const pages = await queryAll(NOTION_DB_IDS.teaching);
  return pages
    .map((p) => ({
      id: p.id,
      title: getTitle(p.properties, 'Title'),
      type: getSelectOrText(p.properties, 'Type'),
      level: getSelectOrText(p.properties, 'Level'),
      instructorIds: getRelationIds(p.properties, 'Instructor'),
      instructorText: getRichText(p.properties, 'Instructor'),
      academicYear: getRichText(p.properties, 'Academic year'),
      description: getRichText(p.properties, 'Description'),
      deadline: getDateStart(p.properties, 'Deadline') ?? null,
      status: getSelectOrText(p.properties, 'Status') ?? 'Open',
      link: getUrl(p.properties, 'Link') ?? getRichText(p.properties, 'Link') ?? null,
    }))
    .filter((t) => !isPlaceholder(t.title));
}

// ---------------------------------------------------------------------------

async function main() {
  if (!process.env.NOTION_TOKEN) {
    console.error('\n✗ NOTION_TOKEN not set. Create .env from .env.example.\n');
    process.exit(1);
  }

  console.log('→ Fetching Notion content...');
  const [people, labs, projects, software, talks, news, events, teaching] =
    await Promise.all([
      fetchPeople(),
      fetchLabs(),
      fetchProjects(),
      fetchSoftware(),
      fetchTalks(),
      fetchNews(),
      fetchEvents(),
      fetchTeaching(),
    ]);

  const writes: [string, unknown][] = [
    ['people.json', people],
    ['labs.json', labs],
    ['projects.json', projects],
    ['software.json', software],
    ['talks.json', talks],
    ['news.json', news],
    ['events.json', events],
    ['teaching.json', teaching],
  ];

  for (const [filename, data] of writes) {
    writeFileSync(
      resolve(OUT_DIR, filename),
      JSON.stringify(data, null, 2),
      'utf8',
    );
  }

  console.log(
    `✓ Wrote ${writes.length} files to src/data/generated/\n` +
      `  people=${people.length}  labs=${labs.length}  projects=${projects.length}  ` +
      `software=${software.length}  talks=${talks.length}  news=${news.length}  ` +
      `events=${events.length}  teaching=${teaching.length}`,
  );
}

main().catch((e) => {
  console.error('✗ fetch-notion failed:', e);
  process.exit(1);
});
