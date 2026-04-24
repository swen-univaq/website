/**
 * Astro Content Collections — currently we don't use Astro's native collections
 * since Notion is our source. We keep this file for future expansion
 * (e.g. in-repo MDX pages like About, Research manifesto) with Zod validation.
 */
import { defineCollection, z } from 'astro:content';

const pages = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    draft: z.boolean().optional(),
  }),
});

export const collections = { pages };
