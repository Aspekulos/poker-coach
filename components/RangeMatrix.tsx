'use client'

import { useState } from 'react'
import { RANKS, OPENING_RANGES, RFI_COLORS, RFIPosition } from '@/lib/data'

const POSITIONS_FILTER: RFIPosition[] = ['EP', 'MP', 'CO', 'BTN', 'Fold']

function getHandLabel(i: number, j: number): string {
  const r1 = RANKS[i]
  const r2 = RANKS[j]
  if (i === j) return r1 + r2
  if (i < j) return r1 + r2 + 's'
  return r2 + r1 + 'o'
}

function buildTooltip(hand: string, position: RFIPosition): string {
  if (position === 'Fold') return `${hand} — À jeter en RFI`
  if (position === 'EP') return `${hand} — Ouvre depuis toutes les positions`
  return `${hand} — Ouvre depuis ${position} et plus tard`
}

export default function RangeMatrix() {
  const [hoveredHand, setHoveredHand] = useState<string | null>(null)
  const [hoveredPos, setHoveredPos] = useState<{ x: number; y: number } | null>(null)
  const [activeFilter, setActiveFilter] = useState<RFIPosition | null>(null)

  return (
    <div>
      {/* Légende */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        {POSITIONS_FILTER.map(pos => {
          const color = RFI_COLORS[pos]
          const isActive = activeFilter === pos
          return (
            <button
              key={pos}
              onClick={() => setActiveFilter(isActive ? null : pos)}
              style={{
                background: color.bg,
                color: color.text,
                border: isActive ? '2px solid ' + color.text : '1px solid #2a2a2a',
                borderRadius: 6,
                padding: '6px 12px',
                fontSize: 12,
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {color.label}
            </button>
          )
        })}
      </div>

      {/* Reset filter */}
      {activeFilter !== null && (
        <button
          onClick={() => setActiveFilter(null)}
          style={{
            background: 'transparent',
            color: '#a1a1aa',
            border: '1px solid #2a2a2a',
            borderRadius: 6,
            padding: '4px 10px',
            fontSize: 11,
            cursor: 'pointer',
            marginBottom: 12,
          }}
        >
          Réinitialiser filtre
        </button>
      )}

      {/* Matrice 13x13 */}
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
              const position: RFIPosition = OPENING_RANGES[hand] ?? 'Fold'
              const color = RFI_COLORS[position]
              const dimmed = activeFilter !== null && position !== activeFilter
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
                    background: color.bg,
                    color: color.text,
                    fontSize: 10,
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 2,
                    cursor: 'pointer',
                    opacity: dimmed ? 0.15 : 1,
                    transition: 'opacity 0.1s ease',
                  }}
                >
                  {hand}
                </div>
              )
            })
          )}
        </div>

        {/* Tooltip */}
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
            {buildTooltip(hoveredHand, OPENING_RANGES[hoveredHand] ?? 'Fold')}
          </div>
        )}
      </div>

      <p style={{ fontSize: 11, color: '#a1a1aa', marginTop: 12 }}>
        Haut-droit = suited · Bas-gauche = offsuit · Diagonale = paires
      </p>
    </div>
  )
}
