/**
 * @module pdf-text-extractor
 * Adapter interface for extracting text from PDF buffers.
 *
 * The parser depends on this interface, NOT on a specific library.
 * Swap implementation without touching the boletim parser.
 */
import { execFile } from 'node:child_process';
import { writeFile, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';

// ─── Interface ───────────────────────────────────────────────────────────────

export interface PdfTextExtractor {
  /** Extract text from a PDF buffer, preserving layout when possible. */
  extract(pdfBuffer: Buffer): Promise<string>;
}

// ─── Error ───────────────────────────────────────────────────────────────────

export class PdfTextExtractorUnavailableError extends Error {
  public readonly code = 'PDF_TEXT_EXTRACTOR_UNAVAILABLE';

  constructor(detail?: string) {
    super(
      `O extrator de texto PDF (pdftotext / poppler-utils) não está disponível neste ambiente. ` +
      `Instale com: sudo apt-get install -y poppler-utils` +
      (detail ? ` — Detalhe: ${detail}` : '')
    );
    this.name = 'PdfTextExtractorUnavailableError';
  }
}

// ─── Preflight ───────────────────────────────────────────────────────────────

/**
 * Assert that the pdftotext binary is available.
 * Call at startup or before first use.
 * @throws PdfTextExtractorUnavailableError if binary is not found.
 */
export function assertPdfTextExtractorAvailable(): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile('pdftotext', ['-v'], (error, _stdout, stderr) => {
      // pdftotext -v prints version to stderr and exits 0 or 99
      if (error && !stderr.includes('pdftotext version')) {
        reject(new PdfTextExtractorUnavailableError(error.message));
      } else {
        resolve();
      }
    });
  });
}

// ─── Implementation: pdftotext -layout ───────────────────────────────────────

/**
 * Primary extractor: shells out to `pdftotext -layout`.
 * Validated by benchmark: 28/28 students reconstructed from real SIAGE fixture.
 *
 * Requires `poppler-utils` system package.
 */
export class LayoutPdfTextExtractor implements PdfTextExtractor {
  async extract(pdfBuffer: Buffer): Promise<string> {
    const tempPath = join(tmpdir(), `siage-pdf-${randomUUID()}.pdf`);

    try {
      await writeFile(tempPath, pdfBuffer);

      const text = await new Promise<string>((resolve, reject) => {
        execFile(
          'pdftotext',
          ['-layout', '-enc', 'UTF-8', tempPath, '-'],
          { maxBuffer: 10 * 1024 * 1024 },
          (error, stdout, stderr) => {
            if (error) {
              // Distinguish between binary-not-found and extraction failure
              if (error.code === 'ENOENT' || error.message.includes('ENOENT')) {
                reject(new PdfTextExtractorUnavailableError(error.message));
              } else {
                reject(new Error(`Falha ao extrair texto do PDF: ${stderr || error.message}`));
              }
            } else {
              resolve(stdout);
            }
          }
        );
      });

      return text;
    } finally {
      // Cleanup temp file — best effort
      await unlink(tempPath).catch(() => {});
    }
  }
}

// ─── Default instance ────────────────────────────────────────────────────────

export const defaultExtractor: PdfTextExtractor = new LayoutPdfTextExtractor();
