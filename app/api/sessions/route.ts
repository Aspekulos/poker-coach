import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Date de session (jour UTC) — équivalent de DATE(played_at) côté Postgres,
// dont le timezone par défaut est UTC.
function utcDate(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
}

export async function GET() {
  try {
    // Équivalent de :
    //   SELECT DATE(played_at) AS session_date, COUNT(*) AS hands_count
    //   FROM analyses WHERE is_global = false
    //   GROUP BY DATE(played_at) ORDER BY session_date DESC
    // (agrégation en JS car le client Supabase ne fait pas de GROUP BY)
    const { data, error } = await supabase
      .from('analyses')
      .select('played_at')
      .eq('is_global', false)

    if (error) {
      return NextResponse.json({ error: `Supabase: ${error.message}` }, { status: 500 })
    }

    const counts: Record<string, number> = {}
    for (const r of data ?? []) {
      if (!r.played_at) continue
      const key = utcDate(r.played_at as string)
      counts[key] = (counts[key] ?? 0) + 1
    }

    const sessions = Object.entries(counts)
      .map(([session_date, hands_count]) => ({ session_date, hands_count }))
      .sort((a, b) => b.session_date.localeCompare(a.session_date))

    return NextResponse.json(sessions)
  } catch (e) {
    console.error(e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}
