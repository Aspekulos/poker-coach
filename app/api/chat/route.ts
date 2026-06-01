import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'

const client = new Anthropic()

type Role = 'user' | 'assistant'

type ContentBlock =
  | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } }
  | { type: 'text'; text: string }

interface ChatMessage {
  role: Role
  content: string | ContentBlock[]
}

interface ChatBody {
  messages: ChatMessage[]
  playerProfile: string
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<ChatBody>
    const messages = Array.isArray(body.messages) ? body.messages : []
    const playerProfile = typeof body.playerProfile === 'string' ? body.playerProfile : 'Profil non disponible.'

    // On ne garde que les messages exploitables et on coerce les rôles.
    // Le contenu peut être une string OU un tableau de blocs Anthropic (image + texte).
    const cleaned = messages
      .filter(m => {
        if (!m) return false
        if (typeof m.content === 'string') return m.content.trim() !== ''
        return Array.isArray(m.content)
      })
      .map<ChatMessage>(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      }))

    if (cleaned.length === 0) {
      return NextResponse.json({ error: 'Aucun message à envoyer.' }, { status: 400 })
    }

    const system = `Tu es un coach poker expert. Tu tutoies le joueur (ML.Aspek).
Voici son profil : ${playerProfile}
Réponds en français, de façon concise et directe.
Tu peux analyser des mains si le joueur les décrit.`

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 800,
      system,
      messages: cleaned as Anthropic.MessageParam[],
    })

    const reply = response.content[0]?.type === 'text' ? response.content[0].text : ''

    return NextResponse.json({ reply })
  } catch (e) {
    console.error(e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}
