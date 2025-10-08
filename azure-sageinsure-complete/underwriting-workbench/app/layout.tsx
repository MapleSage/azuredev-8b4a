import './globals.css'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'SageInsure Underwriting Workbench',
  description: 'AI-Powered Document Analysis & Risk Assessment Platform',
  icons: {
    icon: '/sageinsure_favion.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}