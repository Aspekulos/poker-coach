'use client'

import { useState } from 'react'
import ReactMarkdown from 'react-markdown'

const PLACEHOLDER = `PRÉ-FLOP
ML.Aspek Raises to 3 BB
Erkiko7 Fold
...`

export default function HandAnalyzer() {
  const [handHistory, setHandHistory] = useState('')
  const [analysis, setAnalysis] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAnalyze = async () => {
    if (!handHistory.trim()) {
      setError("Colle un historique de main avant d'analyser.")
      return
    }
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handHistory }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Erreur inconnue.')
      } else {
        setAnalysis(data.analysis)
      }
    } catch (e) {
      console.error(e)
      setError('Erreur réseau.')
    } finally {
      setLoading(false)
    }
  }

  const handleNew = () => {
    setAnalysis(null)
    setError(null)
  }

  return (
    <div>
      <label
        style={{
          display: 'block',
          fontSize: 11,
          color: '#a1a1aa',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          marginBottom: 6,
          fontWeight: 500,
        }}
      >
        Historique de main Winamax
      </label>
      <textarea
        value={handHistory}
        onChange={(e) => setHandHistory(e.target.value)}
        placeholder={PLACEHOLDER}
        style={{
          width: '100%',
          minHeight: 180,
          background: '#1a1a1a',
          border: '1px solid #2a2a2a',
          borderRadius: 8,
          padding: 12,
          fontSize: 13,
          color: '#f5f5f5',
          fontFamily: 'Inter, monospace',
          resize: 'vertical',
          lineHeight: 1.5,
        }}
      />

      <button
        onClick={handleAnalyze}
        disabled={loading}
        style={{
          background: loading ? '#242424' : '#22c55e',
          color: loading ? '#a1a1aa' : '#000',
          border: 'none',
          fontWeight: 600,
          padding: '10px 24px',
          borderRadius: 6,
          marginTop: 12,
          cursor: loading ? 'not-allowed' : 'pointer',
          fontSize: 13,
          transition: 'all 0.15s ease',
        }}
      >
        {loading ? 'Analyse en cours…' : 'Analyser la main'}
      </button>

      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 16, color: '#a1a1aa', fontSize: 13 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="9" stroke="#22c55e" strokeWidth="2.5" strokeDasharray="40 20" strokeLinecap="round">
              <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite" />
            </circle>
          </svg>
          Coach analyse ta main…
        </div>
      )}

      {error && (
        <div
          style={{
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: 6,
            padding: 12,
            fontSize: 13,
            color: '#ef4444',
            marginTop: 16,
          }}
        >
          {error}
        </div>
      )}

      {analysis && (
        <div style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <p style={{ fontSize: 11, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500 }}>
              Analyse
            </p>
            <button
              onClick={handleNew}
              style={{
                background: 'transparent',
                color: '#a1a1aa',
                border: 'none',
                fontSize: 12,
                cursor: 'pointer',
                padding: 4,
              }}
            >
              Nouvelle analyse
            </button>
          </div>
          <div
            style={{
              background: '#1a1a1a',
              border: '1px solid #2a2a2a',
              borderRadius: 8,
              padding: 20,
            }}
          >
            <div className="prose-poker">
              <ReactMarkdown>{analysis}</ReactMarkdown>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
