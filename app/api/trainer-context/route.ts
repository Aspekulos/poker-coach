import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const client = new Anthropic()
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface Leak {
  title?: string
  description?: string
  severity?: string
}

interface PositionEntry {
  score?: number
  verdict?: string
  key_note?: string
}

interface CoachProfileJson {
  priority_leaks?: Leak[]
  position_analysis?: Record<string, PositionEntry>
}

export async function GET() {
  try {
    // 1) Dernier profil Coach généré
    const { data: row, error } = await supabase
      .from('coach_profiles')
      .select('profile_json')
      .order('generated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: `Supabase: ${error.message}` }, { status: 500 })
    }

    if (!row) {
      return NextResponse.json({ error: "Génère d'abord ton profil Coach" }, { status: 404 })
    }

    const profile = (row.profile_json ?? {}) as CoachProfileJson

    // 2) Extraction des leaks et des positions faibles (score < 80%)
    const leaks = Array.isArray(profile.priority_leaks) ? profile.priority_leaks : []
    const leaksText =
      leaks
        .map(l => `${l.title ?? '?'}${l.description ? ` (${l.description})` : ''}`)
        .join(' ; ') || 'aucun leak identifié'

    const weakPositions = Object.entries(profile.position_analysis ?? {}).filter(
      ([, p]) => typeof p.score === 'number' && p.score < 80
    )
    const weakText =
      weakPositions
        .map(([pos, p]) => `${pos} (${p.score}%${p.verdict ? ` — ${p.verdict}` : ''})`)
        .join(' ; ') || 'aucune position particulièrement faible'

    // 3) Prompt système ciblé sur les vraies erreurs du joueur
    const systemPrompt = `Tu es coach poker MTT. Génère 5 questions de quiz ciblées sur les vraies erreurs de ce joueur.
Ses leaks : ${leaksText}. Ses positions faibles : ${weakText}.
Retourne UNIQUEMENT un JSON array de 5 objets :
[{ question: string, options: string[4], correct: 0-3, explanation: string, position: string, topic: string }]
Les questions doivent être concrètes, avec des situations réelles (ex: 'Tu es BB à 18BB, UTG shove, tu as J9s. Action ?').
topic = le leak ciblé (ex: 'all-in avec mains faibles', 'limp EP/MP').`

    // 4) Appel Claude
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: 'user', content: 'Génère le quiz ciblé maintenant.' }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''

    // 5) Parse robuste du JSON array (tolère fences / texte parasite)
    let raw = text.trim()
    const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (fence) raw = fence[1].trim()
    const start = raw.indexOf('[')
    const end = raw.lastIndexOf(']')
    if (start !== -1 && end !== -1) raw = raw.slice(start, end + 1)

    let questions: unknown
    try {
      questions = JSON.parse(raw)
    } catch {
      return NextResponse.json(
        { error: "La réponse de l'IA n'était pas un JSON valide. Réessaie." },
        { status: 500 }
      )
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json(
        { error: "L'IA n'a renvoyé aucune question. Réessaie." },
        { status: 500 }
      )
    }

    return NextResponse.json(questions)
  } catch (e) {
    console.error(e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}
