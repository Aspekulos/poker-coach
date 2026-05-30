'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'

const Loading = () => (
  <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="#22c55e" strokeWidth="2.5" strokeDasharray="40 20" strokeLinecap="round">
        <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite" />
      </circle>
    </svg>
  </div>
)

const RangeMatrix = dynamic(() => import('@/components/RangeMatrix'), { ssr: false, loading: Loading })
const PushFoldChart = dynamic(() => import('@/components/PushFoldChart'), { ssr: false, loading: Loading })
const Trainer = dynamic(() => import('@/components/Trainer'), { ssr: false, loading: Loading })
const EquityCalc = dynamic(() => import('@/components/EquityCalc'), { ssr: false, loading: Loading })
const PositionStrategy = dynamic(() => import('@/components/PositionStrategy'), { ssr: false, loading: Loading })
const HandAnalyzer = dynamic(() => import('@/components/HandAnalyzer'), { ssr: false, loading: Loading })
const ProgressView = dynamic(() => import('@/components/ProgressView'), { ssr: false, loading: Loading })
const PlayerCoach = dynamic(() => import('@/components/PlayerCoach'), { ssr: false, loading: Loading })
const TableMap = dynamic(() => import('@/components/TableMap'), { ssr: false })

type TabId = 'trainer' | 'ranges' | 'pushfold' | 'equity' | 'strategy' | 'table' | 'analyze' | 'progress' | 'coach'

const TABS: { id: TabId; label: string; desc: string }[] = [
  { id: 'trainer',  label: '🎯 Trainer',      desc: 'Quiz interactif' },
  { id: 'ranges',   label: '📊 Ranges RFI',   desc: "Grille d'ouvertures" },
  { id: 'pushfold', label: '⚡ Push/Fold',     desc: 'Nash < 15BB' },
  { id: 'equity',   label: '🎲 Équité',        desc: 'Calculateur' },
  { id: 'strategy', label: '🧠 Stratégie',    desc: 'Par position' },
  { id: 'table',    label: '🪑 Positions',    desc: 'Repère visuel' },
  { id: 'analyze',  label: '🔍 Analyser',      desc: 'Main Winamax' },
  { id: 'progress', label: '📈 Progression',   desc: 'Historique & stats' },
  { id: 'coach',    label: '🎓 Mon Coach',     desc: 'Coaching personnalisé' },
]

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabId>('table')

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f0f' }}>
      {/* Header */}
      <header style={{ background: '#0f0f0f', borderBottom: '1px solid #2a2a2a' }}>
        <div style={{ maxWidth: 960, margin: '0 auto', padding: '20px 16px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <span style={{ fontSize: 22 }}>🃏</span>
            <h1 style={{ fontSize: 20, fontWeight: 600, color: '#f5f5f5' }}>Poker Coach</h1>
            <span style={{ fontSize: 12, color: '#3f3f46', marginLeft: 6 }}>ML.Aspek</span>
          </div>

          <nav style={{ display: 'flex', overflowX: 'auto', gap: 4 }}>
            {TABS.map(tab => {
              const active = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    background: 'transparent',
                    color: active ? '#22c55e' : '#a1a1aa',
                    border: 'none',
                    borderBottom: active ? '2px solid #22c55e' : '2px solid transparent',
                    padding: '10px 14px',
                    fontSize: 13,
                    fontWeight: active ? 500 : 400,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {tab.label}
                </button>
              )
            })}
          </nav>
        </div>
      </header>

      {/* Contenu */}
      <main style={{ maxWidth: 960, margin: '0 auto', padding: '24px 16px' }}>
        {activeTab === 'trainer' && <Trainer />}
        {activeTab === 'ranges' && <RangeMatrix />}
        {activeTab === 'pushfold' && <PushFoldChart />}
        {activeTab === 'equity' && <EquityCalc />}
        {activeTab === 'strategy' && <PositionStrategy />}
        {activeTab === 'table' && <TableMap />}
        {activeTab === 'analyze' && <HandAnalyzer />}
        {activeTab === 'progress' && <ProgressView />}
        {activeTab === 'coach' && <PlayerCoach />}
      </main>
    </div>
  )
}
