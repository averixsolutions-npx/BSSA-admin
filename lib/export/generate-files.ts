import * as XLSX from "xlsx";
import Papa from "papaparse";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { ExportColumn } from "./athlete-columns";
import { toRows } from "./athlete-columns";
import type { AthleteProfile } from "@/lib/types";

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function stamp() {
  return new Date().toISOString().slice(0, 10);
}

export function exportExcel(athletes: AthleteProfile[], columns: ExportColumn[]) {
  const rows = toRows(athletes, columns);
  const ws = XLSX.utils.json_to_sheet(rows, { header: columns.map((c) => c.header) });
  // Reasonable column widths.
  ws["!cols"] = columns.map((c) => ({ wch: Math.max(12, c.header.length + 2) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Athletes");
  const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  triggerDownload(
    new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    `bssa-athletes-${stamp()}.xlsx`
  );
}

export function exportCsv(athletes: AthleteProfile[], columns: ExportColumn[]) {
  const rows = toRows(athletes, columns);
  const csv = Papa.unparse(rows, { columns: columns.map((c) => c.header) });
  triggerDownload(new Blob([csv], { type: "text/csv;charset=utf-8;" }), `bssa-athletes-${stamp()}.csv`);
}

export function exportPdf(
  athletes: AthleteProfile[],
  columns: ExportColumn[],
  meta: { filterLabel: string }
) {
  // Landscape for wide tables. A4.
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });

  doc.setFontSize(16);
  doc.text("BSSA — Athletes Export", 40, 40);
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text(
    `Filter: ${meta.filterLabel}   ·   ${athletes.length} record(s)   ·   Generated ${stamp()}`,
    40,
    58
  );

  autoTable(doc, {
    startY: 72,
    head: [columns.map((c) => c.header)],
    body: athletes.map((a) => columns.map((c) => c.get(a))),
    styles: { fontSize: 7, cellPadding: 3, overflow: "linebreak" },
    headStyles: { fillColor: [23, 92, 168], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [245, 248, 252] },
    margin: { left: 40, right: 40 },
  });

  doc.save(`bssa-athletes-${stamp()}.pdf`);
}
