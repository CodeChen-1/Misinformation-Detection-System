import { Button } from "@mui/material";
import FileDownloadIcon from "@mui/icons-material/FileDownload";

// Generic CSV download — builds a blob from headers + values and triggers a browser download.
export default function ExportCSVButton({ data }) {
  // Build the CSV string in memory, create a download link, and click it programmatically.
  const handleExport = () => {
    if (!data) return;

    const headers = ["text", "model", "threshold", "label", "confidence"];
    const escape = (v) => `"${String(v).replace(/"/g, '""')}"`;
    const row = headers.map((h) => escape(data[h] ?? "")).join(",");
    const csv = headers.join(",") + "\n" + row + "\n";

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.setAttribute("download", "prediction.csv");
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Button
      variant="outlined"
      startIcon={<FileDownloadIcon />}
      onClick={handleExport}
      disabled={!data || Object.keys(data).length === 0}
    >
      Export CSV
    </Button>
  );
}
