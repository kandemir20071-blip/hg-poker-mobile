import { useState, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { format } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { TrendingUp, Upload, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

type PlayerSeries = {
  playerName: string;
  totalProfit: number;
  points: { date: string; cumulative: number; profit: number }[];
};

type FilterMode = "top10" | "heroes_villains" | "all" | "select";

const COLORS = [
  "#10b981",
  "#3b82f6",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
  "#06b6d4",
  "#84cc16",
  "#a855f7",
  "#e11d48",
  "#22d3ee",
  "#facc15",
  "#d946ef",
];

function getColor(index: number) {
  return COLORS[index % COLORS.length];
}

export function PlayerProfitChart({
  playerProfitHistory,
  embedded = false,
}: {
  playerProfitHistory: PlayerSeries[];
  embedded?: boolean;
}) {
  const [filterMode, setFilterMode] = useState<FilterMode>("top10");
  const [searchQuery, setSearchQuery] = useState("");
  const [hoveredPlayer, setHoveredPlayer] = useState<string | null>(null);

  const sortedByProfit = useMemo(
    () => [...playerProfitHistory].sort((a, b) => b.totalProfit - a.totalProfit),
    [playerProfitHistory]
  );

  const filteredPlayers = useMemo(() => {
    switch (filterMode) {
      case "top10":
        return sortedByProfit.slice(0, 10);
      case "heroes_villains": {
        const top5 = sortedByProfit.slice(0, 5);
        const bottom5 = sortedByProfit.slice(-5);
        const combined = new Map<string, PlayerSeries>();
        for (const p of [...top5, ...bottom5]) combined.set(p.playerName, p);
        return Array.from(combined.values());
      }
      case "all":
        return sortedByProfit;
      case "select": {
        const q = searchQuery.toLowerCase().trim();
        if (!q) return [];
        return sortedByProfit.filter((p) =>
          p.playerName.toLowerCase().includes(q)
        );
      }
      default:
        return sortedByProfit.slice(0, 10);
    }
  }, [filterMode, sortedByProfit, searchQuery]);

  const chartData = useMemo(() => {
    const allDates = new Set<string>();
    for (const player of filteredPlayers) {
      for (const pt of player.points) {
        allDates.add(pt.date);
      }
    }
    const datesSorted = Array.from(allDates).sort();

    return datesSorted.map((date) => {
      const row: Record<string, any> = { date };
      for (const player of filteredPlayers) {
        const matchingPoints = player.points.filter((p) => p.date <= date);
        if (matchingPoints.length > 0) {
          const last = matchingPoints[matchingPoints.length - 1];
          row[player.playerName] = last.cumulative;
        }
      }
      return row;
    });
  }, [filteredPlayers]);

  const playerColorMap = useMemo(() => {
    const map = new Map<string, string>();
    filteredPlayers.forEach((p, i) => map.set(p.playerName, getColor(i)));
    return map;
  }, [filteredPlayers]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    const dateStr = label
      ? format(new Date(label), "MMM d, yyyy")
      : "";
    return (
      <div
        className="rounded-xl border border-white/[0.08] p-3 text-sm"
        style={{
          backgroundColor: "hsla(222, 47%, 14%, 0.95)",
          backdropFilter: "blur(12px)",
        }}
      >
        <p className="text-muted-foreground mb-1.5 text-xs font-medium">{dateStr}</p>
        <div className="space-y-0.5 max-h-[200px] overflow-y-auto">
          {payload
            .sort((a: any, b: any) => (b.value || 0) - (a.value || 0))
            .map((entry: any, i: number) => (
              <div key={i} className="flex items-center gap-2">
                <span
                  className="h-2 w-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-white/80 truncate max-w-[120px]">
                  {entry.name}
                </span>
                <span
                  className="ml-auto font-semibold tabular-nums"
                  style={{
                    color:
                      entry.value >= 0
                        ? "#10b981"
                        : "#ef4444",
                  }}
                >
                  {entry.value >= 0 ? "+" : ""}${entry.value}
                </span>
              </div>
            ))}
        </div>
      </div>
    );
  };

  if (!playerProfitHistory || playerProfitHistory.length === 0) {
    return (
      <div className={embedded ? "" : "glass-card rounded-xl p-6"} data-testid="chart-bankroll">
        {!embedded && (
          <h3 className="font-bold text-base mb-6 flex items-center gap-2 text-white">
            <TrendingUp className="h-5 w-5 text-primary" /> Player Performance
          </h3>
        )}
        <div className="h-[300px] flex flex-col items-center justify-center text-muted-foreground border border-dashed border-white/10 rounded-lg gap-3">
          <p>No stats recorded yet</p>
          <Link href="/import">
            <Button
              variant="outline"
              size="sm"
              data-testid="button-import-from-chart"
            >
              <Upload className="mr-2 h-4 w-4" /> Import Game History
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={embedded ? "" : "glass-card rounded-xl p-6"} data-testid="chart-bankroll">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        {!embedded && (
          <h3 className="font-bold text-base flex items-center gap-2 text-white">
            <TrendingUp className="h-5 w-5 text-primary" /> Player Performance
          </h3>
        )}
        <div className="flex items-center gap-2">
          <Select
            value={filterMode}
            onValueChange={(v) => {
              setFilterMode(v as FilterMode);
              setSearchQuery("");
            }}
          >
            <SelectTrigger
              className="w-[180px] bg-background/50 border-white/[0.08]"
              data-testid="select-chart-filter"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="top10" data-testid="filter-top10">
                Top 10 Winners
              </SelectItem>
              <SelectItem value="heroes_villains" data-testid="filter-heroes-villains">
                Heroes & Villains
              </SelectItem>
              <SelectItem value="all" data-testid="filter-all">
                All Players
              </SelectItem>
              <SelectItem value="select" data-testid="filter-select">
                Select Player
              </SelectItem>
            </SelectContent>
          </Select>
          {filterMode === "select" && (
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search player..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 w-[160px] bg-background/50 border-white/[0.08]"
                data-testid="input-player-search"
              />
            </div>
          )}
        </div>
      </div>

      <div className="h-[350px] w-full">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <XAxis
                dataKey="date"
                stroke="#475569"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => format(new Date(value), "MMM d")}
              />
              <YAxis
                stroke="#475569"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `$${value}`}
              />
              <Tooltip content={<CustomTooltip />} />
              {filteredPlayers.map((player) => (
                <Line
                  key={player.playerName}
                  type="monotone"
                  dataKey={player.playerName}
                  stroke={playerColorMap.get(player.playerName)}
                  strokeWidth={
                    hoveredPlayer === player.playerName
                      ? 3
                      : filterMode === "all"
                        ? 1.5
                        : 2
                  }
                  strokeOpacity={
                    filterMode === "all" && hoveredPlayer && hoveredPlayer !== player.playerName
                      ? 0.15
                      : 1
                  }
                  dot={false}
                  connectNulls
                  activeDot={{ r: 4, strokeWidth: 2 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            {filterMode === "select"
              ? "Type a player name to see their graph"
              : "No data for this filter"}
          </div>
        )}
      </div>

      {filteredPlayers.length > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-4 px-1">
          {filteredPlayers.map((player) => (
            <button
              key={player.playerName}
              className="flex items-center gap-1.5 text-xs cursor-pointer transition-opacity"
              style={{
                opacity:
                  hoveredPlayer && hoveredPlayer !== player.playerName
                    ? 0.3
                    : 1,
              }}
              onMouseEnter={() => setHoveredPlayer(player.playerName)}
              onMouseLeave={() => setHoveredPlayer(null)}
              data-testid={`legend-player-${player.playerName}`}
            >
              <span
                className="h-2 w-2 rounded-full flex-shrink-0"
                style={{
                  backgroundColor: playerColorMap.get(player.playerName),
                }}
              />
              <span className="text-white/70">{player.playerName}</span>
              <span
                className="font-semibold tabular-nums"
                style={{
                  color: player.totalProfit >= 0 ? "#10b981" : "#ef4444",
                }}
              >
                {player.totalProfit >= 0 ? "+" : ""}${player.totalProfit}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
