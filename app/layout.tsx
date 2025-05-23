import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ImageFlow',
  description: 'Created by Gelso',
  generator: 'Gelso',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
