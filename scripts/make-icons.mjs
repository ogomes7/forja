// Gera os ícones PNG do app a partir de public/icons/icon.svg.
// Uso: node scripts/make-icons.mjs
import { readFile, writeFile } from 'node:fs/promises';
import { Resvg } from '@resvg/resvg-js';

const svg = await readFile(new URL('../public/icons/icon.svg', import.meta.url), 'utf8');
// Ícone iOS: sem cantos arredondados (o sistema aplica a máscara).
const square = svg.replace(/rx="\d+"/, 'rx="0"');
for (const [name, size, src] of [['icon-192.png', 192, svg], ['icon-512.png', 512, square], ['apple-touch-icon.png', 180, square]]) {
  const png = new Resvg(src, { fitTo: { mode: 'width', value: size } }).render().asPng();
  await writeFile(new URL(`../public/icons/${name}`, import.meta.url), png);
  console.log(name, png.length, 'bytes');
}
