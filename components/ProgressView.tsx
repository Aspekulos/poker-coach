'use client'

import { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { getAnalysisHistory, AnalysisRecord } from '@/lib/supabase'

function formatDate(iso?: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function VerdictBadge({ verdict, isGlobal }: { verdict: string; isGlobal: boolean }) {
  const symbol = isGlobal ? '📊' : verdict
  return (
    <span style={{ fontSize: 18, lineHeight: 1, width: 24, textAlign: 'center', flexShrink: 0 }}>
      {symbol}
    </span>
  )
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div
      style={{
        flex: 1,
        minWidth: 120,
        background: '#1a1a1a',
        border: '1px solid #2a2a2a',
        borderRadius: 8,
        padding: '14px 16px',
      }}
    >
      <div style={{ fontSize: 12, color: '#a1a1aa', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color }}>{value}</div>
    </div>
  )
}

export default function ProgressView() {
  const [records, setRecords] = useState<AnalysisRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<AnalysisRecord | null>(null)

  useEffect(() => {
    getAnalysisHistory()
      .then(setRecords)
      .finally(() => setLoading(false))
  }, [])

  // ─── STATS (mains uniques uniquement) ───
  const hands = records.filter(r => !r.is_global)
  const total = hands.length
  const good = hands.filter(r => r.verdict === '✅').length
  const warn = hands.filter(r => r.verdict === '⚠️').length
  const bad = hands.filter(r => r.verdict === '❌').length
  const score = Math.round((good / total) * 100) || 0

  const scoreColor = score > 70 ? '#22c55e' : score >= 40 ? '#f59e0b' : '#ef4444'

  // proportions de la barre
  const segTotal = good + warn + bad || 1
  const goodPct = (good / segTotal) * 100
  const warnPct = (warn / segTotal) * 100
  const badPct = (bad / segTotal) * 100

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center', padding: 40, color: '#a1a1aa', fontSize: 13 }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="9" stroke="#22c55e" strokeWidth="2.5" strokeDasharray="40 20" strokeLinecap="round">
            <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite" />
          </circle>
        </svg>
        Chargement de l’historique…
      </div>
    )
  }

  // ─── VUE DÉTAIL ───
  if (selected) {
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <button
            onClick={() => setSelected(null)}
            style={{ background: 'transparent', color: '#a1a1aa', border: 'none', fontSize: 13, cursor: 'pointer', padding: 0 }}
          >
            ← Retour
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <VerdictBadge verdict={selected.verdict} isGlobal={selected.is_global} />
            {selected.is_global ? (
              <span style={{ fontSize: 13, color: '#f5f5f5', fontWeight: 500 }}>Analyse globale</span>
            ) : (
              <>
                <span style={{ fontSize: 13, color: '#f5f5f5', fontWeight: 600 }}>{selected.cards || '—'}</span>
                {selected.position && (
                  <span style={{ fontSize: 12, color: '#a1a1aa' }}>{selected.position}</span>
                )}
                {selected.level && (
                  <span style={{ fontSize: 12, color: '#a1a1aa' }}>{selected.level}</span>
                )}
              </>
            )}
            <span style={{ fontSize: 11, color: '#a1a1aa' }}>{formatDate(selected.created_at)}</span>
          </div>
        </div>

        <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8, padding: 20 }}>
          <div className="prose-poker">
            <ReactMarkdown>{selected.analysis_text}</ReactMarkdown>
          </div>
        </div>
      </div>
    )
  }

  // ─── VUE LISTE + STATS ───
  return (
    <div>
      {/* Stats */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
        <StatCard label="Score global" value={`${score}%`} color={scoreColor} />
        <StatCard label="✅ Bien joué" value={String(good)} color="#22c55e" />
        <StatCard label="⚠️ Borderline" value={String(warn)} color="#f59e0b" />
        <StatCard label="❌ Erreurs" value={String(bad)} color="#ef4444" />
      </div>

      {/* Barre de progression */}
      {total > 0 && (
        <div style={{ display: 'flex', width: '100%', height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 24, background: '#1a1a1a' }}>
          <div style={{ width: `${goodPct}%`, background: '#22c55e' }} />
          <div style={{ width: `${warnPct}%`, background: '#f59e0b' }} />
          <div style={{ width: `${badPct}%`, background: '#ef4444' }} />
        </div>
      )}

      {/* Liste */}
      {records.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#a1a1aa', fontSize: 13 }}>
          Aucune analyse enregistrée pour l’instant. Analyse une main dans l’onglet 🔍 Analyser.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 480, overflowY: 'auto', paddingRight: 4 }}>
          {records.map((rec, i) => (
            <div
              key={(rec.id ?? rec.hand_id) + i}
              onClick={() => setSelected(rec)}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#242424')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#1a1a1a')}
              style={{
                background: '#1a1a1a',
                border: '1px solid #2a2a2a',
                borderRadius: 8,
                padding: 12,
                cursor: 'pointer',
                transition: 'background 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <VerdictBadge verdict={rec.verdict} isGlobal={rec.is_global} />

              {rec.is_global ? (
                <span style={{ fontSize: 13, color: '#f5f5f5', fontWeight: 500 }}>
                  Analyse globale
                </span>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 13, color: '#f5f5f5', fontWeight: 600 }}>{rec.cards || '—'}</span>
                  {rec.position && <span style={{ fontSize: 12, color: '#a1a1aa' }}>{rec.position}</span>}
                  {rec.level && <span style={{ fontSize: 12, color: '#a1a1aa' }}>{rec.level}</span>}
                  {rec.result && rec.result !== 'unknown' && (
                    <span style={{ fontSize: 12, color: '#a1a1aa' }}>{rec.result}</span>
                  )}
                </div>
              )}

              <span style={{ marginLeft: 'auto', fontSize: 11, color: '#a1a1aa', whiteSpace: 'nowrap' }}>
                {formatDate(rec.created_at)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
