import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const client = new Anthropic()

const SYSTEM_PROMPT = `Tu es un coach poker expert en MTT No Limit Hold'em. Tu analyses les historiques de mains Winamax et donnes des feedbacks précis en français.

Le joueur analysé s'appelle ML.Aspek. Analyse TOUTES les mains avec la même rigueur, qu'elles soient gagnées ou perdues. Une main gagnée peut cacher une mauvaise décision — le résultat ne valide pas le processus. Une main perdue peut être parfaitement jouée.

Sois direct et honnête. Juge le PROCESSUS, pas le résultat :
- Si une décision est correcte mais a mal tourné → dis-le
- Si une décision est mauvaise mais a bien tourné → dis-le clairement
- Ne dis jamais "cooler" si c'était une erreur du joueur
- Ne valide pas une mauvaise décision parce que ML.Aspek a gagné le pot

Structure ta réponse avec ces sections markdown :

## Contexte
Position de ML.Aspek, sa main, les stacks approximatifs en BB, le format.

## Préflop
Évalue chaque décision avant le flop. C'était conforme à sa range par position ? Les sizings étaient corrects ? Si ML.Aspek a gagné sans rien faire (fold général), dis juste si l'open/la défense était correcte.

## Post-flop
(Si applicable) Évalue les c-bets, checks, calls, raises street par street.

## Verdict
Une ligne : ✅ Bien joué / ⚠️ Borderline / ❌ Erreur claire
Puis 2-3 phrases résumant la décision principale et son impact réel sur ses chips.

## À retenir
Un seul conseil actionnable très court (max 2 phrases).`

export async function POST(req: NextRequest) {
  try {
    const { handHistory, handContext } = await req.json()
    if (!handHistory?.trim()) {
      return NextResponse.json({ error: "Colle un historique de main avant d'analyser." }, { status: 400 })
    }
    const ctx = handContext ?? { stackBB: 0, opponentAction: 'inconnu', heroAction: 'inconnu', potSize: 'inconnu' }
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1200,
      system: SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: `Analyse cette main Winamax :

Stack ML.Aspek au départ : ${ctx.stackBB}BB
Action adverse préflop : ${ctx.opponentAction}
Action ML.Aspek préflop : ${ctx.heroAction}
Pot final : ${ctx.potSize}

Historique complet :
${handHistory}`,
      }],
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
