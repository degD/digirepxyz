#!/usr/bin/env bun
// Convert every PDF or DOCX in a directory to separate ChordPro files.
// Requires GEMINI_API_KEY in the repository .env; run with Bun.
// Usage: bun tools/batch_convert.ts songs/ --recursive

import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { basename, extname, join, relative, resolve } from 'node:path';
import { unzipSync } from 'fflate';

const [, , directory, ...args] = process.argv;
const recursive = args.includes('--recursive');
const overwrite = args.includes('--overwrite');
const dryRun = args.includes('--dry-run');
const apiKey = process.env.GEMINI_API_KEY;
const model = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';

if (!directory) {
  console.error('Usage: bun tools/batch_convert.ts <directory> [--recursive] [--overwrite] [--dry-run]');
  process.exit(1);
}

const directoryPath = resolve(directory);

try {
  if (!(await stat(directoryPath)).isDirectory()) throw new Error('not a directory');
} catch (error) {
  console.error(`Error: ${directoryPath} is ${error instanceof Error ? error.message : 'not available'}.`);
  process.exit(1);
}

const sourceExtensions = new Set(['.pdf', '.docx']);

async function collect(path: string): Promise<string[]> {
  const files: string[] = [];
  for (const entry of await readdir(path, { withFileTypes: true })) {
    const child = join(path, entry.name);
    if (entry.isFile() && sourceExtensions.has(extname(entry.name).toLowerCase())) files.push(resolve(child));
    if (recursive && entry.isDirectory()) files.push(...await collect(child));
  }
  return files;
}

function extractDocxText(bytes: Uint8Array): string {
  const xmlBytes = unzipSync(bytes)['word/document.xml'];
  if (!xmlBytes) throw new Error('DOCX file has no document body.');

  const paragraphs = new TextDecoder().decode(xmlBytes).match(/<w:p\b[\s\S]*?<\/w:p>/gi) || [];
  const text = paragraphs.map((paragraph) => {
    const parts = paragraph.match(/<w:t\b[^>]*>[\s\S]*?<\/w:t>|<w:tab\b[^>]*\/?>(?:<\/w:tab>)?|<w:br\b[^>]*\/?>(?:<\/w:br>)?/gi) || [];
    return parts.map((part) => {
      if (/^<w:tab/i.test(part)) return '\t';
      if (/^<w:br/i.test(part)) return '\n';
      return part
        .replace(/^<w:t\b[^>]*>/i, '')
        .replace(/<\/w:t>$/i, '')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&apos;|&#39;/g, "'")
        .replace(/&amp;/g, '&');
    }).join('');
  }).filter((paragraph) => paragraph.trim()).join('\n').trim();

  if (!text) throw new Error('DOCX file contains no readable text.');
  return text;
}

async function convert(inputPath: string): Promise<string> {
  const extension = extname(inputPath).toLowerCase();
  const bytes = new Uint8Array(await readFile(inputPath));
  if (bytes.byteLength > 50 * 1024 * 1024) throw new Error('input file is larger than 50 MB');

  const sourceText = extension === '.docx' ? extractDocxText(bytes) : '';
  const parts: Record<string, unknown>[] = [{
    text: `You convert exactly one song document into ChordPro.
Return only raw ChordPro text, with no Markdown fences or explanation.
Put title, artist, and key directives at the top when known.
Put chords inline immediately before the syllable they belong to.
Convert chord lines above lyrics into inline chords when positions are clear.
Preserve existing chords and do not invent uncertain chords.
Use {comment: Verse}, {comment: Chorus}, or {comment: Bridge} for sections.

Source filename: ${basename(inputPath)}
${sourceText ? `Extracted document text:\n${sourceText}` : 'The PDF is attached.'}`,
  }];

  if (extension === '.pdf') parts.push({ inline_data: {
    mime_type: 'application/pdf',
    data: Buffer.from(bytes).toString('base64'),
  } });

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey! },
    body: JSON.stringify({
      contents: [{ role: 'user', parts }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 4096 },
    }),
  });
  const data = await response.json() as {
    error?: { message?: string };
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };

  if (!response.ok) throw new Error(data.error?.message || `Gemini request failed (${response.status}).`);
  const result = data.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('')
    .replace(/^```(?:chordpro|cho|text)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  if (!result) throw new Error('Gemini returned empty output.');
  return result;
}

const files = (await collect(directoryPath)).sort((a, b) => a.localeCompare(b));
if (!files.length) {
  console.log('No PDF or DOCX files found.');
  process.exit(0);
}

if (!dryRun && !apiKey) {
  console.error('Error: set GEMINI_API_KEY in the repository .env file.');
  process.exit(1);
}

let converted = 0;
let skipped = 0;
let failed = 0;

for (let index = 0; index < files.length; index += 1) {
  const inputPath = files[index];
  const extension = extname(inputPath).toLowerCase();
  const outputPath = `${inputPath.slice(0, -extension.length)}_${extension.slice(1)}.cho`;
  const label = relative(directoryPath, inputPath);
  const outputLabel = relative(directoryPath, outputPath);
  let exists = false;

  try {
    await stat(outputPath);
    exists = true;
  } catch {}

  if (exists && !overwrite) {
    console.log(`[${index + 1}/${files.length}] SKIP ${label} -> ${outputLabel}`);
    skipped += 1;
    continue;
  }

  if (dryRun) {
    console.log(`[${index + 1}/${files.length}] ${exists ? 'OVERWRITE' : 'CONVERT'} ${label} -> ${outputLabel}`);
    converted += 1;
    continue;
  }

  console.log(`[${index + 1}/${files.length}] Converting ${label}...`);
  const started = Date.now();
  try {
    await writeFile(outputPath, `${await convert(inputPath)}\n`, 'utf8');
    console.log(`         -> ${outputLabel} (${((Date.now() - started) / 1000).toFixed(1)}s)`);
    converted += 1;
  } catch (error) {
    console.error(`         FAILED: ${error instanceof Error ? error.message : String(error)}`);
    failed += 1;
  }
}

console.log(dryRun
  ? `Dry run complete. Would convert ${converted}, skip ${skipped}.`
  : `Done. ${converted} converted, ${skipped} skipped, ${failed} failed.`);
if (failed) process.exitCode = 1;
