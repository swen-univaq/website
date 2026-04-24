import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
// @ts-expect-error — generated at build time
import newsData from '../data/generated/news.json';
// @ts-expect-error — generated at build time
import talksData from '../data/generated/talks.json';

type News = { slug: string; title: string; date: string | null; excerpt: string; category: string | null; status: string };
type Talk = { slug: string; title: string; speaker: string; affiliation: string; date: string | null; abstract: string; status: string };

export async function GET(context: APIContext) {
  const news = (newsData as News[]).filter((n) => n.status === 'Published');
  const talks = (talksData as Talk[]);

  const items = [
    ...news.map((n) => ({
      title: n.title,
      description: n.excerpt,
      pubDate: n.date ? new Date(n.date) : new Date(),
      link: `/news/${n.slug}`,
      categories: n.category ? [n.category] : [],
    })),
    ...talks.map((t) => ({
      title: `SWEN Talk: ${t.title}`,
      description: `${t.speaker}${t.affiliation ? ` (${t.affiliation})` : ''} — ${t.abstract.slice(0, 200)}...`,
      pubDate: t.date ? new Date(t.date) : new Date(),
      link: `/talks`,
      categories: ['Talk'],
    })),
  ].sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime());

  return rss({
    title: 'SWEN — Software Engineering Research Group',
    description: 'News and talks from the SWEN Research Group at DISIM, Università degli Studi dell\'Aquila.',
    site: context.site ?? 'https://swen-univaq.github.io',
    items,
    customData: '<language>en-us</language>',
  });
}
