import { jsPDF } from 'jspdf';

export type PdfDoc = jsPDF;

export function stripMarkdown(text: string): string {
  return text
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`(.*?)`/g, '$1')
    .replace(/^\s*[-*+]\s+/gm, '• ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function createExecutivePdf(title: string, subtitle?: string) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;
  let y = 52;

  doc.setTextColor(24, 24, 27);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text(title, margin, y);

  y += 18;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(82, 82, 91);
  doc.text(`Generated on ${new Date().toLocaleString()}`, margin, y);

  if (subtitle) {
    y += 14;
    doc.setTextColor(63, 63, 70);
    doc.text(subtitle, margin, y);
  }

  y += 22;
  return { doc, pageWidth, margin, y };
}

export function addSectionTitle(doc: jsPDF, title: string, x: number, y: number) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(24, 24, 27);
  doc.text(title, x, y);
}

export function addWrappedText(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  opts?: { fontSize?: number; color?: [number, number, number] }
) {
  const fontSize = opts?.fontSize ?? 9.5;
  const color = opts?.color ?? ([63, 63, 70] as [number, number, number]);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(fontSize);
  doc.setTextColor(color[0], color[1], color[2]);
  const lines = doc.splitTextToSize(text, maxWidth);
  doc.text(lines, x, y);
  return y + lines.length * (fontSize + 2);
}

