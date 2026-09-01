import type { Book } from "./types";
import { slugifyFilename } from "./utils";

export async function downloadBookPdf(input: { book: Book; node: HTMLElement }) {
  await document.fonts.ready;
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  const canvas = await html2canvas(input.node, {
    scale: 2,
    backgroundColor: "#fffcf7",
    useCORS: true,
    logging: false,
    windowWidth: input.node.scrollWidth,
  });

  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const pageWidth = 210;
  const pageHeight = 297;
  const imgWidth = pageWidth;
  const pageCanvasHeight = (canvas.width * pageHeight) / imgWidth;

  let y = 0;
  let page = 0;
  while (y < canvas.height) {
    const sliceHeight = Math.min(pageCanvasHeight, canvas.height - y);
    const slice = document.createElement("canvas");
    slice.width = canvas.width;
    slice.height = sliceHeight;
    const ctx = slice.getContext("2d");
    if (!ctx) break;
    ctx.fillStyle = "#fffcf7";
    ctx.fillRect(0, 0, slice.width, slice.height);
    ctx.drawImage(canvas, 0, y, canvas.width, sliceHeight, 0, 0, slice.width, sliceHeight);
    const data = slice.toDataURL("image/jpeg", 0.92);
    const sliceMm = (sliceHeight * imgWidth) / canvas.width;
    if (page > 0) pdf.addPage();
    pdf.addImage(data, "JPEG", 0, 0, imgWidth, sliceMm);
    y += sliceHeight;
    page += 1;
    if (page > 40) break;
  }

  pdf.save(`${slugifyFilename(input.book.title)}-여백.pdf`);
}
