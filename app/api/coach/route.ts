import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const client = new Anthropic()
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface AnalysisRow {
  position: string | null
  cards: string | null
  verdict: string | null
  analysis_text: string | null
  level: string | null
}

interface PosStat {
  total: number
  ok: number
  warning: number
  error: number
  score: number
}

const SYSTEM_PROMPT = `Tu es un coach poker expert en MTT No Limit Hold'em KO/bounty.
On te fournit les statistiques de jeu de ML.Aspek par position et le détail de ses mains
(les erreurs, les coups borderline, et quelques bons coups).

Tu dois produire un profil de coaching personnalisé.

RÈGLES STRICTES :
- Réponds UNIQUEMENT avec du JSON valide. Pas de backticks, pas de markdown, pas de texte avant ou après. Juste l'objet JSON brut.
- Langage de coach, simple et accessible. Évite le jargon ("GTO", "EV", "ICM", "equity") sans l'expliquer.
- position_analysis : une entrée UNIQUEMENT pour les positions présentes dans les données fournies.
- Toutes les valeurs textuelles sont en français.

Structure EXACTE attendue :

{
  "style": "string (ex: Tight-Passif)",
  "style_description": "string (2-3 phrases sur le style de jeu)",
  "global_score": 0,
  "strengths": ["point fort 1", "point fort 2", "point fort 3"],
  "priority_leaks": [
    { "title": "string", "description": "string", "severity": "high" }
  ],
  "position_analysis": {
    "EP": { "score": 0, "verdict": "string court", "key_note": "string" }
  },
  "tournament_strategy": {
    "early": { "title": "Début (>30BB)", "strategy": "string" },
    "middle": { "title": "Milieu (15-30BB)", "strategy": "string" },
    "bubble": { "title": "Bubble", "strategy": "string" },
    "final_table": { "title": "Table finale", "strategy": "string" },
    "short_stack": { "title": "Short stack (<15BB)", "strategy": "string" }
  },
  "personalized_strategy": "string (paragraphe de stratégie globale personnalisée)",
  "priority_actions": ["action 1", "action 2", "action 3"]
}

priority_leaks : exactement les 3 leaks les plus importants, classés par priorité, severity ∈ "high"|"medium"|"low".
strengths : exactement 3 points forts. priority_actions : exactement 3 actions concrètes applicables tout de suite.`

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams
    const force = params.get('force') === 'true'
    // cacheOnly : renvoie le profil en cache s'il existe, sinon une erreur —
    // sans jamais déclencher de génération Claude (utilisé à l'auto-chargement).
    const cacheOnly = params.get('cacheOnly') === 'true'

    // 1) Nombre de mains individuelles actuelles
    const { count, error: countError } = await supabase
      .from('analyses')
      .select('*', { count: 'exact', head: true })
      .eq('is_global', false)

    if (countError) {
      return NextResponse.json({ error: `Supabase: ${countError.message}` }, { status: 500 })
    }

    const handsCount = count ?? 0
    if (handsCount === 0) {
      return NextResponse.json(
        { error: "Aucune main analysée pour l'instant. Analyse quelques mains avant de générer ton profil." },
        { status: 500 }
      )
    }

    // 2) Cache : un profil existe-t-il déjà pour ce même nombre de mains ?
    //    Si oui et que force n'est pas demandé, on renvoie directement le cache
    //    sans rappeler Claude.
    if (!force) {
      const { data: cached } = await supabase
        .from('coach_profiles')
        .select('profile_json, generated_at')
        .eq('hands_count', handsCount)
        .order('generated_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (cached) {
        return NextResponse.json({
          ...(cached.profile_json as Record<string, unknown>),
          cached: true,
          generated_at: cached.generated_at,
        })
      }

      // Pas de cache pour ce nombre de mains : en mode cacheOnly on s'arrête
      // ici (pas d'appel Claude).
      if (cacheOnly) {
        return NextResponse.json({ error: 'Aucun profil en cache.' }, { status: 404 })
      }
    }

    // 3) (Re)génération : récupère le détail des analyses individuelles
    const { data, error } = await supabase
      .from('analyses')
      .select('position, cards, verdict, analysis_text, level')
      .eq('is_global', false)

    if (error) {
      return NextResponse.json({ error: `Supabase: ${error.message}` }, { status: 500 })
    }

    const rows: AnalysisRow[] = data ?? []
    if (rows.length === 0) {
      return NextResponse.json(
        { error: "Aucune main analysée pour l'instant. Analyse quelques mains avant de générer ton profil." },
        { status: 500 }
      )
    }

    // b) Stats par position
    const byPos: Record<string, PosStat> = {}
    for (const r of rows) {
      const pos = (r.position ?? '').trim().toUpperCase()
      if (!pos) continue
      if (!byPos[pos]) byPos[pos] = { total: 0, ok: 0, warning: 0, error: 0, score: 0 }
      const s = byPos[pos]
      s.total++
      if (r.verdict === '✅') s.ok++
      else if (r.verdict === '⚠️') s.warning++
      else if (r.verdict === '❌') s.error++
    }
    for (const pos of Object.keys(byPos)) {
      const s = byPos[pos]
      s.score = s.total > 0 ? Math.round(((s.ok + s.warning * 0.5) / s.total) * 100) : 0
    }

    // c) Construction du prompt
    const statsLines = Object.entries(byPos)
      .map(([pos, s]) => `${pos} : ${s.total} mains — score ${s.score}% (✅ ${s.ok} / ⚠️ ${s.warning} / ❌ ${s.error})`)
      .join('\n')

    const fmt = (r: AnalysisRow) =>
      `[${r.position ?? '?'}] [${r.cards ?? '?'}]${r.level ? ` (${r.level})` : ''} — ${r.analysis_text ?? ''}`

    const problems = rows
      .filter(r => r.verdict === '⚠️' || r.verdict === '❌')
      .map(fmt)
      .join('\n')

    const goodMoves = rows
      .filter(r => r.verdict === '✅')
      .slice(0, 5)
      .map(fmt)
      .join('\n')

    const userContent = `Statistiques par position :
${statsLines}

Mains à problème (borderline ⚠️ et erreurs ❌) :
${problems || 'Aucune.'}

Exemples de bons coups (✅, max 5) :
${goodMoves || 'Aucun.'}

Produis le profil de coaching JSON.`

    // d) Appel Claude
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 3000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userContent }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''

    // e) Parse du JSON renvoyé par Claude (robuste aux fences éventuels)
    let raw = text.trim()
    const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (fence) raw = fence[1].trim()
    const start = raw.indexOf('{')
    const end = raw.lastIndexOf('}')
    if (start !== -1 && end !== -1) raw = raw.slice(start, end + 1)

    let profile: Record<string, unknown>
    try {
      profile = JSON.parse(raw)
    } catch {
      return NextResponse.json(
        { error: "La réponse de l'IA n'était pas un JSON valide. Réessaie." },
        { status: 500 }
      )
    }

    // 4) Mise en cache : insère le profil avec le nombre de mains courant.
    const { data: inserted, error: insertError } = await supabase
      .from('coach_profiles')
      .insert({ profile_json: profile, hands_count: handsCount })
      .select('generated_at')
      .single()

    if (insertError) console.error('coach_profiles insert error:', insertError)

    return NextResponse.json({
      ...profile,
      cached: false,
      generated_at: inserted?.generated_at ?? new Date().toISOString(),
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}
