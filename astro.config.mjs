import { defineConfig } from 'astro/config';
import mermaid from 'astro-mermaid';
import starlight from '@astrojs/starlight';
import react from '@astrojs/react';
import { unified } from '@astrojs/markdown-remark';
import tailwindcss from '@tailwindcss/vite';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

export default defineConfig({
  ...(process.env.SITE_URL ? { site: process.env.SITE_URL } : {}),
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
      title: '交互式学习笔记',
      description: '个人技术文档、交互式推导与可视化学习笔记',
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
          label: '平台导览',
          items: [
            { label: '平台总览与使用指引', slug: 'index' },
          ],
        },
        {
          label: '编译原理生动交互实验室',
          items: [{ autogenerate: { directory: 'compiler' } }],
        },
        {
          label: '软件需求分析全景交互教程',
          items: [{ autogenerate: { directory: 'se-req' } }],
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
