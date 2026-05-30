import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const client = new Anthropic()

const SYSTEM_PROMPT = `Tu es un coach poker expert en MTT No Limit Hold'em.
Tu reçois un ensemble de mains jouées par ML.Aspek et tu dois produire une analyse
complète de son style de jeu en français.

Sois direct et honnête. Juge le PROCESSUS, pas les résultats.
Une main gagnée avec une mauvaise décision = mauvaise décision.

Structure ta réponse EXACTEMENT comme suit :

## Analyse par main

Pour chaque main, une ligne :
[Position] [Cartes] — ✅ Bien joué / ⚠️ Borderline / ❌ Erreur + une phrase max d'explication

## Points forts
2-3 points concrets observés dans ces mains (avec exemples de mains spécifiques)

## Points faibles
2-3 leaks concrets observés (avec exemples de mains spécifiques)

## Style de jeu
Un paragraphe de 3-4 phrases décrivant le profil global de ML.Aspek
(agressif/passif, loose/tight, tendances préflop/postflop, gestion du stack)

## Priorités d'amélioration
3 points classés par ordre d'impact, avec une action concrète pour chacun.
Format :
1. [Problème] → [Action concrète]
2. [Problème] → [Action concrète]
3. [Problème] → [Action concrète]`

export async function POST(req: NextRequest) {
  try {
    const { hands } = await req.json()
    if (!hands?.length) {
      return NextResponse.json({ error: 'Aucune main à analyser.' }, { status: 400 })
    }

    const handsText = hands.map((h: {
      rawText: string
      myPosition?: string
      myCards?: string
      stackBB?: number
      opponentAction?: string
      heroAction?: string
    }, i: number) =>
      `--- MAIN ${i + 1} [${h.myPosition}] [${h.myCards}] | Stack: ${h.stackBB}BB | Adverse: ${h.opponentAction} | ML.Aspek: ${h.heroAction} ---\n${h.rawText}`
    ).join('\n\n')

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 3000,
      system: SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: `Voici ${hands.length} mains de ML.Aspek à analyser :\n\n${handsText}`
      }]
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    return NextResponse.json({ analysis: text })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erreur API.' }, { status: 500 })
  }
}
