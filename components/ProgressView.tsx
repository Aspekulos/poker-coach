'use client'

import { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid } from 'recharts'
import { getAnalysisHistory, AnalysisRecord } from '@/lib/supabase'

function formatDate(iso?: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

interface Session {
  session_date: string
  hands_count: number
}

// Jour de session (UTC) d'un enregistrement — aligné sur DATE(played_at) côté Postgres.
function sessionKey(iso?: string): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (isNaN(d.getTime())) return null
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
}

// "2026-05-27" → "27 mai 2026"
function formatSessionDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00Z')
  if (isNaN(d.getTime())) return dateStr
  return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(d)
}

// Groupe les analyses par jour de session (played_at) et calcule le score du jour.
// On utilise played_at (vraie date de jeu) et NON created_at (date d'import) :
// sinon toutes les mains importées le même jour tombent dans un seul bucket.
function buildChartData(records: AnalysisRecord[]) {
  const byDay: Record<string, { good: number; total: number }> = {}

  records.filter(r => !r.is_global).forEach(r => {
    const key = sessionKey(r.played_at)
    if (!key) return // ignore les mains sans date de session
    if (!byDay[key]) byDay[key] = { good: 0, total: 0 }
    byDay[key].total++
    if (r.verdict === '✅') byDay[key].good++
  })

  // Clés au format "YYYY-MM-DD" → tri lexicographique = ordre chronologique
  return Object.entries(byDay)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, { good, total }]) => ({
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
      <p style={{ color: '#a1a1aa', marginBottom: 4 }}>
        {label ? (() => { const p = label.split('-'); return p[2] + '/' + p[1] })() : ''}
      </p>
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
  const [sessions, setSessions] = useState<Session[]>([])
  const [sessionFilter, setSessionFilter] = useState<string>('') // '' = toutes les sessions

  useEffect(() => {
    getAnalysisHistory()
      .then(setRecords)
      .finally(() => setLoading(false))
    fetch('/api/sessions')
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setSessions(data) })
      .catch(() => {})
  }, [])

  // ─── FILTRE PAR SESSION ───
  // Sans filtre : comportement actuel (tous les records, globales incluses).
  // Avec une session : uniquement les mains individuelles jouées ce jour-là.
  const viewRecords = sessionFilter
    ? records.filter(r => !r.is_global && sessionKey(r.played_at) === sessionFilter)
    : records

  // ─── STATS (mains uniques uniquement) ───
  const hands = viewRecords.filter(r => !r.is_global)
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
  const chartData = buildChartData(viewRecords)

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
      {/* Sélecteur de session */}
      {sessions.length > 0 && (
        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <label htmlFor="session-filter" style={{ fontSize: 12, color: '#a1a1aa' }}>
            Session
          </label>
          <select
            id="session-filter"
            value={sessionFilter}
            onChange={(e) => setSessionFilter(e.target.value)}
            style={{
              background: '#1a1a1a',
              color: '#f5f5f5',
              border: '1px solid #2a2a2a',
              borderRadius: 8,
              padding: '8px 12px',
              fontSize: 13,
              cursor: 'pointer',
              minWidth: 220,
            }}
          >
            <option value="">Toutes les sessions</option>
            {sessions.map((s) => (
              <option key={s.session_date} value={s.session_date}>
                {formatSessionDate(s.session_date)} ({s.hands_count} main{s.hands_count > 1 ? 's' : ''})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
        <StatCard label="Score décisions" value={`${score}%`} color={scoreColor} />
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
              <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={(val) => { const p = val.split('-'); return p[2] + '/' + p[1] }}
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

      {chartData.length < 2 && hands.length > 0 && (
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
      {viewRecords.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#a1a1aa', fontSize: 13 }}>
          {sessionFilter
            ? 'Aucune main pour cette session.'
            : 'Aucune analyse enregistrée pour l’instant. Analyse une main dans l’onglet 🔍 Analyser.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 480, overflowY: 'auto', paddingRight: 4 }}>
          {viewRecords.map((rec, i) => (
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
