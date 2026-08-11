#!/usr/bin/env bun
// Combine .cho/.chordpro files into one app-importable repertoire file.
// Usage: bun tools/combine_cho.ts songs/ --recursive --sort

import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';

const args = process.argv.slice(2);
const recursive = args.includes('--recursive');
const sortTitles = args.includes('--sort');
const overwrite = args.includes('--overwrite');
const dryRun = args.includes('--dry-run');
const inputs: string[] = [];
let output = `repertoire_${new Date().toISOString().slice(0, 10)}.cho`;

for (let i = 0; i < args.length; i += 1) {
  if (args[i] === '-o' || args[i] === '--output') {
    output = args[++i] || '';
  } else if (args[i]?.startsWith('--output=')) {
    output = args[i].slice(9);
  } else if (!args[i].startsWith('-')) {
    inputs.push(args[i]);
  }
}

if (!inputs.length || !output) {
  console.error('Usage: bun tools/combine_cho.ts <files/directories...> [-o output.cho] [options]');
  process.exit(1);
}

const outputPath = resolve(output);

async function collect(path: string): Promise<string[]> {
  const info = await stat(path);
  if (info.isFile()) return /\.(cho|chordpro)$/i.test(path) ? [resolve(path)] : [];

  const files: string[] = [];
  for (const entry of await readdir(path, { withFileTypes: true })) {
    const child = join(path, entry.name);
    if (entry.isFile() && /\.(cho|chordpro)$/i.test(entry.name)) files.push(resolve(child));
    if (recursive && entry.isDirectory()) files.push(...await collect(child));
  }
  return files;
}

const fileSet = new Set<string>();
for (const input of inputs) {
  try {
    for (const file of await collect(input)) if (file !== outputPath) fileSet.add(file);
  } catch (error) {
    console.error(`Warning: skipping ${input}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

const files = [...fileSet].sort((a, b) => a.localeCompare(b));
if (!files.length) {
  console.error('Error: no .cho or .chordpro files found.');
  process.exit(1);
}

const songs: { title: string; text: string }[] = [];
let processed = 0;

for (const file of files) {
  try {
    const blocks = (await readFile(file, 'utf8'))
      .split(/\r?\n---\r?\n/)
      .map((block) => block.trim())
      .filter(Boolean);
    if (!blocks.length) {
      console.log(`SKIP ${relative(process.cwd(), file)} (empty)`);
      continue;
    }

    for (const text of blocks) {
      songs.push({
        text,
        title: text.match(/\{(?:title|t):\s*([^}\r\n]+)\}/i)?.[1].trim() || 'Untitled',
      });
    }
    processed += 1;
    console.log(`Added ${blocks.length} song(s) from ${relative(process.cwd(), file)}`);
  } catch (error) {
    console.error(`ERROR reading ${file}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (!songs.length) {
  console.error('Error: no songs extracted.');
  process.exit(1);
}

if (sortTitles) songs.sort((a, b) => a.title.localeCompare(b.title));

if (dryRun) {
  console.log(`Dry run: would write ${songs.length} song(s) to ${outputPath}`);
  songs.forEach((song, index) => console.log(`${index + 1}. ${song.title}`));
  process.exit(0);
}

try {
  await stat(outputPath);
  if (!overwrite) throw new Error(`output already exists: ${outputPath} (use --overwrite)`);
} catch (error) {
  if (error instanceof Error && !error.message.startsWith('ENOENT')) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

await writeFile(outputPath, `${songs.map((song) => song.text).join('\n---\n')}\n`, 'utf8');
console.log(`Wrote ${songs.length} song(s) to ${outputPath} from ${processed} file(s).`);
