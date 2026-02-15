import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, SkipForward, Volume2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const BLIND_MULTIPLIERS = [
  1, 1.5, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 30, 40, 50, 60, 80, 100,
];

function formatCurrency(amount: number): string {
  if (amount >= 1 && amount === Math.floor(amount)) {
    return `$${amount}`;
  }
  return `$${amount.toFixed(2)}`;
}

function getBlindsForLevel(level: number, startingBB: number): [number, number] {
  const multiplier = level < BLIND_MULTIPLIERS.length
    ? BLIND_MULTIPLIERS[level]
    : BLIND_MULTIPLIERS[BLIND_MULTIPLIERS.length - 1] * Math.pow(2, level - BLIND_MULTIPLIERS.length + 1);
  const bb = startingBB * multiplier;
  const sb = bb / 2;
  return [sb, bb];
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
  const audioContextRef = useRef<AudioContext | null>(null);

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    return audioContextRef.current;
  }, []);

  const currentBlinds = getBlindsForLevel(currentLevel, startingBigBlind);
  const nextBlinds = getBlindsForLevel(currentLevel + 1, startingBigBlind);

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const totalSeconds = levelDurationMinutes * 60;
  const progress = totalSeconds > 0 ? ((totalSeconds - secondsRemaining) / totalSeconds) * 100 : 0;

  const playBeep = useCallback(() => {
    try {
      const ctx = getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      osc.type = "sine";
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.5);
      setTimeout(() => {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.frequency.value = 1100;
        osc2.type = "sine";
        gain2.gain.setValueAtTime(0.3, ctx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
        osc2.start(ctx.currentTime);
        osc2.stop(ctx.currentTime + 0.6);
      }, 300);
    } catch {
    }
  }, []);

  const advanceLevel = useCallback(() => {
    const newLevel = currentLevel + 1;
    const newBlinds = getBlindsForLevel(newLevel, startingBigBlind);
    setCurrentLevel(newLevel);
    setSecondsRemaining(levelDurationMinutes * 60);
    playBeep();
    toast({
      title: "Blinds Increased!",
      description: `Blinds are now ${formatCurrency(newBlinds[0])} / ${formatCurrency(newBlinds[1])}`,
    });
  }, [currentLevel, levelDurationMinutes, startingBigBlind, toast, playBeep]);

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
            onClick={() => { getAudioContext(); setIsRunning(!isRunning); }}
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
            {formatCurrency(currentBlinds[0])} / {formatCurrency(currentBlinds[1])}
          </p>
        </div>
        <div className="w-px h-10 bg-white/[0.08]" />
        <div className="text-center flex-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">Next Blinds</p>
          <p className="text-2xl font-mono font-bold text-muted-foreground" data-testid="text-next-blinds">
            {formatCurrency(nextBlinds[0])} / {formatCurrency(nextBlinds[1])}
          </p>
        </div>
      </div>
    </div>
  );
}
