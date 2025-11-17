import { defineCollection, z } from 'astro:content';
import { file } from 'astro/loaders';

const entries = defineCollection({
  loader: file("src/data/entries.json"),
  schema: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      description: z.string().optional(),
      icon: z.string().optional(),
      link: z.string().optional(),
  }))
});

// Export a single `collections` object to register your collection(s)
export const collections = { entries };