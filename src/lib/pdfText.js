// Reads a PDF in the browser and returns its text as lines: [{ text, bold }]
export async function pdfToLines(file) {
  const pdfjs = await import('pdfjs-dist');
  const { default: workerUrl } = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

  const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const lines = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    await page.getOperatorList(); // makes font details (needed for bold detection) available
    const content = await page.getTextContent();
    const boldFont = {};
    const isBold = (fontName) => {
      if (!(fontName in boldFont)) {
        let name = content.styles[fontName]?.fontFamily || '';
        try { name += ' ' + (page.commonObjs.get(fontName)?.name || ''); } catch { /* font not loaded */ }
        boldFont[fontName] = /bold|black|heavy|semibold|demi/i.test(name);
      }
      return boldFont[fontName];
    };

    // Group text pieces into rows by their vertical position
    const rows = [];
    for (const item of content.items) {
      if (!item.str || !item.str.trim()) continue;
      const y = item.transform[5], x = item.transform[4];
      let row = rows.find((r) => Math.abs(r.y - y) < 3);
      if (!row) { row = { y, parts: [] }; rows.push(row); }
      row.parts.push({ x, w: item.width, str: item.str, bold: isBold(item.fontName) });
    }
    rows.sort((a, b) => b.y - a.y);
    for (const row of rows) {
      row.parts.sort((a, b) => a.x - b.x);
      let text = '', boldChars = 0, chars = 0, prevEnd = null;
      for (const part of row.parts) {
        if (prevEnd !== null && part.x - prevEnd > 2 && !text.endsWith(' ') && !part.str.startsWith(' ')) text += ' ';
        text += part.str;
        prevEnd = part.x + part.w;
        const n = part.str.replace(/\s/g, '').length;
        chars += n;
        if (part.bold) boldChars += n;
      }
      lines.push({ text: text.replace(/\s+/g, ' ').trim(), bold: chars > 0 && boldChars / chars > 0.6 });
    }
  }
  return lines;
}
