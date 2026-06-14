import { Geist, Geist_Mono } from "next/font/google"

import "./globals.css"
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'})

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export const metadata = {
  title: "Dashboard CIEX",
  description: "Análise de impacto",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={cn("antialiased", fontMono.variable, "font-sans", geist.variable)}
    >
      <body suppressHydrationWarning className="min-h-screen font-sans">
        {children}
      </body>
    </html>
  )
}
