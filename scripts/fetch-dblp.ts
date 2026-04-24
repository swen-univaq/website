/**
 * For every SWEN member with a DBLP PID, fetches their publication list from
 * dblp.org/pid/{PID}.xml, filters to peer-reviewed journal and conference papers,
 * deduplicates by DOI / dblp key, and writes src/data/generated/publications.json.
 *
 * Run manually:  pnpm fetch:dblp
 * Run as part of build: pnpm build  (pnpm fetch:content runs this + notion + github)
 *
 * Resilient: if a PID times out or 404s, it is skipped with a warning — the build
 * does NOT fail because of DBLP downtime.
 */
import 'dotenv/config';
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { XMLParser } from 'fast-xml-parser';

const OUT_DIR = resolve(process.cwd(), 'src/data/generated');
mkdirSync(OUT_DIR, { recursive: true });

/* ----- Peer-reviewed venue whitelist -----
 * DBLP returns abbreviated journal names (e.g. "Softw. Syst. Model." for SoSyM),
 * so match against both the abbreviation and the full-name form.
 */
const JOURNAL_WHITELIST = [
  // SoSyM
  'softw. syst. model.', 'software and systems modeling', 'sosym',
  // TSE
  'ieee trans. software eng.', 'ieee trans. softw. eng.', 'transactions on software engineering',
  // TOSEM
  'acm trans. softw. eng. methodol.', 'trans. softw. eng. methodol.', 'transactions on software engineering and methodology',
  // EMSE
  'empir. softw. eng.', 'empirical software engineering',
  // JSS
  'j. syst. softw.', 'journal of systems and software',
  // IST
  'inf. softw. technol.', 'information and software technology',
  // SCP
  'sci. comput. program.', 'science of computer programming',
  // SoftwareX
  'softwarex',
  // SPE
  'softw. pract. exp.', 'software practice and experience', 'software: practice and experience',
  // IEEE Software
  'ieee softw.', 'ieee software',
  // Computer (IEEE)
  'computer',
  // Automated Software Engineering Journal
  'autom. softw. eng.', 'automated software engineering',
  // Journal of Computer Languages
  'j. comput. lang.', 'journal of computer languages',
  // Journal of Object Technology
  'j. object technol.', 'journal of object technology',
  // Systems Engineering (Wiley)
  'syst. eng.', 'systems engineering',
];
const CONFERENCE_WHITELIST = [
  'icse', 'fse', 'ase', 'issta', 'icsme', 'saner', 'models', 'ecmfa', 'sle', 'gpce',
  'splc', 'icsa', 'esem', 'msr', 'icse-companion', 'icpc', 'wcre', 'compsac',
  'quatic', 'seaa', 'euromicro', 'sigsoft',
  // Added: commonly referenced SE venues
  'icmt', 'ease', 'sbes', 'scam', 'profes', 'refsq', 'caise', 're ',
  'modelsward', 'modellierung', 'staf', 'msr',
];

function isWhitelistedJournal(venue: string): boolean {
  const v = venue.toLowerCase();
  return JOURNAL_WHITELIST.some((j) => v.includes(j));
}
function isWhitelistedConference(booktitle: string): boolean {
  const b = booktitle.toLowerCase();
  // reject common workshop/poster markers even if the host conference is whitelisted
  if (/workshop|poster|demo|doctoral symposium|journal-first|companion.+workshop/i.test(booktitle)) {
    return false;
  }
  return CONFERENCE_WHITELIST.some((c) => b.includes(c));
}

/* ----- Types ----- */
type Publication = {
  key: string;          // dblp key, stable identifier
  type: 'article' | 'inproceedings';
  title: string;
  authors: string[];
  venue: string;        // journal name or conference abbreviation
  year: number;
  doi?: string;
  ee?: string;          // external electronic edition link
  bibtexKey?: string;
  authorsSwen: string[]; // subset of authors that are SWEN members
};

type PersonRow = {
  id: string;
  name: string;
  dblpPid: string;
};

async function fetchPidXml(pid: string): Promise<string | null> {
  const url = `https://dblp.org/pid/${pid}.xml`;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'SWEN-website-builder/1.0 (contact: alfonso.pierantonio@univaq.it)' },
    });
    if (!res.ok) {
      console.warn(`  × DBLP ${pid}: HTTP ${res.status}`);
      return null;
    }
    return await res.text();
  } catch (e: any) {
    console.warn(`  × DBLP ${pid}: ${e.message}`);
    return null;
  }
}

function normalizeList<T>(x: T | T[] | undefined): T[] {
  if (x === undefined || x === null) return [];
  return Array.isArray(x) ? x : [x];
}

function extractText(node: any): string {
  if (node == null) return '';
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);
  if (typeof node === 'object' && '#text' in node) return String(node['#text']);
  return '';
}

function parseDblpXml(xml: string, person: PersonRow): Publication[] {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    textNodeName: '#text',
    parseAttributeValue: false,
    trimValues: true,
  });
  let doc: any;
  try {
    doc = parser.parse(xml);
  } catch {
    return [];
  }

  const root = doc?.dblpperson?.r;
  if (!root) return [];
  const entries = normalizeList(root);

  const pubs: Publication[] = [];
  for (const entry of entries) {
    for (const type of ['article', 'inproceedings'] as const) {
      const items = normalizeList(entry[type]);
      for (const item of items) {
        if (!item) continue;

        const publtype = item['@_publtype'];
        if (publtype === 'informal' || publtype === 'withdrawn') continue;

        const title = extractText(item.title).replace(/\.$/, '').trim();
        if (!title) continue;
        const year = parseInt(extractText(item.year), 10) || 0;
        if (year < 2000) continue;

        const authors = normalizeList(item.author).map(extractText).filter(Boolean);
        const key = item['@_key'] ?? '';
        const doi = extractText(item.ee).match(/doi\.org\/(.+)/)?.[1];
        const ee = extractText(item.ee) || undefined;

        let venue = '';
        if (type === 'article') {
          venue = extractText(item.journal);
          if (!venue || !isWhitelistedJournal(venue)) continue;
          if (/arxiv|corr/i.test(venue)) continue;
        } else {
          venue = extractText(item.booktitle);
          if (!venue || !isWhitelistedConference(venue)) continue;
        }

        pubs.push({
          key,
          type,
          title,
          authors,
          venue,
          year,
          doi,
          ee,
          authorsSwen: [person.name],
        });
      }
    }
  }
  return pubs;
}

function dedupe(all: Publication[]): Publication[] {
  const byKey = new Map<string, Publication>();
  for (const p of all) {
    const existing = byKey.get(p.key);
    if (!existing) {
      byKey.set(p.key, p);
    } else {
      // merge authorsSwen
      const merged = new Set([...existing.authorsSwen, ...p.authorsSwen]);
      existing.authorsSwen = Array.from(merged);
    }
  }
  return Array.from(byKey.values());
}

async function main() {
  const peoplePath = resolve(OUT_DIR, 'people.json');
  if (!existsSync(peoplePath)) {
    console.error('✗ src/data/generated/people.json not found. Run `pnpm fetch:notion` first.');
    process.exit(1);
  }
  const people: PersonRow[] = JSON.parse(readFileSync(peoplePath, 'utf8'));
  const withPids = people.filter((p) => p.dblpPid && p.dblpPid.trim().length > 0);

  console.log(`→ Fetching DBLP for ${withPids.length}/${people.length} people with a PID...\n`);

  const allPubs: Publication[] = [];
  for (const person of withPids) {
    const pid = person.dblpPid.trim();
    const xml = await fetchPidXml(pid);
    if (!xml) continue;
    const pubs = parseDblpXml(xml, person);
    console.log(`  ✓ ${person.name.padEnd(30)} (${pid}) → ${pubs.length} peer-reviewed`);
    allPubs.push(...pubs);
    // be polite to DBLP
    await new Promise((r) => setTimeout(r, 300));
  }

  const unique = dedupe(allPubs).sort((a, b) => b.year - a.year || a.title.localeCompare(b.title));
  writeFileSync(resolve(OUT_DIR, 'publications.json'), JSON.stringify(unique, null, 2), 'utf8');

  console.log(
    `\n✓ Wrote publications.json with ${unique.length} unique peer-reviewed entries` +
      ` (from ${allPubs.length} raw, ${withPids.length} authors).`,
  );
  if (withPids.length === 0) {
    console.log(
      '\n⚠ No people had a DBLP PID set. Fill the "DBLP PID" field in Notion (e.g. p/AlfonsoPierantonio) to populate publications.',
    );
  }
}

main().catch((e) => {
  console.error('✗ fetch-dblp failed:', e);
  process.exit(1);
});
