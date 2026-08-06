'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/navigation'
import { comparePassword } from '../lib/bcrypt'
import Toast from '../components/ui/Toast'
import ThemeToggle from '../components/ui/ThemeToggle'
import { ADMIN_EMAIL } from '../lib/constants'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [popup, setPopup] = useState({ show: false, message: '', isSuccess: false })
  const router = useRouter()

  useEffect(() => {
    const savedStudent = sessionStorage.getItem("studentSession")
    if (savedStudent) {
      router.replace('/StudentDashboard')
      return
    }

    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session && session.user.email.toLowerCase() === ADMIN_EMAIL) {
        sessionStorage.setItem("adminSession", JSON.stringify({ email: session.user.email }))
        router.replace('/AdminDashboard')
      }
    }
    checkSession()

    const handleOffline = () => {
      setPopup({ show: true, message: "Network Interrupted: Check connection.", isSuccess: false })
    }
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('offline', handleOffline)
    }
  }, [router])

  const handleLogin = async (e) => {
    e.preventDefault()
    if (!navigator.onLine) {
      setPopup({ show: true, message: "No Internet Connection.", isSuccess: false })
      return
    }

    setLoading(true)
    const cleanEmail = email.toLowerCase().trim()

    try {
      let result

      if (cleanEmail === ADMIN_EMAIL) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: password
        })

        if (error || !data.user) {
          setPopup({ show: true, message: "Access Denied: Incorrect password.", isSuccess: false })
          setLoading(false)
          return
        }

        result = { success: true, isAdmin: true, user: { email: data.user.email } }
      } else {
        const { data: students, error } = await supabase
          .from("authorized_students")
          .select("*")
          .eq("email", cleanEmail)
          .single()

        if (error || !students) {
          setPopup({ show: true, message: "Access Denied: Email not registered.", isSuccess: false })
          setLoading(false)
          return
        }

        const isValidPassword = await comparePassword(password, students.password)

        if (!isValidPassword) {
          setPopup({ show: true, message: "Access Denied: Incorrect password.", isSuccess: false })
          setLoading(false)
          return
        }

        result = {
          success: true,
          isAdmin: false,
          student: {
            email: students.email,
            firstName: students.firstname,
            lastName: students.lastname,
            yearLevel: students.yearlevel,
            block: students.block,
            id: students.id,
            mustchangepassword: students.mustchangepassword
          }
        }
      }

      if (!result.success) {
        setPopup({ show: true, message: result.message, isSuccess: false })
        setLoading(false)
        return
      }

      if (result.isAdmin) {
        sessionStorage.setItem("adminSession", JSON.stringify({ email: result.user.email }))
        setPopup({ show: true, message: "Admin identity confirmed...", isSuccess: true })
        setTimeout(() => router.push('/AdminDashboard'), 2000)
        return
      }

      if (result.student.mustchangepassword) {
        router.push(`/ChangePassword?id=${result.student.id}`)
        setLoading(false)
        return
      }

      sessionStorage.setItem("studentSession", JSON.stringify({
        email: result.student.email,
        firstName: result.student.firstName,
        lastName: result.student.lastName,
        yearLevel: result.student.yearLevel,
        block: result.student.block,
        id: result.student.id
      }))

      setPopup({ show: true, message: "Identity verified. Redirecting...", isSuccess: true })
      setTimeout(() => router.replace('/StudentDashboard'), 1500)
    } catch (error) {
      setPopup({ show: true, message: "System Error: Unable to connect.", isSuccess: false })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen page-bg flex flex-col items-center justify-center px-4 relative overflow-hidden">

      {/* Theme toggle — top right */}
      <div className="absolute top-6 right-6 z-20">
        <ThemeToggle />
      </div>

      {/* Premium floating ambient orbs */}
      <div className="ambient-orb w-[500px] h-[500px] bg-indigo-400/15 dark:bg-indigo-500/10 top-[-15%] left-[-12%] animate-float" />
      <div className="ambient-orb w-[400px] h-[400px] bg-violet-400/12 dark:bg-violet-500/8 bottom-[-12%] right-[-10%] animate-float" style={{ animationDelay: '2s' }} />
      <div className="ambient-orb w-[250px] h-[250px] bg-purple-300/10 dark:bg-purple-400/6 top-[30%] right-[20%] animate-float" style={{ animationDelay: '1s' }} />

      {/* Notice modal */}
      {popup.show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/30 dark:bg-black/50 backdrop-blur-xl" onClick={() => popup.isSuccess ? null : setPopup({ show: false, message: '', isSuccess: false })} />
          <div className="relative card-glass w-full max-w-sm p-8 shadow-elevated animate-pop-in">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg ${popup.isSuccess ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400 shadow-emerald-500/20' : 'bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400 shadow-rose-500/20'}`}>
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                {popup.isSuccess ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                )}
              </svg>
            </div>
            <h2 className="text-lg font-extrabold text-center text-slate-900 dark:text-white mb-2">{popup.isSuccess ? 'Success' : 'Notice'}</h2>
            <p className="text-slate-500 dark:text-slate-400 text-center text-sm mb-6 leading-relaxed">{popup.message}</p>
            {!popup.isSuccess && (
              <button onClick={() => setPopup({ show: false, message: '', isSuccess: false })} className="btn btn-primary w-full py-3.5 text-sm">Continue</button>
            )}
          </div>
        </div>
      )}

      {/* Main card — glass morphism split layout */}
      <div className={`w-full max-w-md lg:max-w-5xl grid grid-cols-1 lg:grid-cols-2 card-glass rounded-3xl overflow-hidden shadow-elevated z-10 transition-all duration-500 ${popup.show ? 'blur-md opacity-50 scale-[0.97]' : 'opacity-100'}`}>

        {/* Brand showcase — premium gradient panel */}
        <div className="hidden lg:flex flex-col justify-between p-12 brand-gradient text-white relative overflow-hidden">
          {/* Ambient light effects inside panel */}
          <div className="absolute -right-20 -top-20 w-72 h-72 rounded-full bg-white/10 blur-3xl animate-glow" />
          <div className="absolute -bottom-24 -left-14 w-80 h-80 rounded-full bg-white/8 blur-3xl animate-glow" style={{ animationDelay: '1.5s' }} />

          <div className="relative z-10">
            <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center mb-8 backdrop-blur-sm shadow-lg border border-white/10">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 19l-7-3V9l7-3 7 3v7l-7 3z" /><path d="M9 12v3m6-3v3M9 12V9m6 3V9" />
              </svg>
            </div>
            <h1 className="text-4xl font-black tracking-tight leading-[1.1]">Faculty<br />Evaluation</h1>
            <p className="mt-5 text-white/75 text-sm leading-relaxed max-w-xs">
              A secure and anonymous way for students to rate their instructors — helping the institution grow every semester.
            </p>
          </div>

          <div className="relative z-10 flex flex-wrap gap-2.5">
            {['Anonymous', 'Encrypted', 'Real-time'].map(t => (
              <span key={t} className="px-3.5 py-1.5 rounded-full bg-white/12 text-[11px] font-semibold backdrop-blur-sm border border-white/10">{t}</span>
            ))}
          </div>
        </div>

        {/* Form side — premium glass */}
        <div className="p-8 sm:p-12 flex flex-col justify-center">
          <div className="mb-8">
            <div className="lg:hidden inline-flex items-center gap-2 px-3.5 py-1.5 bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 rounded-full text-[11px] font-bold mb-6 border border-indigo-100 dark:border-indigo-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
              Faculty Evaluation
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">Welcome back</h2>
            <p className="text-slate-500 dark:text-slate-400 mt-2.5 text-sm leading-relaxed">Sign in to your portal to continue.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <label className="overline block">Academic Email</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="input" placeholder="username@email.com" autoComplete="email" />
            </div>
            <div className="space-y-2">
              <label className="overline block">Password</label>
              <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="input" placeholder="Enter your password" autoComplete="current-password" />
            </div>
            <button type="submit" disabled={loading} className="btn btn-primary w-full mt-2 py-4 text-sm font-bold">
              {loading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" /></svg>
                  Signing in...
                </>
              ) : "Sign In"}
            </button>
          </form>

          <p className="text-center text-slate-400 dark:text-slate-500 text-xs mt-8 font-medium">By continuing, you agree to our terms and privacy policy.</p>
        </div>
      </div>
    </div>
  )
}
