/**
 * Utility for exporting data to CSV with UTF-8 BOM for Bengali (বাংলা) support in Excel
 */

export function exportToCSV<T extends Record<string, any>>(
  filename: string,
  data: T[],
  headers: { key: keyof T | string; label: string }[]
) {
  if (!data || data.length === 0) {
    alert("এক্সপোর্ট করার জন্য কোনো তথ্য নেই!");
    return;
  }

  // Create header row
  const headerRow = headers.map((h) => `"${h.label.replace(/"/g, '""')}"`).join(",");

  // Create data rows
  const rows = data.map((item) => {
    return headers
      .map((h) => {
        const raw = item[h.key];
        const val = raw === undefined || raw === null ? "" : raw;
        // Convert to string and escape double quotes
        const strVal = String(val).replace(/"/g, '""');
        return `"${strVal}"`;
      })
      .join(",");
  });

  const csvContent = [headerRow, ...rows].join("\r\n");

  // \uFEFF is the UTF-8 Byte Order Mark (BOM) ensuring Excel displays Bengali characters perfectly
  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}_${new Date().toISOString().split("T")[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function parseCSV(csvText: string): Record<string, string>[] {
  // Remove BOM if present
  const cleanText = csvText.replace(/^\uFEFF/, "");
  const lines = cleanText.split(/\r\n|\n/).filter((line) => line.trim() !== "");
  if (lines.length < 2) return [];

  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        result.push(cur.trim());
        cur = "";
      } else {
        cur += char;
      }
    }
    result.push(cur.trim());
    return result;
  };

  const headers = parseLine(lines[0]);
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i]);
    if (values.length === headers.length || values.some((v) => v !== "")) {
      const rowObj: Record<string, string> = {};
      headers.forEach((h, idx) => {
        rowObj[h] = values[idx] || "";
      });
      rows.push(rowObj);
    }
  }

  return rows;
}
