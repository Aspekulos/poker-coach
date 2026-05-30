import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

interface IncomingHand {
  handId?: string
  myPosition?: string
  myCards?: string
  level?: string
  result?: string
  stackBB?: number
  opponentAction?: string
  heroAction?: string
  rawText?: string
}

interface AnalysisInsert {
  hand_id: string
  cards: string
  position: string
  level: string
  result: string
  verdict: string
  analysis_text: string
  raw_hand: string
  is_global: boolean
}

const client = new Anthropic()
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const SYSTEM_PROMPT = `Tu es un coach poker expert en MTT No Limit Hold'em KO/bounty.
Tu analyses les mains de ML.Aspek et tu donnes un verdict strict en français.

═══════════════════════════════════════════════
RÈGLES DE VERDICT — APPLIQUE-LES STRICTEMENT
═══════════════════════════════════════════════

✅ Bien joué : action clairement correcte ou optimale selon la théorie GTO/exploitative

⚠️ Borderline : action défendable dans certains contextes mais discutable.
  Utilise ⚠️ quand :
  - La décision dépend fortement de reads spécifiques sur l'adversaire
  - Deux lignes sont raisonnables (fold ET call, ou raise ET call)
  - Le spot est correct en théorie mais l'exécution (sizing) est imparfaite

❌ Erreur : utilise ❌ UNIQUEMENT si l'action est CLAIREMENT -EV selon les critères suivants :
  - Call all-in avec moins de 30% d'equity ET sans bounty qui compense
  - Open raise avec une main qui ne justifie jamais un open dans cette position (ex: 72o UTG)
  - Sizing catastrophiquement incorrect qui détruit la valeur (ex: min-bet river pour value)
  - Bluff avec 0% de fold equity démontrable
  - Limp/fold (investir des chips puis folder sans avoir vu le flop gratuitement)

  NE JAMAIS noter ❌ pour :
  - Un fold d'une main marginale en early position face à une relance
  - Un call qui avait des pot odds supérieurs à l'equity requise
  - Une décision correcte qui a donné un mauvais résultat (juge le PROCESS, pas le résultat)
  - Un spot où deux lignes sont légitimement défendables
  - Un open raise standard même si suboptimal (QJo UTG = ⚠️ max, jamais ❌)

═══════════════════════════════════════════════
CONTEXTE STACK SIZE
═══════════════════════════════════════════════
- < 15BB : mode push/fold strict, standards différents
- 15-30BB : semi-short, 3-bet/fold quasi-impossible, shoves fréquents
- 30-60BB : jeu normal, postflop possible
- > 60BB : stack profond, postflop dominant

═══════════════════════════════════════════════
CONTEXTE BOUNTY KO
═══════════════════════════════════════════════
En tournoi KO, la valeur du bounty s'ajoute à l'EV du call.
Un call qui semble léger peut être correct grâce au bounty.
Mentionne le bounty quand il influence significativement la décision.

═══════════════════════════════════════════════
FORMAT DE RÉPONSE — RESPECTE-LE EXACTEMENT
═══════════════════════════════════════════════

## Analyse par main

Pour chaque main, UNE SEULE LIGNE avec ce format strict (ne mets pas "VERDICT :") :
[POSITION] [CARTES] — ✅/⚠️/❌ Label — Explication courte en 1 phrase max

Exemples :
[CO] [Ks Jh] — ✅ Bien joué — Open standard, steal réussi.
[BTN] [9h Jd] — ⚠️ Borderline — 3-bet défendable mais sizing sous-dimensionné crée un spot difficile.
[BB] [3d 3s] — ❌ Erreur — Overbet shove all-in avec une sous-paire sur board dynamique sans equity.

## Points forts
2-3 points observés avec références aux numéros de mains.

## Points faibles
2-3 leaks concrets avec références aux numéros de mains.

## Style de jeu
3-4 phrases sur le profil global.

## Priorités d'amélioration
3 points classés par impact :
1. [Problème] → [Action concrète]
2. [Problème] → [Action concrète]
3. [Problème] → [Action concrète]`

export async function POST(req: NextRequest) {
  try {
    const { hands } = await req.json()
    if (!hands?.length) {
      return NextResponse.json({ error: 'Aucune main à analyser.' }, { status: 400 })
    }

    const handsText = hands.map((h: IncomingHand, i: number) =>
      `--- MAIN ${i + 1} [${h.myPosition}] [${h.myCards}] | Stack: ${h.stackBB}BB | Adverse: ${h.opponentAction} | ML.Aspek: ${h.heroAction} ---\n${h.rawText}`
    ).join('\n\n')

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4000,
      system: SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: `Voici ${hands.length} mains de ML.Aspek à analyser :\n\n${handsText}`
      }]
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''

    // Sauvegarde analyse globale
    await supabase.from('analyses').insert({
      hand_id: 'global-' + Date.now(),
      cards: '',
      position: '',
      level: '',
      result: '',
      verdict: 'global',
      analysis_text: text,
      raw_hand: '',
      is_global: true
    })

    // Normalise les cartes pour la comparaison (retire espaces superflus,
    // lowercase sauf symboles)
    const normalizeCards = (s: string) =>
      s
        .replace(/♠/g, 's').replace(/♥/g, 'h')
        .replace(/♦/g, 'd').replace(/♣/g, 'c')
        .toLowerCase()
        .trim()
        .split(/\s+/)
        .sort()
        .join('')
    const normalizePos = (s: string) => s.trim().toUpperCase()

    // Parse les lignes d'analyse de Claude
    const lines = text.split('\n')
    const handRecords: AnalysisInsert[] = []
    const usedHandIndices = new Set<number>()

    for (const line of lines) {
      const match = line.match(
        /\[([^\]]+)\]\s*\[([^\]]+)\]\s*[—\-]\s*(✅|⚠️|❌)\s*(.+)/
      )
      if (!match) continue

      const position = normalizePos(match[1])
      const cards    = normalizeCards(match[2])
      const verdict  = match[3].trim()
      const explanation = match[4].replace(/^(Bien joué|Borderline|Erreur)\s*[:—-]\s*/i, '').trim()

      // Cherche la main correspondante par position + cartes
      let matchedHand: IncomingHand | null = null
      let matchedIndex = -1

      for (let i = 0; i < hands.length; i++) {
        if (usedHandIndices.has(i)) continue
        const h = hands[i]
        if (
          normalizePos(h.myPosition) === position &&
          normalizeCards(h.myCards)  === cards
        ) {
          matchedHand  = h
          matchedIndex = i
          break
        }
      }

      // Si pas de match exact, fallback sur le prochain non utilisé
      // (cas rare : Claude a reformaté les cartes)
      if (!matchedHand) {
        for (let i = 0; i < hands.length; i++) {
          if (!usedHandIndices.has(i)) {
            matchedHand  = hands[i]
            matchedIndex = i
            break
          }
        }
      }

      if (matchedIndex !== -1) usedHandIndices.add(matchedIndex)

      handRecords.push({
        hand_id: matchedHand?.handId || `hand-${Date.now()}-${handRecords.length}`,
        // forme lisible pour l'affichage (la variable `cards` normalisée
        // "jhks" ne sert qu'au matching position+cartes ci-dessus)
        cards: matchedHand?.myCards || match[2].trim(),
        position,
        level:         matchedHand?.level   || '',
        result:        matchedHand?.result  || '',
        verdict,
        analysis_text: explanation,
        raw_hand:      matchedHand?.rawText || '',
        is_global:     false
      })
    }

    if (handRecords.length > 0) {
      await supabase.from('analyses').upsert(handRecords, {
        onConflict: 'hand_id',
        ignoreDuplicates: false
      })
    }

    return NextResponse.json({
      analysis: text,
      savedHands: handRecords.length
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erreur API.' }, { status: 500 })
  }
}
