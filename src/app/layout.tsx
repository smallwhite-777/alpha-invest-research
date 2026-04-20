import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { ThemeProvider } from "next-themes"
import { TooltipProvider } from "@/components/ui/tooltip"
import { TopBar } from "@/components/layout/TopBar"
import { Sidebar } from "@/components/layout/Sidebar"
import { getSiteOrigin } from "@/lib/site"
import "./globals.css"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "OPENINVEST - Investment Intelligence",
  description: "OpenInvest investment intelligence platform",
  metadataBase: getSiteOrigin(),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: "OPENINVEST - Investment Intelligence",
    description: "OpenInvest investment intelligence platform",
    url: '/',
    siteName: "OPENINVEST",
    locale: "zh_CN",
    type: "website",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <TooltipProvider>
            <div className="flex h-screen flex-col overflow-hidden">
              <TopBar />
              <div className="flex flex-1 overflow-hidden">
                <Sidebar />
                <main className="flex-1 overflow-hidden">
                  {children}
                </main>
              </div>
            </div>
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
