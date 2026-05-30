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

const SYSTEM_PROMPT = `Tu es un coach poker expert en MTT No Limit Hold'em.
Tu reçois un ensemble de mains jouées par ML.Aspek et tu dois produire une analyse
complète de son style de jeu en français.

Sois direct et honnête. Juge le PROCESSUS, pas les résultats.
Une main gagnée avec une mauvaise décision = mauvaise décision.

Structure ta réponse EXACTEMENT comme suit :

## Analyse par main

Pour chaque main, UNE LIGNE EXACTEMENT avec ce format strict :
[POSITION] [CARTES] — VERDICT : explication courte

Où VERDICT est exactement l'un de ces trois mots : ✅ Bien joué / ⚠️ Borderline / ❌ Erreur

## Points forts
2-3 points concrets observés dans ces mains (avec exemples de mains spécifiques)

## Points faibles
2-3 leaks concrets observés (avec exemples de mains spécifiques)

## Style de jeu
Un paragraphe de 3-4 phrases décrivant le profil global de ML.Aspek

## Priorités d'amélioration
3 points classés par ordre d'impact :
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
      model: 'claude-sonnet-4-20250514',
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

    // Parse et sauvegarde chaque main individuellement
    // Format attendu : [POSITION] [CARTES] — ✅/⚠️/❌ ...
    const lines = text.split('\n')
    const handRecords: AnalysisInsert[] = []

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      // Match les lignes d'analyse de main
      const match = line.match(/\[([^\]]+)\]\s*\[([^\]]+)\]\s*[—-]\s*(✅|⚠️|❌)(.+)/)
      if (!match) continue

      const position = match[1].trim()
      const cards = match[2].trim()
      const verdictEmoji = match[3].trim()
      const explanation = match[4].trim()

      // Retrouve la main correspondante dans le tableau hands
      const handIndex = handRecords.length
      const hand = hands[handIndex]

      handRecords.push({
        hand_id: hand?.handId || `hand-${i}`,
        cards,
        position,
        level: hand?.level || '',
        result: hand?.result || '',
        verdict: verdictEmoji,
        analysis_text: explanation,
        raw_hand: hand?.rawText || '',
        is_global: false
      })
    }

    if (handRecords.length > 0) {
      await supabase.from('analyses').insert(handRecords)
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
