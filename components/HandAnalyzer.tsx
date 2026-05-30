'use client'

import { useState, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import { saveAnalysis } from '@/lib/supabase'

type View = 'upload' | 'list' | 'analysis' | 'global'
type HandResult = 'won' | 'lost' | 'folded' | 'unknown'

interface Hand {
  handId: string
  level: string
  myCards: string
  myPosition: string
  result: HandResult
  rawText: string
}

const HERO = 'ML.Aspek'

function extractVerdict(text: string): string {
  if (text.includes('✅')) return '✅'
  if (text.includes('⚠️')) return '⚠️'
  if (text.includes('❌')) return '❌'
  return 'unknown'
}

const POS_COLORS: Record<string, string> = {
  BTN: '#3b82f6',
  CO:  '#f59e0b',
  MP:  '#84cc16',
  EP:  '#22c55e',
  SB:  '#a1a1aa',
  BB:  '#a1a1aa',
}

function formatCard(rawCard: string): { rank: string; symbol: string; color: string } {
  const rank = rawCard.slice(0, -1).toUpperCase()
  const suit = rawCard.slice(-1).toLowerCase()
  const map: Record<string, { symbol: string; color: string }> = {
    s: { symbol: '♠', color: '#1a1a1a' },
    h: { symbol: '♥', color: '#ef4444' },
    d: { symbol: '♦', color: '#ef4444' },
    c: { symbol: '♣', color: '#1a1a1a' },
  }
  const m = map[suit] ?? { symbol: '?', color: '#1a1a1a' }
  return { rank, symbol: m.symbol, color: m.color }
}

function cardsToString(rawCards: string[]): string {
  return rawCards
    .map(c => {
      const f = formatCard(c)
      return f.rank + f.symbol
    })
    .join(' ')
}

function getPosition(offset: number, total: number): string {
  if (total <= 2) {
    return offset === 0 ? 'SB' : 'BB'
  }
  if (offset === 0) return 'BTN'
  if (offset === 1) return 'SB'
  if (offset === 2) return 'BB'
  const fromBtnBackward = total - offset
  if (fromBtnBackward === 1) return 'CO'
  if (fromBtnBackward === 2) return 'MP'
  return 'EP'
}

function parseSingleHand(rawText: string): Hand {
  // HandId
  const handIdMatch = rawText.match(/HandId:\s*#?([\w-]+)/i)
  const handId = handIdMatch?.[1] ?? '—'

  // Blinds level: prefer "(200/400)" or "(200-400)" inside parentheses
  let level = '—'
  const blindsMatch = rawText.match(/\((\d+(?:\.\d+)?)[/-](\d+(?:\.\d+)?)(?:[/-](\d+(?:\.\d+)?))?\)/)
  if (blindsMatch) {
    level = blindsMatch[3]
      ? `${blindsMatch[1]}/${blindsMatch[2]}/${blindsMatch[3]}`
      : `${blindsMatch[1]}/${blindsMatch[2]}`
  } else {
    const levelMatch = rawText.match(/level:\s*(\d+)/i)
    if (levelMatch) level = `lvl ${levelMatch[1]}`
  }

  // Hero cards
  let myCards = '—'
  const dealtMatch = rawText.match(new RegExp(`Dealt to ${HERO.replace('.', '\\.')}\\s*\\[([^\\]]+)\\]`, 'i'))
  if (dealtMatch) {
    const cards = dealtMatch[1].trim().split(/\s+/)
    myCards = cardsToString(cards)
  }

  // Button seat
  const buttonMatch = rawText.match(/Seat\s*#?(\d+)\s*is\s*the\s*button/i)
  const buttonSeat = buttonMatch ? parseInt(buttonMatch[1], 10) : -1

  // Active seats (from "Seat N: Name (chips)" lines)
  const seatLines = [...rawText.matchAll(/^Seat\s+(\d+):\s*([^(\n]+?)\s*\(([^)]+)\)/gm)]
  const seats = seatLines.map(m => ({ seat: parseInt(m[1], 10), name: m[2].trim() }))

  // Hero seat
  const heroSeat = seats.find(s => s.name === HERO)?.seat ?? -1

  let myPosition = '?'
  if (buttonSeat !== -1 && heroSeat !== -1 && seats.length > 0) {
    const sortedSeats = [...seats].sort((a, b) => a.seat - b.seat)
    const btnIdx = sortedSeats.findIndex(s => s.seat === buttonSeat)
    const heroIdx = sortedSeats.findIndex(s => s.seat === heroSeat)
    if (btnIdx !== -1 && heroIdx !== -1) {
      const offset = (heroIdx - btnIdx + sortedSeats.length) % sortedSeats.length
      myPosition = getPosition(offset, sortedSeats.length)
    }
  }

  // Result from SUMMARY
  let result: HandResult = 'unknown'
  const summaryIdx = rawText.search(/\*\*\*\s*SUMMARY\s*\*\*\*/i)
  const summary = summaryIdx >= 0 ? rawText.slice(summaryIdx) : rawText
  const heroEscaped = HERO.replace('.', '\\.')
  if (new RegExp(`${heroEscaped}.*\\b(won|collected|wins)\\b`, 'i').test(summary)) {
    result = 'won'
  } else if (new RegExp(`${heroEscaped}.*\\b(folded|fold)\\b`, 'i').test(summary)) {
    result = 'folded'
  } else if (new RegExp(`${heroEscaped}.*\\b(lost|busted|showed)\\b`, 'i').test(summary)) {
    result = 'lost'
  } else if (new RegExp(`\\bDealt to ${heroEscaped}\\b`, 'i').test(rawText)) {
    // Hero saw cards but no explicit summary marker → assume folded preflop or post
    if (/folds/i.test(rawText.split('Dealt to')[1] ?? '')) result = 'folded'
  }

  return { handId, level, myCards, myPosition, result, rawText }
}

function parseHandHistory(text: string): Hand[] {
  // Winamax marker: lines starting with "Winamax Poker"
  const re = /(?=^Winamax Poker.*HandId)/gmi
  const parts = text.split(re).map(p => p.trim()).filter(Boolean)
  return parts.map(parseSingleHand)
}

function CardBadge({ rawCard }: { rawCard: string }) {
  // rawCard here is already in "A♠" form from cardsToString
  const rank = rawCard.slice(0, -1)
  const symbol = rawCard.slice(-1)
  const isRed = symbol === '♥' || symbol === '♦'
  return (
    <span
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: 28,
        height: 36,
        background: '#f5f5f5',
        borderRadius: 4,
        color: isRed ? '#ef4444' : '#1a1a1a',
        fontSize: 13,
        fontWeight: 700,
        lineHeight: 1.1,
      }}
    >
      <span>{rank}</span>
      <span style={{ fontSize: 12 }}>{symbol}</span>
    </span>
  )
}

function HandCards({ str }: { str: string }) {
  if (str === '—') return <span style={{ color: '#3f3f46', fontSize: 12 }}>—</span>
  const tokens = str.split(' ').filter(Boolean)
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {tokens.map((t, i) => (
        <CardBadge key={i} rawCard={t} />
      ))}
    </div>
  )
}

function PositionBadge({ position }: { position: string }) {
  const color = POS_COLORS[position] ?? '#3f3f46'
  return (
    <span
      style={{
        background: color + '22',
        color,
        border: `1px solid ${color}40`,
        padding: '3px 8px',
        borderRadius: 4,
        fontSize: 11,
        fontWeight: 600,
      }}
    >
      {position}
    </span>
  )
}

function ResultLabel({ result }: { result: HandResult }) {
  if (result === 'won') return <span style={{ color: '#22c55e', fontSize: 12, fontWeight: 500 }}>✓ Gagné</span>
  if (result === 'lost') return <span style={{ color: '#ef4444', fontSize: 12, fontWeight: 500 }}>✗ Perdu</span>
  if (result === 'folded') return <span style={{ color: '#a1a1aa', fontSize: 12 }}>Fold</span>
  return <span style={{ color: '#3f3f46', fontSize: 12 }}>—</span>
}

export default function HandAnalyzer() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [view, setView] = useState<View>('upload')
  const [hands, setHands] = useState<Hand[]>([])
  const [selectedHand, setSelectedHand] = useState<Hand | null>(null)
  const [analysis, setAnalysis] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fileName, setFileName] = useState('')
  const [globalAnalysis, setGlobalAnalysis] = useState<string | null>(null)
  const [globalLoading, setGlobalLoading] = useState(false)
  const [globalError, setGlobalError] = useState<string | null>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    try {
      const allHands: Hand[] = []
      const names: string[] = []

      for (const file of files) {
        const text = await file.text()
        const parsed = parseHandHistory(text)
        allHands.push(...parsed)
        names.push(file.name)
      }

      if (allHands.length === 0) {
        setError("Aucune main détectée. Vérifie que ce sont bien des exports Winamax.")
        return
      }

      setError(null)
      setHands(allHands)
      setFileName(names.length === 1 ? names[0] : `${names.length} fichiers importés`)
      setView('list')
    } catch {
      setError('Erreur de lecture des fichiers.')
    } finally {
      e.target.value = ''
    }
  }

  const handleAnalyze = async (hand: Hand) => {
    setLoading(true)
    setError(null)
    setAnalysis(null)
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handHistory: hand.rawText }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erreur API')
      setAnalysis(data.analysis)

      await saveAnalysis({
        hand_id: hand.handId,
        cards: hand.myCards,
        position: hand.myPosition,
        level: hand.level,
        result: hand.result,
        verdict: extractVerdict(data.analysis),
        analysis_text: data.analysis,
        raw_hand: hand.rawText,
        is_global: false,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectHand = (hand: Hand) => {
    setSelectedHand(hand)
    setView('analysis')
    handleAnalyze(hand)
  }

  const handleAnalyzeAll = async () => {
    setGlobalLoading(true)
    setGlobalError(null)
    setGlobalAnalysis(null)
    setView('global')
    try {
      const res = await fetch('/api/analyze-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hands }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erreur API')
      setGlobalAnalysis(data.analysis)

      await saveAnalysis({
        hand_id: 'global-' + Date.now(),
        cards: '',
        position: '',
        level: '',
        result: '',
        verdict: 'global',
        analysis_text: data.analysis,
        raw_hand: '',
        is_global: true,
      })
    } catch (e) {
      setGlobalError(e instanceof Error ? e.message : 'Erreur inconnue')
    } finally {
      setGlobalLoading(false)
    }
  }

  const resetToUpload = () => {
    setView('upload')
    setHands([])
    setSelectedHand(null)
    setAnalysis(null)
    setError(null)
    setFileName('')
  }

  const resetToList = () => {
    setView('list')
    setSelectedHand(null)
    setAnalysis(null)
    setError(null)
  }

  // ─── VUE UPLOAD ───
  if (view === 'upload') {
    return (
      <div>
        <input
          type="file"
          accept=".txt"
          multiple
          style={{ display: 'none' }}
          ref={fileInputRef}
          onChange={handleFileChange}
        />
        <div
          onClick={() => fileInputRef.current?.click()}
          style={{
            background: '#1a1a1a',
            border: '2px dashed #2a2a2a',
            borderRadius: 12,
            padding: 40,
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <div style={{ fontSize: 32, marginBottom: 12 }}>📄</div>
          <p style={{ fontSize: 15, fontWeight: 600, color: '#f5f5f5', marginBottom: 6 }}>
            Importe ton historique Winamax
          </p>
          <p style={{ fontSize: 12, color: '#a1a1aa', marginBottom: 16 }}>
            Fichier(s) .txt depuis Documents/Winamax Poker — sélection multiple possible
          </p>
          <button
            onClick={(e) => {
              e.stopPropagation()
              fileInputRef.current?.click()
            }}
            style={{
              background: '#22c55e',
              color: '#000',
              fontWeight: 600,
              padding: '10px 24px',
              borderRadius: 6,
              border: 'none',
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            Choisir le fichier
          </button>
        </div>

        {error && (
          <div
            style={{
              marginTop: 16,
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: 6,
              padding: 12,
              fontSize: 13,
              color: '#ef4444',
            }}
          >
            {error}
          </div>
        )}
      </div>
    )
  }

  // ─── VUE LISTE ───
  if (view === 'list') {
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
          <button
            onClick={resetToUpload}
            style={{
              background: 'transparent',
              color: '#a1a1aa',
              border: 'none',
              fontSize: 13,
              cursor: 'pointer',
              padding: 0,
            }}
          >
            ← Nouveau fichier
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span
              style={{
                background: 'rgba(34,197,94,0.15)',
                color: '#22c55e',
                padding: '3px 8px',
                borderRadius: 4,
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              {hands.length} mains — {fileName}
            </span>
            <button
              onClick={handleAnalyzeAll}
              disabled={globalLoading || hands.length === 0}
              style={{
                background: '#22c55e',
                color: '#000',
                fontWeight: 600,
                padding: '8px 18px',
                borderRadius: 6,
                border: 'none',
                cursor: globalLoading ? 'not-allowed' : 'pointer',
                fontSize: 13,
                opacity: globalLoading ? 0.6 : 1,
              }}
            >
              {globalLoading ? 'Analyse en cours…' : `🔍 Analyser les ${hands.length} mains`}
            </button>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            maxHeight: 480,
            overflowY: 'auto',
            paddingRight: 4,
          }}
        >
          {hands.map((hand, i) => (
            <div
              key={hand.handId + i}
              onClick={() => handleSelectHand(hand)}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#242424')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#1a1a1a')}
              style={{
                background: '#1a1a1a',
                border: '1px solid #2a2a2a',
                borderRadius: 8,
                padding: '12px 16px',
                cursor: 'pointer',
                transition: 'background 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                flexWrap: 'wrap',
              }}
            >
              <HandCards str={hand.myCards} />
              <PositionBadge position={hand.myPosition} />
              <span style={{ fontSize: 12, color: '#a1a1aa' }}>{hand.level}</span>
              <span style={{ marginLeft: 'auto' }}>
                <ResultLabel result={hand.result} />
              </span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ─── VUE GLOBAL ───
  if (view === 'global') {
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
          <button
            onClick={() => {
              setView('list')
              setGlobalAnalysis(null)
              setGlobalError(null)
            }}
            style={{
              background: 'transparent',
              color: '#a1a1aa',
              border: 'none',
              fontSize: 13,
              cursor: 'pointer',
              padding: 0,
            }}
          >
            ← Retour à la liste
          </button>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: '#f5f5f5' }}>
            Analyse complète — {hands.length} mains
          </h2>
        </div>

        {globalLoading && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              color: '#a1a1aa',
              fontSize: 13,
              padding: 24,
              justifyContent: 'center',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <circle
                cx="12"
                cy="12"
                r="9"
                stroke="#22c55e"
                strokeWidth="2.5"
                strokeDasharray="40 20"
                strokeLinecap="round"
              >
                <animateTransform
                  attributeName="transform"
                  type="rotate"
                  from="0 12 12"
                  to="360 12 12"
                  dur="1s"
                  repeatCount="indefinite"
                />
              </circle>
            </svg>
            Analyse de {hands.length} mains en cours… (peut prendre 15-20s)
          </div>
        )}

        {globalError && !globalLoading && (
          <div
            style={{
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: 6,
              padding: 12,
              fontSize: 13,
              color: '#ef4444',
            }}
          >
            {globalError}
          </div>
        )}

        {globalAnalysis && !globalLoading && (
          <>
            <div
              style={{
                background: '#1a1a1a',
                border: '1px solid #2a2a2a',
                borderRadius: 8,
                padding: 20,
                marginTop: 16,
              }}
            >
              <div className="prose-poker">
                <ReactMarkdown>{globalAnalysis}</ReactMarkdown>
              </div>
            </div>
            <button
              onClick={() => {
                setView('list')
                setGlobalAnalysis(null)
                setGlobalError(null)
              }}
              style={{
                background: 'transparent',
                color: '#a1a1aa',
                border: '1px solid #2a2a2a',
                borderRadius: 6,
                padding: '8px 16px',
                fontSize: 13,
                cursor: 'pointer',
                marginTop: 14,
              }}
            >
              Nouvelle analyse
            </button>
          </>
        )}
      </div>
    )
  }

  // ─── VUE ANALYSE ───
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <button
          onClick={resetToList}
          style={{
            background: 'transparent',
            color: '#a1a1aa',
            border: 'none',
            fontSize: 13,
            cursor: 'pointer',
            padding: 0,
          }}
        >
          ← Retour à la liste
        </button>
        {selectedHand && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <HandCards str={selectedHand.myCards} />
            <PositionBadge position={selectedHand.myPosition} />
            <span style={{ fontSize: 12, color: '#a1a1aa' }}>{selectedHand.level}</span>
          </div>
        )}
      </div>

      {loading && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            color: '#a1a1aa',
            fontSize: 13,
            padding: 24,
            justifyContent: 'center',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <circle
              cx="12"
              cy="12"
              r="9"
              stroke="#22c55e"
              strokeWidth="2.5"
              strokeDasharray="40 20"
              strokeLinecap="round"
            >
              <animateTransform
                attributeName="transform"
                type="rotate"
                from="0 12 12"
                to="360 12 12"
                dur="1s"
                repeatCount="indefinite"
              />
            </circle>
          </svg>
          Coach analyse ta main…
        </div>
      )}

      {error && !loading && (
        <div
          style={{
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: 6,
            padding: 12,
            fontSize: 13,
            color: '#ef4444',
          }}
        >
          {error}
        </div>
      )}

      {analysis && !loading && (
        <>
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
          <button
            onClick={resetToList}
            style={{
              background: 'transparent',
              color: '#a1a1aa',
              border: '1px solid #2a2a2a',
              borderRadius: 6,
              padding: '8px 16px',
              fontSize: 13,
              cursor: 'pointer',
              marginTop: 14,
            }}
          >
            Analyser une autre main
          </button>
        </>
      )}
    </div>
  )
}
