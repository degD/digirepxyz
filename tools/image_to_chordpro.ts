#!/usr/bin/env bun
// Convert one song image or PDF to ChordPro with Gemini.
// Requires GEMINI_API_KEY in the repository .env; run with Bun.
// Usage: bun tools/image_to_chordpro.ts input.png [output.cho]

import { readFile, writeFile } from 'node:fs/promises';
import { basename, extname, resolve } from 'node:path';

const [, , input, outputArg] = process.argv;
const mimeTypes: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.heic': 'image/heic',
  '.heif': 'image/heif',
};

if (!input) {
  console.error('Usage: bun tools/image_to_chordpro.ts <input> [output.cho]');
  process.exit(1);
}

const inputPath = resolve(input);
const extension = extname(inputPath).toLowerCase();
const outputPath = resolve(outputArg || inputPath.replace(/\.[^.]+$/, '.cho'));
const apiKey = process.env.GEMINI_API_KEY;
const model = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
const mimeType = mimeTypes[extension];

if (!mimeType) {
  console.error('Error: input must be a PDF, PNG, JPG, JPEG, WebP, HEIC, or HEIF file.');
  process.exit(1);
}

if (!apiKey) {
  console.error('Error: set GEMINI_API_KEY in the repository .env file.');
  process.exit(1);
}

try {
  const bytes = new Uint8Array(await readFile(inputPath));
  if (bytes.byteLength > 50 * 1024 * 1024) throw new Error('Input file is larger than 50 MB.');

  const parts: Record<string, unknown>[] = [{
    text: `Read exactly one song from the attached ${extension === '.pdf' ? 'PDF' : 'image'} and convert it to ChordPro.
Return only raw ChordPro text, with no Markdown fences or explanation.
Put title, artist, and key directives at the top when visible.
Put chords inline immediately before the syllable they belong to.
Preserve visible chords and do not invent uncertain chords.
Use {comment: Verse}, {comment: Chorus}, or {comment: Bridge} for sections.
The source filename is ${basename(inputPath)}.`,
  }, {
    inline_data: { mime_type: mimeType, data: Buffer.from(bytes).toString('base64') },
  }];

  console.log(`Converting ${inputPath} with ${model}...`);
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
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

  await writeFile(outputPath, `${result}\n`, 'utf8');
  console.log(`ChordPro written to ${outputPath}`);
} catch (error) {
  console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
