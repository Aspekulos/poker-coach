import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const VALID_TYPES = ['KO', 'Classic', 'Rebuy', 'Autre']

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('tournaments')
      .select('*')
      .order('played_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: `Supabase: ${error.message}` }, { status: 500 })
    }

    return NextResponse.json(data ?? [])
  } catch (e) {
    console.error(e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { played_at, tournament_name, buy_in, total_players, position, gain, type, notes } = body

    // Validation : played_at, buy_in et position sont requis.
    const buyInNum = Number(buy_in)
    const positionNum = Number(position)
    if (
      !played_at ||
      buy_in === undefined || buy_in === null || buy_in === '' || Number.isNaN(buyInNum) ||
      position === undefined || position === null || position === '' || Number.isNaN(positionNum)
    ) {
      return NextResponse.json(
        { error: 'Les champs date, buy-in et position finale sont requis.' },
        { status: 400 }
      )
    }

    const tournamentType = VALID_TYPES.includes(type) ? type : 'KO'
    const totalPlayersNum =
      total_players === undefined || total_players === null || total_players === ''
        ? null
        : Number(total_players)
    const gainNum =
      gain === undefined || gain === null || gain === '' ? 0 : Number(gain)

    const insert = {
      played_at,
      tournament_name: tournament_name?.trim() || null,
      buy_in: buyInNum,
      total_players: totalPlayersNum !== null && !Number.isNaN(totalPlayersNum) ? totalPlayersNum : null,
      position: positionNum,
      gain: Number.isNaN(gainNum) ? 0 : gainNum,
      type: tournamentType,
      notes: notes?.trim() || null,
    }

    const { data, error } = await supabase
      .from('tournaments')
      .insert(insert)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: `Supabase: ${error.message}` }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (e) {
    console.error(e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}
