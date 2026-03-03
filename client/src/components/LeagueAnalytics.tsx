import { useState, useMemo, useRef, useEffect } from "react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  AreaChart,
  Area,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import { format } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HelpCircle, X, Search, ChevronsUpDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlayerProfitChart, type FilterMode } from "./PlayerProfitChart";
import { PaywallOverlay } from "@/components/ui/PaywallOverlay";

type PlayerSeries = {
  playerName: string;
  totalProfit: number;
  points: { date: string; cumulative: number; profit: number }[];
};

type PlayerAnalyticsData = {
  playerName: string;
  gamesPlayed: number;
  totalBuyIn: number;
  totalProfit: number;
  roi: number;
  biggestWin: number;
  biggestLoss: number;
};

type SessionHistoryData = {
  date: string;
  totalWagered: number;
};

type AnalyticsView = "performance" | "skill_map" | "volatility" | "pulse";

interface LeagueAnalyticsProps {
  playerProfitHistory: PlayerSeries[];
  playerAnalytics: PlayerAnalyticsData[];
  sessionHistory: SessionHistoryData[];
  isPro?: boolean;
}

function HelpBubble({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        className="text-muted-foreground"
        onClick={() => setOpen(!open)}
        data-testid="button-help-bubble"
      >
        <HelpCircle className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-2 w-64 p-3 bg-card border border-border rounded-md shadow-lg z-50">
          <div className="flex items-start gap-2">
            <p className="text-xs leading-relaxed text-muted-foreground flex-1">{text}</p>
            <button
              className="text-muted-foreground shrink-0 mt-0.5"
              onClick={() => setOpen(false)}
              data-testid="button-help-close"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function PlayerSearchCombobox({
  players,
  value,
  onChange,
}: {
  players: { playerName: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  const [comboOpen, setComboOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!comboOpen) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setComboOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [comboOpen]);

  const filtered = useMemo(() => {
    return players
      .slice()
      .sort((a, b) => a.playerName.localeCompare(b.playerName))
      .filter(p => !query || p.playerName.toLowerCase().includes(query.toLowerCase()));
  }, [players, query]);

  return (
    <div className="relative" ref={containerRef}>
      <Button
        variant="outline"
        className="w-[200px] justify-between bg-background/50 border-white/[0.08] gap-2"
        onClick={() => { setComboOpen(!comboOpen); setQuery(""); }}
        data-testid="button-player-picker"
      >
        <span className="truncate text-sm">
          {value || "Select a player..."}
        </span>
        {value ? (
          <span
            role="button"
            className="shrink-0 rounded-full p-0.5"
            onClick={(e) => { e.stopPropagation(); e.preventDefault(); onChange(""); setComboOpen(false); }}
            onMouseDown={(e) => e.stopPropagation()}
            data-testid="button-clear-player"
          >
            <X className="h-3.5 w-3.5 text-muted-foreground" />
          </span>
        ) : (
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        )}
      </Button>

      {comboOpen && (
        <div
          className="absolute top-full left-0 mt-1 w-[240px] rounded-md border border-white/[0.08] bg-card shadow-lg z-50 overflow-hidden"
          data-testid="player-picker-dropdown"
        >
          <div className="p-2 border-b border-white/[0.06]">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-8 h-8 text-sm bg-background/50 border-white/[0.08]"
                placeholder="Search players..."
                autoFocus
                data-testid="input-player-search"
              />
            </div>
          </div>
          <div className="overflow-y-auto max-h-60">
            {filtered.length === 0 && (
              <div className="py-4 px-3 text-sm text-muted-foreground text-center" data-testid="text-no-player-results">
                No players found
              </div>
            )}
            {filtered.map(p => (
              <button
                key={p.playerName}
                type="button"
                onClick={() => { onChange(p.playerName); setComboOpen(false); setQuery(""); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover-elevate transition-colors"
                data-testid={`option-player-${p.playerName}`}
              >
                <div className={`flex items-center justify-center w-4 h-4 rounded-sm shrink-0 ${
                  value === p.playerName ? "text-emerald-400" : "text-transparent"
                }`}>
                  <Check className="w-3.5 h-3.5" />
                </div>
                <span className="truncate">{p.playerName}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const VIEW_HELP: Record<AnalyticsView, string> = {
  performance: "Tracks the cumulative profit/loss for players over time. Shows who is consistently winning vs. losing.",
  skill_map: "Scatter plot comparing Games Played (Experience) vs. ROI % (Efficiency). Top-Right = Sharks; Bottom-Right = Donators.",
  volatility: "Analyzes play style. Shows a player's single biggest win (Green) vs. single biggest loss (Red). Larger bars = higher variance.",
  pulse: "The health monitor of your league. Shows the Total Money Wagered per session over time.",
};

export function LeagueAnalytics({ playerProfitHistory, playerAnalytics, sessionHistory, isPro }: LeagueAnalyticsProps) {
  const [view, setView] = useState<AnalyticsView>("performance");
  const [skillFilter, setSkillFilter] = useState("all");
  const [volatilitySort, setVolatilitySort] = useState("biggest_win");
  const [pulseTimeframe, setPulseTimeframe] = useState("all");
  const [perfFilterMode, setPerfFilterMode] = useState<FilterMode>("top10");
  const [perfSearchQuery, setPerfSearchQuery] = useState("");

  const skillFiltered = useMemo(() => {
    const min = skillFilter === "5" ? 5 : skillFilter === "10" ? 10 : 0;
    return playerAnalytics
      .filter((p) => p.gamesPlayed >= min)
      .sort((a, b) => a.gamesPlayed - b.gamesPlayed);
  }, [playerAnalytics, skillFilter]);

  const renderToolbarControls = () => {
    if (view === "performance") {
      return (
        <>
          <Select
            value={perfFilterMode}
            onValueChange={(v) => {
              setPerfFilterMode(v as FilterMode);
              setPerfSearchQuery("");
            }}
          >
            <SelectTrigger className="w-[180px] bg-background/50 border-white/[0.08]" data-testid="select-chart-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="top10" data-testid="filter-top10">Top 10 Winners</SelectItem>
              <SelectItem value="heroes_villains" data-testid="filter-heroes-villains">Heroes & Villains</SelectItem>
              <SelectItem value="all" data-testid="filter-all">All Players</SelectItem>
              <SelectItem value="select" data-testid="filter-select">Select Player</SelectItem>
            </SelectContent>
          </Select>
          {perfFilterMode === "select" && (
            <PlayerSearchCombobox
              players={playerProfitHistory}
              value={perfSearchQuery}
              onChange={setPerfSearchQuery}
            />
          )}
        </>
      );
    }
    if (view === "skill_map") {
      return (
        <Select value={skillFilter} onValueChange={setSkillFilter}>
          <SelectTrigger className="w-[140px] bg-background/50 border-white/[0.08]" data-testid="select-min-games">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Players</SelectItem>
            <SelectItem value="5">Min 5 Games</SelectItem>
            <SelectItem value="10">Min 10 Games</SelectItem>
          </SelectContent>
        </Select>
      );
    }
    if (view === "volatility") {
      return (
        <Select value={volatilitySort} onValueChange={setVolatilitySort}>
          <SelectTrigger className="w-[160px] bg-background/50 border-white/[0.08]" data-testid="select-volatility-sort">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="biggest_win">Biggest Win</SelectItem>
            <SelectItem value="biggest_loss">Biggest Loss</SelectItem>
            <SelectItem value="most_stable">Most Stable</SelectItem>
          </SelectContent>
        </Select>
      );
    }
    if (view === "pulse") {
      return (
        <Select value={pulseTimeframe} onValueChange={setPulseTimeframe}>
          <SelectTrigger className="w-[160px] bg-background/50 border-white/[0.08]" data-testid="select-pulse-timeframe">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="last10">Last 10 Sessions</SelectItem>
            <SelectItem value="year">Last Year</SelectItem>
            <SelectItem value="all">All Time</SelectItem>
          </SelectContent>
        </Select>
      );
    }
    return null;
  };

  return (
    <div className="glass-card rounded-xl p-6" data-testid="chart-league-analytics">
      <div className="flex flex-col gap-3 mb-6">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-base text-white">League Analytics</h3>
            <HelpBubble text={VIEW_HELP[view]} />
          </div>
          <Select value={view} onValueChange={(v) => setView(v as AnalyticsView)}>
            <SelectTrigger className="w-[180px] bg-background/50 border-white/[0.08]" data-testid="select-analytics-view">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="performance">Player Performance</SelectItem>
              <SelectItem value="skill_map">Skill Map</SelectItem>
              <SelectItem value="volatility">Volatility Index</SelectItem>
              <SelectItem value="pulse">League Pulse</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-wrap gap-2 justify-end">
          {renderToolbarControls()}
        </div>
      </div>

      {view === "performance" && (
        <PlayerProfitChart
          playerProfitHistory={playerProfitHistory}
          embedded
          externalFilterMode={perfFilterMode}
          externalSearchQuery={perfSearchQuery}
        />
      )}
      {view === "skill_map" && (
        <PaywallOverlay isPro={!!isPro} featureName="Skill Map">
          <SkillMapChart data={skillFiltered} />
        </PaywallOverlay>
      )}
      {view === "volatility" && (
        <PaywallOverlay isPro={!!isPro} featureName="Volatility Index">
          <VolatilityChart playerAnalytics={playerAnalytics} sortBy={volatilitySort} />
        </PaywallOverlay>
      )}
      {view === "pulse" && (
        <PaywallOverlay isPro={!!isPro} featureName="League Pulse">
          <PulseChart sessionHistory={sessionHistory} timeframe={pulseTimeframe} />
        </PaywallOverlay>
      )}
    </div>
  );
}

function SkillMapChart({ data }: { data: PlayerAnalyticsData[] }) {
  const ScatterTooltipContent = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <div
        className="rounded-xl border border-white/[0.08] p-3 text-sm"
        style={{ backgroundColor: "hsla(222, 47%, 14%, 0.95)", backdropFilter: "blur(12px)" }}
      >
        <p className="font-semibold text-white mb-1">{d.playerName}</p>
        <p className="text-muted-foreground text-xs">Games: {d.gamesPlayed}</p>
        <p className="text-xs" style={{ color: d.roi >= 0 ? "#10b981" : "#ef4444" }}>
          ROI: {d.roi >= 0 ? "+" : ""}{d.roi}%
        </p>
        <p className="text-xs text-muted-foreground">
          Profit: <span style={{ color: d.totalProfit >= 0 ? "#10b981" : "#ef4444" }}>${d.totalProfit}</span>
        </p>
      </div>
    );
  };

  return (
    <div className="h-[350px] w-full">
      {data.length > 0 ? (
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis
              dataKey="gamesPlayed"
              name="Games Played"
              type="number"
              stroke="#475569"
              fontSize={12}
              tickLine={false}
              label={{ value: "Experience (Games)", position: "insideBottom", offset: -5, fill: "#64748b", fontSize: 11 }}
            />
            <YAxis
              dataKey="roi"
              name="ROI %"
              stroke="#475569"
              fontSize={12}
              tickLine={false}
              tickFormatter={(v) => `${v}%`}
              label={{ value: "ROI %", angle: -90, position: "insideLeft", fill: "#64748b", fontSize: 11 }}
            />
            <ReferenceLine y={0} stroke="rgba(255,255,255,0.1)" />
            <Tooltip
              content={<ScatterTooltipContent />}
              cursor={{ strokeDasharray: "3 3", stroke: "rgba(255,255,255,0.15)" }}
            />
            <Scatter data={data} fill="#10b981">
              {data.map((entry, index) => (
                <Cell
                  key={index}
                  fill={entry.roi >= 0 ? "#10b981" : "#ef4444"}
                  fillOpacity={0.8}
                  stroke={entry.roi >= 0 ? "#10b981" : "#ef4444"}
                  strokeOpacity={0.15}
                  strokeWidth={16}
                  r={Math.max(6, Math.min(14, entry.gamesPlayed / 2))}
                />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-full flex items-center justify-center text-muted-foreground">
          No players match this filter
        </div>
      )}
    </div>
  );
}

function VolatilityChart({ playerAnalytics, sortBy }: { playerAnalytics: PlayerAnalyticsData[]; sortBy: string }) {
  const sorted = useMemo(() => {
    const data = playerAnalytics.filter((p) => (p.biggestWin > 0 || p.biggestLoss < 0) && p.gamesPlayed >= 3);
    switch (sortBy) {
      case "biggest_win":
        return [...data].sort((a, b) => b.biggestWin - a.biggestWin);
      case "biggest_loss":
        return [...data].sort((a, b) => a.biggestLoss - b.biggestLoss);
      case "most_stable":
        return [...data].sort((a, b) => (a.biggestWin - a.biggestLoss) - (b.biggestWin - b.biggestLoss));
      default:
        return data;
    }
  }, [playerAnalytics, sortBy]);

  const chartData = sorted.map((p) => ({
    name: p.playerName,
    win: p.biggestWin,
    loss: p.biggestLoss,
  }));

  const BarTooltipContent = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div
        className="rounded-xl border border-white/[0.08] p-3 text-sm"
        style={{ backgroundColor: "hsla(222, 47%, 14%, 0.95)", backdropFilter: "blur(12px)" }}
      >
        <p className="font-semibold text-white mb-1">{label}</p>
        {payload.map((entry: any, i: number) => (
          <p key={i} className="text-xs" style={{ color: entry.dataKey === "win" ? "#10b981" : "#ef4444" }}>
            {entry.dataKey === "win" ? "Best Win" : "Worst Loss"}: ${entry.value}
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="h-[350px] w-full">
      {chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, bottom: 40, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis
              dataKey="name"
              stroke="#475569"
              fontSize={11}
              tickLine={false}
              angle={-35}
              textAnchor="end"
              interval={0}
              height={60}
            />
            <YAxis
              stroke="#475569"
              fontSize={12}
              tickLine={false}
              tickFormatter={(v) => `$${v}`}
            />
            <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" />
            <Tooltip content={<BarTooltipContent />} />
            <Bar dataKey="win" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
            <Bar dataKey="loss" fill="#ef4444" radius={[0, 0, 4, 4]} maxBarSize={40} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-full flex items-center justify-center text-muted-foreground">
          Need players with 3+ sessions for volatility data
        </div>
      )}
    </div>
  );
}

function PulseChart({ sessionHistory, timeframe }: { sessionHistory: SessionHistoryData[]; timeframe: string }) {
  const filtered = useMemo(() => {
    if (timeframe === "last10") return sessionHistory.slice(-10);
    if (timeframe === "year") {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      return sessionHistory.filter((s) => new Date(s.date) >= oneYearAgo);
    }
    return sessionHistory;
  }, [sessionHistory, timeframe]);

  const PulseTooltipContent = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div
        className="rounded-xl border border-white/[0.08] p-3 text-sm"
        style={{ backgroundColor: "hsla(222, 47%, 14%, 0.95)", backdropFilter: "blur(12px)" }}
      >
        <p className="text-muted-foreground text-xs mb-1">{label ? format(new Date(label), "MMM d, yyyy") : ""}</p>
        <p className="font-semibold text-white">Pot: ${payload[0].value}</p>
      </div>
    );
  };

  return (
    <div className="h-[350px] w-full">
      {filtered.length > 0 ? (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={filtered} margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
            <defs>
              <linearGradient id="pulseGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis
              dataKey="date"
              stroke="#475569"
              fontSize={12}
              tickLine={false}
              tickFormatter={(v) => format(new Date(v), "MMM d")}
            />
            <YAxis
              stroke="#475569"
              fontSize={12}
              tickLine={false}
              tickFormatter={(v) => `$${v}`}
            />
            <Tooltip content={<PulseTooltipContent />} />
            <Area
              type="monotone"
              dataKey="totalWagered"
              stroke="#10b981"
              strokeWidth={2}
              fill="url(#pulseGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-full flex items-center justify-center text-muted-foreground">
          No session history available
        </div>
      )}
    </div>
  );
}
