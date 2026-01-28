'use client'
import { useEffect, useState } from 'react' 
import { signInWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth'
import { auth, db } from '../lib/firebase' 
import { collection, query, where, getDocs } from 'firebase/firestore' 
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [popup, setPopup] = useState({ show: false, message: '', isSuccess: false })
  const router = useRouter()

  useEffect(() => {
    const savedStudent = localStorage.getItem("studentSession")
    if (savedStudent) {
      router.replace('/StudentDashboard')
      return
    }
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && user.email.toLowerCase() === "admintest@gmail.com") {
        router.replace('/AdminDashboard')
      }
    })
    return () => unsubscribe() 
  }, [router])

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    const cleanEmail = email.toLowerCase().trim()

    try {
      // 1. Admin Logic (Firebase Auth)
      if (cleanEmail === "admintest@gmail.com") {
        try {
          await signInWithEmailAndPassword(auth, cleanEmail, password)
          setPopup({ 
            show: true, 
            message: "Administrative identity confirmed. Initializing session...", 
            isSuccess: true 
          })
          setTimeout(() => router.push('/AdminDashboard'), 2000)
          return
        } catch (adminErr) {
          setPopup({ 
            show: true, 
            message: "Authorization Failed: Admin security key is incorrect.", 
            isSuccess: false 
          })
          setLoading(false)
          return
        }
      }

      // 2. Student Logic (Refined Firestore Query)
      // We query by email first to check if the user exists
      const studentQuery = query(
        collection(db, "authorized_students"),
        where("email", "==", cleanEmail)
      )
      
      const querySnapshot = await getDocs(studentQuery)

      if (!querySnapshot.empty) {
        const studentDoc = querySnapshot.docs[0]
        const studentData = studentDoc.data()

        // Check if plain-text password matches exactly
        if (studentData.password === password) {
          localStorage.setItem("studentSession", JSON.stringify({
            email: studentData.email,
            firstName: studentData.firstName,
            lastName: studentData.lastName,
            role: 'student',
            id: studentDoc.id
          }))

          setPopup({ 
            show: true, 
            message: "Identity verified. Redirecting to Evaluation Portal...", 
            isSuccess: true 
          })
          setTimeout(() => router.push('/StudentDashboard'), 2000)
        } else {
          // Email exists, but password is wrong
          setPopup({ 
            show: true, 
            message: "Access Denied: The security password provided is incorrect.", 
            isSuccess: false 
          })
        }
      } else {
        // Email doesn't exist in the 'authorized_students' collection
        setPopup({ 
          show: true, 
          message: "Access Denied: This email is not registered in our student directory.", 
          isSuccess: false 
        })
      }
    } catch (error) {
      console.error("Login Error:", error)
      setPopup({ 
        show: true, 
        message: "System Error: Unable to connect to the security server.", 
        isSuccess: false 
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center px-4 relative overflow-hidden font-sans">
      {/* Background Decorative Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-600/10 blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-600/10 blur-[120px]" />
      
      {/* --- POPUP MODAL --- */}
      {popup.show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
          <div className="bg-slate-900 border border-white/10 w-full max-w-sm rounded-[2rem] p-8 shadow-2xl animate-pop-in relative overflow-hidden">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ${popup.isSuccess ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'}`}>
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {popup.isSuccess ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                )}
              </svg>
            </div>
            <h2 className="text-xl font-bold text-center text-white mb-2 italic uppercase tracking-wider">
              {popup.isSuccess ? 'Verified' : 'Access Denied'}
            </h2>
            <p className="text-slate-400 text-center text-sm mb-6 leading-relaxed">{popup.message}</p>
            {!popup.isSuccess && (
              <button onClick={() => setPopup({ show: false, message: '', isSuccess: false })} className="cursor-pointer w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl hover:bg-blue-500 transition-all active:scale-[0.98] uppercase text-[10px] tracking-widest">
                Try Again
              </button>
            )}
            {popup.isSuccess && (
              <div className="absolute bottom-0 left-0 h-1 bg-white/5 w-full">
                <div className="h-full bg-emerald-500 animate-timer-progress"></div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- LOGIN CARD --- */}
      <div className={`bg-slate-900 w-full max-w-md p-8 md:p-12 rounded-[2.5rem] shadow-2xl border border-white/5 transition-all duration-500 ${popup.show ? 'blur-md opacity-50 scale-95' : 'opacity-100'}`}>
        <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full text-[11px] font-black text-blue-400 uppercase tracking-[0.2em] mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>
              Security Protocol
            </div>
            <h2 className="text-3xl font-black text-white tracking-tighter uppercase italic leading-none">
              Faculty <span className="text-blue-500">Evaluation</span>
            </h2>
            <p className="text-slate-500 mt-3 text-[10px] font-bold uppercase tracking-[0.3em]">Access Portal</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Academic Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-slate-800 p-4 rounded-xl border border-slate-700 focus:border-blue-500 outline-none font-medium text-white transition-all placeholder:text-slate-600"
              placeholder="Username"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Security Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-slate-800 p-4 rounded-xl border border-slate-700 focus:border-blue-500 outline-none font-medium text-white transition-all placeholder:text-slate-600"
              placeholder="Password"
            />
          </div>

          <button
            type="submit"
            disabled={loading || popup.isSuccess}
            className="cursor-pointer w-full bg-indigo-600 text-white py-4 rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Verifying...
              </>
            ) : "Enter Portal"}
          </button>
        </form>
        
        <div className="mt-10 pt-6 border-t border-white/5">
           <p className="text-center text-slate-700 text-[9px] font-bold uppercase tracking-[0.4em]">
             Authorized Personnel Only
           </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes pop-in {
          0% { transform: scale(0.98); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes timer-progress {
          0% { width: 100%; }
          100% { width: 0%; }
        }
        .animate-pop-in {
          animation: pop-in 0.3s ease-out forwards;
        }
        .animate-timer-progress {
          animation: timer-progress 2s linear forwards;
        }
      `}</style>
    </div>
  )
}