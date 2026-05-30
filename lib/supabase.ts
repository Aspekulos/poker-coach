import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

export interface AnalysisRecord {
  id?: string
  created_at?: string
  hand_id: string
  cards: string
  position: string
  level: string
  result: string
  verdict: string        // '✅' | '⚠️' | '❌' | 'global'
  analysis_text: string
  raw_hand: string
  is_global: boolean
}

export async function saveAnalysis(record: AnalysisRecord) {
  const { error } = await supabase.from('analyses').insert(record)
  if (error) console.error('Supabase save error:', error)
}

export async function getAnalysisHistory(): Promise<AnalysisRecord[]> {
  const { data, error } = await supabase
    .from('analyses')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200)
  if (error) { console.error(error); return [] }
  return data || []
}
