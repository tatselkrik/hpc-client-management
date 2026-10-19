import { Unzip, UnzipInflate } from "https://esm.sh/fflate@0.8.3";

const textDecoder = new TextDecoder("utf-8", { fatal: true });
const starts = (bytes: Uint8Array, signature: number[]) => signature.every((value, index) => bytes[index] === value);

function inspectOffice(bytes: Uint8Array, extension: string) {
  const required = extension === ".docx" ? "word/document.xml" : extension === ".xlsx" ? "xl/workbook.xml" : "ppt/presentation.xml";
  const seen = new Set<string>(); const xml = new Map<string, string>(); let entries = 0; let expanded = 0;
  const unzip = new Unzip((file) => {
    const name = file.name;
    if (++entries > 2048 || name.startsWith("/") || name.includes("\\") || name.split("/").some((part) => part === "..") || seen.has(name.toLowerCase())) throw new Error("Unsafe Office archive layout.");
    seen.add(name.toLowerCase());
    if (/(vbaProject|activeX|embeddings\/|\.bin$|\.(exe|dll|js|vbs)$)/i.test(name)) throw new Error("Office files with macros, embedded programs or active content are not accepted. Export a flattened PDF instead.");
    if (!/\.(xml|rels)$/i.test(name)) return;
    let size = 0; const chunks: Uint8Array[] = [];
    file.ondata = (error, data, final) => {
      if (error) throw error;
      size += data.length; expanded += data.length;
      if (size > 4 * 1024 * 1024 || expanded > 32 * 1024 * 1024) { file.terminate(); throw new Error("Office document expands beyond the content-validation limit."); }
      chunks.push(data);
      if (final) {
        const output = new Uint8Array(size); let offset = 0;
        for (const chunk of chunks) { output.set(chunk, offset); offset += chunk.length; }
        const value = textDecoder.decode(output);
        if (/<!DOCTYPE|<!ENTITY|macroEnabled|TargetMode\s*=\s*["']External|oleObject|altChunk/i.test(value)) throw new Error("Office active or externally loaded content is not accepted. Export a flattened PDF instead.");
        xml.set(name, value);
      }
    };
    file.start();
  });
  unzip.register(UnzipInflate);
  // Feed bounded compressed chunks so expansion checks run before another large
  // compressed block is processed. No archive files are written to disk.
  for (let offset = 0; offset < bytes.length; offset += 1024) unzip.push(bytes.subarray(offset, offset + 1024), offset + 1024 >= bytes.length);
  if (!xml.has("[Content_Types].xml") || !xml.has(required) || !xml.get(required)?.includes("<")) throw new Error("The file does not contain the claimed Office document format.");
}

export function validateUploadContent(bytes: Uint8Array, fileName: string): string {
  const extension = /\.[a-z0-9]+$/i.exec(fileName)?.[0].toLowerCase() ?? "";
  if (!bytes.length) return "The uploaded file is empty.";
  try {
    if (extension === ".png") {
      if (!starts(bytes, [137,80,78,71,13,10,26,10]) || bytes.length < 45 || new TextDecoder().decode(bytes.subarray(12,16)) !== "IHDR" || new TextDecoder().decode(bytes.subarray(-8,-4)) !== "IEND") throw new Error("Invalid PNG file content.");
      const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength); const width = view.getUint32(16); const height = view.getUint32(20);
      if (!width || !height || width * height > 40_000_000) throw new Error("Image dimensions exceed the allowed limit.");
    } else if (extension === ".jpg" || extension === ".jpeg") {
      if (!starts(bytes,[255,216,255]) || bytes[bytes.length-2] !== 255 || bytes[bytes.length-1] !== 217) throw new Error("Invalid JPEG file content.");
    } else if (extension === ".webp") {
      if (bytes.length < 20 || new TextDecoder().decode(bytes.subarray(0,4)) !== "RIFF" || new TextDecoder().decode(bytes.subarray(8,12)) !== "WEBP" || new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength).getUint32(4,true)+8 !== bytes.length) throw new Error("Invalid WebP file content.");
    } else if (extension === ".pdf") {
      const head = new TextDecoder("latin1").decode(bytes.subarray(0,8));
      const tail = new TextDecoder("latin1").decode(bytes.subarray(-1024));
      if (!/^%PDF-(1\.[0-7]|2\.0)/.test(head) || !/%%EOF\s*$/.test(tail)) throw new Error("Invalid PDF file content.");
      const content = new TextDecoder("latin1").decode(bytes).replace(/#([0-9a-f]{2})/gi,(_,hex) => String.fromCharCode(parseInt(hex,16)));
      if (/\/(JavaScript|JS|Launch|EmbeddedFile|RichMedia|XFA|OpenAction|AA)\b/i.test(content)) throw new Error("PDF active content is not accepted. Export a flattened PDF instead.");
    } else if (extension === ".txt" || extension === ".csv") {
      const content = textDecoder.decode(bytes);
      if ([...content].some((character) => character.charCodeAt(0) < 32 && ![9,10,13].includes(character.charCodeAt(0)))) throw new Error("Text uploads must contain valid UTF-8 text without binary control bytes.");
    } else if ([".docx",".xlsx",".pptx"].includes(extension)) {
      if (!starts(bytes,[80,75,3,4])) throw new Error("Invalid Office archive content.");
      inspectOffice(bytes,extension);
    } else {
      throw new Error("This file format cannot be safely verified. Convert legacy DOC/XLS/PPT files to PDF or a supported Office format.");
    }
    return "";
  } catch (error) { return error instanceof Error ? error.message : "The uploaded content could not be verified."; }
}
