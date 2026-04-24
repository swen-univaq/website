/**
 * Prints the column names and types of the People DB + first 3 rows' Role values,
 * so we can see if the column is called differently or is the wrong type.
 *
 * Run:  pnpm tsx scripts/debug-people-columns.ts
 */
import 'dotenv/config';
import { notion } from '../src/lib/notion.js';
import { NOTION_DB_IDS } from '../src/config/notion.js';

async function main() {
  const res = await notion.databases.query({
    database_id: NOTION_DB_IDS.people,
    page_size: 3,
  });

  if (res.results.length === 0) {
    console.log('People DB is empty.');
    return;
  }

  const first = res.results[0];
  if (!('properties' in first)) return;

  console.log('── Columns in People DB ─────────────────────');
  for (const [name, prop] of Object.entries(first.properties)) {
    console.log(`  "${name}" → type: ${prop.type}`);
  }

  console.log('\n── First 3 rows: Name + all property values (non-empty) ─────');
  for (const row of res.results) {
    if (!('properties' in row)) continue;
    const nameProp: any = Object.values(row.properties).find((p: any) => p.type === 'title');
    const name = nameProp?.title?.map((t: any) => t.plain_text).join('') ?? '(no title)';
    console.log(`\n  ▸ ${name}`);
    for (const [colName, prop] of Object.entries(row.properties)) {
      const p: any = prop;
      let value = '';
      switch (p.type) {
        case 'title': value = p.title.map((t: any) => t.plain_text).join(''); break;
        case 'rich_text': value = p.rich_text.map((t: any) => t.plain_text).join(''); break;
        case 'select': value = p.select?.name ?? ''; break;
        case 'multi_select': value = p.multi_select.map((s: any) => s.name).join(', '); break;
        case 'email': value = p.email ?? ''; break;
        case 'url': value = p.url ?? ''; break;
        case 'number': value = String(p.number ?? ''); break;
        case 'checkbox': value = String(p.checkbox); break;
        case 'date': value = p.date?.start ?? ''; break;
        case 'relation': value = `[${p.relation.length} rel]`; break;
        case 'files': value = `[${p.files.length} files]`; break;
        default: value = `(${p.type})`;
      }
      if (value.trim()) console.log(`    ${colName} (${p.type}) = ${value.slice(0, 60)}`);
    }
  }
}

main().catch(console.error);
