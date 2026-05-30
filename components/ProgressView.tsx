'use client'

import { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { getAnalysisHistory, AnalysisRecord } from '@/lib/supabase'

function formatDate(iso?: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// Groupe les analyses par jour et calcule le score de chaque jour
function buildChartData(records: AnalysisRecord[]) {
  // Filtre uniquement les analyses individuelles (pas globales)
  const individual = records
    .filter(r => !r.is_global)
    .sort((a, b) => new Date(a.created_at!).getTime() - new Date(b.created_at!).getTime())

  if (individual.length === 0) return []

  // Groupe par jour (format DD/MM)
  const byDay: Record<string, { good: number; total: number }> = {}

  for (const r of individual) {
    const date = new Date(r.created_at!)
    const key = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}`
    if (!byDay[key]) byDay[key] = { good: 0, total: 0 }
    byDay[key].total++
    if (r.verdict === '✅') byDay[key].good++
  }

  return Object.entries(byDay).map(([date, { good, total }]) => ({
    date,
    score: Math.round((good / total) * 100),
    total,
  }))
}

interface TooltipProps {
  active?: boolean
  payload?: Array<{ value: number; payload: { total: number } }>
  label?: string
}

function CustomTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: '#1a1a1a', border: '1px solid #2a2a2a',
      borderRadius: 6, padding: '8px 12px', fontSize: 12,
    }}>
      <p style={{ color: '#a1a1aa', marginBottom: 4 }}>{label}</p>
      <p style={{ color: '#22c55e', fontWeight: 600 }}>
        Score : {payload[0].value}%
      </p>
      <p style={{ color: '#a1a1aa' }}>
        {payload[0].payload.total} mains analysées
      </p>
    </div>
  )
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

  // données du graphe d'évolution (par jour)
  const chartData = buildChartData(records)

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

      {/* Graphe d'évolution */}
      {chartData.length >= 2 && (
        <div style={{
          background: '#1a1a1a', border: '1px solid #2a2a2a',
          borderRadius: 8, padding: '16px 20px', marginBottom: 20,
        }}>
          <p style={{
            fontSize: 12, fontWeight: 500, color: '#a1a1aa',
            textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16,
          }}>
            Évolution du score
          </p>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: '#3f3f46' }}
                axisLine={{ stroke: '#2a2a2a' }}
                tickLine={false}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 11, fill: '#3f3f46' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine
                y={70}
                stroke="#22c55e"
                strokeDasharray="4 4"
                strokeOpacity={0.3}
                label={{ value: 'Objectif 70%', position: 'right', fontSize: 10, fill: '#22c55e', fillOpacity: 0.5 }}
              />
              <ReferenceLine
                y={50}
                stroke="#f59e0b"
                strokeDasharray="4 4"
                strokeOpacity={0.3}
              />
              <Line
                type="monotone"
                dataKey="score"
                stroke="#22c55e"
                strokeWidth={2}
                dot={{ fill: '#22c55e', r: 4, strokeWidth: 0 }}
                activeDot={{ r: 6, fill: '#4ade80' }}
              />
            </LineChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 24, height: 2, background: '#22c55e', opacity: 0.4, borderTop: '1px dashed #22c55e' }} />
              <span style={{ fontSize: 11, color: '#3f3f46' }}>Objectif 70%</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 24, height: 2, background: '#f59e0b', opacity: 0.4, borderTop: '1px dashed #f59e0b' }} />
              <span style={{ fontSize: 11, color: '#3f3f46' }}>Seuil 50%</span>
            </div>
          </div>
        </div>
      )}

      {chartData.length < 2 && records.filter(r => !r.is_global).length > 0 && (
        <div style={{
          background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8,
          padding: '16px 20px', marginBottom: 20, textAlign: 'center',
        }}>
          <p style={{ fontSize: 13, color: '#3f3f46' }}>
            Analyse des mains sur au moins 2 jours différents pour voir le graphe d&apos;évolution
          </p>
        </div>
      )}

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
