'use client'

import { useState } from 'react'
import { POSITIONS_STRATEGY } from '@/lib/data'

export default function PositionStrategy() {
  const [activeId, setActiveId] = useState('BTN')
  const active = POSITIONS_STRATEGY.find(p => p.id === activeId) ?? POSITIONS_STRATEGY[0]

  return (
    <div>
      {/* Boutons */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        {POSITIONS_STRATEGY.map(p => {
          const isActive = p.id === activeId
          return (
            <button
              key={p.id}
              onClick={() => setActiveId(p.id)}
              style={{
                background: isActive ? `${p.accentColor}26` : 'transparent',
                color: isActive ? p.accentColor : '#a1a1aa',
                border: isActive ? `1px solid ${p.accentColor}` : '1px solid #2a2a2a',
                borderRadius: 6,
                padding: '8px 14px',
                fontSize: 12,
                fontWeight: isActive ? 500 : 400,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {p.label}
            </button>
          )
        })}
      </div>

      {/* Panel */}
      <div
        style={{
          background: '#1a1a1a',
          border: '1px solid #2a2a2a',
          borderRadius: 12,
          padding: 20,
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: active.accentColor }}>{active.label}</h2>
          <span
            style={{
              background: active.posType === 'IP' ? 'rgba(34,197,94,0.15)' : 'rgba(245,158,11,0.15)',
              color: active.posType === 'IP' ? '#22c55e' : '#f59e0b',
              padding: '3px 8px',
              borderRadius: 4,
              fontSize: 11,
              fontWeight: 500,
            }}
          >
            {active.posType} — {active.posLabel}
          </span>
          <span style={{ color: '#a1a1aa', fontSize: 12 }}>
            Range : <strong style={{ color: '#f5f5f5' }}>{active.range}</strong>
          </span>
        </div>

        {/* Grid 2 cols : Préflop + Post-flop */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10, marginBottom: 12 }}>
          <div style={{ background: '#242424', border: '1px solid #2a2a2a', borderRadius: 6, padding: 12 }}>
            <p style={{ fontSize: 11, fontWeight: 500, color: '#a1a1aa', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Préflop
            </p>
            <p style={{ fontSize: 13, lineHeight: 1.6, color: '#f5f5f5' }}>{active.preflop}</p>
          </div>
          <div style={{ background: '#242424', border: '1px solid #2a2a2a', borderRadius: 6, padding: 12 }}>
            <p style={{ fontSize: 11, fontWeight: 500, color: '#a1a1aa', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Post-flop
            </p>
            <p style={{ fontSize: 13, lineHeight: 1.6, color: '#f5f5f5' }}>{active.postflop}</p>
          </div>
        </div>

        {/* Clé */}
        <div
          style={{
            background: 'rgba(59,130,246,0.07)',
            border: '1px solid rgba(59,130,246,0.2)',
            borderRadius: 6,
            padding: 12,
            marginBottom: 10,
          }}
        >
          <p style={{ fontSize: 11, fontWeight: 500, color: '#3b82f6', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Clé
          </p>
          <p style={{ fontSize: 13, lineHeight: 1.6, color: '#f5f5f5' }}>{active.keyTip}</p>
        </div>

        {/* Erreur */}
        <div
          style={{
            background: 'rgba(239,68,68,0.06)',
            border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: 6,
            padding: 12,
          }}
        >
          <p style={{ fontSize: 11, fontWeight: 500, color: '#ef4444', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Erreur fréquente
          </p>
          <p style={{ fontSize: 13, lineHeight: 1.6, color: '#f5f5f5' }}>{active.error}</p>
        </div>
      </div>
    </div>
  )
}
