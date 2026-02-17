'use client'
import React, { useState, useEffect } from 'react'
import { auth } from '../../lib/firebase'
import { useRouter, usePathname } from 'next/navigation'
import { onAuthStateChanged, signOut } from 'firebase/auth'

export default function AdminLayout({ children }) {
  const router = useRouter()
  const pathname = usePathname()
  const [loading, setLoading] = useState(true)
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [toast, setToast] = useState({ show: false, message: '' })
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  // 1. Dynamic Title Helper (Updated for Logs)
  const getPageTitle = () => {
    const p = pathname.toLowerCase();
    if (p.includes('faculty')) return { main: "Faculty Management", sub: "Manage Instructors" };
    if (p.includes('studentlist')) return { main: "Student Directory", sub: "Authorized Access" };
    if (p.includes('subjects')) return { main: "Subject Matrix", sub: "Academic Records" };
    if (p.includes('results')) return { main: "Evaluation Results", sub: "Performance Data" };
    if (p.includes('logs')) return { main: "System Activity", sub: "Audit Trails & Logs" };
    return { main: "Main Dashboard", sub: "Overview & Performance" };
  }

  // 2. Navigation Handler
  const navigateTo = (path) => {
    router.push(path);
    if (window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  };

  // 3. Highlight Logic
  const isLinkActive = (path) => {
    const currentPath = pathname.toLowerCase();
    const targetPath = path.toLowerCase();
    if (targetPath === '/admindashboard') {
      return currentPath === '/admindashboard' || currentPath === '/admindashboard/';
    }
    return currentPath.includes(targetPath.split('/').pop().toLowerCase());
  };

  const triggerToast = (msg) => {
    setToast({ show: true, message: msg })
    setTimeout(() => setToast({ show: false, message: '' }), 2500)
  };

  const handleLogout = async () => {
    await signOut(auth);
    router.replace('/');
  };

  // 4. Auth Guard
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && user.email?.toLowerCase() === "admintest@gmail.com") {
        setLoading(false)
      } else {
        router.replace('/')
      }
    });
    return () => unsubscribe();
  }, [router]);

  if (loading) return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
      <div className="text-center font-bold text-indigo-400 uppercase tracking-[0.3em] animate-pulse">Authenticating Admin...</div>
    </div>
  );

  const pageTitle = getPageTitle();

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 flex font-sans overflow-hidden">
      
      {/* SIDEBAR OVERLAY */}
      <div 
        className={`fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity duration-300 md:hidden ${
          isSidebarOpen ? 'opacity-100 z-[100]' : 'opacity-0 pointer-events-none z-0'
        }`} 
        onClick={() => setIsSidebarOpen(false)} 
      />

      {/* SIDEBAR */}
      <aside className={`
        fixed inset-y-0 left-0 w-72 bg-slate-900 border-r border-white/5 flex flex-col 
        transition-transform duration-300 ease-in-out z-[110]
        md:relative md:translate-x-0 
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-8 pr-4 flex items-center justify-between">
          <h1 className="text-2xl font-black tracking-tighter text-white uppercase italic">ADMIN<span className="text-indigo-500">Panel</span></h1>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-3 bg-white/5 rounded-xl text-slate-400">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
          <SidebarLink 
            icon="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" 
            label="Dashboard" 
            active={isLinkActive('/AdminDashboard')} 
            onClick={() => navigateTo('/AdminDashboard')} 
          />
          <SidebarLink 
            icon="M16 7a4 4 0 11-8 0 4 4 0 018 0z" 
            label="Faculty" 
            active={isLinkActive('Faculty')} 
            onClick={() => navigateTo('/AdminDashboard/Faculty')} 
          />
          <SidebarLink 
            icon="M12 14l9-5-9-5-9 5 9 5z" 
            label="Students" 
            active={isLinkActive('StudentList')} 
            onClick={() => navigateTo('/AdminDashboard/StudentList')} 
          />
          <SidebarLink 
            icon="M12 6.253v13" 
            label="Subjects" 
            active={isLinkActive('Subjects')} 
            onClick={() => navigateTo('/AdminDashboard/Subjects')} 
          />
          <SidebarLink 
            icon="M9 19v-6" 
            label="Results" 
            active={isLinkActive('Results')} 
            onClick={() => navigateTo('/AdminDashboard/Results')} 
          />
          {/* NEW LOGS LINK */}
          <SidebarLink 
            icon="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" 
            label="Activity Logs" 
            active={isLinkActive('Logs')} 
            onClick={() => navigateTo('/AdminDashboard/Logs')} 
          />
        </nav>

        <div className="p-4 border-t border-white/5">
          <button onClick={() => setShowLogoutModal(true)} className="w-full px-4 py-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 rounded-xl font-black text-[9px] uppercase tracking-widest transition-colors cursor-pointer">
            Logout Session
          </button>
        </div>
      </aside>

      {/* MAIN LAYOUT */}
      <main className="flex-1 relative overflow-hidden flex flex-col min-w-0">
        <header className="md:hidden flex items-center justify-between p-6 bg-slate-900/50 backdrop-blur-md border-b border-white/5 sticky top-0 z-[40]">
          <div>
            <h2 className="text-lg font-black text-white uppercase italic tracking-tight leading-none">{pageTitle.main}</h2>
            <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest mt-1">{pageTitle.sub}</p>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(true)} 
            className="p-3 bg-slate-800 rounded-xl text-indigo-400 border border-white/5 shadow-lg active:scale-95 transition-all relative z-[50]"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16m-7 6h7" /></svg>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto relative">
          {children}
        </div>
      </main>

      {/* MODALS & TOASTS (Stay the same) */}
      {showLogoutModal && (
        <div className="fixed inset-0 flex items-center justify-center z-[2000] bg-slate-950/90 backdrop-blur-md p-4">
          <div className="bg-slate-900 border border-white/10 rounded-[2.5rem] p-8 max-sm:w-full max-w-sm shadow-2xl text-center">
            <h3 className="text-xl font-black text-white mb-2 uppercase italic leading-tight">Do you want to logout?</h3>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-8">Confirm to end your admin session</p>
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => setShowLogoutModal(false)} className="py-4 bg-slate-800 text-slate-300 rounded-2xl font-black text-[10px] uppercase cursor-pointer">No, Stay</button>
              <button onClick={handleLogout} className="py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase cursor-pointer">Yes, Logout</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SidebarLink({ icon, label, onClick, active = false }) {
  return (
    <button 
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-200 group pointer-events-auto ${
        active 
          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' 
          : 'text-slate-500 hover:bg-white/5 hover:text-slate-200 cursor-pointer'
      }`}
    >
      <svg className={`w-5 h-5 ${active ? 'text-white' : 'text-slate-600 group-hover:text-indigo-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={icon} />
      </svg>
      <span className="text-[11px] font-black uppercase tracking-widest">{label}</span>
    </button>
  )
}