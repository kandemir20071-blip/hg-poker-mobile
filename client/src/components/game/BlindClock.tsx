import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, SkipForward, Volume2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const BLIND_LEVELS = [
  [1, 2],
  [2, 4],
  [3, 6],
  [4, 8],
  [5, 10],
  [10, 20],
  [15, 30],
  [20, 40],
  [25, 50],
  [30, 60],
  [40, 80],
  [50, 100],
  [75, 150],
  [100, 200],
  [150, 300],
  [200, 400],
  [300, 600],
  [400, 800],
  [500, 1000],
  [750, 1500],
  [1000, 2000],
];

function getBlindsForLevel(level: number, startingBB: number): [number, number] {
  let startIdx = 0;
  for (let i = BLIND_LEVELS.length - 1; i >= 0; i--) {
    if (BLIND_LEVELS[i][1] <= startingBB) {
      startIdx = i;
      break;
    }
  }
  const idx = startIdx + level;
  if (idx < BLIND_LEVELS.length) {
    return BLIND_LEVELS[idx] as [number, number];
  }
  const lastLevel = BLIND_LEVELS[BLIND_LEVELS.length - 1];
  const multiplier = Math.pow(2, idx - BLIND_LEVELS.length + 1);
  return [lastLevel[0] * multiplier, lastLevel[1] * multiplier];
}

interface BlindClockProps {
  levelDurationMinutes: number;
  startingBigBlind: number;
}

export function BlindClock({ levelDurationMinutes, startingBigBlind }: BlindClockProps) {
  const { toast } = useToast();
  const [currentLevel, setCurrentLevel] = useState(0);
  const [secondsRemaining, setSecondsRemaining] = useState(levelDurationMinutes * 60);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasAlerted = useRef(false);

  const currentBlinds = getBlindsForLevel(currentLevel, startingBigBlind);
  const nextBlinds = getBlindsForLevel(currentLevel + 1, startingBigBlind);

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const totalSeconds = levelDurationMinutes * 60;
  const progress = totalSeconds > 0 ? ((totalSeconds - secondsRemaining) / totalSeconds) * 100 : 0;

  const advanceLevel = useCallback(() => {
    const newLevel = currentLevel + 1;
    const newBlinds = getBlindsForLevel(newLevel, startingBigBlind);
    setCurrentLevel(newLevel);
    setSecondsRemaining(levelDurationMinutes * 60);
    hasAlerted.current = false;
    toast({
      title: "Blinds Increased!",
      description: `Blinds are now ${newBlinds[0]}/${newBlinds[1]}`,
    });
  }, [currentLevel, levelDurationMinutes, startingBigBlind, toast]);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setSecondsRemaining(prev => {
          if (prev <= 1) {
            advanceLevel();
            return levelDurationMinutes * 60;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, advanceLevel, levelDurationMinutes]);

  useEffect(() => {
    if (secondsRemaining <= 10 && secondsRemaining > 0 && !hasAlerted.current) {
      hasAlerted.current = true;
    }
  }, [secondsRemaining]);

  const handleNextLevel = () => {
    advanceLevel();
  };

  const isLow = secondsRemaining <= 30;
  const isCritical = secondsRemaining <= 10;

  return (
    <div className="glass-card rounded-xl p-4 space-y-3" data-testid="blind-clock">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Volume2 className="w-4 h-4 text-primary" />
          <span className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Blind Clock</span>
          <span className="text-xs text-muted-foreground">Level {currentLevel + 1}</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant={isRunning ? "default" : "outline"}
            onClick={() => setIsRunning(!isRunning)}
            data-testid="button-blind-play-pause"
          >
            {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </Button>
          <Button
            size="icon"
            variant="outline"
            onClick={handleNextLevel}
            data-testid="button-blind-next-level"
          >
            <SkipForward className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="text-center">
        <p className={`text-5xl font-mono font-bold tabular-nums tracking-wider transition-colors ${isCritical ? 'text-red-500 animate-pulse' : isLow ? 'text-amber-400' : 'text-white'}`} data-testid="text-blind-timer">
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </p>
      </div>

      <div className="w-full bg-white/[0.06] rounded-full h-1.5 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${isCritical ? 'bg-red-500' : isLow ? 'bg-amber-400' : 'bg-primary'}`}
          style={{ width: `${progress}%` }}
          data-testid="blind-progress-bar"
        />
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="text-center flex-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">Current Blinds</p>
          <p className="text-2xl font-mono font-bold text-primary" data-testid="text-current-blinds">
            {currentBlinds[0]}/{currentBlinds[1]}
          </p>
        </div>
        <div className="w-px h-10 bg-white/[0.08]" />
        <div className="text-center flex-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">Next Blinds</p>
          <p className="text-2xl font-mono font-bold text-muted-foreground" data-testid="text-next-blinds">
            {nextBlinds[0]}/{nextBlinds[1]}
          </p>
        </div>
      </div>
    </div>
  );
}
