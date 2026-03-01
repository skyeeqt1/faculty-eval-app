'use client'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase' 
import { useState, useEffect, useCallback } from 'react'

export default function StudentPage() {
  const router = useRouter()
  const [userName, setUserName] = useState('Student')
  const [loading, setLoading] = useState(true)
  const [isFormOpen, setIsFormOpen] = useState(true)
  const [yearLevel, setYearLevel] = useState(null)
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [studentData, setStudentData] = useState(null)
  const [block, setBlock] = useState(null)
  const [semester, setSemester] = useState('1st Semester')

  // BACK BUTTON INTERCEPTION
  const handlePopState = useCallback((e) => {
    setShowLogoutModal(true);
    window.history.pushState(null, null, window.location.pathname);
  }, []);

  useEffect(() => {
    window.history.pushState(null, null, window.location.pathname);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [handlePopState]);

  // AUTH & DATA LOGIC
  useEffect(() => {
    // Check session storage
    const savedSession = sessionStorage.getItem("studentSession")
    if (savedSession) {
      const data = JSON.parse(savedSession)
      setUserName(data.firstName || 'Student')
      setYearLevel(data.yearLevel || null)
      setBlock(data.block || null)
      setLoading(false) // Data is found, stop the loading screen
    }

    // Check admin session
    const savedAdmin = sessionStorage.getItem("adminSession")
    if (savedAdmin) {
      router.replace('/AdminDashboard')
      return
    }

    // Subscribe to settings changes
    const channel = supabase
      .channel('settings-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, (payload) => {
        if (payload.new && payload.new.id === 'formConfig') {
          setIsFormOpen(payload.new.isopen)
          setSemester(payload.new.semester || '1st Semester')
        }
      })
      .subscribe()

    const fetchSettings = async () => {
      try {
        const { data, error } = await supabase
          .from("settings")
          .select("*")
          .eq("id", "formConfig")
          .single()

        if (data) {
          setIsFormOpen(data.isopen)
          setSemester(data.semester || '1st Semester')
        }
      } catch (err) {
        console.error("Error fetching settings:", err)
      }
    }

    fetchSettings()

    // Check if user is logged in via Supabase session
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        // Query by email field
        const { data: students, error } = await supabase
          .from("authorized_students")
          .select("*")
          .eq("email", session.user.email.toLowerCase())
          .single()
        
        if (students) {
          setUserName(students.firstname || students.name)
          setYearLevel(students.yearlevel || null)
          setBlock(students.block || null)
          setStudentData(students)
        }
      }
      setLoading(false)
    }

    checkAuth()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [router])

  const handleLogout = async () => {
    try {
      sessionStorage.removeItem("studentSession") // Clear the session
      sessionStorage.removeItem("adminSession")
      await supabase.auth.signOut()
      router.replace('/')
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f172a]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-600/20 border-t-indigo-500 rounded-full animate-spin"></div>
          <p className="text-slate-500 font-black text-[10px] uppercase tracking-[0.3em]">Syncing Session...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col items-center p-6 md:p-12 font-sans text-slate-200 relative overflow-hidden">
      
      {/* LOGOUT MODAL */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setShowLogoutModal(false)} />
          <div className="relative bg-[#111827] border border-white/10 w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="text-center">
              <div className="w-16 h-16 bg-rose-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-rose-500/20">
                <svg className="w-8 h-8 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </div>
              <h3 className="text-xl font-black text-white uppercase italic tracking-tight mb-2">End Session?</h3>
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest leading-relaxed mb-8">
                Are you sure you want to sign out of the student portal?
              </p>
              <div className="flex flex-col gap-3">
                <button onClick={handleLogout} className="hover:pointer cursor-pointer w-full py-4 bg-rose-600 hover:bg-rose-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95">Yes, Sign Out</button>
                <button onClick={() => setShowLogoutModal(false)} className="hover:pointer cursor-pointer w-full py-4 bg-slate-800 text-slate-400 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Decorative Blurs */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-indigo-600/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-violet-600/5 blur-[120px] pointer-events-none" />

      {/* Header */}
      <div className={`w-full max-w-5xl flex flex-col md:flex-row justify-between items-start md:items-center mb-12 mt-4 gap-6 z-10 transition-all duration-300 ${showLogoutModal ? 'blur-md scale-[0.98]' : ''}`}>
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-white tracking-tighter uppercase italic">
            Hello, <span className="text-indigo-500">{userName}</span>
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <span className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]"></span>
            <p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest">Student Portal Access Active</p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex md:hidden items-center gap-3 px-4 py-3 bg-slate-900/50 border border-white/5 rounded-2xl flex-1 justify-center">
            <div className={`w-2 h-2 rounded-full ${isFormOpen ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
            <span className="text-[9px] font-black text-white uppercase tracking-widest">{isFormOpen ? `Opened - ${semester}` : "Closed"}</span>
          </div>
          <button onClick={() => setShowLogoutModal(true)} className="hover:pointer cursor-pointer flex items-center gap-3 px-6 py-3 bg-slate-900 border border-white/10 rounded-2xl text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-rose-400 transition-all active:scale-95 flex-1 md:flex-none justify-center">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      <div className={`w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 z-10 transition-all duration-300 ${showLogoutModal ? 'blur-md scale-[0.98]' : ''}`}>
        <div className="lg:col-span-8 space-y-8">
          
          {/* Step 01: Student Info - Auto-detected from account */}
          <div className="bg-slate-900 rounded-[2.5rem] border border-white/5 p-8 md:p-10 shadow-2xl">
            <h3 className="text-sm font-black text-indigo-400 uppercase tracking-[0.2em] mb-8 flex items-center gap-3">
                <span className="w-6 h-6 rounded-lg bg-indigo-500/10 flex items-center justify-center text-[10px]">01</span>
                Student Information
            </h3>
            <div className="bg-slate-950/50 rounded-2xl p-6 border border-white/5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-indigo-600/20 flex items-center justify-center border border-indigo-500/30">
                    <svg className="w-6 h-6 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">Year Level</p>
                    <p className="text-lg font-black text-white uppercase">{yearLevel || 'Loading...'}</p>
                    {block && (
                      <p className="text-xs font-bold text-indigo-400 mt-1 uppercase">{block}</p>
                    )}
                  </div>
                </div>
                <div className="px-4 py-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                  <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Auto-Detected</p>
                </div>
              </div>
            </div>
          </div>

          {/* Step 02: Launch Card */}
          <div className="bg-slate-900 rounded-[2.5rem] border border-white/5 p-8 md:p-10 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/5 blur-3xl group-hover:bg-indigo-600/10 transition-colors" />
            <h3 className="text-sm font-black text-indigo-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
                <span className="w-6 h-6 rounded-lg bg-indigo-500/10 flex items-center justify-center text-[10px]">02</span>
                System Authorization
            </h3>
            <h2 className="text-2xl font-black text-white mb-4 uppercase italic">Faculty Evaluation</h2>
            <p className="text-slate-500 text-sm leading-relaxed mb-10 max-w-xl">
              {isFormOpen 
                ? "Access granted to evaluate assigned instructors. Your specific responses are encrypted and processed anonymously."
                : "The evaluation gateway is currently locked by administration."}
            </p>
            <button
              disabled={!yearLevel || !isFormOpen}
              onClick={() => router.push(`/Evaluation?year=${encodeURIComponent(yearLevel)}`)}
              className="hover:pointer cursor-pointer group flex items-center justify-center w-full md:w-auto bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-black py-5 px-12 rounded-2xl transition-all shadow-lg shadow-indigo-600/20 uppercase text-[11px] tracking-[0.2em]"
            >
              {!yearLevel ? "Loading Year Level..." : "Launch Evaluation"}
              <svg className="w-5 h-5 ml-3 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
            </button>
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-4 space-y-6">
          <div className="hidden md:block bg-slate-900 rounded-[2rem] border border-white/5 p-8 shadow-2xl">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-6">Gateway Status</h3>
            <div className="flex items-center gap-4 bg-slate-950/50 p-4 rounded-2xl border border-white/5">
              <div className={`w-3 h-3 rounded-full ${isFormOpen ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)] animate-pulse' : 'bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.5)]'}`}></div>
              <span className="text-xs font-black text-white uppercase tracking-widest">{isFormOpen ? "Evaluation Opened" : "Gateway Offline"}</span>
            </div>
          </div>

          <div className="bg-gradient-to-br from-slate-900 to-slate-950 rounded-[2rem] border border-indigo-500/10 p-8 shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center border border-indigo-500/20">
                  <svg className="w-5 h-5 text-indigo-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                </div>
                <h3 className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Privacy Shield</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed font-bold uppercase tracking-wider">
              Evaluations are <span className="text-indigo-400">100% anonymous</span>. Your identity is scrubbed from the final report.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
