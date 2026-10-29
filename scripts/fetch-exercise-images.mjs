// Baixa os 2 quadros de cada exercício usado em src/seed/exercises.ts
// do free-exercise-db (Unlicense / domínio público) para public/exercises/.
// Uso: node scripts/fetch-exercise-images.mjs
import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const BASE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises';
const src = await readFile(join(root, 'src/seed/exercises.ts'), 'utf8');
const ids = [...src.matchAll(/src: '([^']+)'/g)].map((m) => m[1]);

let ok = 0;
for (const id of ids) {
  for (const f of ['0.jpg', '1.jpg']) {
    const out = join(root, 'public/exercises', id, f);
    try {
      await access(out);
      ok++;
      continue;
    } catch {}
    const res = await fetch(`${BASE}/${encodeURIComponent(id)}/${f}`);
    if (!res.ok) {
      console.warn(`falhou: ${id}/${f} (${res.status})`);
      continue;
    }
    await mkdir(dirname(out), { recursive: true });
    await writeFile(out, Buffer.from(await res.arrayBuffer()));
    ok++;
  }
}
console.log(`${ok}/${ids.length * 2} imagens prontas em public/exercises/`);
