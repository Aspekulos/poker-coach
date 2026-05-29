'use client'

import { useState, useMemo } from 'react'
import { calculateEquity, getAllCards, formatCard, EquityResult } from '@/lib/equity'

type Slot = 'hand1' | 'hand2' | 'board'

const ALL_CARDS = getAllCards()
const RANK_ORDER = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2']
const SUIT_ORDER = ['s', 'h', 'd', 'c']

function CardDisplay({ card }: { card: string | null }) {
  if (!card) {
    return (
      <div
        style={{
          width: 44,
          height: 60,
          border: '1.5px dashed #2a2a2a',
          borderRadius: 6,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#3f3f46',
          fontSize: 18,
        }}
      >
        ?
      </div>
    )
  }
  const c = formatCard(card)
  return (
    <div
      style={{
        width: 44,
        height: 60,
        background: '#f5f5f5',
        borderRadius: 6,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 4,
      }}
    >
      <span style={{ fontSize: 16, fontWeight: 700, color: c.color, alignSelf: 'flex-start' }}>{c.rank}</span>
      <span style={{ fontSize: 22, color: c.color }}>{c.suitSymbol}</span>
    </div>
  )
}

function CardSlot({
  active,
  onClick,
  label,
  cards,
  maxCards,
}: {
  active: boolean
  onClick: () => void
  label: string
  cards: string[]
  maxCards: number
}) {
  return (
    <div
      onClick={onClick}
      style={{
        background: active ? 'rgba(34,197,94,0.05)' : '#1a1a1a',
        border: active ? '1px solid #22c55e' : '1px solid #2a2a2a',
        borderRadius: 8,
        padding: 14,
        cursor: 'pointer',
        transition: 'all 0.15s ease',
      }}
    >
      <p style={{ fontSize: 11, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8, fontWeight: 500 }}>
        {label}
      </p>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {Array.from({ length: maxCards }).map((_, i) => (
          <CardDisplay key={i} card={cards[i] ?? null} />
        ))}
      </div>
    </div>
  )
}

export default function EquityCalc() {
  const [hand1, setHand1] = useState<string[]>([])
  const [hand2, setHand2] = useState<string[]>([])
  const [board, setBoard] = useState<string[]>([])
  const [result, setResult] = useState<EquityResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selecting, setSelecting] = useState<Slot>('hand1')

  const usedCards = useMemo(() => new Set([...hand1, ...hand2, ...board]), [hand1, hand2, board])

  const handlePickCard = (card: string) => {
    if (usedCards.has(card)) return
    if (selecting === 'hand1') {
      if (hand1.length >= 2) return
      setHand1([...hand1, card])
    } else if (selecting === 'hand2') {
      if (hand2.length >= 2) return
      setHand2([...hand2, card])
    } else {
      if (board.length >= 5) return
      setBoard([...board, card])
    }
    setResult(null)
  }

  const handleSlotClick = (slot: Slot) => {
    setSelecting(slot)
    if (slot === 'hand1') setHand1([])
    else if (slot === 'hand2') setHand2([])
    else setBoard([])
    setResult(null)
  }

  const handleReset = () => {
    setHand1([])
    setHand2([])
    setBoard([])
    setResult(null)
    setError(null)
    setSelecting('hand1')
  }

  const handleCalculate = async () => {
    if (hand1.length !== 2 || hand2.length !== 2) {
      setError('Sélectionne 2 cartes pour chaque joueur.')
      return
    }
    setError(null)
    setLoading(true)
    try {
      const r = await calculateEquity(hand1, hand2, board, 20000)
      setResult(r)
    } catch (e) {
      console.error(e)
      setError('Erreur lors du calcul.')
    } finally {
      setLoading(false)
    }
  }

  const canCalculate = hand1.length === 2 && hand2.length === 2 && !loading

  // Cards organized by suit then rank
  const cardsBySuit = SUIT_ORDER.flatMap(s => RANK_ORDER.map(r => r + s))

  return (
    <div>
      {/* Slots */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <CardSlot
          active={selecting === 'hand1'}
          onClick={() => setSelecting('hand1')}
          label="Ma main"
          cards={hand1}
          maxCards={2}
        />
        <CardSlot
          active={selecting === 'hand2'}
          onClick={() => setSelecting('hand2')}
          label="Adversaire"
          cards={hand2}
          maxCards={2}
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <CardSlot
          active={selecting === 'board'}
          onClick={() => setSelecting('board')}
          label="Board (optionnel)"
          cards={board}
          maxCards={5}
        />
      </div>

      {/* Sélecteur de cartes */}
      <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8, padding: 12, marginBottom: 16 }}>
        <p style={{ fontSize: 11, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10, fontWeight: 500 }}>
          Pioche une carte ({selecting === 'hand1' ? 'Ma main' : selecting === 'hand2' ? 'Adversaire' : 'Board'})
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(13, 1fr)', gap: 4 }}>
          {cardsBySuit.map(card => {
            const c = formatCard(card)
            const used = usedCards.has(card)
            return (
              <button
                key={card}
                onClick={() => handlePickCard(card)}
                disabled={used}
                style={{
                  background: used ? '#0f0f0f' : '#f5f5f5',
                  color: c.color,
                  border: '1px solid ' + (used ? '#2a2a2a' : '#0f0f0f'),
                  borderRadius: 4,
                  padding: '6px 2px',
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: used ? 'not-allowed' : 'pointer',
                  opacity: used ? 0.3 : 1,
                  transition: 'all 0.1s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  lineHeight: 1.1,
                }}
              >
                <span>{c.rank}</span>
                <span style={{ fontSize: 13 }}>{c.suitSymbol}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Boutons */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <button
          onClick={handleCalculate}
          disabled={!canCalculate}
          style={{
            flex: 1,
            background: canCalculate ? '#22c55e' : '#242424',
            color: canCalculate ? '#000' : '#3f3f46',
            border: 'none',
            borderRadius: 8,
            padding: 12,
            fontSize: 13,
            fontWeight: 600,
            cursor: canCalculate ? 'pointer' : 'not-allowed',
          }}
        >
          {loading ? 'Calcul…' : 'Calculer (20 000 simulations)'}
        </button>
        <button
          onClick={handleReset}
          style={{
            background: 'transparent',
            color: '#a1a1aa',
            border: '1px solid #2a2a2a',
            borderRadius: 8,
            padding: '12px 20px',
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          Réinitialiser
        </button>
      </div>

      {error && (
        <div
          style={{
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: 6,
            padding: 12,
            fontSize: 13,
            color: '#ef4444',
            marginBottom: 16,
          }}
        >
          {error}
        </div>
      )}

      {result && (
        <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8, padding: 20, marginBottom: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
            <ResultBar label="Victoire" value={result.win} color="#22c55e" />
            <ResultBar label="Égalité" value={result.tie} color="#f59e0b" />
            <ResultBar label="Défaite" value={result.lose} color="#ef4444" />
          </div>
          <p style={{ fontSize: 11, color: '#a1a1aa', textAlign: 'center', marginTop: 8 }}>
            {result.iterations.toLocaleString()} simulations Monte Carlo
          </p>
        </div>
      )}

      {/* Quick reference */}
      <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8, padding: 16 }}>
        <p style={{ fontSize: 11, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10, fontWeight: 500 }}>
          Quick reference — matchups courants
        </p>
        <div style={{ fontSize: 12 }}>
          {[
            ['Overpair vs underpair (AA vs KK)', '82% vs 18%'],
            ['Overpair vs top pair (AA vs AK)', '67% vs 33%'],
            ['Paire vs deux overcards (JJ vs AK)', '57% vs 43%'],
            ['Flush draw vs top pair', '36% vs 64%'],
            ['Open-ender vs top pair', '31% vs 69%'],
            ['Set vs flush draw sur flop', '67% vs 33%'],
          ].map(([m, v], i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '6px 0',
                borderBottom: i < 5 ? '1px solid #242424' : 'none',
                gap: 8,
              }}
            >
              <span style={{ color: '#f5f5f5' }}>{m}</span>
              <span style={{ color: '#22c55e', fontWeight: 500, whiteSpace: 'nowrap' }}>{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function ResultBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div
        style={{
          fontSize: 32,
          fontWeight: 600,
          color,
          lineHeight: 1.2,
        }}
      >
        {value.toFixed(1)}%
      </div>
      <div style={{ fontSize: 11, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ height: 4, background: '#242424', borderRadius: 2, overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            width: `${value}%`,
            background: color,
            transition: 'width 0.3s ease',
          }}
        />
      </div>
    </div>
  )
}
