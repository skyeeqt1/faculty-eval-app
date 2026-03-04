'use client'
import { useEffect, useState } from 'react' 
import { supabase } from '../lib/supabase' 
import { useRouter } from 'next/navigation'
import bcrypt from 'bcryptjs'

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
      if (session && session.user.email.toLowerCase() === "admintest@gmail.com") {
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
      // Check if it's admin email - use Supabase Auth
      if (cleanEmail === "admintest@gmail.com") {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: password
        })

        if (error) {
          setPopup({ show: true, message: "Access Denied: Incorrect password.", isSuccess: false })
          setLoading(false)
          return
        }

        if (data.user) {
          sessionStorage.setItem("adminSession", JSON.stringify({ email: data.user.email }))
          setPopup({ show: true, message: "Admin identity confirmed...", isSuccess: true })
          setTimeout(() => router.push('/AdminDashboard'), 2000)
          return
        }
      }

      // Student login - Check database for account with hashed password
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

      // Verify password using bcrypt
      const isValidPassword = await bcrypt.compare(password, students.password)
      
      if (isValidPassword) {
        if (students.mustchangepassword) {
          router.push(`/ChangePassword?id=${students.id}`)
          setLoading(false)
          return
        }

        sessionStorage.setItem("studentSession", JSON.stringify({
          email: students.email,
          firstName: students.firstname,
          lastName: students.lastname,
          yearLevel: students.yearlevel,
          block: students.block,
          id: students.id
        }))

        setPopup({ show: true, message: "Identity verified. Redirecting...", isSuccess: true })
        setTimeout(() => router.replace('/StudentDashboard'), 1500)
      } else {
        setPopup({ show: true, message: "Access Denied: Incorrect password.", isSuccess: false })
      }
    } catch (error) {
      setPopup({ show: true, message: "System Error: Unable to connect.", isSuccess: false })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-start md:justify-center px-4 pt-12 md:pt-0 relative overflow-hidden font-sans">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-600/10 blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-violet-600/10 blur-[120px]" />
      
      {popup.show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
          <div className="bg-slate-900 border border-white/10 w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl animate-pop-in relative overflow-hidden">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ${popup.isSuccess ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'}`}>
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {popup.isSuccess ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                )}
              </svg>
            </div>
            <h2 className="text-lg font-black text-center text-white mb-2 italic uppercase tracking-wider">{popup.isSuccess ? 'Verified' : 'Notice'}</h2>
            <p className="text-slate-400 text-center text-xs md:text-sm mb-6 leading-relaxed font-medium">{popup.message}</p>
            {!popup.isSuccess && (
              <button onClick={() => setPopup({ show: false, message: '', isSuccess: false })} className="cursor-pointer w-full bg-indigo-600 text-white font-black py-4 rounded-2xl hover:bg-indigo-500 transition-all uppercase text-[10px] tracking-widest shadow-lg shadow-indigo-600/20">Continue</button>
            )}
          </div>
        </div>
      )}

      <div className={`bg-slate-900 w-full max-w-md p-8 md:p-12 rounded-[2.5rem] shadow-2xl border border-white/5 transition-all duration-500 z-10 ${popup.show ? 'blur-md opacity-50 scale-95' : 'opacity-100'}`}>
        <div className="text-center mb-8 md:mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-[11px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></span>
            Security Protocol
          </div>
          <h2 className="text-3xl font-black text-white tracking-tighter uppercase italic leading-none">
            Faculty <span className="text-indigo-500">Evaluation</span>
          </h2>
          <p className="text-slate-500 mt-3 text-[10px] font-bold uppercase tracking-[0.3em]">Access Portal</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5 md:space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Academic Email</label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-slate-800 p-4 rounded-2xl border border-slate-700 focus:border-indigo-500 text-white outline-none text-sm transition-all" placeholder="Username" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Security Password</label>
            <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-slate-800 p-4 rounded-2xl border border-slate-700 focus:border-indigo-500 text-white outline-none text-sm transition-all" placeholder="Password" />
          </div>
          <button type="submit" disabled={loading} className="cursor-pointer w-full mt-4 bg-indigo-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-indigo-500 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/10">
            {loading ? "Verifying..." : "Enter Portal"}
          </button>
        </form>
      </div>

      <style jsx>{`
        @keyframes pop-in { 0% { transform: scale(0.95); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
        .animate-pop-in { animation: pop-in 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
        
        /* Ensures the background stays fixed on mobile even when keyboard pops up */
        @media (max-width: 768px) {
          .min-h-screen { min-height: -webkit-fill-available; }
        }
      `}</style>
    </div>
  )
}
