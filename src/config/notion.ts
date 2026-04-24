/**
 * Notion database IDs — public identifiers, safe to commit.
 * The NOTION_TOKEN that grants access to them is instead a secret and must live
 * in environment variables (.env locally, GitHub Secrets on CI).
 *
 * Mapping verified via scripts/debug-notion-ids.ts on 2026-04-24.
 */
export const NOTION_DB_IDS = {
  people:   '34cb8bb3ac2d804c909dcf1f7149f336',
  labs:     '34cb8bb3ac2d816d8487d13f4afb1598',
  projects: '34cb8bb3ac2d817da7f4f122675053f6',
  software: '34cb8bb3ac2d819788b3e02b7ba39384',
  talks:    '34cb8bb3ac2d81e0b24ece4707e01fee',
  news:     '34cb8bb3ac2d81d1b11cf5e4600e5ad8',
  events:   '34cb8bb3ac2d80fba4cef97e6462b359',
  teaching: '34cb8bb3ac2d814f9a1fe4203bc89ece',
} as const;

export type NotionDbKey = keyof typeof NOTION_DB_IDS;
