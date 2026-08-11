# Standalone Tools

Back to [Documentation](../README.md).

The repository includes four standalone Bun scripts for converting documents and combining ChordPro files. Run them from the repository root.

## Setup

Requirements:

- Bun
- A Gemini API key for the conversion scripts
- Internet access for Gemini conversion

Create a local `.env` from `.env.example` and set the key:

```dotenv
GEMINI_API_KEY=your-key
GEMINI_MODEL=gemini-3.5-flash-lite
```

Bun loads `.env` automatically. The file is ignored by Git. The conversion scripts reject requests without `GEMINI_API_KEY`; API keys are not accepted on the command line.

The AI scripts send selected documents to Google Gemini. Review Google's terms, privacy policy, and pricing before using them with personal or copyrighted material.

## Document Conversion

Convert one text PDF or DOCX file:

```bash
bun tools/pdf_word_to_chordpro.ts song.pdf
bun tools/pdf_word_to_chordpro.ts song.docx song.cho
```

PDF bytes are sent directly to Gemini. DOCX text is extracted locally with the existing `fflate` dependency. The input limit is 50 MB. Supported inputs are `.pdf` and `.docx`.

Convert one image or scanned PDF:

```bash
bun tools/image_to_chordpro.ts song.png
bun tools/image_to_chordpro.ts scanned.pdf song.cho
```

Supported inputs are `.pdf`, `.png`, `.jpg`, `.jpeg`, `.webp`, `.heic`, and `.heif`. The file is sent directly to Gemini as one song. The input limit is 50 MB.

Both scripts write one `.cho` file with a trailing newline. They do not add a trailing `---` separator.

## Batch Conversion

Convert PDF and DOCX files in a directory:

```bash
bun tools/batch_convert.ts ./songs
bun tools/batch_convert.ts ./songs --recursive
bun tools/batch_convert.ts ./songs --recursive --dry-run
bun tools/batch_convert.ts ./songs --recursive --overwrite
```

Output names include the source extension to avoid collisions:

```text
song.pdf  -> song_pdf.cho
song.docx -> song_docx.cho
```

Batch conversion runs sequentially. Existing outputs are skipped unless `--overwrite` is used. `--dry-run` does not require a Gemini key and does not write files. Legacy `.doc` files are not supported.

## Combining ChordPro

Combine `.cho` or `.chordpro` files, or files in directories:

```bash
bun tools/combine_cho.ts song1.cho song2.cho -o repertoire.cho
bun tools/combine_cho.ts ./songs --recursive --sort -o repertoire.cho
bun tools/combine_cho.ts ./songs --dry-run
```

Options:

- `--recursive` includes nested directories
- `--sort` sorts songs by title
- `--overwrite` replaces an existing output file
- `--dry-run` lists songs without writing

The output uses a line containing exactly `---` between songs and is directly importable by the app.

## PDF Export

The app's PDF export is separate from these tools. It converts ChordPro to HTML and uses Expo Print. `chordpro_to_pdf.py` remains an optional Python command-line renderer and is not required for app export or the Bun tools.
