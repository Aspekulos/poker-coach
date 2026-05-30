'use client'

import { useState, useEffect } from 'react'
import { RANKS, OPENING_RANGES, RFI_COLORS, shouldPush, PUSH_THRESHOLDS, RFIPosition, PushPosition } from '@/lib/data'

type Mode = 'rfi' | 'pushfold'
type Action = 'raise' | 'fold' | 'push'

interface Spot {
  mode: Mode
  position: RFIPosition | PushPosition
  hand: string
  stackBB: number
  correctAction: Action
  explanation: string
}

const RFI_POSITIONS: RFIPosition[] = ['EP', 'MP', 'CO', 'BTN']
const PF_POSITIONS: PushPosition[] = ['EP', 'MP', 'CO', 'BTN', 'SB']

function generateRandomHand(): string {
  const r1 = RANKS[Math.floor(Math.random() * 13)]
  const r2 = RANKS[Math.floor(Math.random() * 13)]
  if (r1 === r2) return r1 + r2
  const i1 = RANKS.indexOf(r1)
  const i2 = RANKS.indexOf(r2)
  const high = i1 < i2 ? r1 : r2
  const low = i1 < i2 ? r2 : r1
  const suited = Math.random() < 0.3
  return high + low + (suited ? 's' : 'o')
}

function buildRFIExplanation(hand: string, position: RFIPosition, correctAction: Action): string {
  if (correctAction === 'raise') {
    return `Avec ${hand} depuis ${position}, tu dois ouvrir car cette main fait partie de la range d'ouverture standard (RFI) à cette position.`
  }
  return `Avec ${hand} depuis ${position}, tu dois folder car cette main est trop faible pour ouvrir d'ici (hors range RFI standard).`
}

function buildPFExplanation(hand: string, position: PushPosition, stackBB: number, isPush: boolean): string {
  const threshold = PUSH_THRESHOLDS[position][stackBB] ?? 0
  if (isPush) {
    return `Avec ${hand} à ${stackBB}BB depuis ${position}, la stratégie Nash recommande de push car la main a assez d'équité pour un jam rentable (~${threshold.toFixed(0)}% des mains jouables d'ici).`
  }
  return `Avec ${hand} à ${stackBB}BB depuis ${position}, la stratégie Nash recommande de folder car la main est hors de la range de jam (~${threshold.toFixed(0)}% des mains).`
}

function generateSpot(): Spot {
  const mode: Mode = Math.random() < 0.5 ? 'rfi' : 'pushfold'
  const hand = generateRandomHand()

  if (mode === 'rfi') {
    const position = RFI_POSITIONS[Math.floor(Math.random() * RFI_POSITIONS.length)]
    const handRange = OPENING_RANGES[hand]
    const isInRange = handRange !== undefined && RFI_POSITIONS.indexOf(handRange) <= RFI_POSITIONS.indexOf(position)
    const correctAction: Action = isInRange ? 'raise' : 'fold'
    return {
      mode,
      position,
      hand,
      stackBB: 40,
      correctAction,
      explanation: buildRFIExplanation(hand, position, correctAction),
    }
  }

  const position = PF_POSITIONS[Math.floor(Math.random() * PF_POSITIONS.length)]
  const stackBB = Math.floor(Math.random() * 12) + 4
  const isPush = shouldPush(hand, position, stackBB)
  return {
    mode,
    position,
    hand,
    stackBB,
    correctAction: isPush ? 'push' : 'fold',
    explanation: buildPFExplanation(hand, position, stackBB, isPush),
  }
}

interface VisualCard {
  rank: string
  suit: string
  color: string
}

function handToCards(hand: string): [VisualCard, VisualCard] {
  const r1 = hand[0]
  const r2 = hand[1]
  const isPair = r1 === r2
  const isSuited = hand.length === 3 && hand[2] === 's'

  if (isPair) {
    return [
      { rank: r1, suit: '♥', color: '#ef4444' },
      { rank: r2, suit: '♠', color: '#1a1a1a' },
    ]
  }
  if (isSuited) {
    return [
      { rank: r1, suit: '♠', color: '#1a1a1a' },
      { rank: r2, suit: '♠', color: '#1a1a1a' },
    ]
  }
  return [
    { rank: r1, suit: '♠', color: '#1a1a1a' },
    { rank: r2, suit: '♥', color: '#ef4444' },
  ]
}

function CardVisual({ rank, suit, color }: VisualCard) {
  return (
    <div
      style={{
        width: 56,
        height: 78,
        background: '#f5f5f5',
        borderRadius: 6,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 6,
        boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
      }}
    >
      <span style={{ fontSize: 18, fontWeight: 700, color, alignSelf: 'flex-start' }}>{rank}</span>
      <span style={{ fontSize: 26, color }}>{suit}</span>
    </div>
  )
}

export default function Trainer() {
  const [spot, setSpot] = useState<Spot | null>(null)
  const [answered, setAnswered] = useState(false)
  const [userAction, setUserAction] = useState<Action | null>(null)
  const [score, setScore] = useState({ correct: 0, total: 0 })

  useEffect(() => {
    setSpot(generateSpot())
  }, [])

  const handleAnswer = (action: Action) => {
    if (!spot || answered) return
    setUserAction(action)
    setAnswered(true)
    setScore(s => ({
      correct: s.correct + (action === spot.correctAction ? 1 : 0),
      total: s.total + 1,
    }))
  }

  const handleNext = () => {
    setSpot(generateSpot())
    setAnswered(false)
    setUserAction(null)
  }

  const handleSkip = () => {
    setSpot(generateSpot())
    setAnswered(false)
    setUserAction(null)
  }

  if (!spot) return <div style={{ color: '#a1a1aa' }}>Chargement…</div>

  const [card1, card2] = handToCards(spot.hand)
  const isCorrect = userAction === spot.correctAction

  // Label de la bonne réponse : RFI → Open/Fold, Push/Fold → Push/Fold
  const correctAnswer = spot.mode === 'rfi'
    ? (spot.correctAction === 'raise' ? 'Open' : 'Fold')
    : (spot.correctAction === 'push' ? 'Push' : 'Fold')

  // Position badge color
  const isRFI = spot.mode === 'rfi'
  const posColor = isRFI
    ? RFI_COLORS[spot.position as RFIPosition] ?? RFI_COLORS.Fold
    : { bg: 'rgba(34,197,94,0.15)', text: '#22c55e', label: spot.position }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ fontSize: 13, color: '#a1a1aa' }}>
          <strong style={{ color: '#22c55e' }}>{score.correct}</strong> / {score.total} bonnes réponses
        </span>
        <button
          onClick={handleSkip}
          style={{
            background: 'transparent',
            color: '#a1a1aa',
            border: '1px solid #2a2a2a',
            borderRadius: 6,
            padding: '6px 12px',
            fontSize: 12,
            cursor: 'pointer',
          }}
        >
          Nouvelle main
        </button>
      </div>

      {/* Card principal */}
      <div
        style={{
          background: '#1a1a1a',
          border: '1px solid #2a2a2a',
          borderRadius: 12,
          padding: 24,
        }}
      >
        {/* Badges */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          <span
            style={{
              background: posColor.bg,
              color: posColor.text,
              padding: '4px 10px',
              borderRadius: 4,
              fontSize: 12,
              fontWeight: 500,
            }}
          >
            {spot.position}
          </span>
          {spot.mode === 'pushfold' && (
            <span
              style={{
                background: 'rgba(245,158,11,0.15)',
                color: '#f59e0b',
                padding: '4px 10px',
                borderRadius: 4,
                fontSize: 12,
                fontWeight: 500,
              }}
            >
              {spot.stackBB} BB
            </span>
          )}
          <span
            style={{
              background: 'rgba(59,130,246,0.15)',
              color: '#3b82f6',
              padding: '4px 10px',
              borderRadius: 4,
              fontSize: 12,
              fontWeight: 500,
            }}
          >
            {spot.mode === 'rfi' ? 'RFI Open' : 'Push/Fold'}
          </span>
        </div>

        {/* Main visuelle */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 8 }}>
          <CardVisual {...card1} />
          <CardVisual {...card2} />
        </div>
        <p style={{ textAlign: 'center', fontSize: 13, color: '#a1a1aa', marginBottom: 24 }}>
          {spot.hand}
        </p>

        {/* Actions */}
        {!answered ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <button
              onClick={() => handleAnswer('fold')}
              style={{
                background: 'rgba(239,68,68,0.15)',
                color: '#ef4444',
                border: '1px solid rgba(239,68,68,0.4)',
                borderRadius: 8,
                padding: 14,
                fontSize: 15,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              Fold
            </button>
            <button
              onClick={() => handleAnswer(spot.mode === 'rfi' ? 'raise' : 'push')}
              style={{
                background: 'rgba(34,197,94,0.15)',
                color: '#22c55e',
                border: '1px solid rgba(34,197,94,0.4)',
                borderRadius: 8,
                padding: 14,
                fontSize: 15,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {spot.mode === 'rfi' ? 'Raise 2.5 BB' : 'Push All-in'}
            </button>
          </div>
        ) : (
          <div>
            <div
              style={{
                background: isCorrect ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.10)',
                color: isCorrect ? '#22c55e' : '#ef4444',
                border: `1px solid ${isCorrect ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
                padding: '10px 14px',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                marginBottom: 12,
                textAlign: 'center',
              }}
            >
              {isCorrect ? '✓ Correct !' : `✗ Incorrect — la bonne action était ${spot.correctAction === 'raise' ? 'Raise' : spot.correctAction === 'push' ? 'Push' : 'Fold'}`}
            </div>

            {isCorrect ? (
              <div
                style={{
                  background: '#242424',
                  borderRadius: 8,
                  padding: 14,
                  fontSize: 13,
                  lineHeight: 1.6,
                  color: '#f5f5f5',
                  marginBottom: 14,
                }}
              >
                {spot.explanation}
              </div>
            ) : (
              // Bonne réponse + explication (affiché uniquement sur erreur).
              // Équivalent inline du snippet Tailwind : bg-gray-800,
              // border-gray-600, text-green-400, text-gray-300.
              <div
                style={{
                  marginTop: 12,
                  marginBottom: 14,
                  padding: 12,
                  background: '#1f2937',
                  borderRadius: 8,
                  border: '1px solid #4b5563',
                  fontSize: 13,
                }}
              >
                <p style={{ color: '#4ade80', fontWeight: 500, marginBottom: 4 }}>
                  ✅ Bonne réponse : {correctAnswer}
                </p>
                <p style={{ color: '#d1d5db', lineHeight: 1.6 }}>{spot.explanation}</p>
              </div>
            )}

            <button
              onClick={handleNext}
              style={{
                width: '100%',
                background: '#22c55e',
                color: '#000',
                border: 'none',
                borderRadius: 8,
                padding: 12,
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Main suivante →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
