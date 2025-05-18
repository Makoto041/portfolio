import '../global.css'
import type { Metadata } from 'next'
import React from 'react'
import SideNav from '@/components/SideNav'
import MobileHeader from '@/components/MobileHeader'

export const metadata: Metadata = {
  title: 'Iwabuchi – Timeline',
  description: 'Personal timeline powered by Payload & Next.js',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" suppressHydrationWarning className="dark:text-zinc-50">
      <head>
        <meta name="color-scheme" content="light dark" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(()=>{try{if(matchMedia('(prefers-color-scheme:dark)').matches)
              document.documentElement.classList.add('dark')}catch(e){}})()`,
          }}
        />
      </head>

      <body className="antialiased overflow-x-hidden bg-[color:var(--bg)] text-[color:var(--text)]">
        {/* ── Mobile header ─────────────────── */}
        <MobileHeader />

        {/* ── Desktop layout ― side + main ── */}
        <div className="flex">
          <SideNav />

          <main className="flex-1 min-h-screen">{children}</main>
        </div>
      </body>
    </html>
  )
}
