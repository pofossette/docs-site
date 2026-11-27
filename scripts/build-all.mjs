import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { COURSES } from '../courses.mjs';

const siteRoot = resolve(import.meta.dirname, '..');
const distDir = resolve(siteRoot, 'dist');
const astroCacheDir = resolve(siteRoot, '.astro');
const astroBin = resolve(siteRoot, 'node_modules', '.bin', 'astro');

rmSync(distDir, { recursive: true, force: true });
mkdirSync(distDir, { recursive: true });

for (const courseId of Object.keys(COURSES)) {
  console.log(`\n==> Building isolated site for course: ${courseId} (base: ${COURSES[courseId].base})`);
  if (existsSync(astroCacheDir)) {
    rmSync(astroCacheDir, { recursive: true, force: true });
  }
  execFileSync(astroBin, ['build'], {
    cwd: siteRoot,
    stdio: 'inherit',
    env: {
      ...process.env,
      COURSE_ID: courseId,
    },
  });
}

const courseCardsHtml = Object.values(COURSES)
  .map(
    (c) => `
      <a class="card" href="${c.base}/">
        <div class="card-head">
          <h2>${c.title}</h2>
          <span class="arrow">&rarr;</span>
        </div>
        <p>${c.description}</p>
        <code>${c.base}/</code>
      </a>`
  )
  .join('\n');

const portalHtml = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>交互式学习笔记导航</title>
  <style>
    :root {
      color-scheme: light dark;
      --bg: #ffffff;
      --fg: #171717;
      --muted: #52525b;
      --card-bg: #fafafa;
      --border: #eaeaea;
      --border-hover: #0070f3;
      --code-bg: #f4f4f5;
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #000000;
        --fg: #ededed;
        --muted: #a1a1aa;
        --card-bg: #0a0a0a;
        --border: #27272a;
        --border-hover: #38bdf8;
        --code-bg: #18181b;
      }
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      background: var(--bg);
      color: var(--fg);
      font-family: -apple-system, BlinkMacSystemFont, "Inter", "PingFang SC", "Noto Sans SC", sans-serif;
      padding: 2rem 1.25rem;
    }
    main { width: 100%; max-width: 780px; }
    header { margin-bottom: 2rem; }
    h1 {
      margin: 0 0 0.5rem;
      font-size: clamp(1.5rem, 3vw, 2rem);
      font-weight: 700;
      letter-spacing: -0.02em;
    }
    header p {
      margin: 0;
      color: var(--muted);
      font-size: 0.98rem;
      line-height: 1.6;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1rem;
    }
    .card {
      display: flex;
      flex-direction: column;
      gap: 0.65rem;
      padding: 1.35rem;
      border-radius: 12px;
      border: 1px solid var(--border);
      background: var(--card-bg);
      color: inherit;
      text-decoration: none;
      transition: border-color 0.15s ease, transform 0.15s ease;
    }
    .card:hover {
      border-color: var(--border-hover);
      transform: translateY(-2px);
    }
    .card-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
    }
    .card h2 { margin: 0; font-size: 1.1rem; font-weight: 600; }
    .arrow { color: var(--muted); font-size: 1.1rem; }
    .card p {
      margin: 0;
      color: var(--muted);
      font-size: 0.9rem;
      line-height: 1.55;
      flex: 1;
    }
    .card code {
      align-self: flex-start;
      padding: 0.2rem 0.5rem;
      border-radius: 6px;
      background: var(--code-bg);
      font-size: 0.8rem;
      color: var(--muted);
    }
  </style>
</head>
<body>
  <main>
    <header>
      <h1>交互式学习笔记入口</h1>
      <p>各专题站点按路径独立构建与隔离，拥有独立的目录侧边栏与全文检索。</p>
    </header>
    <section class="grid">
${courseCardsHtml}
    </section>
  </main>
</body>
</html>
`;

const notFoundHtml = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>404 Not Found</title>
  <style>
    :root { color-scheme: light dark; }
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      font-family: -apple-system, BlinkMacSystemFont, "Inter", sans-serif;
    }
    main { text-align: center; padding: 2rem; }
    h1 { font-size: 1.75rem; margin: 0 0 0.5rem; }
    a { color: #0070f3; text-decoration: none; font-size: 0.95rem; }
  </style>
</head>
<body>
  <main>
    <h1>404</h1>
    <p><a href="/">返回入口首页 &rarr;</a></p>
  </main>
</body>
</html>
`;

writeFileSync(resolve(distDir, 'index.html'), portalHtml, 'utf8');
writeFileSync(resolve(distDir, '404.html'), notFoundHtml, 'utf8');
console.log('\n==> All isolated course builds completed.');
