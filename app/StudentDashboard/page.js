'use client'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { useState, useEffect, useCallback } from 'react'
import Modal from '../../components/ui/Modal'
import ThemeToggle from '../../components/ui/ThemeToggle'

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

  const handlePopState = useCallback((e) => {
    setShowLogoutModal(true);
    window.history.pushState(null, null, window.location.pathname);
  }, []);

  useEffect(() => {
    window.history.pushState(null, null, window.location.pathname);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [handlePopState]);

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      const savedSession = sessionStorage.getItem("studentSession")
      if (savedSession) {
        const data = JSON.parse(savedSession)
        if (!cancelled) {
          setUserName(data.firstName || 'Student')
          setYearLevel(data.yearLevel || null)
          setBlock(data.block || null)
          setLoading(false)
        }
      }

      const savedAdmin = sessionStorage.getItem("adminSession")
      if (savedAdmin) {
        router.replace('/AdminDashboard')
        return
      }

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
          const { data } = await supabase
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

      const { data: { session } } = await supabase.auth.getSession()
      if (session && !cancelled) {
        const { data: students } = await supabase
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
      if (!cancelled) setLoading(false)

      return channel
    }

    let channel;
    init().then(c => { channel = c; })

    return () => {
      cancelled = true
      if (channel) supabase.removeChannel(channel)
    }
  }, [router])

  const handleLogout = async () => {
    try {
      sessionStorage.removeItem("studentSession")
      sessionStorage.removeItem("adminSession")
      await supabase.auth.signOut()
      router.replace('/')
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen page-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-10 h-10">
            <div className="absolute inset-0 border-[3px] border-indigo-500/10 rounded-full" />
            <div className="absolute inset-0 border-[3px] border-transparent border-t-indigo-600 dark:border-t-indigo-400 rounded-full animate-spin" />
          </div>
          <p className="text-slate-500 dark:text-slate-400 font-semibold text-xs uppercase tracking-widest">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen page-bg flex flex-col items-center p-6 md:p-12 font-sans relative overflow-hidden">

      {/* Ambient orbs — subtle */}
      <div className="ambient-orb w-[350px] h-[350px] bg-indigo-400/8 dark:bg-indigo-500/5 top-[-10%] right-[-8%] animate-float" />
      <div className="ambient-orb w-[280px] h-[280px] bg-violet-400/6 dark:bg-violet-500/4 bottom-[-8%] left-[-5%] animate-float" style={{ animationDelay: '1.5s' }} />

      {/* LOGOUT MODAL */}
      <Modal open={showLogoutModal} onClose={() => setShowLogoutModal(false)}>
        <div className="text-center">
          <div className="w-14 h-14 bg-rose-50 dark:bg-rose-500/10 rounded-2xl flex items-center justify-center mx-auto mb-5 text-rose-600 dark:text-rose-400 shadow-lg shadow-rose-500/10 border border-rose-100 dark:border-rose-500/10">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </div>
          <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mb-2">End Session?</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-7">
            Are you sure you want to sign out of the student portal?
          </p>
          <div className="flex flex-col gap-3">
            <button onClick={handleLogout} className="btn btn-danger w-full py-3.5 text-sm">Yes, Sign Out</button>
            <button onClick={() => setShowLogoutModal(false)} className="btn btn-ghost w-full py-3.5 text-sm">Cancel</button>
          </div>
        </div>
      </Modal>

      {/* Header */}
      <div className={`w-full max-w-5xl flex flex-col md:flex-row justify-between items-start md:items-center mb-10 mt-4 gap-5 z-10 transition-all duration-300 ${showLogoutModal ? 'blur-md scale-[0.98]' : ''}`}>
        <div>
          <p className="overline mb-2">Student Portal</p>
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
            Hello, <span className="text-gradient">{userName}</span>
          </h1>
          <div className="flex items-center gap-2 mt-3">
            <span className={`w-2 h-2 rounded-full shadow-sm ${isFormOpen ? 'bg-emerald-500 shadow-emerald-500/30' : 'bg-rose-500 shadow-rose-500/30'}`}></span>
            <p className="text-slate-500 dark:text-slate-400 text-xs font-medium">{isFormOpen ? `Evaluation open for ${semester}` : 'Evaluation closed by administration'}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="md:hidden flex-1" />
          <ThemeToggle />
          <button onClick={() => setShowLogoutModal(true)} className="btn btn-ghost px-5 py-3 text-xs font-bold flex-1 md:flex-none">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            Sign Out
          </button>
        </div>
      </div>

      <div className={`w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-6 z-10 stagger-children ${showLogoutModal ? 'blur-md scale-[0.98]' : ''}`}>
        <div className="lg:col-span-8 space-y-6">

          {/* Step 01: Student Info — glass card */}
          <div className="card-glass card-interactive p-6 sm:p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-3">
                <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-[11px] font-black text-white shadow-md shadow-indigo-500/20">1</span>
                Student Information
              </h3>
              <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 rounded-full text-[10px] font-bold uppercase tracking-wider border border-emerald-100 dark:border-emerald-500/15">Auto-detected</span>
            </div>
            <div className="flex items-center gap-4 bg-slate-50/80 dark:bg-indigo-500/5 rounded-2xl p-5 border border-slate-100/60 dark:border-indigo-500/8">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <p className="overline mb-0.5">Year Level</p>
                <p className="text-lg font-bold text-slate-900 dark:text-white">{yearLevel || 'Loading...'}</p>
                {block && <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-300 mt-0.5">{block}</p>}
              </div>
            </div>
          </div>

          {/* Step 02: Launch Card — premium with glow */}
          <div className="card-glass card-interactive p-6 sm:p-8 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-48 h-48 brand-gradient opacity-[0.07] blur-3xl group-hover:opacity-[0.12] transition-opacity duration-500" />
            <h3 className="text-sm font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-3 mb-5">
              <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-[11px] font-black text-white shadow-md shadow-indigo-500/20">2</span>
              Faculty Evaluation
            </h3>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">Rate your instructors</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-8 max-w-xl">
              {isFormOpen
                ? "Access granted to evaluate assigned instructors. Your responses are anonymous and securely transmitted."
                : "The evaluation gateway is currently locked by administration."}
            </p>
            <button
              disabled={!yearLevel || !isFormOpen}
              onClick={() => router.push(`/Evaluation?year=${encodeURIComponent(yearLevel)}${block ? `&block=${encodeURIComponent(block)}` : ''}`)}
              className="btn btn-primary w-full md:w-auto px-10 py-4 text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
            >
              {!yearLevel ? "Loading year level..." : "Launch Evaluation"}
              <svg className="w-5 h-5 ml-1 group-hover:translate-x-1.5 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
            </button>
          </div>
        </div>

        {/* Sidebar cards */}
        <div className="lg:col-span-4 space-y-6">
          <div className="card-glass card-interactive p-6">
            <p className="overline mb-4">Gateway Status</p>
            <div className={`flex items-center gap-3 rounded-2xl p-4 border ${isFormOpen ? 'bg-emerald-50/80 text-emerald-700 dark:bg-emerald-500/8 dark:text-emerald-300 border-emerald-100 dark:border-emerald-500/10' : 'bg-rose-50/80 text-rose-700 dark:bg-rose-500/8 dark:text-rose-300 border-rose-100 dark:border-rose-500/10'}`}>
              <span className={`w-3 h-3 rounded-full shadow-sm ${isFormOpen ? 'bg-emerald-500 shadow-emerald-500/30 animate-pulse' : 'bg-rose-500 shadow-rose-500/30'}`} />
              <span className="text-sm font-bold">{isFormOpen ? "Evaluation Opened" : "Gateway Offline"}</span>
            </div>
          </div>

          <div className="card-glass card-interactive p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-violet-500 rounded-xl flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Privacy Shield</h3>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Evaluations are <span className="font-semibold text-indigo-600 dark:text-indigo-300">100% anonymous</span>. Your identity is scrubbed from the final report.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
