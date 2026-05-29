import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Poker Coach',
  description: 'Entraînement poker MTT — Ranges, Push/Fold, Trainer, Equity',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body style={{ background: '#0f0f0f' }}>{children}</body>
    </html>
  )
}
