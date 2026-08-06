'use client'
import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { App } from '@capacitor/app'
import { StatusBar, Style } from '@capacitor/status-bar'
import { initTheme } from './ui/ThemeToggle'

/**
 * Client-side application shell: theme bootstrap, native status bar,
 * and hardware back-button handling. Wraps route content inside the
 * server root layout.
 */
export default function RootClient({ children }) {
  const router = useRouter()
  const pathname = usePathname()

  // Apply saved theme before paint to avoid a flash of the wrong theme
  useEffect(() => {
    initTheme()
  }, [])

  useEffect(() => {
    // Status Bar Setup — adapts to the applied theme
    const setStatus = async () => {
      try {
        const isDark = document.documentElement.classList.contains('dark')
        await StatusBar.setBackgroundColor({ color: isDark ? '#0a0e1f' : '#f4f5fb' });
        await StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light });
      } catch (e) {
        // Running in web mode — StatusBar not available
      }
    };
    setStatus();

    // Keep the native status bar in sync when the theme changes
    window.addEventListener('themechange', setStatus);
    return () => window.removeEventListener('themechange', setStatus);
  }, []);

  useEffect(() => {
    // Hardware Back Button
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

  return <>{children}</>;
}
