'use client'

import { useState, useEffect } from 'react'
import { RANKS, OPENING_RANGES, RFI_COLORS, shouldPush, PUSH_THRESHOLDS, RFIPosition, PushPosition } from '@/lib/data'

type Mode = 'rfi' | 'pushfold'
type Action = 'raise' | 'fold' | 'push'

interface Spot {
  mode: Mode
  position: RFIPosition | PushPosition
  hand: string
  stackBB: number
  correctAction: Action
  explanation: string
}

const RFI_POSITIONS: RFIPosition[] = ['EP', 'MP', 'CO', 'BTN']
const PF_POSITIONS: PushPosition[] = ['EP', 'MP', 'CO', 'BTN', 'SB']

function generateRandomHand(): string {
  const r1 = RANKS[Math.floor(Math.random() * 13)]
  const r2 = RANKS[Math.floor(Math.random() * 13)]
  if (r1 === r2) return r1 + r2
  const i1 = RANKS.indexOf(r1)
  const i2 = RANKS.indexOf(r2)
  const high = i1 < i2 ? r1 : r2
  const low = i1 < i2 ? r2 : r1
  const suited = Math.random() < 0.3
  return high + low + (suited ? 's' : 'o')
}

function buildRFIExplanation(hand: string, position: RFIPosition, correctAction: Action): string {
  if (correctAction === 'raise') {
    return `Avec ${hand} depuis ${position}, tu dois ouvrir car cette main fait partie de la range d'ouverture standard (RFI) à cette position.`
  }
  return `Avec ${hand} depuis ${position}, tu dois folder car cette main est trop faible pour ouvrir d'ici (hors range RFI standard).`
}

function buildPFExplanation(hand: string, position: PushPosition, stackBB: number, isPush: boolean): string {
  const threshold = PUSH_THRESHOLDS[position][stackBB] ?? 0
  if (isPush) {
    return `Avec ${hand} à ${stackBB}BB depuis ${position}, la stratégie Nash recommande de push car la main a assez d'équité pour un jam rentable (~${threshold.toFixed(0)}% des mains jouables d'ici).`
  }
  return `Avec ${hand} à ${stackBB}BB depuis ${position}, la stratégie Nash recommande de folder car la main est hors de la range de jam (~${threshold.toFixed(0)}% des mains).`
}

function generateSpot(): Spot {
  const mode: Mode = Math.random() < 0.5 ? 'rfi' : 'pushfold'
  const hand = generateRandomHand()

  if (mode === 'rfi') {
    const position = RFI_POSITIONS[Math.floor(Math.random() * RFI_POSITIONS.length)]
    const handRange = OPENING_RANGES[hand]
    const isInRange = handRange !== undefined && RFI_POSITIONS.indexOf(handRange) <= RFI_POSITIONS.indexOf(position)
    const correctAction: Action = isInRange ? 'raise' : 'fold'
    return {
      mode,
      position,
      hand,
      stackBB: 40,
      correctAction,
      explanation: buildRFIExplanation(hand, position, correctAction),
    }
  }

  const position = PF_POSITIONS[Math.floor(Math.random() * PF_POSITIONS.length)]
  const stackBB = Math.floor(Math.random() * 12) + 4
  const isPush = shouldPush(hand, position, stackBB)
  return {
    mode,
    position,
    hand,
    stackBB,
    correctAction: isPush ? 'push' : 'fold',
    explanation: buildPFExplanation(hand, position, stackBB, isPush),
  }
}

interface VisualCard {
  rank: string
  suit: string
  color: string
}

function handToCards(hand: string): [VisualCard, VisualCard] {
  const r1 = hand[0]
  const r2 = hand[1]
  const isPair = r1 === r2
  const isSuited = hand.length === 3 && hand[2] === 's'

  if (isPair) {
    return [
      { rank: r1, suit: '♥', color: '#ef4444' },
      { rank: r2, suit: '♠', color: '#1a1a1a' },
    ]
  }
  if (isSuited) {
    return [
      { rank: r1, suit: '♠', color: '#1a1a1a' },
      { rank: r2, suit: '♠', color: '#1a1a1a' },
    ]
  }
  return [
    { rank: r1, suit: '♠', color: '#1a1a1a' },
    { rank: r2, suit: '♥', color: '#ef4444' },
  ]
}

function CardVisual({ rank, suit, color }: VisualCard) {
  return (
    <div
      style={{
        width: 56,
        height: 78,
        background: '#f5f5f5',
        borderRadius: 6,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 6,
        boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
      }}
    >
      <span style={{ fontSize: 18, fontWeight: 700, color, alignSelf: 'flex-start' }}>{rank}</span>
      <span style={{ fontSize: 26, color }}>{suit}</span>
    </div>
  )
}

function StandardTrainer() {
  const [spot, setSpot] = useState<Spot | null>(null)
  const [answered, setAnswered] = useState(false)
  const [userAction, setUserAction] = useState<Action | null>(null)
  const [score, setScore] = useState({ correct: 0, total: 0 })

  useEffect(() => {
    setSpot(generateSpot())
  }, [])

  const handleAnswer = (action: Action) => {
    if (!spot || answered) return
    setUserAction(action)
    setAnswered(true)
    setScore(s => ({
      correct: s.correct + (action === spot.correctAction ? 1 : 0),
      total: s.total + 1,
    }))
  }

  const handleNext = () => {
    setSpot(generateSpot())
    setAnswered(false)
    setUserAction(null)
  }

  const handleSkip = () => {
    setSpot(generateSpot())
    setAnswered(false)
    setUserAction(null)
  }

  if (!spot) return <div style={{ color: '#a1a1aa' }}>Chargement…</div>

  const [card1, card2] = handToCards(spot.hand)
  const isCorrect = userAction === spot.correctAction

  // Label de la bonne réponse : RFI → Open/Fold, Push/Fold → Push/Fold
  const correctAnswer = spot.mode === 'rfi'
    ? (spot.correctAction === 'raise' ? 'Open' : 'Fold')
    : (spot.correctAction === 'push' ? 'Push' : 'Fold')

  // Position badge color
  const isRFI = spot.mode === 'rfi'
  const posColor = isRFI
    ? RFI_COLORS[spot.position as RFIPosition] ?? RFI_COLORS.Fold
    : { bg: 'rgba(34,197,94,0.15)', text: '#22c55e', label: spot.position }

  // Faces partagées entre le recto (question) et le verso (résultat) du flip
  const faceStyle: React.CSSProperties = {
    background: '#1a1a1a',
    border: '1px solid #2a2a2a',
    borderRadius: 12,
    padding: 24,
  }

  const badges = (
    <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
      <span style={{ background: posColor.bg, color: posColor.text, padding: '4px 10px', borderRadius: 4, fontSize: 12, fontWeight: 500 }}>
        {spot.position}
      </span>
      {spot.mode === 'pushfold' && (
        <span style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', padding: '4px 10px', borderRadius: 4, fontSize: 12, fontWeight: 500 }}>
          {spot.stackBB} BB
        </span>
      )}
      <span style={{ background: 'rgba(59,130,246,0.15)', color: '#3b82f6', padding: '4px 10px', borderRadius: 4, fontSize: 12, fontWeight: 500 }}>
        {spot.mode === 'rfi' ? 'RFI Open' : 'Push/Fold'}
      </span>
    </div>
  )

  const handVisual = (
    <>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 8 }}>
        <CardVisual {...card1} />
        <CardVisual {...card2} />
      </div>
      <p style={{ textAlign: 'center', fontSize: 13, color: '#a1a1aa', marginBottom: 24 }}>
        {spot.hand}
      </p>
    </>
  )

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ fontSize: 13, color: '#a1a1aa' }}>
          <strong style={{ color: '#22c55e' }}>{score.correct}</strong> / {score.total} bonnes réponses
        </span>
        <button
          onClick={handleSkip}
          style={{
            background: 'transparent',
            color: '#a1a1aa',
            border: '1px solid #2a2a2a',
            borderRadius: 6,
            padding: '6px 12px',
            fontSize: 12,
            cursor: 'pointer',
          }}
        >
          Nouvelle main
        </button>
      </div>

      {/* Card principal — flip 3D à la révélation de la réponse */}
      <div className="card-flip-container">
        <div className={`card-flip${answered ? ' flipped' : ''}`}>
          {/* RECTO — question + actions */}
          <div className="card-front" style={{ ...faceStyle, pointerEvents: answered ? 'none' : 'auto' }}>
            {badges}
            {handVisual}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <button
                onClick={() => handleAnswer('fold')}
                style={{
                  background: 'rgba(239,68,68,0.15)',
                  color: '#ef4444',
                  border: '1px solid rgba(239,68,68,0.4)',
                  borderRadius: 8,
                  padding: 14,
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                Fold
              </button>
              <button
                onClick={() => handleAnswer(spot.mode === 'rfi' ? 'raise' : 'push')}
                style={{
                  background: 'rgba(34,197,94,0.15)',
                  color: '#22c55e',
                  border: '1px solid rgba(34,197,94,0.4)',
                  borderRadius: 8,
                  padding: 14,
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {spot.mode === 'rfi' ? 'Raise 2.5 BB' : 'Push All-in'}
              </button>
            </div>
          </div>

          {/* VERSO — résultat + explication */}
          <div className="card-back" style={{ ...faceStyle, pointerEvents: answered ? 'auto' : 'none' }}>
            {badges}
            {handVisual}
            <div
              style={{
                background: isCorrect ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.10)',
                color: isCorrect ? '#22c55e' : '#ef4444',
                border: `1px solid ${isCorrect ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
                padding: '10px 14px',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                marginBottom: 12,
                textAlign: 'center',
              }}
            >
              {isCorrect ? '✓ Correct !' : `✗ Incorrect — la bonne action était ${spot.correctAction === 'raise' ? 'Raise' : spot.correctAction === 'push' ? 'Push' : 'Fold'}`}
            </div>

            {isCorrect ? (
              <div
                style={{
                  background: '#242424',
                  borderRadius: 8,
                  padding: 14,
                  fontSize: 13,
                  lineHeight: 1.6,
                  color: '#f5f5f5',
                  marginBottom: 14,
                }}
              >
                {spot.explanation}
              </div>
            ) : (
              <div
                style={{
                  marginTop: 12,
                  marginBottom: 14,
                  padding: 12,
                  background: '#1f2937',
                  borderRadius: 8,
                  border: '1px solid #4b5563',
                  fontSize: 13,
                }}
              >
                <p style={{ color: '#4ade80', fontWeight: 500, marginBottom: 4 }}>
                  ✅ Bonne réponse : {correctAnswer}
                </p>
                <p style={{ color: '#d1d5db', lineHeight: 1.6 }}>{spot.explanation}</p>
              </div>
            )}

            <button
              onClick={handleNext}
              style={{
                width: '100%',
                background: '#22c55e',
                color: '#000',
                border: 'none',
                borderRadius: 8,
                padding: 12,
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Main suivante →
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
//  Quiz ciblé : questions générées par Claude à partir des
//  vrais leaks détectés dans le dernier profil Coach.
// ─────────────────────────────────────────────────────────────

interface QuizQuestion {
  question: string
  options: string[]
  correct: number
  explanation: string
  position: string
  topic: string
}

type QuizStatus = 'loading' | 'ready' | 'error'

function TargetedQuiz() {
  const [status, setStatus] = useState<QuizStatus>('loading')
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [errorMsg, setErrorMsg] = useState('')
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [score, setScore] = useState({ correct: 0, total: 0 })

  const runFetch = async () => {
    try {
      const res = await fetch('/api/trainer-context')
      const data = await res.json()
      if (!res.ok || data?.error) {
        throw new Error(data?.error ?? 'Erreur lors du chargement du quiz ciblé.')
      }
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error('Aucune question générée.')
      }
      setQuestions(data as QuizQuestion[])
      setStatus('ready')
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Erreur inconnue')
      setStatus('error')
    }
  }

  // Relance complète (bouton "Réessayer" / "Nouveau quiz") — hors effet.
  const load = () => {
    setStatus('loading')
    setErrorMsg('')
    setIndex(0)
    setSelected(null)
    setScore({ correct: 0, total: 0 })
    runFetch()
  }

  // Au montage : l'état initial est déjà 'loading', on lance juste le fetch
  // (pas de setState synchrone dans l'effet).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    runFetch()
  }, [])

  if (status === 'loading') {
    return (
      <div
        style={{
          background: '#1a1a1a',
          border: '1px solid #2a2a2a',
          borderRadius: 12,
          padding: 40,
          textAlign: 'center',
          color: '#a1a1aa',
          fontSize: 14,
        }}
      >
        Génération de ton quiz ciblé à partir de tes leaks…
      </div>
    )
  }

  if (status === 'error') {
    // Le cas dominant est l'absence de profil Coach : on guide vers l'onglet.
    const noProfile = /profil/i.test(errorMsg)
    return (
      <div
        style={{
          background: 'rgba(245,158,11,0.08)',
          border: '1px solid rgba(245,158,11,0.4)',
          borderRadius: 12,
          padding: 24,
          textAlign: 'center',
        }}
      >
        <p style={{ color: '#f59e0b', fontSize: 15, fontWeight: 600, marginBottom: 8 }}>
          Génère d&apos;abord ton profil Coach dans l&apos;onglet 🎓
        </p>
        {!noProfile && <p style={{ color: '#a1a1aa', fontSize: 13, marginBottom: 14 }}>{errorMsg}</p>}
        <button
          onClick={load}
          style={{
            background: 'transparent',
            color: '#a1a1aa',
            border: '1px solid #2a2a2a',
            borderRadius: 6,
            padding: '6px 12px',
            fontSize: 12,
            cursor: 'pointer',
          }}
        >
          Réessayer
        </button>
      </div>
    )
  }

  const q = questions[index]
  const answered = selected !== null
  const isLast = index === questions.length - 1
  const finished = index >= questions.length

  if (finished || !q) {
    return (
      <div
        style={{
          background: '#1a1a1a',
          border: '1px solid #2a2a2a',
          borderRadius: 12,
          padding: 32,
          textAlign: 'center',
        }}
      >
        <p style={{ fontSize: 16, fontWeight: 700, color: '#f5f5f5', marginBottom: 8 }}>
          Quiz ciblé terminé 🎯
        </p>
        <p style={{ fontSize: 14, color: '#a1a1aa', marginBottom: 20 }}>
          <strong style={{ color: '#22c55e' }}>{score.correct}</strong> / {score.total} bonnes réponses
        </p>
        <button
          onClick={load}
          style={{
            background: '#22c55e',
            color: '#000',
            border: 'none',
            borderRadius: 8,
            padding: '12px 20px',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Nouveau quiz ciblé
        </button>
      </div>
    )
  }

  const handleAnswer = (i: number) => {
    if (answered) return
    setSelected(i)
    setScore(s => ({
      correct: s.correct + (i === q.correct ? 1 : 0),
      total: s.total + 1,
    }))
  }

  const handleNext = () => {
    setIndex(i => i + 1)
    setSelected(null)
  }

  const isCorrect = selected === q.correct

  return (
    <div>
      {/* Header : progression + score */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ fontSize: 13, color: '#a1a1aa' }}>
          Question {index + 1} / {questions.length}
        </span>
        <span style={{ fontSize: 13, color: '#a1a1aa' }}>
          <strong style={{ color: '#22c55e' }}>{score.correct}</strong> / {score.total} bonnes réponses
        </span>
      </div>

      <div
        style={{
          background: '#1a1a1a',
          border: '1px solid #2a2a2a',
          borderRadius: 12,
          padding: 24,
        }}
      >
        {/* Badges : leak ciblé + position */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          <span
            style={{
              background: 'rgba(168,85,247,0.15)',
              color: '#a855f7',
              padding: '4px 10px',
              borderRadius: 4,
              fontSize: 12,
              fontWeight: 500,
            }}
          >
            Leak : {q.topic}
          </span>
          {q.position && (
            <span
              style={{
                background: 'rgba(59,130,246,0.15)',
                color: '#3b82f6',
                padding: '4px 10px',
                borderRadius: 4,
                fontSize: 12,
                fontWeight: 500,
              }}
            >
              {q.position}
            </span>
          )}
        </div>

        {/* Question */}
        <p style={{ fontSize: 16, fontWeight: 600, color: '#f5f5f5', lineHeight: 1.5, marginBottom: 18 }}>
          {q.question}
        </p>

        {/* Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: answered ? 16 : 0 }}>
          {q.options.map((opt, i) => {
            let bg = 'rgba(255,255,255,0.03)'
            let border = '1px solid #2a2a2a'
            let color = '#f5f5f5'
            if (answered) {
              if (i === q.correct) {
                bg = 'rgba(34,197,94,0.15)'
                border = '1px solid rgba(34,197,94,0.5)'
                color = '#22c55e'
              } else if (i === selected) {
                bg = 'rgba(239,68,68,0.12)'
                border = '1px solid rgba(239,68,68,0.5)'
                color = '#ef4444'
              }
            }
            return (
              <button
                key={i}
                onClick={() => handleAnswer(i)}
                disabled={answered}
                style={{
                  background: bg,
                  border,
                  color,
                  borderRadius: 8,
                  padding: '12px 14px',
                  fontSize: 14,
                  textAlign: 'left',
                  cursor: answered ? 'default' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  transition: 'all 0.15s ease',
                }}
              >
                <span style={{ fontWeight: 700, opacity: 0.7 }}>{String.fromCharCode(65 + i)}</span>
                <span>{opt}</span>
                {answered && i === q.correct && <span style={{ marginLeft: 'auto' }}>✓</span>}
                {answered && i === selected && i !== q.correct && <span style={{ marginLeft: 'auto' }}>✗</span>}
              </button>
            )
          })}
        </div>

        {/* Explication + suite */}
        {answered && (
          <div>
            <div
              style={{
                background: '#242424',
                borderLeft: `3px solid ${isCorrect ? '#22c55e' : '#ef4444'}`,
                borderRadius: 8,
                padding: 14,
                fontSize: 13,
                lineHeight: 1.6,
                color: '#d1d5db',
                marginBottom: 14,
              }}
            >
              <p style={{ color: isCorrect ? '#4ade80' : '#ef4444', fontWeight: 600, marginBottom: 4 }}>
                {isCorrect ? '✓ Correct !' : `✗ Incorrect — bonne réponse : ${String.fromCharCode(65 + q.correct)}`}
              </p>
              {q.explanation}
            </div>
            <button
              onClick={handleNext}
              style={{
                width: '100%',
                background: '#22c55e',
                color: '#000',
                border: 'none',
                borderRadius: 8,
                padding: 12,
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {isLast ? 'Voir le résultat →' : 'Question suivante →'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
//  Wrapper : bascule entre quiz standard et quiz ciblé.
// ─────────────────────────────────────────────────────────────

type QuizMode = 'standard' | 'targeted'

export default function Trainer() {
  const [mode, setMode] = useState<QuizMode>('standard')

  const tab = (value: QuizMode, label: string) => {
    const active = mode === value
    return (
      <button
        onClick={() => setMode(value)}
        style={{
          background: active ? 'rgba(34,197,94,0.15)' : 'transparent',
          color: active ? '#22c55e' : '#a1a1aa',
          border: `1px solid ${active ? 'rgba(34,197,94,0.4)' : '#2a2a2a'}`,
          borderRadius: 8,
          padding: '8px 14px',
          fontSize: 13,
          fontWeight: active ? 600 : 400,
          cursor: 'pointer',
        }}
      >
        {label}
      </button>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {tab('standard', 'Quiz standard')}
        {tab('targeted', '🎯 Ciblé sur mes leaks')}
      </div>

      {mode === 'standard' ? <StandardTrainer /> : <TargetedQuiz />}
    </div>
  )
}
