const SUITS = ['h', 'd', 'c', 's'] as const
const RANKS_EQ = ['2','3','4','5','6','7','8','9','T','J','Q','K','A'] as const

export function getAllCards(): string[] {
  const cards: string[] = []
  for (const r of RANKS_EQ) for (const s of SUITS) cards.push(r + s)
  return cards
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export interface EquityResult {
  win: number
  tie: number
  lose: number
  iterations: number
}

export async function calculateEquity(
  hand1: string[],
  hand2: string[],
  board: string[] = [],
  iterations = 20000
): Promise<EquityResult> {
  const { Hand } = await import('pokersolver')
  const used = new Set([...hand1, ...hand2, ...board])
  const deck = getAllCards().filter(c => !used.has(c))
  const needed = 5 - board.length

  let wins = 0, ties = 0, losses = 0

  for (let i = 0; i < iterations; i++) {
    const shuffled = shuffle(deck)
    const simBoard = [...board, ...shuffled.slice(0, needed)]
    const h1 = Hand.solve([...hand1, ...simBoard])
    const h2 = Hand.solve([...hand2, ...simBoard])
    const winners = Hand.winners([h1, h2])
    if (winners.length === 2) ties++
    else if (winners.includes(h1)) wins++
    else losses++
  }

  return {
    win: Math.round(wins / iterations * 1000) / 10,
    tie: Math.round(ties / iterations * 1000) / 10,
    lose: Math.round(losses / iterations * 1000) / 10,
    iterations,
  }
}

export function formatCard(card: string): { rank: string; suit: string; suitSymbol: string; color: string } {
  const suit = card.slice(-1)
  const rank = card.slice(0, -1)
  const suitMap: Record<string, { suitSymbol: string; color: string }> = {
    h: { suitSymbol: '♥', color: '#ef4444' },
    d: { suitSymbol: '♦', color: '#ef4444' },
    s: { suitSymbol: '♠', color: '#1a1a1a' },
    c: { suitSymbol: '♣', color: '#1a1a1a' },
  }
  return { rank, suit, ...suitMap[suit] }
}
