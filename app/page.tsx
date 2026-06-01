'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import {
  LayoutDashboard,
  Upload,
  BrainCircuit,
  TrendingUp,
  Dumbbell,
  Grid3X3,
  Zap,
  Scale,
  Map,
  MapPin,
} from 'lucide-react'

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

type NavIcon = React.ComponentType<{ size?: number; strokeWidth?: number }>

const NAV_MAIN: { id: TabId; icon: NavIcon; label: string }[] = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { id: 'analyze',   icon: Upload,          label: 'Analyser' },
  { id: 'coach',     icon: BrainCircuit,    label: 'Mon Coach' },
  { id: 'progress',  icon: TrendingUp,      label: 'Progression' },
  { id: 'trainer',   icon: Dumbbell,        label: 'Trainer' },
]

const NAV_REFS: { id: TabId; icon: NavIcon; label: string }[] = [
  { id: 'ranges',   icon: Grid3X3, label: 'Ranges RFI' },
  { id: 'pushfold', icon: Zap,     label: 'Push/Fold' },
  { id: 'equity',   icon: Scale,   label: 'Équité' },
  { id: 'strategy', icon: Map,     label: 'Stratégie' },
  { id: 'table',    icon: MapPin,  label: 'Positions' },
]

const TAB_META: Record<TabId, { label: string; action?: string }> = {
  dashboard: { label: 'Dashboard',    action: '+ Tournoi' },
  analyze:   { label: 'Analyser',     action: '↑ Importer' },
  coach:     { label: 'Mon Coach'     },
  progress:  { label: 'Progression'  },
  trainer:   { label: 'Trainer'      },
  ranges:    { label: 'Ranges RFI'   },
  pushfold:  { label: 'Push / Fold'  },
  equity:    { label: 'Équité'       },
  strategy:  { label: 'Stratégie'    },
  table:     { label: 'Positions'    },
}

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
        <div style={{ padding: '18px 16px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div style={{
              width: 28,
              height: 28,
              background: 'rgba(201,168,76,0.12)',
              border: '1px solid rgba(201,168,76,0.30)',
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
              color: '#c9a84c',
              fontFamily: 'serif',
              lineHeight: 1,
              flexShrink: 0,
            }}>
              <svg width="13" height="13" viewBox="0 0 100 100" fill="#22c55e">
                <path d="M50 5 C50 5 10 35 10 58 C10 75 25 82 38 76
                         C34 85 28 90 20 92 L80 92
                         C72 90 66 85 62 76
                         C75 82 90 75 90 58
                         C90 35 50 5 50 5 Z"/>
              </svg>
            </div>
            <h1 style={{
              fontFamily: 'var(--font-playfair)',
              fontWeight: 600,
              fontSize: 14,
              color: '#e4e0d8',
              letterSpacing: '0.01em',
            }}>
              Poker Coach
            </h1>
          </div>
          <span style={{
            display: 'inline-block',
            background: 'var(--green-dim)',
            color: 'var(--green)',
            border: '1px solid var(--green-border)',
            borderRadius: 'var(--radius-sm)',
            padding: '3px 8px',
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.02em',
          }}>
            ML.Aspek
          </span>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, overflowY: 'auto', paddingTop: 4 }}>
          {NAV_MAIN.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              aria-current={activeTab === item.id ? 'page' : undefined}
              className={`sidebar-item${activeTab === item.id ? ' active' : ''}`}
            >
              <item.icon size={15} strokeWidth={1.75} />
              <span>{item.label}</span>
            </button>
          ))}
          <div style={{ padding: '12px 16px 6px', fontSize: 10, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.08em', fontWeight: 600, textTransform: 'uppercase' }}>
            Références
          </div>
          {NAV_REFS.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              aria-current={activeTab === item.id ? 'page' : undefined}
              className={`sidebar-item${activeTab === item.id ? ' active' : ''}`}
            >
              <item.icon size={15} strokeWidth={1.75} />
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
      <main style={{ flex: 1, height: '100vh', display: 'flex', flexDirection: 'column' }}>
        {/* Topbar */}
        <div style={{
          height: 48,
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 24px',
          gap: 8,
          flexShrink: 0,
          background: '#0a0a14',
        }}>
          <span style={{
            fontSize: 13, fontWeight: 500, color: '#eeeef5',
          }}>
            <span style={{
              fontFamily: 'var(--font-playfair)',
              fontStyle: 'italic',
              fontWeight: 400,
              fontSize: 16,
            }}>
              {TAB_META[activeTab]?.label ?? activeTab}
            </span>
          </span>
        </div>

        {/* Contenu scrollable */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
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
