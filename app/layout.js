import RootClient from '../components/RootClient'
import { APP_NAME, APP_DESCRIPTION } from '../lib/constants'
import './globals.css'

export const metadata = {
  title: `${APP_NAME} — Student Portal`,
  description: APP_DESCRIPTION,
  manifest: '/manifest.webmanifest',
  applicationName: APP_NAME,
  icons: {
    icon: '/icons/icon.svg',
    apple: '/icons/icon.svg',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: APP_NAME,
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#f4f5fb',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <RootClient>{children}</RootClient>
      </body>
    </html>
  )
}
