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

const Dashboard = dynamic(() => import('@/components/Dashboard'), { ssr: false, loading: Loading })
const RangeMatrix = dynamic(() => import('@/components/RangeMatrix'), { ssr: false, loading: Loading })
const PushFoldChart = dynamic(() => import('@/components/PushFoldChart'), { ssr: false, loading: Loading })
const Trainer = dynamic(() => import('@/components/Trainer'), { ssr: false, loading: Loading })
const EquityCalc = dynamic(() => import('@/components/EquityCalc'), { ssr: false, loading: Loading })
const PositionStrategy = dynamic(() => import('@/components/PositionStrategy'), { ssr: false, loading: Loading })
const HandAnalyzer = dynamic(() => import('@/components/HandAnalyzer'), { ssr: false, loading: Loading })
const ProgressView = dynamic(() => import('@/components/ProgressView'), { ssr: false, loading: Loading })
const PlayerCoach = dynamic(() => import('@/components/PlayerCoach'), { ssr: false, loading: Loading })
const TableMap = dynamic(() => import('@/components/TableMap'), { ssr: false })

type TabId = 'dashboard' | 'coach' | 'progress' | 'trainer' | 'ranges' | 'pushfold' | 'equity' | 'strategy' | 'table' | 'analyze'

const NAV: { id: TabId; icon: string; label: string }[] = [
  { id: 'dashboard', icon: '📊', label: 'Dashboard' },
  { id: 'coach',     icon: '🎓', label: 'Mon Coach' },
  { id: 'progress',  icon: '📈', label: 'Progression' },
  { id: 'trainer',   icon: '🎯', label: 'Trainer' },
  { id: 'ranges',    icon: '📋', label: 'Ranges RFI' },
  { id: 'pushfold',  icon: '⚡', label: 'Push/Fold' },
  { id: 'equity',    icon: '⚖️', label: 'Équité' },
  { id: 'strategy',  icon: '🗺️', label: 'Stratégie' },
  { id: 'table',     icon: '📍', label: 'Positions' },
  { id: 'analyze',   icon: '🔍', label: 'Analyser' },
]

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabId>('dashboard')

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg-base)' }}>
      {/* ───────────── Sidebar ───────────── */}
      <aside
        style={{
          width: 220,
          flexShrink: 0,
          height: '100vh',
          background: '#0a0a0f',
          borderRight: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Logo + badge joueur */}
        <div style={{ padding: '20px 16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 20 }}>🃏</span>
            <h1 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>Poker Coach</h1>
          </div>
          <span
            style={{
              display: 'inline-block',
              background: 'rgba(34,197,94,0.12)',
              color: '#22c55e',
              border: '1px solid rgba(34,197,94,0.3)',
              borderRadius: 6,
              padding: '3px 9px',
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            ML.Aspek
          </span>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, overflowY: 'auto', paddingTop: 4 }}>
          {NAV.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              aria-current={activeTab === item.id ? 'page' : undefined}
              className={`sidebar-item${activeTab === item.id ? ' active' : ''}`}
            >
              <span style={{ fontSize: 15, width: 20, textAlign: 'center' }}>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Footer version */}
        <div style={{ padding: '14px 16px', fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>
          v0.1 beta
        </div>
      </aside>

      {/* ───────────── Contenu principal ───────────── */}
      <main style={{ flex: 1, overflowY: 'auto', height: '100vh' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 28px 48px' }}>
          {activeTab === 'dashboard' && <Dashboard />}
          {activeTab === 'trainer' && <Trainer />}
          {activeTab === 'ranges' && <RangeMatrix />}
          {activeTab === 'pushfold' && <PushFoldChart />}
          {activeTab === 'equity' && <EquityCalc />}
          {activeTab === 'strategy' && <PositionStrategy />}
          {activeTab === 'table' && <TableMap />}
          {activeTab === 'analyze' && <HandAnalyzer />}
          {activeTab === 'progress' && <ProgressView />}
          {activeTab === 'coach' && <PlayerCoach />}
        </div>
      </main>
    </div>
  )
}
