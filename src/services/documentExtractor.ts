/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ExtractedDocument {
  title: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  text: string;
  wordCount: number;
  characterCount: number;
  pageCount?: number;
  warning?: string;
}

export async function extractTextFromFile(
  file: File,
  maxSizeBytes: number = 15 * 1024 * 1024
): Promise<ExtractedDocument> {
  if (file.size > maxSizeBytes) {
    throw new Error(
      `File size (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds configured limit of ${(
        maxSizeBytes /
        (1024 * 1024)
      ).toFixed(1)} MB.`
    );
  }

  const fileName = file.name;
  const fileExt = fileName.split('.').pop()?.toLowerCase() || '';
  const title = fileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');

  let extractedText = '';
  let pageCount: number | undefined;
  let warning: string | undefined;

  if (fileExt === 'txt' || fileExt === 'md' || fileExt === 'markdown' || fileExt === 'csv') {
    extractedText = await file.text();
  } else if (fileExt === 'pdf') {
    try {
      const arrayBuffer = await file.arrayBuffer();
      // Dynamically load pdfjs to ensure bundler compatibility
      const pdfjs = await import('pdfjs-dist');
      
      // Set worker source if available or use disableWorker option
      if (pdfjs.GlobalWorkerOptions && !pdfjs.GlobalWorkerOptions.workerSrc) {
        pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version || '4.0.379'}/pdf.worker.min.mjs`;
      }

      const loadingTask = pdfjs.getDocument({
        data: new Uint8Array(arrayBuffer),
        useSystemFonts: true,
      });

      const pdf = await loadingTask.promise;
      pageCount = pdf.numPages;

      const pageTexts: string[] = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageString = textContent.items
          // @ts-expect-error item has str property in TextItem
          .map((item) => (item.str ? item.str : ''))
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();

        if (pageString) {
          pageTexts.push(pageString);
        }
      }

      extractedText = pageTexts.join('\n\n');

      if (!extractedText.trim()) {
        throw new Error(
          'This PDF document contains no digital text layer. Scanned documents or image-only PDFs require Optical Character Recognition (OCR), which is not available in the offline browser engine. Please copy/paste the text or submit a digitally authored document.'
        );
      }
    } catch (err: any) {
      if (err.message && err.message.includes('OCR')) {
        throw err;
      }
      throw new Error(`Failed to parse PDF document: ${err.message || 'Corrupted or encrypted PDF'}`);
    }
  } else if (fileExt === 'docx') {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const mammoth = await import('mammoth');
      const result = await mammoth.extractRawText({ arrayBuffer });
      extractedText = result.value || '';

      if (result.messages && result.messages.length > 0) {
        warning = `Docx extraction notices: ${result.messages.map((m: any) => m.message).join('; ')}`;
      }

      if (!extractedText.trim()) {
        throw new Error(
          'The Word (.docx) document appears to be empty or contains non-extractable content.'
        );
      }
    } catch (err: any) {
      throw new Error(`Failed to parse DOCX document: ${err.message || 'Corrupted document'}`);
    }
  } else {
    throw new Error(
      `Unsupported file type .${fileExt}. Supported formats are: Plain Text (.txt), Markdown (.md), PDF (.pdf), and Microsoft Word (.docx).`
    );
  }

  // Normalize line endings
  extractedText = extractedText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();

  const words = extractedText ? extractedText.split(/\s+/).filter(Boolean).length : 0;
  const characterCount = extractedText.length;

  return {
    title,
    fileName,
    fileSize: file.size,
    fileType: fileExt.toUpperCase(),
    text: extractedText,
    wordCount: words,
    characterCount,
    pageCount,
    warning,
  };
}
