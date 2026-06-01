import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'

const client = new Anthropic()

type Role = 'user' | 'assistant'

interface ChatMessage {
  role: Role
  content: string
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
    const cleaned = messages
      .filter(m => m && typeof m.content === 'string' && m.content.trim() !== '')
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
      model: 'claude-sonnet-4-20250514',
      max_tokens: 800,
      system,
      messages: cleaned,
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
