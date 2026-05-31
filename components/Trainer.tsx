'use client'

import { useState, useEffect } from 'react'

// ─────────────────────────────────────────────────────────────
//  Trainer à 4 niveaux de difficulté.
//  - beginner / intermediate / advanced : questions prédéfinies côté client
//  - leaks : questions générées par Claude depuis le profil Coach (/api/trainer-context)
// ─────────────────────────────────────────────────────────────

type Difficulty = 'beginner' | 'intermediate' | 'advanced' | 'leaks'

interface QuizQuestion {
  question: string
  options: string[]
  correct: number
  explanation: string
  position: string
  topic: string
}

type QuizStatus = 'loading' | 'ready' | 'error'

const DIFFICULTIES: { id: Difficulty; btn: string; label: string }[] = [
  { id: 'beginner', btn: '🟢 Débutant', label: 'Débutant' },
  { id: 'intermediate', btn: '🟡 Intermédiaire', label: 'Intermédiaire' },
  { id: 'advanced', btn: '🔴 Avancé', label: 'Avancé' },
  { id: 'leaks', btn: '🎯 Mes leaks', label: 'Personnalisé' },
]

// ── Banques de questions prédéfinies ──────────────────────────

const BEGINNER: QuizQuestion[] = [
  { question: 'Main : 72o en première position (EP). Action ?', options: ['Fold', 'Raise'], correct: 0, position: 'EP', topic: 'Mains de départ', explanation: '72 dépareillé est la pire main du poker. En première position, on la jette sans hésiter.' },
  { question: 'Main : AA en UTG. Action ?', options: ['Fold', 'Raise'], correct: 1, position: 'UTG', topic: 'Mains de départ', explanation: "Une paire d'As est la meilleure main de départ : on relance toujours, même en première position." },
  { question: 'Main : KQs au bouton (BTN). Action ?', options: ['Fold', 'Raise'], correct: 1, position: 'BTN', topic: 'Mains de départ', explanation: 'KQ assorti au bouton est une excellente main : on ouvre pour voler les blinds.' },
  { question: 'Quel est le nom de la 4e carte commune ?', options: ['Flop', 'Turn', 'River'], correct: 1, position: '', topic: 'Vocabulaire', explanation: 'Le flop = 3 cartes, la turn = la 4e carte, la river = la 5e et dernière.' },
  { question: 'Que signifie "IP" ?', options: ['In Position', 'Important Play'], correct: 0, position: '', topic: 'Vocabulaire', explanation: "IP = In Position : tu agis APRÈS ton adversaire, c'est un gros avantage." },
  { question: "Qu'est-ce qu'un limp ?", options: ['Appeler le BB', 'Relancer'], correct: 0, position: '', topic: 'Vocabulaire', explanation: 'Limper = seulement suivre la grosse blinde sans relancer. C\'est souvent déconseillé.' },
  { question: 'Combien de cartes privées reçoit chaque joueur au Hold\'em ?', options: ['2', '3', '4'], correct: 0, position: '', topic: 'Règles', explanation: 'Au Texas Hold\'em, chaque joueur reçoit exactement 2 cartes privées.' },
  { question: 'Main : JJ en MP. Action ?', options: ['Fold', 'Raise'], correct: 1, position: 'MP', topic: 'Mains de départ', explanation: 'Une paire de Valets est une main forte : on ouvre en relançant.' },
  { question: 'Main : 32o en UTG. Action ?', options: ['Fold', 'Raise'], correct: 0, position: 'UTG', topic: 'Mains de départ', explanation: '32 dépareillé est bien trop faible pour jouer en début de parole. Fold.' },
  { question: 'Le bouton (BTN) est-il une bonne position ?', options: ['Oui, la meilleure', 'Non, la pire'], correct: 0, position: 'BTN', topic: 'Positions', explanation: 'Le bouton est la meilleure position : après le flop, tu parles toujours en dernier.' },
  { question: 'Main : AKs au cutoff (CO). Action ?', options: ['Fold', 'Raise'], correct: 1, position: 'CO', topic: 'Mains de départ', explanation: 'AK assorti est une main premium : on relance de partout.' },
  { question: 'Que veut dire "fold" ?', options: ['Se coucher', 'Suivre'], correct: 0, position: '', topic: 'Vocabulaire', explanation: 'Fold = jeter ses cartes et abandonner le coup.' },
  { question: 'Combien de cartes communes au total à la fin du coup ?', options: ['3', '5', '7'], correct: 1, position: '', topic: 'Règles', explanation: 'Flop (3) + turn (1) + river (1) = 5 cartes communes.' },
  { question: 'Main : 99 au bouton. Action ?', options: ['Fold', 'Raise'], correct: 1, position: 'BTN', topic: 'Mains de départ', explanation: 'Une paire de 9 au bouton est largement assez forte pour ouvrir.' },
  { question: "Qu'est-ce qu'une blinde (blind) ?", options: ['Une mise forcée', 'Une relance'], correct: 0, position: '', topic: 'Règles', explanation: 'Les blinds (petite et grosse) sont des mises obligatoires postées avant la distribution.' },
  { question: 'Que signifie "BB" ?', options: ['Big Blind (grosse blinde)', 'Best Bet'], correct: 0, position: '', topic: 'Vocabulaire', explanation: 'BB = Big Blind, la grosse blinde. Elle sert aussi d\'unité de mesure des tapis.' },
]

const INTERMEDIATE: QuizQuestion[] = [
  { question: 'Main : A9o au cutoff (CO), à toi de parler. Action ?', options: ['Fold', 'Raise'], correct: 1, position: 'CO', topic: 'Range RFI', explanation: 'A9o au cutoff fait partie de la range d\'ouverture standard : tu relances pour prendre l\'initiative et voler les blinds.' },
  { question: 'Main : 55 en MP, 20BB, face à un 3-bet. Action ?', options: ['Call', 'Fold', '4-bet'], correct: 1, position: 'MP', topic: 'Pot odds / stack', explanation: 'À 20BB face à un 3-bet, les petites paires perdent leur valeur (peu d\'implied odds pour toucher un brelan). Fold est correct (à 100BB, le call deviendrait jouable).' },
  { question: 'Pot = 100€, l\'adversaire mise 50€. Equity minimum pour call ?', options: ['25%', '33%', '50%'], correct: 0, position: '', topic: 'Pot odds', explanation: 'Tu risques 50 pour gagner 150 (100 + 50) : 50 / 200 = 25% d\'equity nécessaire.' },
  { question: 'Main : KJs au BTN, la SB 3-bet d\'une petite taille. Action ?', options: ['Fold', 'Call', '4-bet'], correct: 1, position: 'BTN', topic: 'Jeu en position', explanation: 'Face à un 3-bet de petite taille en position, KJs a assez d\'equity et de jouabilité pour suivre et jouer le flop en position.' },
  { question: "Qu'est-ce qu'une range ?", options: ['L\'ensemble des mains possibles', 'Une seule main précise'], correct: 0, position: '', topic: 'Concepts', explanation: 'Une range = l\'éventail des mains qu\'un joueur peut détenir dans une situation donnée. On raisonne par range, pas par main unique.' },
  { question: 'Main : AJo en UTG sur table 9-max. Action ?', options: ['Fold', 'Raise'], correct: 0, position: 'UTG', topic: 'Range RFI', explanation: 'AJo en UTG sur table pleine est trop souvent dominé (AQ, AK, KJ...). Le fold est standard.' },
  { question: 'Tu as un tirage couleur après le flop (9 outs). Equity approximative ?', options: ['~18%', '~35%', '~50%'], correct: 1, position: '', topic: 'Equity', explanation: 'Règle des 4 : 9 outs × 4 ≈ 36% d\'equity sur les deux cartes à venir (turn + river).' },
  { question: 'Main : 77 au bouton, à toi de parler. Action ?', options: ['Fold', 'Raise'], correct: 1, position: 'BTN', topic: 'Range RFI', explanation: '77 au bouton s\'ouvre toujours : paire jouable + position pour faire du set-mining ou continuer en bluff.' },
  { question: 'Pot = 60€, l\'adversaire mise 60€. Equity requise pour call ?', options: ['25%', '33%', '40%'], correct: 1, position: '', topic: 'Pot odds', explanation: 'Tu mises 60 pour gagner 180 (60 + 60 + 60) : 60 / 180 ≈ 33% d\'equity requise.' },
  { question: 'Main : ATs en MP face à un open d\'EP raisonnable. Action ?', options: ['Fold', 'Call', '3-bet'], correct: 1, position: 'MP', topic: 'Range vs open', explanation: 'ATs joue très bien en call face à un open early : jouabilité, potentiel de nuts (couleur max), domination limitée.' },
  { question: "Qu'apporte le fait d'être en position ?", options: ['L\'information (agir en dernier)', 'Plus de jetons'], correct: 0, position: '', topic: 'Position', explanation: 'Être en position = agir après l\'adversaire, donc décider avec plus d\'information. C\'est un avantage majeur.' },
  { question: 'Main : 22 au bouton, 50BB effectifs. Action ?', options: ['Fold', 'Raise'], correct: 1, position: 'BTN', topic: 'Range RFI', explanation: 'Avec 50BB au bouton, 22 s\'ouvre : tu peux set-miner et voler les blinds avec la position.' },
  { question: 'Main : KQo en UTG sur table 9-max. Action ?', options: ['Fold', 'Raise'], correct: 0, position: 'UTG', topic: 'Range RFI', explanation: 'KQo en UTG est marginal et souvent dominé sur table pleine ; le fold est l\'option standard.' },
  { question: 'Un "cooler", c\'est quoi ?', options: ['Deux très grosses mains qui se rencontrent', 'Une erreur de jeu évidente'], correct: 0, position: '', topic: 'Vocabulaire', explanation: 'Un cooler = situation où deux mains très fortes s\'affrontent (ex: brelan vs couleur). Les pertes y sont quasi inévitables.' },
  { question: 'Face à un calling-station qui suit tout, tu dois...', options: ['Bluffer moins, value-bet plus', 'Bluffer beaucoup plus'], correct: 0, position: '', topic: 'Exploitation', explanation: 'Contre un joueur qui ne fold jamais, les bluffs ne passent pas : tu mises pour la valeur avec tes bonnes mains et tu coupes les bluffs.' },
  { question: 'Tu as une quinte par les deux bouts au flop (8 outs). Equity approx ?', options: ['~16%', '~32%', '~45%'], correct: 1, position: '', topic: 'Equity', explanation: 'Règle des 4 : 8 outs × 4 ≈ 32% sur les deux cartes à venir.' },
]

const ADVANCED: QuizQuestion[] = [
  { question: 'Bulle finale (ICM fort), 15BB, A8o en UTG. Action ?', options: ['Shove', 'Fold'], correct: 1, position: 'UTG', topic: 'ICM', explanation: 'À la bulle, l\'ICM pénalise lourdement le buste : A8o UTG est bien trop large malgré 15BB. Fold.' },
  { question: "Qu'est-ce qu'un blocker ?", options: ['Une carte qui réduit les combos adverses', 'Une mise purement défensive'], correct: 0, position: '', topic: 'Blockers', explanation: 'Un blocker = une carte de ta main qui rend certaines combinaisons adverses moins probables (ex: tenir l\'A♠ bloque la couleur max / les AA).' },
  { question: 'Board K72 rainbow, BTN vs BB, tu as QQ. c-bet ou check ?', options: ['C-bet', 'Check'], correct: 0, position: 'BTN', topic: 'Texture de board', explanation: 'Board sec qui favorise ta range d\'agresseur : un c-bet de petite taille pour value/protection est standard avec QQ.' },
  { question: 'Une range polarisée contient...', options: ['Du très fort + des bluffs', 'Surtout des mains moyennes'], correct: 0, position: '', topic: 'Construction de range', explanation: 'Polarisé = soit très fort, soit bluff. Merged = mains moyennes-à-fortes regroupées, sans bluffs purs.' },
  { question: 'Quand préférer une range MERGED plutôt que polarisée ?', options: ['Contre un adversaire qui call large', 'Toujours sur la river'], correct: 0, position: '', topic: 'Construction de range', explanation: 'Contre un calling-station, on value-bet plus de mains moyennes (merged). Le polarisé sert face à un adversaire qui fold trop.' },
  { question: 'En ICM, un jeton supplémentaire vaut...', options: ['Moins (valeur décroissante)', 'Toujours la même chose'], correct: 0, position: '', topic: 'ICM', explanation: 'En ICM, la valeur marginale des jetons décroît : il faut jouer plus serré près des paliers de prix, surtout avec un stack moyen.' },
  { question: 'Board à tirage couleur ♠, tu détiens l\'A♠. Effet ?', options: ['Tu bloques le nut flush adverse', 'Aucun effet notable'], correct: 0, position: '', topic: 'Blockers', explanation: 'Détenir l\'A♠ bloque la couleur max : l\'adversaire l\'a moins souvent, ce qui fait de toi un bon candidat au bluff.' },
  { question: 'Board A♥K♥5♣, tu défends en BB face au c-bet. Tu continues avec...', options: ['Tirages + paires avec equity', 'Tu fold tout sauf top paire'], correct: 0, position: 'BB', topic: 'Défense BB', explanation: 'Tu défends ton equity : tirages cœur, gutshots, paires. Folder tout te rend exploitable (MDF).' },
  { question: 'La MDF (minimum defense frequency) sert à...', options: ['Ne pas trop folder face aux mises', 'Maximiser tes bluffs'], correct: 0, position: '', topic: 'Théorie GTO', explanation: 'La MDF indique la fréquence minimale de défense pour ne pas être exploitable par les bluffs adverses.' },
  { question: 'Un overbet (mise > pot) s\'utilise surtout...', options: ['Range polarisée + nut advantage', 'Sur un board neutre sans avantage'], correct: 0, position: '', topic: 'Sizing', explanation: 'L\'overbet s\'emploie polarisé, quand tu as l\'avantage des nuts sur un board qui te permet d\'avoir les mains max bien plus souvent.' },
  { question: 'Meilleurs candidats pour un 3-bet bluff ?', options: ['Mains à blockers + jouables (ex: A5s)', 'Déchets sans valeur (ex: 72o)'], correct: 0, position: '', topic: 'Construction de range', explanation: 'Les bons 3-bet bluffs ont des blockers (un As) et de la jouabilité postflop (suited/connectées), pas les pires mains.' },
  { question: 'Bulle ICM, big stack vs short stack : qui met la pression ?', options: ['Le big stack', 'Le short stack'], correct: 0, position: '', topic: 'ICM', explanation: 'Le big stack exploite l\'ICM en attaquant : les stacks moyens ne peuvent pas se permettre de call large sous peine de buster.' },
  { question: 'Board monotone (3 cartes même couleur), ta range d\'agresseur...', options: ['C-bet plus prudent / petite taille', 'Overbet systématique'], correct: 0, position: '', topic: 'Texture de board', explanation: 'Sur monotone, ton avantage de range diminue (le BB a aussi des couleurs) : on réduit taille et fréquence de c-bet.' },
  { question: 'Un "squeeze", c\'est...', options: ['3-bet après un open + un call', 'Un check-raise river'], correct: 0, position: '', topic: 'Vocabulaire avancé', explanation: 'Le squeeze = relancer (3-bet) après une ouverture suivie d\'au moins un call, pour exploiter des ranges cappées et la dead money.' },
  { question: 'Qu\'est-ce qui améliore l\'equity realization d\'une main ?', options: ['La position et la jouabilité', 'Uniquement un gros tapis'], correct: 0, position: '', topic: 'Théorie GTO', explanation: 'La position et les mains jouables (suited, connectées) réalisent mieux leur equity brute que des mains injouables hors de position.' },
]

const BANKS: Record<Exclude<Difficulty, 'leaks'>, QuizQuestion[]> = {
  beginner: BEGINNER,
  intermediate: INTERMEDIATE,
  advanced: ADVANCED,
}

// Mélange (copie) — Fisher-Yates. Math.random est OK en code client.
function shuffle(arr: QuizQuestion[]): QuizQuestion[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function Trainer() {
  const [difficulty, setDifficulty] = useState<Difficulty>('beginner')
  const [score, setScore] = useState({ correct: 0, total: 0 })
  const [questions, setQuestions] = useState<QuizQuestion[]>(() => shuffle(BANKS.beginner))
  const [status, setStatus] = useState<QuizStatus>('ready')
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)

  // Charge (ou recharge) le niveau courant. Hors effet pour pouvoir être
  // rappelée par les boutons "Rejouer / Réessayer".
  const loadLevel = (lvl: Difficulty) => {
    setScore({ correct: 0, total: 0 })
    setIndex(0)
    setSelected(null)
    if (lvl === 'leaks') {
      setStatus('loading')
      setQuestions([])
      ;(async () => {
        try {
          const res = await fetch('/api/trainer-context?difficulty=leaks')
          const data = await res.json()
          if (!res.ok || data?.error) throw new Error(data?.error ?? 'Erreur lors du chargement.')
          if (!Array.isArray(data) || data.length === 0) throw new Error('Aucune question générée.')
          setQuestions(data as QuizQuestion[])
          setStatus('ready')
        } catch {
          setStatus('error')
        }
      })()
    } else {
      setQuestions(shuffle(BANKS[lvl]))
      setStatus('ready')
    }
  }

  // CHANGEMENT 2 : à chaque changement de niveau, on remet le compteur à zéro
  // et on (re)charge les questions du niveau.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadLevel(difficulty)
  }, [difficulty])

  const levelLabel = DIFFICULTIES.find(d => d.id === difficulty)?.label ?? ''

  // ── Sélecteur de niveau (commun à tous les états) ──
  const levelSelector = (
    <>
      <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
        {DIFFICULTIES.map(d => {
          const active = difficulty === d.id
          return (
            <button
              key={d.id}
              onClick={() => setDifficulty(d.id)}
              style={{
                background: active ? '#22c55e' : '#1a1a1a',
                color: active ? '#000' : '#a1a1aa',
                border: active ? 'none' : '1px solid #2a2a2a',
                fontWeight: active ? 600 : 400,
                borderRadius: 8,
                padding: '8px 16px',
                fontSize: 13,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {d.btn}
            </button>
          )
        })}
      </div>
      {/* CHANGEMENT 5 : libellé du niveau courant */}
      <p style={{ fontSize: 11, color: '#a1a1aa', marginBottom: 16 }}>Niveau : {levelLabel}</p>
    </>
  )

  // ── États du mode "leaks" ──
  if (status === 'loading') {
    return (
      <div>
        {levelSelector}
        <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 12, padding: 40, textAlign: 'center', color: '#a1a1aa', fontSize: 14 }}>
          Génération de ton quiz personnalisé à partir de tes leaks…
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div>
        {levelSelector}
        <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.4)', borderRadius: 12, padding: 24, textAlign: 'center' }}>
          <p style={{ color: '#f59e0b', fontSize: 15, fontWeight: 600, marginBottom: 14 }}>
            Génère d&apos;abord ton profil dans Mon Coach pour activer ce mode.
          </p>
          <button
            onClick={() => loadLevel('leaks')}
            style={{ background: 'transparent', color: '#a1a1aa', border: '1px solid #2a2a2a', borderRadius: 6, padding: '6px 12px', fontSize: 12, cursor: 'pointer' }}
          >
            Réessayer
          </button>
        </div>
      </div>
    )
  }

  const q = questions[index]
  const answered = selected !== null
  const isLast = index === questions.length - 1
  const finished = index >= questions.length

  // ── Écran de fin ──
  if (finished || !q) {
    return (
      <div>
        {levelSelector}
        <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 12, padding: 32, textAlign: 'center' }}>
          <p style={{ fontSize: 16, fontWeight: 700, color: '#f5f5f5', marginBottom: 8 }}>Quiz terminé 🎉</p>
          <p style={{ fontSize: 14, color: '#a1a1aa', marginBottom: 20 }}>
            <strong style={{ color: '#22c55e' }}>{score.correct}</strong> / {score.total} bonnes réponses
          </p>
          <button
            onClick={() => loadLevel(difficulty)}
            style={{ background: '#22c55e', color: '#000', border: 'none', borderRadius: 8, padding: '12px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
          >
            Rejouer ce niveau
          </button>
        </div>
      </div>
    )
  }

  const handleAnswer = (i: number) => {
    if (answered) return
    setSelected(i)
    setScore(s => ({ correct: s.correct + (i === q.correct ? 1 : 0), total: s.total + 1 }))
  }

  const handleNext = () => {
    setIndex(i => i + 1)
    setSelected(null)
  }

  const isCorrect = selected === q.correct
  const isLeaks = difficulty === 'leaks'
  const topicBadge = isLeaks
    ? { bg: 'rgba(168,85,247,0.15)', color: '#a855f7', label: `Leak : ${q.topic}` }
    : { bg: 'rgba(34,197,94,0.12)', color: '#22c55e', label: q.topic }

  return (
    <div>
      {levelSelector}

      {/* Progression + score */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ fontSize: 13, color: '#a1a1aa' }}>Question {index + 1} / {questions.length}</span>
        <span style={{ fontSize: 13, color: '#a1a1aa' }}>
          <strong style={{ color: '#22c55e' }}>{score.correct}</strong> / {score.total} bonnes réponses
        </span>
      </div>

      <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 12, padding: 24 }}>
        {/* Badges : thème + position éventuelle */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {q.topic && (
            <span style={{ background: topicBadge.bg, color: topicBadge.color, padding: '4px 10px', borderRadius: 4, fontSize: 12, fontWeight: 500 }}>
              {topicBadge.label}
            </span>
          )}
          {q.position && (
            <span style={{ background: 'rgba(59,130,246,0.15)', color: '#3b82f6', padding: '4px 10px', borderRadius: 4, fontSize: 12, fontWeight: 500 }}>
              {q.position}
            </span>
          )}
        </div>

        {/* Question */}
        <p style={{ fontSize: 16, fontWeight: 600, color: '#f5f5f5', lineHeight: 1.5, marginBottom: 18 }}>{q.question}</p>

        {/* Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: answered ? 16 : 0 }}>
          {q.options.map((opt, i) => {
            let bg = 'rgba(255,255,255,0.03)'
            let border = '1px solid #2a2a2a'
            let color = '#f5f5f5'
            if (answered) {
              if (i === q.correct) { bg = 'rgba(34,197,94,0.15)'; border = '1px solid rgba(34,197,94,0.5)'; color = '#22c55e' }
              else if (i === selected) { bg = 'rgba(239,68,68,0.12)'; border = '1px solid rgba(239,68,68,0.5)'; color = '#ef4444' }
            }
            return (
              <button
                key={i}
                onClick={() => handleAnswer(i)}
                disabled={answered}
                style={{
                  background: bg, border, color,
                  borderRadius: 8, padding: '12px 14px', fontSize: 14, textAlign: 'left',
                  cursor: answered ? 'default' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: 10,
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
            <div style={{ background: '#242424', borderLeft: `3px solid ${isCorrect ? '#22c55e' : '#ef4444'}`, borderRadius: 8, padding: 14, fontSize: 13, lineHeight: 1.6, color: '#d1d5db', marginBottom: 14 }}>
              <p style={{ color: isCorrect ? '#4ade80' : '#ef4444', fontWeight: 600, marginBottom: 4 }}>
                {isCorrect ? '✓ Correct !' : `✗ Incorrect — bonne réponse : ${String.fromCharCode(65 + q.correct)}`}
              </p>
              {q.explanation}
            </div>
            <button
              onClick={handleNext}
              style={{ width: '100%', background: '#22c55e', color: '#000', border: 'none', borderRadius: 8, padding: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
            >
              {isLast ? 'Voir le résultat →' : 'Question suivante →'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
