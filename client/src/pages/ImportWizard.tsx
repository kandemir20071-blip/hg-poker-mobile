import { useState, useCallback, useRef } from "react";
import { useLocation, useSearch } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { useLeagues } from "@/hooks/use-leagues";
import { api } from "@shared/routes";
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
  ClipboardPaste,
  Info,
  Shield,
  UserCheck,
  UserPlus,
  XCircle,
  Users,
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
  const [existingNames, setExistingNames] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);
  const initialLeagueId = searchParams.get('leagueId');
  const [selectedLeagueId, setSelectedLeagueId] = useState<number | null>(initialLeagueId ? Number(initialLeagueId) : null);
  const { data: leagues } = useLeagues();

  const fetchExistingNames = async () => {
    try {
      const res = await fetch("/api/import/history", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        const names = new Set<string>();
        for (const r of data) {
          names.add((r.playerName || "").trim().toLowerCase());
        }
        setExistingNames(Array.from(names));
      }
    } catch {}
  };

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
      return res.json() as Promise<{ rows: ImportRow[]; rawText?: string; existingNames?: string[] }>;
    },
    onSuccess: (data) => {
      setRows(data.rows || []);
      setRawText(data.rawText || "");
      setExistingNames(data.existingNames || []);
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
      if (!selectedLeagueId) throw new Error("Please select a league first");
      const res = await fetch("/api/import/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: importRows, leagueId: selectedLeagueId }),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Save failed");
      }
      return res.json() as Promise<{ imported: number; skipped: number; players: string[] }>;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/stats"], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ["/api/import/history"], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: [api.stats.league.path], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: [api.stats.personal.path], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: [api.leagues.list.path], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['/api/leagues/sessions'], refetchType: 'all' });
      setStep("confirm");
      const skippedMsg = data.skipped > 0 ? ` (${data.skipped} duplicates skipped)` : "";
      toast({
        title: "Import complete",
        description: `${data.imported} games imported for ${data.players.length} player(s).${skippedMsg}`,
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
    fetchExistingNames();
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

  const isNameExisting = (name: string) => {
    return existingNames.includes(name.trim().toLowerCase());
  };

  const uniqueNames = Array.from(new Set(rows.map(r => r.playerName.trim()).filter(Boolean)));
  const matchedCount = uniqueNames.filter(n => isNameExisting(n)).length;
  const newCount = uniqueNames.filter(n => n && !isNameExisting(n)).length;

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

      <Card className="p-4 flex items-center gap-4 flex-wrap bg-card/50 border-white/[0.06]" data-testid="card-league-selector">
        <Users className="h-5 w-5 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white">Import to League</p>
          <p className="text-xs text-muted-foreground">Select which league this data belongs to.</p>
        </div>
        <Select value={selectedLeagueId?.toString() || ""} onValueChange={(v) => setSelectedLeagueId(Number(v))}>
          <SelectTrigger className="w-[200px] bg-background/50 border-white/[0.08]" data-testid="select-import-league">
            <SelectValue placeholder="Select league" />
          </SelectTrigger>
          <SelectContent>
            {(leagues || []).map((league: any) => (
              <SelectItem key={league.id} value={league.id.toString()}>{league.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Card>

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

      {step === "upload" && (
        <div className="space-y-6">
          <Card className="bg-primary/5 border-primary/20 p-4 flex items-start gap-3" data-testid="card-data-integrity">
            <Shield className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-primary mb-1">Data Integrity Check</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Every name is cross-referenced with the database. New names will create guests; existing names will update current profiles. No duplicate player records will be created.
              </p>
            </div>
          </Card>

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

              <div className="flex items-center gap-4">
                <div className="flex-1 h-[1px] bg-white/10" />
                <span className="text-muted-foreground text-xs uppercase tracking-wider">or</span>
                <div className="flex-1 h-[1px] bg-white/10" />
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
                  fetchExistingNames();
                  setRows([{ date: "", playerName: "", buyIn: 0, cashOut: 0 }]);
                  setStep("review");
                }}
                data-testid="button-manual-entry"
              >
                <Table2 className="mr-2 h-5 w-5" />
                Enter Data Manually
              </Button>

              <div className="flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" data-testid="button-template-info">
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-sm p-4" data-testid="tooltip-template">
                    <p className="font-semibold text-sm mb-2">Perfect PDF Format</p>
                    <div className="space-y-1 text-xs text-muted-foreground font-mono leading-relaxed">
                      <p className="text-primary font-semibold">15.11.2023</p>
                      <p>Marvin 20€ Endstand: 38€</p>
                      <p>Alex 10€ Endstand: 0€</p>
                      <p>Jonas 15€ Endstand: 22€</p>
                      <p className="text-primary font-semibold mt-2">22.11.2023</p>
                      <p>Marvin 30€ Endstand: 45€</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-3">
                      Dates group entries into sessions. Each line: Name Buy-in Endstand: Cash-out
                    </p>
                  </TooltipContent>
                </Tooltip>
                <span className="text-xs text-muted-foreground">
                  View the perfect PDF format template
                </span>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4 flex-wrap">
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
                names, and amounts.
              </p>
              <Card className="bg-white/5 border-white/10 p-3">
                <code className="text-xs text-muted-foreground leading-relaxed block font-mono">
                  <span className="text-primary">15.11.2023</span>
                  <br />
                  Marvin 20€ Endstand: 38€
                  <br />
                  Alex 10€ Endstand: 0€
                  <br />
                  <span className="text-primary">22.11.2023</span>
                  <br />
                  Marvin 30€ Endstand: 45€
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

      {step === "review" && (
        <div className="space-y-4">
          <Card className="bg-primary/5 border-primary/20 p-4 flex items-start gap-3" data-testid="card-review-integrity">
            <Shield className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-primary mb-1">Data Integrity Check</p>
              <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                Names are normalized (case-insensitive, trimmed) and cross-referenced with your database. Duplicates will be automatically skipped on import.
              </p>
              {uniqueNames.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {matchedCount > 0 && (
                    <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                      <UserCheck className="h-3.5 w-3.5" />
                      {matchedCount} existing player{matchedCount !== 1 ? 's' : ''}
                    </div>
                  )}
                  {newCount > 0 && (
                    <div className="flex items-center gap-1.5 text-xs text-amber-400">
                      <UserPlus className="h-3.5 w-3.5" />
                      {newCount} new guest{newCount !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>

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
                    Buy-in
                  </th>
                  <th className="text-left py-3 px-2 text-muted-foreground font-medium">
                    Cash-out
                  </th>
                  <th className="text-right py-3 px-2 text-muted-foreground font-medium">
                    Net
                  </th>
                  <th className="text-center py-3 px-2 text-muted-foreground font-medium w-20">
                    Status
                  </th>
                  <th className="py-3 px-2 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => {
                  const net = (row.cashOut || 0) - (row.buyIn || 0);
                  const nameMatched = row.playerName.trim() ? isNameExisting(row.playerName) : false;
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
                      <td className="py-2 px-2 text-center">
                        {row.playerName.trim() ? (
                          nameMatched ? (
                            <Badge variant="secondary" className="text-[10px] gap-1" data-testid={`badge-existing-${i}`}>
                              <UserCheck className="h-3 w-3 text-emerald-400" />
                              Exists
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] gap-1" data-testid={`badge-new-${i}`}>
                              <UserPlus className="h-3 w-3 text-amber-400" />
                              New
                            </Badge>
                          )
                        ) : null}
                      </td>
                      <td className="py-2 px-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteRow(i)}
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
              disabled={validRows.length === 0 || saveMutation.isPending || !selectedLeagueId}
              onClick={() => saveMutation.mutate(validRows)}
              data-testid="button-confirm-commit"
            >
              {saveMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="mr-2 h-4 w-4" />
              )}
              Confirm & Commit {validRows.length} Record{validRows.length !== 1 ? "s" : ""}
            </Button>
          </div>
        </div>
      )}

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
                setPasteMode(false);
                fetchExistingNames();
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
  const pokerRows = parsePokerFormat(text);
  if (pokerRows.length > 0) return pokerRows;

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

function parsePokerFormat(text: string): Array<{ date: string; playerName: string; buyIn: number; cashOut: number }> {
  const rows: Array<{ date: string; playerName: string; buyIn: number; cashOut: number }> = [];
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  const dateHeaderPattern = /^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/;
  const entryWithEndstand = /^(.+?)\s+([\d.,]+)\s*[€$£]?\s+[Ee]ndstand\s*:?\s*([\d.,]+)\s*[€$£]?\s*$/;
  const entryBuyinCashout = /^(.+?)\s+([\d.,]+)\s*[€$£]\s+([\d.,]+)\s*[€$£]?\s*$/;

  let currentDate = '';

  for (const line of lines) {
    const dateMatch = line.match(dateHeaderPattern);
    if (dateMatch) {
      const day = dateMatch[1].padStart(2, '0');
      const month = dateMatch[2].padStart(2, '0');
      let year = dateMatch[3];
      if (year.length === 2) year = '20' + year;
      currentDate = `${year}-${month}-${day}`;
      continue;
    }

    if (!currentDate) continue;

    const parseNum = (s: string) => parseFloat(s.replace(/,/g, '.')) || 0;

    let match = line.match(entryWithEndstand);
    if (match) {
      rows.push({ date: currentDate, playerName: match[1].trim(), buyIn: parseNum(match[2]), cashOut: parseNum(match[3]) });
      continue;
    }

    match = line.match(entryBuyinCashout);
    if (match) {
      rows.push({ date: currentDate, playerName: match[1].trim(), buyIn: parseNum(match[2]), cashOut: parseNum(match[3]) });
    }
  }

  return rows;
}
