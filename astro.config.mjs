import { defineConfig } from 'astro/config';
import mermaid from 'astro-mermaid';
import starlight from '@astrojs/starlight';
import react from '@astrojs/react';
import { unified } from '@astrojs/markdown-remark';
import tailwindcss from '@tailwindcss/vite';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { getActiveCourse } from './courses.mjs';

const course = getActiveCourse();

export default defineConfig({
  ...(process.env.SITE_URL ? { site: process.env.SITE_URL } : {}),
  base: course.base,
  outDir: `./dist/${course.id}`,
  vite: {
    plugins: [tailwindcss()],
    build: {
      emptyOutDir: false,
    },
  },
  integrations: [
    mermaid({
      theme: 'neutral',
      autoTheme: true,
      enableLog: false,
      mermaidConfig: {
        flowchart: {
          curve: 'basis',
          padding: 16,
          nodeSpacing: 40,
          rankSpacing: 48,
          htmlLabels: true,
        },
        sequence: {
          mirrorActors: false,
          bottomMarginAdj: 2,
        },
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Inter', 'PingFang SC', 'Hiragino Sans GB', 'Noto Sans SC', sans-serif",
      },
    }),
    starlight({
      title: course.title,
      description: course.description,
      social: [
        {
          icon: 'github',
          label: 'GitHub',
          href: 'https://github.com/pofossette/docs-site',
        },
      ],
      customCss: [
        'katex/dist/katex.min.css',
        './src/styles/custom.css',
      ],
      sidebar: [
        {
          autogenerate: { directory: '.' },
        },
      ],
    }),
    react(),
  ],
  markdown: {
    processor: unified({
      remarkPlugins: [remarkMath],
      rehypePlugins: [rehypeKatex],
    }),
  },
});
