import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const client = new Anthropic()

const SYSTEM_PROMPT = `Tu es un coach poker expert en MTT No Limit Hold'em. Tu analyses les historiques de mains Winamax et donnes des feedbacks précis en français.

Le joueur analysé s'appelle ML.Aspek. Sois direct et honnête — si une décision est mauvaise, dis-le clairement avec une explication précise. Ne dis pas "cooler" si c'était une erreur du joueur. Ne valide pas une mauvaise décision juste parce que le résultat était bon. Analyse le PROCESSUS, pas le résultat.

Structure ta réponse avec ces sections markdown :

## Contexte
Position de ML.Aspek, sa main, les stacks approximatifs en BB, le format du tournoi.

## Préflop
Évalue chaque décision de ML.Aspek avant le flop. C'était conforme à sa range par position ? Les sizings étaient corrects (open, 3-bet, 4-bet, fold face à un 5-bet) ?

## Flop
(Si applicable) Évalue le c-bet ou check, le call ou fold. Explique pourquoi c'était optimal ou non selon la texture du board et sa position.

## Turn
(Si applicable) Même analyse. La décision a-t-elle du sens face à la range adverse ?

## River
(Si applicable) Même analyse.

## Verdict
Une ligne : ✅ Bien joué / ⚠️ Borderline / ❌ Erreur claire
Puis 2-3 phrases résumant la décision principale et son impact chips.

## À retenir
Un seul conseil actionnable très court (max 2 phrases).`

export async function POST(req: NextRequest) {
  try {
    const { handHistory } = await req.json()
    if (!handHistory?.trim()) {
      return NextResponse.json({ error: "Colle un historique de main avant d'analyser." }, { status: 400 })
    }
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1200,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: `Analyse cette main Winamax :\n\n${handHistory}` }],
    })
    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    return NextResponse.json({ analysis: text })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Erreur API. Vérifie que ANTHROPIC_API_KEY est dans .env.local' },
      { status: 500 },
    )
  }
}
