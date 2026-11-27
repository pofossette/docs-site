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

const neutralHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex, nofollow" />
  <title>404 Not Found</title>
  <style>
    :root { color-scheme: light dark; }
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      font-family: -apple-system, BlinkMacSystemFont, "Inter", sans-serif;
      color: #666;
    }
    main { text-align: center; padding: 2rem; }
    h1 { font-size: 1.5rem; font-weight: 600; margin: 0 0 0.5rem; }
    p { font-size: 0.9rem; margin: 0; opacity: 0.8; }
  </style>
</head>
<body>
  <main>
    <h1>404</h1>
    <p>Page not found.</p>
  </main>
</body>
</html>
`;

writeFileSync(resolve(distDir, 'index.html'), neutralHtml, 'utf8');
writeFileSync(resolve(distDir, '404.html'), neutralHtml, 'utf8');
console.log('\n==> All isolated course builds completed.');
