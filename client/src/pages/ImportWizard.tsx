import { useState, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Upload,
  FileText,
  Table2,
  CheckCircle,
  ArrowLeft,
  ArrowRight,
  Trash2,
  Plus,
  Loader2,
  AlertTriangle,
  FileSpreadsheet,
  ClipboardPaste,
} from "lucide-react";

type ImportRow = {
  date: string;
  playerName: string;
  buyIn: number;
  cashOut: number;
};

type Step = "upload" | "review" | "confirm";

export default function ImportWizard() {
  const [step, setStep] = useState<Step>("upload");
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [rawText, setRawText] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");
  const [pasteMode, setPasteMode] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/import/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Upload failed");
      }
      return res.json() as Promise<{ rows: ImportRow[]; rawText?: string }>;
    },
    onSuccess: (data) => {
      setRows(data.rows || []);
      setRawText(data.rawText || "");
      setStep("review");
      if (data.rows.length === 0 && data.rawText) {
        toast({
          title: "Text extracted",
          description:
            "We couldn't auto-detect rows. You can edit the extracted text or enter data manually in the table below.",
        });
      } else {
        toast({
          title: "File parsed",
          description: `Found ${data.rows.length} game records.`,
        });
      }
    },
    onError: (err: Error) => {
      toast({
        title: "Upload failed",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (importRows: ImportRow[]) => {
      const res = await fetch("/api/import/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: importRows }),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Save failed");
      }
      return res.json() as Promise<{ imported: number; players: string[] }>;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/import/history"] });
      setStep("confirm");
      toast({
        title: "Import complete",
        description: `${data.imported} games imported for ${data.players.length} player(s).`,
      });
    },
    onError: (err: Error) => {
      toast({
        title: "Import failed",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const handleFileDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) {
        setFileName(file.name);
        uploadMutation.mutate(file);
      }
    },
    [uploadMutation]
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      uploadMutation.mutate(file);
    }
  };

  const handlePasteSubmit = () => {
    if (!pasteText.trim()) return;
    const parsed = tryParsePastedText(pasteText);
    if (parsed.length > 0) {
      setRows(parsed);
      setStep("review");
      toast({
        title: "Text parsed",
        description: `Found ${parsed.length} records from pasted text.`,
      });
    } else {
      setRows([{ date: "", playerName: "", buyIn: 0, cashOut: 0 }]);
      setRawText(pasteText);
      setStep("review");
      toast({
        title: "Could not auto-parse",
        description:
          "Enter data manually in the table below, or fix the text format and try again.",
      });
    }
  };

  const updateRow = (index: number, field: keyof ImportRow, value: string | number) => {
    setRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, [field]: value } : r))
    );
  };

  const deleteRow = (index: number) => {
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const addRow = () => {
    setRows((prev) => [
      ...prev,
      { date: "", playerName: "", buyIn: 0, cashOut: 0 },
    ]);
  };

  const validRows = rows.filter(
    (r) => r.date && r.playerName && (r.buyIn > 0 || r.cashOut > 0)
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLocation("/dashboard")}
          data-testid="button-back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-white">
            Import Game History
          </h2>
          <p className="text-muted-foreground text-sm">
            Upload files or paste your notes to populate your bankroll graph.
          </p>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-2 text-sm">
        {[
          { key: "upload", label: "Upload", icon: Upload },
          { key: "review", label: "Review & Edit", icon: Table2 },
          { key: "confirm", label: "Done", icon: CheckCircle },
        ].map(({ key, label, icon: Icon }, i) => (
          <div key={key} className="flex items-center gap-2">
            {i > 0 && (
              <div
                className={`w-8 h-[2px] ${
                  step === key || (key === "confirm" && step === "confirm")
                    ? "bg-primary"
                    : "bg-white/10"
                }`}
              />
            )}
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                step === key
                  ? "bg-primary/20 text-primary"
                  : "text-muted-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </div>
          </div>
        ))}
      </div>

      {/* Step: Upload */}
      {step === "upload" && (
        <div className="space-y-6">
          {!pasteMode ? (
            <>
              <Card
                className="border-2 border-dashed border-white/10 hover:border-primary/40 transition-colors bg-card/50 cursor-pointer"
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
                data-testid="dropzone-upload"
              >
                <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                  {uploadMutation.isPending ? (
                    <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
                  ) : (
                    <Upload className="h-12 w-12 text-primary/60 mb-4" />
                  )}
                  <h3 className="text-lg font-bold text-white mb-2">
                    {uploadMutation.isPending
                      ? "Parsing file..."
                      : "Drop your file here"}
                  </h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    Supports CSV, Excel (.xlsx), PDF, Word (.docx), and plain
                    text files.
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {[".csv", ".xlsx", ".pdf", ".docx", ".txt"].map((ext) => (
                      <span
                        key={ext}
                        className="px-2 py-1 rounded bg-white/5 text-xs text-muted-foreground"
                      >
                        {ext}
                      </span>
                    ))}
                  </div>
                </div>
              </Card>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls,.pdf,.docx,.doc,.txt"
                onChange={handleFileSelect}
                className="hidden"
                data-testid="input-file"
              />

              <div className="text-center text-muted-foreground text-sm">
                or
              </div>

              <Button
                variant="outline"
                className="w-full py-6"
                onClick={() => setPasteMode(true)}
                data-testid="button-paste-mode"
              >
                <ClipboardPaste className="mr-2 h-5 w-5" />
                Paste Text / Notes
              </Button>

              <Button
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setRows([{ date: "", playerName: "", buyIn: 0, cashOut: 0 }]);
                  setStep("review");
                }}
                data-testid="button-manual-entry"
              >
                <Table2 className="mr-2 h-5 w-5" />
                Enter Data Manually
              </Button>
            </>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <ClipboardPaste className="h-5 w-5 text-primary" />
                  Paste Your Game Notes
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPasteMode(false)}
                >
                  Back
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Paste your game history below. The app will try to detect dates,
                names, and amounts. Format example:
              </p>
              <Card className="bg-white/5 border-white/10 p-3">
                <code className="text-xs text-muted-foreground leading-relaxed block">
                  2023-01-15 John 50 120
                  <br />
                  2023-01-22 Steve 100 80
                  <br />
                  2023-02-05 Alice 75 150
                </code>
              </Card>
              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder="Paste your game notes here..."
                className="w-full h-48 bg-card border border-white/10 rounded-lg p-4 text-sm text-white resize-y focus:outline-none focus:ring-2 focus:ring-primary/50"
                data-testid="textarea-paste"
              />
              <Button
                className="w-full rounded-full font-semibold"
                onClick={handlePasteSubmit}
                disabled={!pasteText.trim()}
                data-testid="button-parse-text"
              >
                <FileText className="mr-2 h-5 w-5" />
                Parse Text
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Step: Review & Edit */}
      {step === "review" && (
        <div className="space-y-4">
          {rawText && (
            <details className="group">
              <summary className="text-sm text-muted-foreground cursor-pointer hover:text-primary flex items-center gap-2">
                <FileText className="h-4 w-4" />
                View extracted text
              </summary>
              <Card className="mt-2 bg-white/5 border-white/10 p-4 max-h-48 overflow-auto">
                <pre className="text-xs text-muted-foreground whitespace-pre-wrap">
                  {rawText}
                </pre>
              </Card>
            </details>
          )}

          {rows.length === 0 && (
            <Card className="bg-amber-500/10 border-amber-500/20 p-4 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-400">
                  No records detected
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Add rows manually using the button below.
                </p>
              </div>
            </Card>
          )}

          {/* Editable Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="table-import-data">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-2 text-muted-foreground font-medium">
                    Date
                  </th>
                  <th className="text-left py-3 px-2 text-muted-foreground font-medium">
                    Player Name
                  </th>
                  <th className="text-left py-3 px-2 text-muted-foreground font-medium">
                    Buy-in ($)
                  </th>
                  <th className="text-left py-3 px-2 text-muted-foreground font-medium">
                    Cash-out ($)
                  </th>
                  <th className="text-right py-3 px-2 text-muted-foreground font-medium">
                    Net
                  </th>
                  <th className="py-3 px-2 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => {
                  const net = (row.cashOut || 0) - (row.buyIn || 0);
                  return (
                    <tr
                      key={i}
                      className="border-b border-white/5 hover:bg-white/[0.02]"
                    >
                      <td className="py-2 px-2">
                        <Input
                          type="date"
                          value={row.date}
                          onChange={(e) => updateRow(i, "date", e.target.value)}
                          className="bg-transparent border-white/10 h-9 text-sm"
                          data-testid={`input-date-${i}`}
                        />
                      </td>
                      <td className="py-2 px-2">
                        <Input
                          value={row.playerName}
                          onChange={(e) =>
                            updateRow(i, "playerName", e.target.value)
                          }
                          placeholder="Player name"
                          className="bg-transparent border-white/10 h-9 text-sm"
                          data-testid={`input-player-${i}`}
                        />
                      </td>
                      <td className="py-2 px-2">
                        <Input
                          type="number"
                          value={row.buyIn || ""}
                          onChange={(e) =>
                            updateRow(i, "buyIn", parseFloat(e.target.value) || 0)
                          }
                          placeholder="0"
                          className="bg-transparent border-white/10 h-9 text-sm"
                          data-testid={`input-buyin-${i}`}
                        />
                      </td>
                      <td className="py-2 px-2">
                        <Input
                          type="number"
                          value={row.cashOut || ""}
                          onChange={(e) =>
                            updateRow(
                              i,
                              "cashOut",
                              parseFloat(e.target.value) || 0
                            )
                          }
                          placeholder="0"
                          className="bg-transparent border-white/10 h-9 text-sm"
                          data-testid={`input-cashout-${i}`}
                        />
                      </td>
                      <td className="py-2 px-2 text-right">
                        <span
                          className={`font-mono text-sm ${
                            net > 0
                              ? "text-green-500"
                              : net < 0
                              ? "text-red-500"
                              : "text-muted-foreground"
                          }`}
                          data-testid={`text-net-${i}`}
                        >
                          {net > 0 ? "+" : ""}
                          {net}
                        </span>
                      </td>
                      <td className="py-2 px-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteRow(i)}
                          className="text-muted-foreground hover:text-destructive"
                          data-testid={`button-delete-row-${i}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <Button
            variant="outline"
            onClick={addRow}
            className="w-full border-dashed border-white/10"
            data-testid="button-add-row"
          >
            <Plus className="mr-2 h-4 w-4" /> Add Row
          </Button>

          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button
              variant="ghost"
              onClick={() => {
                setStep("upload");
                setRows([]);
                setRawText("");
                setPasteText("");
              }}
              data-testid="button-back-to-upload"
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            <div className="flex-1" />
            <div className="text-sm text-muted-foreground self-center">
              {validRows.length} of {rows.length} rows valid
            </div>
            <Button
              className="rounded-full font-semibold"
              disabled={validRows.length === 0 || saveMutation.isPending}
              onClick={() => saveMutation.mutate(validRows)}
              data-testid="button-import"
            >
              {saveMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="mr-2 h-4 w-4" />
              )}
              Import {validRows.length} Record{validRows.length !== 1 ? "s" : ""}
            </Button>
          </div>
        </div>
      )}

      {/* Step: Done */}
      {step === "confirm" && (
        <Card className="bg-card border-white/5 p-8 text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white mb-2">
              Import Complete
            </h3>
            <p className="text-muted-foreground text-sm">
              Your game history has been saved. Check your Dashboard to see the
              updated Bankroll Graph.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              className="rounded-full font-semibold"
              onClick={() => setLocation("/dashboard")}
              data-testid="button-go-dashboard"
            >
              <ArrowRight className="mr-2 h-4 w-4" />
              View Dashboard
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setStep("upload");
                setRows([]);
                setRawText("");
                setPasteText("");
                setFileName("");
              }}
              data-testid="button-import-more"
            >
              <Plus className="mr-2 h-4 w-4" />
              Import More
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

function tryParsePastedText(
  text: string
): Array<{ date: string; playerName: string; buyIn: number; cashOut: number }> {
  const rows: Array<{
    date: string;
    playerName: string;
    buyIn: number;
    cashOut: number;
  }> = [];
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const datePattern =
    /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}|\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+\d{1,2},?\s*\d{2,4})/i;

  for (const line of lines) {
    const dateMatch = line.match(datePattern);
    if (!dateMatch) continue;

    const dateStr = dateMatch[1];
    const afterDate = line.substring(line.indexOf(dateStr) + dateStr.length);

    const numbers =
      afterDate
        .match(/[$€£]?\s*[\d,]+\.?\d*/g)
        ?.map((n) => parseFloat(n.replace(/[$€£,\s]/g, "")))
        .filter((n) => !isNaN(n) && n > 0) || [];

    if (numbers.length < 2) continue;

    const firstNumIdx = afterDate.search(/[$€£]?\s*\d/);
    let playerName = "Unknown";
    if (firstNumIdx > 0) {
      playerName =
        afterDate
          .substring(0, firstNumIdx)
          .replace(/[|,;:\t]+/g, " ")
          .trim() || "Unknown";
    }

    let formattedDate = dateStr;
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
      formattedDate = parsed.toISOString().split("T")[0];
    }

    rows.push({
      date: formattedDate,
      playerName,
      buyIn: numbers[0],
      cashOut: numbers[1],
    });
  }

  return rows;
}
