// ─── TYPES ───────────────────────────────────────────────────────────────────

export const RANKS = ['A','K','Q','J','T','9','8','7','6','5','4','3','2'] as const
export type RankType = typeof RANKS[number]
export type RFIPosition = 'EP' | 'MP' | 'CO' | 'BTN' | 'Fold'
export type PushPosition = 'EP' | 'MP' | 'CO' | 'BTN' | 'SB'

// ─── RFI OPENING RANGES ──────────────────────────────────────────────────────

export const OPENING_RANGES: Record<string, RFIPosition> = {
  'AA':'EP','KK':'EP','QQ':'EP','JJ':'EP','TT':'EP','99':'EP','88':'EP','77':'EP','66':'EP',
  'AKs':'EP','AQs':'EP','AJs':'EP','ATs':'EP','KQs':'EP','KJs':'EP','QJs':'EP','JTs':'EP',
  'AKo':'EP','AQo':'EP','AJo':'EP','KQo':'EP',
  '55':'MP','44':'MP',
  'A9s':'MP','KTs':'MP','QTs':'MP','T9s':'MP','98s':'MP',
  'ATo':'MP','KJo':'MP',
  '33':'CO','22':'CO',
  'A8s':'CO','A7s':'CO','A6s':'CO','A5s':'CO','A4s':'CO','A3s':'CO','A2s':'CO',
  'K9s':'CO','Q9s':'CO','J9s':'CO','T8s':'CO','97s':'CO','86s':'CO','76s':'CO','65s':'CO','54s':'CO',
  'A9o':'CO','KTo':'CO','QJo':'CO','QTo':'CO','JTo':'CO',
  'K8s':'BTN','K7s':'BTN','K6s':'BTN','K5s':'BTN','K4s':'BTN','K3s':'BTN','K2s':'BTN',
  'Q8s':'BTN','Q7s':'BTN','Q6s':'BTN','J8s':'BTN','J7s':'BTN','T7s':'BTN',
  '96s':'BTN','85s':'BTN','75s':'BTN','74s':'BTN','64s':'BTN','53s':'BTN','43s':'BTN',
  'A8o':'BTN','A7o':'BTN','A6o':'BTN','A5o':'BTN','A4o':'BTN','A3o':'BTN','A2o':'BTN',
  'K9o':'BTN','Q9o':'BTN','J9o':'BTN','T9o':'BTN',
}

export const RFI_COLORS: Record<RFIPosition, { bg: string; text: string; label: string }> = {
  EP:   { bg:'#14532d', text:'#bbf7d0', label:'EP ~10%' },
  MP:   { bg:'#365314', text:'#d9f99d', label:'MP ~13%' },
  CO:   { bg:'#78350f', text:'#fde68a', label:'CO ~25%' },
  BTN:  { bg:'#1e3a5f', text:'#bfdbfe', label:'BTN ~42%' },
  Fold: { bg:'#1a1a1a', text:'#3f3f46', label:'Fold' },
}

// ─── PUSH/FOLD — Classement des mains pour Nash ───────────────────────────────

export const PUSH_HAND_RANKING: string[] = [
  'AA','KK','QQ','JJ','AKs','AKo','TT','AQs','AQo','99',
  'AJs','88','AJo','ATs','KQs','77','ATo','KQo','66','A9s',
  'KJs','55','A8s','KTs','QJs','44','A7s','KJo','A9o','33',
  'A6s','QTs','KTo','22','A5s','A8o','JTs','A4s','A7o','Q9s',
  'K9s','A3s','A6o','A2s','QJo','T9s','K8s','A5o','J9s','A4o',
  'Q8s','K7s','A3o','JTo','K6s','98s','A2o','T8s','J8s','K5s',
  'Q7s','K9o','T9o','97s','K4s','J7s','Q9o','87s','K3s','T7s',
  'Q6s','86s','K8o','96s','76s','K2s','J9o','Q5s','85s','75s',
  'Q8o','65s','Q4s','95s','K7o','J8o','T8o','Q3s','54s','74s',
  '84s','Q2s','64s','43s','K6o','Q7o','97o','53s','87o','J7o',
  '94s','63s','K5o','73s','52s','T7o','86o','76o','Q6o','J6s',
  'K4o','32s','85o','K3o','75o','54o','J5s','Q5o','64o','K2o',
  'T6s','J4s','74o','J3s','43o','Q4o','95o','T5s','J2s','53o',
  'Q3o','T4s','63o','T3s','Q2o','42o','52o','T2s','J5o','84o',
  'J4o','T6o','83o','J3o','T5o','73o','J2o','T4o','82o','T3o',
  '72o','T2o','62o','32o',
]

export const PUSH_THRESHOLDS: Record<PushPosition, Record<number, number>> = {
  EP:  { 4:65, 5:50, 6:32, 7:26, 8:22, 9:19, 10:16, 11:14, 12:12, 13:11, 14:10, 15:9  },
  MP:  { 4:72, 5:58, 6:40, 7:34, 8:30, 9:26, 10:22, 11:20, 12:18, 13:16, 14:14, 15:13 },
  CO:  { 4:80, 5:68, 6:55, 7:48, 8:40, 9:36, 10:32, 11:28, 12:25, 13:22, 14:21, 15:20 },
  BTN: { 4:90, 5:78, 6:65, 7:58, 8:53, 9:47, 10:42, 11:38, 12:35, 13:32, 14:30, 15:28 },
  SB:  { 4:95, 5:88, 6:80, 7:72, 8:65, 9:60, 10:55, 11:50, 12:45, 13:42, 14:39, 15:36 },
}

export function shouldPush(hand: string, position: PushPosition, stackBB: number): boolean {
  const threshold = PUSH_THRESHOLDS[position]?.[stackBB] ?? 0
  const cutoffIndex = Math.ceil(PUSH_HAND_RANKING.length * threshold / 100)
  return PUSH_HAND_RANKING.slice(0, cutoffIndex).includes(hand)
}

// ─── STRATÉGIE PAR POSITION ───────────────────────────────────────────────────

export const POSITIONS_STRATEGY = [
  {
    id:'EP', label:'EP — UTG', accentColor:'#22c55e', posType:'OOP', posLabel:'Hors de position',
    range:'~10%',
    preflop:"Range ultra serrée. Tu parles en 1er — tout le monde te voit agir avant eux. Joue uniquement les grosses mains (paires 66+, broadways forts). Aucun fancy play.",
    postflop:"C-bet sélectif (~40% des flops). Mise avec tes mains fortes, check avec les moyennes. Évite les bluffs multi-streets — tu as plusieurs adversaires potentiels.",
    keyTip:"Si tu raises AQ et le flop sort K-J-8, souvent check/fold face à de l'agressivité. Ne surjoue pas les top paires faibles quand tu es le 1er à parler.",
    error:"Continuer à miser 3 streets avec une main marginale. En OOP, un check-raise adverse c'est presque jamais un bluff — lis le signal."
  },
  {
    id:'MP', label:'MP', accentColor:'#84cc16', posType:'OOP', posLabel:'Hors de position',
    range:'~13%',
    preflop:"Légèrement plus large qu'EP. Commence à ajouter des suited connectors et petites paires. Évite les cold-calls légers — si tu appelles une raise, t'as une raison solide.",
    postflop:"C-bet ~50% des flops. Attention : le BTN va souvent float (caller avec une main légère pour prendre le pot au turn). Ne mise pas 3 streets avec top paire kicker moyen.",
    keyTip:"Pense toujours à qui est derrière toi. Si BTN a callé et check le turn, c'est souvent une invitation à check back.",
    error:"Ignorer le BTN. Il a un avantage positionnel énorme sur toi — joue plus défensif face à son agressivité."
  },
  {
    id:'CO', label:'CO — Cutoff', accentColor:'#f59e0b', posType:'IP', posLabel:'En position (vs blindes)',
    range:'~25%',
    preflop:"Steal régulièrement quand les joueurs devant ont foldé. Beaucoup de mains valent un raise pour voler les blindes.",
    postflop:"C-bet ~60% des flops quand tu joues contre SB/BB uniquement. Tu as l'avantage — ils agissent avant toi.",
    keyTip:"Si BTN entre dans le pot, tu perds ton avantage IP. Dans ce cas joue plus prudemment.",
    error:"Miser trop gros pour voler les blindes. Un c-bet petit (30-40% du pot) suffit souvent."
  },
  {
    id:'BTN', label:'BTN — Button', accentColor:'#3b82f6', posType:'IP', posLabel:'Toujours en position',
    range:'~42%',
    preflop:"Steal agressivement contre les blindes. Tu peux ouvrir ~42% des mains. C'est ta position d'argent.",
    postflop:"C-bet presque toujours (~70-80% des flops). Tu peux float pour bluffer au turn. Tu vois ce qu'ils font AVANT d'agir.",
    keyTip:"Si SB/BB checkent le flop, prends le pot. Si ils misent fort plusieurs streets, ils ont quelque chose.",
    error:"Devenir prévisible en c-betant 100% des flops. Check back parfois avec des mains moyennes pour induire leurs bluffs."
  },
  {
    id:'SB', label:'SB — Small Blind', accentColor:'#a1a1aa', posType:'OOP', posLabel:'Hors de position (vs BB)',
    range:'~38%',
    preflop:"Raise ou fold uniquement — jamais limp. Tu seras OOP contre BB toute la main.",
    postflop:"C-bet sélectif (~45%). Mains fortes : mise pour valeur. Mains moyennes : check souvent pour contrôler le pot.",
    keyTip:"Ne sur-défends pas face aux steals de BTN. Ce ½ BB investi ne vaut pas les galères post-flop OOP.",
    error:"Compléter (limp) en SB parce que 'c'est pas cher'. Tu vas jouer OOP toute la main avec une main quelconque."
  },
  {
    id:'BB', label:'BB — Big Blind', accentColor:'#a1a1aa', posType:'OOP', posLabel:'Hors de position (vs tous)',
    range:'Défends ~40% face à un raise 2-2.5BB',
    preflop:"Tu as déjà 1 BB investi = discount. Face à un raise 2-2.5BB, défends plus large que tu ne l'imagines.",
    postflop:"Check-raise avec tes mains très fortes — tu sembles faible en checkant, donc ça fait peur. Avec des mains moyennes, check/call.",
    keyTip:"Ne 'donk bet' pas avec des mains légères — check, laisse le raiser c-bet, puis joue ta main.",
    error:"Over-défendre face à des grosses raises. Le 1 BB est perdu — la vraie question : est-ce que ta main vaut le call maintenant ?"
  }
]
