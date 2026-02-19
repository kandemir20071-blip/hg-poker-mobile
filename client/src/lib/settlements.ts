export type Settlement = {
  fromPlayer: string;
  fromPlayerId: number;
  toPlayer: string;
  toPlayerId: number;
  amount: number;
};

export type PlayerBalance = {
  id: number;
  name: string;
  netProfit: number;
};

export function calculateSettlements(players: PlayerBalance[]): Settlement[] {
  const winners: { id: number; name: string; remaining: number }[] = [];
  const losers: { id: number; name: string; remaining: number }[] = [];

  for (const p of players) {
    if (p.netProfit > 0) {
      winners.push({ id: p.id, name: p.name, remaining: p.netProfit });
    } else if (p.netProfit < 0) {
      losers.push({ id: p.id, name: p.name, remaining: Math.abs(p.netProfit) });
    }
  }

  winners.sort((a, b) => b.remaining - a.remaining);
  losers.sort((a, b) => b.remaining - a.remaining);

  const settlements: Settlement[] = [];
  let wi = 0;
  let li = 0;

  while (wi < winners.length && li < losers.length) {
    const winner = winners[wi];
    const loser = losers[li];
    const amount = Math.min(winner.remaining, loser.remaining);

    if (amount > 0) {
      settlements.push({
        fromPlayer: loser.name,
        fromPlayerId: loser.id,
        toPlayer: winner.name,
        toPlayerId: winner.id,
        amount,
      });
    }

    winner.remaining -= amount;
    loser.remaining -= amount;

    if (winner.remaining <= 0) wi++;
    if (loser.remaining <= 0) li++;
  }

  return settlements;
}
