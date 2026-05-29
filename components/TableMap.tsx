'use client'

import { useState } from 'react'

const POSITIONS = [
  {
    id: 'BTN',
    label: 'BTN',
    fullLabel: 'Button',
    angle: 0,
    color: '#3b82f6',
    posType: 'IP',
    desc: 'Meilleure position. Tu parles en dernier post-flop contre tout le monde sauf SB/BB quand ils flat call. Steal large (~42% des mains). C\'est ta position d\'argent.',
    aka: null,
  },
  {
    id: 'CO',
    label: 'CO',
    fullLabel: 'Cutoff',
    angle: 300,
    color: '#f59e0b',
    posType: 'IP',
    desc: '2ème meilleure position. Juste avant le BTN. Si BTN fold, tu as l\'avantage sur SB/BB. Si BTN entre, tu perds ton edge. Open ~25% des mains.',
    aka: null,
  },
  {
    id: 'MP',
    label: 'MP',
    fullLabel: 'Middle Position',
    angle: 240,
    color: '#84cc16',
    posType: 'OOP',
    desc: 'Position intermédiaire. CO, BTN et blindes peuvent te piéger. Joue serré à modéré (~13% des mains). Évite les cold-calls légers.',
    aka: 'HJ (Hijack) en 9-max',
  },
  {
    id: 'EP',
    label: 'EP',
    fullLabel: 'Early Position',
    angle: 180,
    color: '#22c55e',
    posType: 'OOP',
    desc: 'Pire position. Tu parles en 1er — tout le monde te voit avant d\'agir. Range ultra serrée (~10%). Seulement les grosses mains : paires 66+, AK, AQ, broadways.',
    aka: 'UTG (Under The Gun) = 1er à parler',
  },
  {
    id: 'SB',
    label: 'SB',
    fullLabel: 'Small Blind',
    angle: 60,
    color: '#a1a1aa',
    posType: 'OOP',
    desc: 'Poste forcé ½ BB. OOP contre tout le monde sauf BB. Raise ou fold — jamais limp. Face aux steals BTN, défends sélectivement car tu seras OOP toute la main.',
    aka: null,
  },
  {
    id: 'BB',
    label: 'BB',
    fullLabel: 'Big Blind',
    angle: 120,
    color: '#a1a1aa',
    posType: 'OOP',
    desc: 'Poste forcé 1 BB. Dernier à parler pré-flop (avantage), mais 1er post-flop (désavantage). Le 1 BB investi te donne un discount pour défendre plus large face à des petites raises.',
    aka: null,
  },
]

const SEAT_ORDER_INFO = [
  { label: 'UTG / EP', color: '#22c55e', note: 'Parle en 1er' },
  { label: 'MP / HJ',  color: '#84cc16', note: '2ème à parler' },
  { label: 'CO',       color: '#f59e0b', note: '3ème à parler' },
  { label: 'BTN',      color: '#3b82f6', note: 'Parle en dernier (IP)' },
  { label: 'SB',       color: '#a1a1aa', note: '1er post-flop' },
  { label: 'BB',       color: '#a1a1aa', note: 'Dernier pré-flop / 2ème post-flop' },
]

export default function TableMap() {
  const [active, setActive] = useState<string | null>('BTN')
  const activePos = POSITIONS.find(p => p.id === active)

  // Table dimensions
  const CX = 260
  const CY = 160
  const RX = 170
  const RY = 110
  const SEAT_R = 28

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Légende rapide ordre de parole */}
      <div style={{ background: '#1a1a1a', borderRadius: 8, padding: '14px 16px', border: '1px solid #2a2a2a' }}>
        <p style={{ fontSize: 11, color: '#a1a1aa', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
          Ordre de parole post-flop (1er → dernier)
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {SEAT_ORDER_INFO.map((s, i) => (
            <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#242424', borderRadius: 6, padding: '5px 10px' }}>
              <span style={{ fontWeight: 700, color: '#3f3f46', fontSize: 11 }}>{i + 1}</span>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: '#f5f5f5', fontWeight: 500 }}>{s.label}</span>
              <span style={{ fontSize: 11, color: '#a1a1aa' }}>{s.note}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Table visuelle + panel info côte à côte */}
      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>

        {/* SVG table */}
        <div style={{ flex: '0 0 auto' }}>
          <svg width="520" height="320" viewBox="0 0 520 320" style={{ display: 'block' }}>
            {/* Feutrine */}
            <ellipse cx={CX} cy={CY} rx={RX} ry={RY} fill="#0d2818" stroke="#1a4a2a" strokeWidth="3" />
            {/* Rail */}
            <ellipse cx={CX} cy={CY} rx={RX + 12} ry={RY + 12} fill="none" stroke="#2a1a0a" strokeWidth="10" />
            <ellipse cx={CX} cy={CY} rx={RX + 18} ry={RY + 18} fill="none" stroke="#3a2a1a" strokeWidth="4" />

            {/* Texte centre table */}
            <text x={CX} y={CY - 6} textAnchor="middle" fill="#1a4a2a" fontSize="13" fontWeight="600" fontFamily="Inter, sans-serif">POKER COACH</text>
            <text x={CX} y={CY + 12} textAnchor="middle" fill="#1a4a2a" fontSize="11" fontFamily="Inter, sans-serif">6-max</text>

            {/* Dealer button indicator */}
            {(() => {
              const btnRad = (0 - 90) * Math.PI / 180
              const dx = CX + (RX + 16) * Math.cos(btnRad)
              const dy = CY + (RY + 16) * Math.sin(btnRad)
              return (
                <>
                  <circle cx={dx} cy={dy} r={9} fill="#f5f5f5" />
                  <text x={dx} y={dy + 4} textAnchor="middle" fontSize="9" fontWeight="700" fill="#0f0f0f" fontFamily="Inter, sans-serif">D</text>
                </>
              )
            })()}

            {POSITIONS.map(pos => {
              const rad = (pos.angle - 90) * Math.PI / 180
              const sx = CX + (RX + 42) * Math.cos(rad)
              const sy = CY + (RY + 32) * Math.sin(rad)
              const isActive = active === pos.id

              return (
                <g key={pos.id} onClick={() => setActive(pos.id === active ? null : pos.id)} style={{ cursor: 'pointer' }}>
                  {/* Connecteur */}
                  <line
                    x1={CX + RX * Math.cos(rad) * 0.95}
                    y1={CY + RY * Math.sin(rad) * 0.95}
                    x2={sx}
                    y2={sy}
                    stroke={isActive ? pos.color : '#2a2a2a'}
                    strokeWidth="1.5"
                    strokeDasharray={isActive ? 'none' : '3,3'}
                  />
                  {/* Siège */}
                  <circle
                    cx={sx} cy={sy} r={SEAT_R}
                    fill={isActive ? pos.color + '25' : '#1a1a1a'}
                    stroke={isActive ? pos.color : '#3f3f46'}
                    strokeWidth={isActive ? 2 : 1.5}
                  />
                  {/* Label court */}
                  <text x={sx} y={sy - 4} textAnchor="middle" fontSize="11" fontWeight="700" fill={isActive ? pos.color : '#a1a1aa'} fontFamily="Inter, sans-serif">
                    {pos.label}
                  </text>
                  {/* IP/OOP badge */}
                  <text x={sx} y={sy + 10} textAnchor="middle" fontSize="9" fill={pos.posType === 'IP' ? '#4ade80' : '#f59e0b'} fontFamily="Inter, sans-serif">
                    {pos.posType}
                  </text>
                </g>
              )
            })}
          </svg>
          <p style={{ fontSize: 11, color: '#3f3f46', textAlign: 'center', marginTop: 4 }}>
            Clique sur une position pour voir les détails · D = Dealer button
          </p>
        </div>

        {/* Panel info */}
        <div style={{ flex: 1, minWidth: 220 }}>
          {activePos ? (
            <div style={{ background: '#1a1a1a', border: `1px solid ${activePos.color}40`, borderRadius: 10, padding: 20, height: '100%' }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: activePos.color + '20',
                  border: `2px solid ${activePos.color}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700, color: activePos.color
                }}>
                  {activePos.label}
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#f5f5f5' }}>{activePos.fullLabel}</div>
                  {activePos.aka && <div style={{ fontSize: 11, color: '#a1a1aa', marginTop: 2 }}>{activePos.aka}</div>}
                </div>
                <div style={{
                  marginLeft: 'auto',
                  padding: '3px 8px', borderRadius: 4,
                  background: activePos.posType === 'IP' ? 'rgba(34,197,94,0.12)' : 'rgba(245,158,11,0.12)',
                  border: `1px solid ${activePos.posType === 'IP' ? 'rgba(34,197,94,0.3)' : 'rgba(245,158,11,0.3)'}`,
                  fontSize: 11, fontWeight: 600,
                  color: activePos.posType === 'IP' ? '#4ade80' : '#fbbf24'
                }}>
                  {activePos.posType === 'IP' ? '✓ En position' : '✗ Hors position'}
                </div>
              </div>

              {/* Description */}
              <p style={{ fontSize: 13, lineHeight: 1.65, color: '#f5f5f5', marginBottom: 16 }}>
                {activePos.desc}
              </p>

              {/* Tip rapide selon position */}
              <div style={{
                background: '#242424', borderRadius: 6, padding: '10px 12px',
                borderLeft: `3px solid ${activePos.color}`
              }}>
                <p style={{ fontSize: 11, color: '#a1a1aa', fontWeight: 500, marginBottom: 4 }}>RÈGLE CLÉ</p>
                <p style={{ fontSize: 12, color: '#f5f5f5', lineHeight: 1.55 }}>
                  {activePos.id === 'BTN' && "Sois agressif. Tu vois tout le monde agir avant toi — c'est le plus grand avantage au poker."}
                  {activePos.id === 'CO' && "Steal souvent quand c'est folded devant toi. Si BTN 3-bet, respecte-le ou 4-bet/fold."}
                  {activePos.id === 'MP' && "Ne cold-call jamais légèrement. Si tu joues une main, tu la relances. Sinon tu jettes."}
                  {activePos.id === 'EP' && "Chaque main que tu ouvres ici, tu devras la jouer sans info sur les autres. Sois ultra sélectif."}
                  {activePos.id === 'SB' && "Ce ½ BB économisé en limpant ne vaut pas les galères OOP toute la main. Raise ou fold."}
                  {activePos.id === 'BB' && "Ton 1 BB est perdu. La vraie question : est-ce que ta main vaut de défendre face à cette raise ?"}
                </p>
              </div>
            </div>
          ) : (
            <div style={{
              background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 10,
              padding: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
              minHeight: 200
            }}>
              <p style={{ color: '#3f3f46', fontSize: 13, textAlign: 'center' }}>
                Clique sur une position<br />pour voir les détails
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
