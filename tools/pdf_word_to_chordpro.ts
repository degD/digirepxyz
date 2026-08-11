#!/usr/bin/env bun
// Convert one PDF or DOCX song document to ChordPro with Gemini.
// Requires GEMINI_API_KEY in the repository .env; run with Bun.
// Usage: bun tools/pdf_word_to_chordpro.ts input.pdf [output.cho]

import { readFile, writeFile } from 'node:fs/promises';
import { basename, extname, resolve } from 'node:path';
import { unzipSync } from 'fflate';

const [, , input, outputArg] = process.argv;

if (!input) {
  console.error('Usage: bun tools/pdf_word_to_chordpro.ts <input.pdf|input.docx> [output.cho]');
  process.exit(1);
}

const inputPath = resolve(input);
const extension = extname(inputPath).toLowerCase();
const outputPath = resolve(outputArg || inputPath.replace(/\.[^.]+$/, '.cho'));
const apiKey = process.env.GEMINI_API_KEY;
const model = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';

if (!['.pdf', '.docx'].includes(extension)) {
  console.error('Error: input must be a .pdf or .docx file.');
  process.exit(1);
}

if (!apiKey) {
  console.error('Error: set GEMINI_API_KEY in the repository .env file.');
  process.exit(1);
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

try {
  const bytes = new Uint8Array(await readFile(inputPath));
  if (bytes.byteLength > 50 * 1024 * 1024) throw new Error('Input file is larger than 50 MB.');

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

  if (extension === '.pdf') {
    parts.push({ inline_data: {
      mime_type: 'application/pdf',
      data: Buffer.from(bytes).toString('base64'),
    } });
  }

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
