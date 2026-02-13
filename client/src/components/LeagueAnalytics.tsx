import { useState, useMemo } from "react";
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
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { HelpCircle } from "lucide-react";
import { PlayerProfitChart } from "./PlayerProfitChart";

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
}

function HelpBubble({ text }: { text: string }) {
  return (
    <UITooltip>
      <TooltipTrigger asChild>
        <button className="text-muted-foreground" data-testid="button-help-bubble">
          <HelpCircle className="h-4 w-4" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[280px] text-xs leading-relaxed">
        {text}
      </TooltipContent>
    </UITooltip>
  );
}

function SkillMapView({ playerAnalytics }: { playerAnalytics: PlayerAnalyticsData[] }) {
  const [minGames, setMinGames] = useState<string>("all");

  const filtered = useMemo(() => {
    const min = minGames === "5" ? 5 : minGames === "10" ? 10 : 0;
    return playerAnalytics.filter((p) => p.gamesPlayed >= min);
  }, [playerAnalytics, minGames]);

  const ScatterTooltipContent = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const data = payload[0].payload;
    return (
      <div
        className="rounded-xl border border-white/[0.08] p-3 text-sm"
        style={{ backgroundColor: "hsla(222, 47%, 14%, 0.95)", backdropFilter: "blur(12px)" }}
      >
        <p className="font-semibold text-white mb-1">{data.playerName}</p>
        <p className="text-muted-foreground text-xs">Games: {data.gamesPlayed}</p>
        <p className="text-xs" style={{ color: data.roi >= 0 ? "#10b981" : "#ef4444" }}>
          ROI: {data.roi >= 0 ? "+" : ""}{data.roi}%
        </p>
        <p className="text-xs text-muted-foreground">
          Profit: <span style={{ color: data.totalProfit >= 0 ? "#10b981" : "#ef4444" }}>${data.totalProfit}</span>
        </p>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Select value={minGames} onValueChange={setMinGames}>
          <SelectTrigger className="w-[140px] bg-background/50 border-white/[0.08]" data-testid="select-min-games">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Players</SelectItem>
            <SelectItem value="5">Min 5 Games</SelectItem>
            <SelectItem value="10">Min 10 Games</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="h-[350px] w-full">
        {filtered.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis
                dataKey="gamesPlayed"
                name="Games Played"
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
              <Tooltip content={<ScatterTooltipContent />} />
              <Scatter data={filtered} fill="#10b981">
                {filtered.map((entry, index) => (
                  <Cell
                    key={index}
                    fill={entry.roi >= 0 ? "#10b981" : "#ef4444"}
                    fillOpacity={0.8}
                    r={Math.max(5, Math.min(12, entry.gamesPlayed / 2))}
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
    </div>
  );
}

function VolatilityView({ playerAnalytics }: { playerAnalytics: PlayerAnalyticsData[] }) {
  const [sortBy, setSortBy] = useState<string>("biggest_win");

  const sorted = useMemo(() => {
    const data = playerAnalytics.filter((p) => p.biggestWin > 0 || p.biggestLoss < 0);
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
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[160px] bg-background/50 border-white/[0.08]" data-testid="select-volatility-sort">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="biggest_win">Biggest Win</SelectItem>
            <SelectItem value="biggest_loss">Biggest Loss</SelectItem>
            <SelectItem value="most_stable">Most Stable</SelectItem>
          </SelectContent>
        </Select>
      </div>

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
            No session data available
          </div>
        )}
      </div>
    </div>
  );
}

function PulseView({ sessionHistory }: { sessionHistory: SessionHistoryData[] }) {
  const [timeframe, setTimeframe] = useState<string>("all");

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
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Select value={timeframe} onValueChange={setTimeframe}>
          <SelectTrigger className="w-[160px] bg-background/50 border-white/[0.08]" data-testid="select-pulse-timeframe">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="last10">Last 10 Sessions</SelectItem>
            <SelectItem value="year">Last Year</SelectItem>
            <SelectItem value="all">All Time</SelectItem>
          </SelectContent>
        </Select>
      </div>

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
    </div>
  );
}

const VIEW_HELP: Record<AnalyticsView, string> = {
  performance: "Tracks each player's cumulative profit over time. Rising lines indicate consistent winners.",
  skill_map: "Segments players by skill. Top Right = Sharks (High Volume, High Win Rate). Bottom Right = Donators (High Volume, Losing).",
  volatility: "Reveals play style. Large bars = High Variance / Maniac. Small bars = Low Variance / The Rock.",
  pulse: "Tracks the health of the league and pot sizes over time.",
};

const VIEW_LABELS: Record<AnalyticsView, string> = {
  performance: "Player Performance",
  skill_map: "Skill Map",
  volatility: "Volatility Index",
  pulse: "League Pulse",
};

export function LeagueAnalytics({ playerProfitHistory, playerAnalytics, sessionHistory }: LeagueAnalyticsProps) {
  const [view, setView] = useState<AnalyticsView>("performance");

  return (
    <div className="glass-card rounded-xl p-6" data-testid="chart-league-analytics">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-base text-white">League Analytics</h3>
          <HelpBubble text={VIEW_HELP[view]} />
        </div>
        <Select value={view} onValueChange={(v) => setView(v as AnalyticsView)}>
          <SelectTrigger className="w-[200px] bg-background/50 border-white/[0.08]" data-testid="select-analytics-view">
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

      {view === "performance" && (
        <PlayerProfitChart playerProfitHistory={playerProfitHistory} embedded />
      )}
      {view === "skill_map" && (
        <SkillMapView playerAnalytics={playerAnalytics} />
      )}
      {view === "volatility" && (
        <VolatilityView playerAnalytics={playerAnalytics} />
      )}
      {view === "pulse" && (
        <PulseView sessionHistory={sessionHistory} />
      )}
    </div>
  );
}
