'use client'
import { useState, useEffect, useCallback } from 'react'
import { auth } from '../../lib/firebase'
import { useRouter, usePathname } from 'next/navigation'
import { onAuthStateChanged, signOut } from 'firebase/auth'

export default function AdminLayout({ children }) {
  const router = useRouter()
  const pathname = usePathname()
  const [loading, setLoading] = useState(true)
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [toast, setToast] = useState({ show: false, message: '' })
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebar_persistent_state')
      return saved === 'true'
    }
    return false
  })

  // --- Helper: Show Toast ---
  const triggerToast = (msg) => {
    setToast({ show: true, message: msg })
    setTimeout(() => setToast({ show: false, message: '' }), 2500)
  }

  // --- Mobile Back Button Navigation Logic ---
  const handlePopState = useCallback((e) => {
    if (isSidebarOpen) {
      handleSidebarToggle(false);
      window.history.pushState(null, null, window.location.pathname);
    } 
    else if (pathname === '/AdminDashboard' || pathname === '/AdminDashboard/') {
      setShowLogoutModal(true);
      window.history.pushState(null, null, window.location.pathname);
    }
  }, [isSidebarOpen, pathname]);

  useEffect(() => {
    if (pathname === '/AdminDashboard' || pathname === '/AdminDashboard/') {
      window.history.pushState(null, null, window.location.pathname);
    }
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [handlePopState, pathname]);

  // --- Authentication Guard ---
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

  const handleSidebarToggle = (newState) => {
    setIsSidebarOpen(newState);
    if (typeof window !== 'undefined') {
      localStorage.setItem('sidebar_persistent_state', newState);
    }
  };

  const handleLogout = async () => {
    localStorage.removeItem('sidebar_persistent_state');
    await signOut(auth);
    router.replace('/');
  };

  const isLinkActive = (path) => {
    if (path === '/AdminDashboard') {
      return pathname === '/AdminDashboard' || pathname === '/AdminDashboard/';
    }
    return pathname.includes(path);
  };

  if (loading) return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
      <div className="text-center font-bold text-indigo-400 uppercase tracking-[0.3em] animate-pulse">Authenticating Admin...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 flex font-sans overflow-hidden">
      {/* Sidebar Overlay */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[60] md:hidden cursor-pointer" onClick={() => handleSidebarToggle(false)} />
      )}

      {/* Persistent Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-[70] w-72 bg-slate-900 border-r border-white/5 flex flex-col md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-200 md:transition-none`}>
        <div className="p-8 pr-4 flex items-center justify-between">
          <h1 className="text-2xl font-black tracking-tighter text-white uppercase italic">ADMIN<span className="text-indigo-500">Panel</span></h1>
          <button onClick={() => handleSidebarToggle(false)} className="md:hidden p-3 bg-white/5 rounded-xl text-slate-400 hover:text-white transition-all active:scale-90">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          <SidebarLink icon="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" label="Dashboard" active={isLinkActive('/AdminDashboard')} onClick={() => router.push('/AdminDashboard')} />
          <SidebarLink icon="M16 7a4 4 0 11-8 0 4 4 0 018 0z" label="Faculty" active={isLinkActive('Faculty')} onClick={() => router.push('/AdminDashboard/Faculty')} />
          <SidebarLink icon="M12 14l9-5-9-5-9 5 9 5z" label="Students" active={isLinkActive('StudentList')} onClick={() => router.push('/AdminDashboard/StudentList')} />
          <SidebarLink icon="M12 6.253v13" label="Subjects" active={isLinkActive('Subjects')} onClick={() => router.push('/AdminDashboard/Subjects')} />
          <SidebarLink icon="M9 19v-6" label="Results" active={isLinkActive('Results')} onClick={() => router.push('/AdminDashboard/Results')} />
        </nav>

        <div className="p-4 border-t border-white/5">
          <button onClick={() => setShowLogoutModal(true)} className="w-full px-4 py-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 rounded-xl font-black text-[9px] uppercase tracking-widest cursor-pointer">Logout Session</button>
        </div>
      </aside>

      <main className="flex-1 relative overflow-y-auto flex flex-col">
        {/* Mobile Header - Removed "Analytics" h1, set to justify-end */}
        <header className="md:hidden flex items-center justify-end p-6 bg-slate-900 border-b border-white/5 sticky top-0 z-40">
          <button onClick={() => handleSidebarToggle(true)} className="p-2 bg-slate-800 rounded-lg text-indigo-400">
             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16m-7 6h7" /></svg>
          </button>
        </header>

        {children}
      </main>

      {/* --- UNIFIED LOGOUT CONFIRMATION MODAL --- */}
      {showLogoutModal && (
        <div className="fixed inset-0 flex items-center justify-center z-[500] bg-slate-950/90 backdrop-blur-md p-4">
          <div className="bg-slate-900 border border-white/10 rounded-[2.5rem] p-8 max-sm:w-full max-w-sm shadow-2xl text-center">
            <h3 className="text-xl font-black text-white mb-2 uppercase italic leading-tight">Do you want to logout?</h3>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-8">Confirm to end your admin session</p>
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => { setShowLogoutModal(false); triggerToast("Session Continued"); }} 
                className="py-4 bg-slate-800 text-slate-300 rounded-2xl font-black text-[10px] uppercase cursor-pointer"
              >
                No, Stay
              </button>
              <button 
                onClick={handleLogout} 
                className="py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase cursor-pointer"
              >
                Yes, Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- Toast Notification --- */}
      {toast.show && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[600] bg-indigo-600 text-white px-6 py-3 rounded-full shadow-2xl border border-white/10 animate-bounce">
          <span className="text-[10px] font-black uppercase tracking-[0.2em]">{toast.message}</span>
        </div>
      )}
    </div>
  )
}

function SidebarLink({ icon, label, onClick, active = false }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-colors duration-200 group ${active ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-500 hover:bg-white/5 hover:text-slate-200 cursor-pointer'}`}>
      <svg className={`w-5 h-5 ${active ? 'text-white' : 'text-slate-600 group-hover:text-indigo-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={icon} /></svg>
      <span className="text-[11px] font-black uppercase tracking-widest">{label}</span>
    </button>
  )
}