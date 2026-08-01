import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const cdnAssetPattern = /https:\/\/cdn\.prod\.website-files\.com\/[^"'\s>]+/g;

export function readSourceBody(sourcePath: string): string {
  const source = readFileSync(fileURLToPath(new URL(sourcePath, import.meta.url)), 'utf8');
  const body = source.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1];
  if (!body) throw new Error(`Source page has no body: ${sourcePath}`);

  return body
    .replace(cdnAssetPattern, (url) => {
      const name = decodeURIComponent(url.split('/').pop() ?? '');
      return `/assets/${name}`;
    })
    .replace(/\sstyle="opacity:0"/g, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '');
}
