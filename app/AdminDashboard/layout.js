'use client'
import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter, usePathname } from 'next/navigation'
import ThemeToggle from '../../components/ui/ThemeToggle'
import Modal from '../../components/ui/Modal'
import { ADMIN_EMAIL, ADMIN_NAV } from '../../lib/constants'

export default function AdminLayout({ children }) {
  const router = useRouter()
  const pathname = usePathname()
  const [loading, setLoading] = useState(true)
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  const getPageTitle = () => {
    const p = pathname.toLowerCase();
    if (p.includes('faculty')) return { main: "Faculty Management", sub: "Manage Instructors" };
    if (p.includes('studentlist')) return { main: "Student Directory", sub: "Authorized Access" };
    if (p.includes('subjects')) return { main: "Subject Matrix", sub: "Academic Records" };
    if (p.includes('results')) return { main: "Evaluation Results", sub: "Performance Data" };
    if (p.includes('logs')) return { main: "System Activity", sub: "Audit Trails & Logs" };
    return { main: "Main Dashboard", sub: "Overview & Performance" };
  }

  const navigateTo = (path) => {
    router.push(path);
    if (window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  };

  const isLinkActive = (path) => {
    const currentPath = pathname.toLowerCase();
    const targetPath = path.toLowerCase();
    if (targetPath === '/admindashboard') {
      return currentPath === '/admindashboard' || currentPath === '/admindashboard/';
    }
    return currentPath.includes(targetPath.split('/').pop().toLowerCase());
  };

  const handleLogout = async () => {
    await supabase.auth.signOut()
    sessionStorage.removeItem("adminSession");
    router.replace('/');
  };

  useEffect(() => {
    let cancelled = false;

    const authenticate = async () => {
      const localSession = sessionStorage.getItem("adminSession")
      if (localSession) {
        try {
          const sessionData = JSON.parse(localSession)
          if (sessionData.email?.toLowerCase() === ADMIN_EMAIL) {
            if (!cancelled) setLoading(false)
            return
          }
        } catch (err) {}
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (cancelled) return

      if (session && session.user.email?.toLowerCase() === ADMIN_EMAIL) {
        sessionStorage.setItem("adminSession", JSON.stringify({ email: session.user.email }))
        setLoading(false)
      } else {
        router.replace('/')
      }
    }

    authenticate()
    return () => { cancelled = true }
  }, [router]);

  if (loading) return (
    <div className="min-h-screen page-bg flex items-center justify-center">
      <div className="flex items-center gap-3 text-indigo-600 dark:text-indigo-400 text-xs font-bold uppercase tracking-[0.3em]">
        <div className="relative w-6 h-6">
          <div className="absolute inset-0 border-[2.5px] border-indigo-500/10 rounded-full" />
          <div className="absolute inset-0 border-[2.5px] border-transparent border-t-indigo-600 dark:border-t-indigo-400 rounded-full animate-spin" />
        </div>
        Authenticating Admin...
      </div>
    </div>
  );

  const pageTitle = getPageTitle();

  return (
    <div className="min-h-screen page-bg dark:bg-[#0a0e1f] flex font-sans overflow-hidden">

      {/* SIDEBAR OVERLAY — premium glass blur */}
      <div
        className={`fixed inset-0 bg-slate-900/30 dark:bg-black/50 backdrop-blur-xl transition-opacity duration-300 md:hidden ${
          isSidebarOpen ? 'opacity-100 z-[100]' : 'opacity-0 pointer-events-none z-0'
        }`}
        onClick={() => setIsSidebarOpen(false)}
      />

      {/* SIDEBAR — glass morphism */}
      <aside className={`
        fixed inset-y-0 left-0 w-72 flex flex-col
        bg-white/80 dark:bg-[#0f1530]/85
        backdrop-blur-2xl saturate-150
        border-r border-slate-200/60 dark:border-indigo-500/8
        transition-transform duration-300 ease-out z-[110]
        md:relative md:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Brand header */}
        <div className="p-7 pr-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl brand-gradient flex items-center justify-center text-white shadow-lg shadow-indigo-500/25">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19l-7-3V9l7-3 7 3v7l-7 3z" /><path d="M9 12v3m6-3v3M9 12V9m6 3V9" /></svg>
            </div>
            <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">Admin<span className="text-gradient">Panel</span></h1>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-2.5 bg-slate-100 dark:bg-slate-800/60 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Separator */}
        <div className="separator-line mx-5" />

        {/* Navigation */}
        <nav className="flex-1 px-4 pt-4 pb-2 space-y-1 overflow-y-auto scrollbar-thin">
          <p className="overline px-4 pb-2 pt-1">Navigation</p>
          {ADMIN_NAV.map(item => (
            <SidebarLink key={item.path} icon={item.icon} label={item.label} active={isLinkActive(item.path)} onClick={() => navigateTo(item.path)} />
          ))}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-slate-100/60 dark:border-indigo-500/8">
          <button
            onClick={() => setShowLogoutModal(true)}
            className="w-full px-4 py-3.5 bg-rose-50 dark:bg-rose-500/8 hover:bg-rose-100 dark:hover:bg-rose-500/15 text-rose-600 dark:text-rose-400 rounded-xl font-bold text-xs uppercase tracking-wider transition-all active:scale-[0.97] border border-rose-100 dark:border-rose-500/10"
          >
            Logout Session
          </button>
        </div>
      </aside>

      {/* MAIN LAYOUT */}
      <main className="flex-1 relative overflow-hidden flex flex-col min-w-0">
        {/* Mobile header — glass */}
        <header className="md:hidden flex items-center justify-between p-5 bg-white/70 dark:bg-[#0a0e1f]/70 backdrop-blur-xl border-b border-slate-200/60 dark:border-indigo-500/8 sticky top-0 z-[40]">
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white leading-none">{pageTitle.main}</h2>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider mt-1">{pageTitle.sub}</p>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-3 bg-white dark:bg-slate-800/60 rounded-xl text-indigo-600 dark:text-indigo-300 border border-slate-200 dark:border-slate-700/60 shadow-md active:scale-95 transition-all relative z-[50]"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16m-7 6h7" /></svg>
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto relative">
          {children}
        </div>
      </main>

      {/* LOGOUT MODAL */}
      <Modal open={showLogoutModal} onClose={() => setShowLogoutModal(false)}>
        <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mb-2">End admin session?</h3>
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-8 leading-relaxed">Confirm to log out of the admin panel.</p>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => setShowLogoutModal(false)} className="btn btn-ghost py-3.5 text-sm font-bold">Cancel</button>
          <button onClick={handleLogout} className="btn btn-primary py-3.5 text-sm font-bold">Yes, Logout</button>
        </div>
      </Modal>
    </div>
  )
}

function SidebarLink({ icon, label, onClick, active = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl transition-all duration-200 group magnetic ${
        active
          ? 'brand-gradient text-white shadow-lg shadow-indigo-500/25'
          : 'text-slate-400 dark:text-slate-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/8 hover:text-indigo-600 dark:hover:text-indigo-300 cursor-pointer'
      }`}
    >
      <svg className={`w-5 h-5 transition-colors ${active ? 'text-white' : 'text-slate-400 dark:text-slate-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d={icon} />
      </svg>
      <span className="text-[12px] font-bold">{label}</span>
      {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white/70" />}
    </button>
  )
}
