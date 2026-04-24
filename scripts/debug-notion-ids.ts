/**
 * Diagnostic: asks Notion for the title of each DB ID we have configured,
 * plus the row count visible to the integration.
 *
 * Run:  pnpm tsx scripts/debug-notion-ids.ts
 */
import 'dotenv/config';
import { notion, queryAll } from '../src/lib/notion.js';
import { NOTION_DB_IDS } from '../src/config/notion.js';

async function main() {
  console.log('Mapping + row count diagnostic for the 8 Notion DB IDs:\n');
  console.log('key          title                       rows   id');
  console.log('─'.repeat(90));

  for (const [key, id] of Object.entries(NOTION_DB_IDS)) {
    try {
      const db = await notion.databases.retrieve({ database_id: id });
      const title =
        'title' in db && Array.isArray(db.title)
          ? db.title.map((t: any) => t.plain_text).join('').trim() || '(untitled)'
          : '(no title)';

      let rowCount: number | string = '?';
      try {
        const rows = await queryAll(id);
        rowCount = rows.length;
      } catch (qerr: any) {
        rowCount = `ERR: ${qerr.code ?? qerr.message}`;
      }

      const mismatch = !title.toLowerCase().includes(key.toLowerCase()) ? ' ⚠ mismatch' : '';
      console.log(
        `${key.padEnd(12)} ${title.padEnd(28)} ${String(rowCount).padEnd(6)} ${id}${mismatch}`,
      );
    } catch (e: any) {
      console.log(`${key.padEnd(12)} ERROR retrieve: ${e.message}`);
    }
  }
  console.log(
    '\nIf a DB shows "rows=0" but you can see rows in Notion, the integration\n' +
      'is not connected to that DB (or is connected to a different copy).\n' +
      'Fix: open the DB in Notion → ••• → Connections → add "SWEN Website Build".\n',
  );
}

main();
