// Dependency-free single-page PDF writer, adapted from Bookworm's
// hand-rolled createPdfBlob (app/infographic.js): render a DOM element to a
// canvas, JPEG-encode it, and hand-assemble a minimal valid PDF byte stream
// with that JPEG embedded directly as a DCTDecode image XObject. No jsPDF,
// no network dependency at export time.

const encoder = new TextEncoder();

function asBytes(value) {
  return value instanceof Uint8Array ? value : encoder.encode(value);
}

function concatBytes(chunks) {
  let length = 0;
  chunks.forEach((c) => { length += c.length; });
  const output = new Uint8Array(length);
  let offset = 0;
  chunks.forEach((chunk) => {
    output.set(chunk, offset);
    offset += chunk.length;
  });
  return output;
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Canvas could not be encoded."));
    }, type, quality);
  });
}

function cleanTitle(title) {
  return String(title || "Almanac")
    .replace(/[^\x20-\x7E]/g, "-")
    .replace(/[()\\]/g, " ");
}

// canvas: an HTMLCanvasElement already rendered (e.g. via html2canvas).
// Returns a single-page application/pdf Blob sized to the canvas's own
// pixel dimensions (scaled to points at 1px = 0.75pt, i.e. 96dpi -> 72dpi).
export async function createPdfBlob(canvas, metadata = {}) {
  const blob = await canvasToBlob(canvas, "image/jpeg", 0.94);
  const image = new Uint8Array(await blob.arrayBuffer());

  const pageW = canvas.width * 0.75;
  const pageH = canvas.height * 0.75;

  // Object numbering: 1=Catalog 2=Pages 3=Page 4=Contents 5=Image
  const content = asBytes(`q\n${pageW} 0 0 ${pageH} 0 0 cm\n/Im0 Do\nQ\n`);
  const objects = [
    null,
    asBytes("<< /Type /Catalog /Pages 2 0 R >>"),
    asBytes("<< /Type /Pages /Count 1 /Kids [3 0 R] >>"),
    asBytes(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Resources << /XObject << /Im0 5 0 R >> >> /Contents 4 0 R >>`),
    concatBytes([asBytes(`<< /Length ${content.length} >>\nstream\n`), content, asBytes("endstream")]),
    concatBytes([
      asBytes(`<< /Type /XObject /Subtype /Image /Width ${canvas.width} /Height ${canvas.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.length} >>\nstream\n`),
      image,
      asBytes("\nendstream"),
    ]),
  ];

  const chunks = [asBytes("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n")];
  const offsets = new Array(objects.length).fill(0);
  let length = chunks[0].length;
  for (let index = 1; index < objects.length; index += 1) {
    offsets[index] = length;
    const objectBytes = concatBytes([asBytes(`${index} 0 obj\n`), objects[index], asBytes("\nendobj\n")]);
    chunks.push(objectBytes);
    length += objectBytes.length;
  }
  const xrefOffset = length;
  const xrefRows = ["0000000000 65535 f ", ...offsets.slice(1).map((o) => `${String(o).padStart(10, "0")} 00000 n `)];
  const title = cleanTitle(metadata.title);
  chunks.push(asBytes(`xref\n0 ${objects.length}\n${xrefRows.join("\n")}\ntrailer\n<< /Size ${objects.length} /Root 1 0 R /Info << /Title (${title}) /Creator (Almanac) >> >>\nstartxref\n${xrefOffset}\n%%EOF\n`));

  return new Blob([concatBytes(chunks)], { type: "application/pdf" });
}
