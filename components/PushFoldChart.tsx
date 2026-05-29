'use client'

import { useState, useMemo } from 'react'
import { RANKS, PUSH_HAND_RANKING, PUSH_THRESHOLDS, shouldPush, PushPosition } from '@/lib/data'

const POSITIONS: PushPosition[] = ['EP', 'MP', 'CO', 'BTN', 'SB']

function getHandLabel(i: number, j: number): string {
  const r1 = RANKS[i]
  const r2 = RANKS[j]
  if (i === j) return r1 + r2
  if (i < j) return r1 + r2 + 's'
  return r2 + r1 + 'o'
}

export default function PushFoldChart() {
  const [stackBB, setStackBB] = useState(10)
  const [position, setPosition] = useState<PushPosition>('BTN')
  const [hoveredHand, setHoveredHand] = useState<string | null>(null)
  const [hoveredPos, setHoveredPos] = useState<{ x: number; y: number } | null>(null)

  const { pushCount, threshold } = useMemo(() => {
    const t = PUSH_THRESHOLDS[position][stackBB] ?? 0
    const count = Math.ceil(PUSH_HAND_RANKING.length * t / 100)
    return { pushCount: count, threshold: t }
  }, [position, stackBB])

  const contextMsg = useMemo(() => {
    if (stackBB >= 15) return "⚠️ Au-dessus de 15BB, joue un jeu normal d'open/fold, pas de push systématique"
    if (stackBB >= 10) return "Zone mixte : les mains limites peuvent être open-raised ou pushées selon le contexte"
    return "Zone push/fold pure — jam ou fold, pas d'open-raise"
  }, [stackBB])

  return (
    <div>
      {/* Contrôles */}
      <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8, padding: 16, marginBottom: 16 }}>
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 11, color: '#a1a1aa', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500 }}>
            Stack : <span style={{ color: '#22c55e', fontWeight: 600 }}>{stackBB} BB</span>
          </label>
          <input
            type="range"
            min={4}
            max={15}
            step={1}
            value={stackBB}
            onChange={(e) => setStackBB(Number(e.target.value))}
            style={{ width: '100%', accentColor: '#22c55e' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 11, color: '#a1a1aa', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500 }}>
            Position
          </label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {POSITIONS.map(p => {
              const active = position === p
              return (
                <button
                  key={p}
                  onClick={() => setPosition(p)}
                  style={{
                    background: active ? 'rgba(34,197,94,0.15)' : 'transparent',
                    color: active ? '#22c55e' : '#a1a1aa',
                    border: active ? '1px solid #22c55e' : '1px solid #2a2a2a',
                    borderRadius: 6,
                    padding: '6px 14px',
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {p}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <p style={{ fontSize: 13, color: '#f5f5f5', marginBottom: 8 }}>
        Push : <strong style={{ color: '#22c55e' }}>{threshold.toFixed(1)}%</strong> des mains
        <span style={{ color: '#a1a1aa' }}> ({pushCount} combos)</span>
      </p>
      <p style={{ fontSize: 12, color: '#a1a1aa', marginBottom: 16, fontStyle: 'italic' }}>{contextMsg}</p>

      {/* Grille */}
      <div style={{ position: 'relative' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(13, 1fr)',
            gap: 1,
            background: '#0f0f0f',
          }}
        >
          {RANKS.map((_, i) =>
            RANKS.map((__, j) => {
              const hand = getHandLabel(i, j)
              const push = shouldPush(hand, position, stackBB)
              return (
                <div
                  key={`${i}-${j}`}
                  onMouseEnter={(e) => {
                    setHoveredHand(hand)
                    const rect = e.currentTarget.getBoundingClientRect()
                    setHoveredPos({ x: rect.left + rect.width / 2, y: rect.top })
                  }}
                  onMouseLeave={() => {
                    setHoveredHand(null)
                    setHoveredPos(null)
                  }}
                  style={{
                    aspectRatio: '1 / 1',
                    background: push ? '#22c55e' : '#1a1a1a',
                    color: push ? '#0f0f0f' : '#3f3f46',
                    fontSize: 10,
                    fontWeight: push ? 600 : 500,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 2,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {hand}
                </div>
              )
            })
          )}
        </div>

        {hoveredHand && hoveredPos && (
          <div
            style={{
              position: 'fixed',
              left: hoveredPos.x,
              top: hoveredPos.y - 36,
              transform: 'translateX(-50%)',
              background: '#242424',
              color: '#f5f5f5',
              border: '1px solid #2a2a2a',
              padding: '6px 10px',
              fontSize: 11,
              borderRadius: 4,
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
              zIndex: 50,
            }}
          >
            {hoveredHand} — {shouldPush(hoveredHand, position, stackBB) ? 'Push all-in' : 'Fold'}
          </div>
        )}
      </div>

      <p style={{ fontSize: 11, color: '#a1a1aa', marginTop: 12 }}>
        Basé sur Nash équilibre (ChipEV) — 9-max avec antes
      </p>
    </div>
  )
}
