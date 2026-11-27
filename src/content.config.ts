import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { docsSchema } from '@astrojs/starlight/schema';
import { getActiveCourse } from '../courses.mjs';

const course = getActiveCourse();

export const collections = {
  docs: defineCollection({
    loader: glob({
      base: new URL(`./content/docs/${course.id}`, import.meta.url),
      pattern: '**/[^_]*.{md,mdx,markdown}',
    }),
    schema: docsSchema(),
  }),
};
