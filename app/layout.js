'use client'
import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { App } from '@capacitor/app'
import { StatusBar, Style } from '@capacitor/status-bar'
import './globals.css'

export default function RootLayout({ children }) {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // 1. Status Bar Setup
    const setStatus = async () => {
      try {
        await StatusBar.setBackgroundColor({ color: '#0f172a' });
        await StatusBar.setStyle({ style: Style.Dark });
      } catch (e) { console.log("Running in Web Mode") }
    };
    setStatus();
  }, []);

  useEffect(() => {
    // 2. Hardware Back Button Listener (Mobile)
    const setupListener = async () => {
      const backListener = await App.addListener('backButton', () => {
        if (pathname === '/' || pathname === '/login') {
          App.exitApp();
        } else {
          router.back();
        }
      });
      return backListener;
    };

    const listenerPromise = setupListener();

    return () => {
      listenerPromise.then(l => l.remove());
    };
  }, [pathname, router]);

  return (
    <html lang="en">
      <body className="bg-[#0f172a] text-slate-200 min-h-screen pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
        {children}
      </body>
    </html>
  )
}