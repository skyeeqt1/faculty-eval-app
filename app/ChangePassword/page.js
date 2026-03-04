'use client'
import { useState, useEffect, Suspense } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import bcrypt from 'bcryptjs'

function ChangePasswordContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const studentId = searchParams.get('id')

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [popup, setPopup] = useState({ show: false, message: '', isSuccess: false })

  useEffect(() => {
    if (!studentId) router.replace('/')
  }, [studentId, router])

  const handleUpdate = async (e) => {
    e.preventDefault()
    
    if (newPassword.length < 6) {
      setPopup({ show: true, message: "Security requirement: Password must be at least 6 characters.", isSuccess: false })
      return
    }
    if (newPassword !== confirmPassword) {
      setPopup({ show: true, message: "Mismatch: Passwords do not match.", isSuccess: false })
      return
    }

    setLoading(true)
    try {
      // Hash the new password
      const hashedPassword = await bcrypt.hash(newPassword, 10)
      
      // Update password directly in database
      const { error } = await supabase
        .from("authorized_students")
        .update({
          password: hashedPassword,
          mustchangepassword: false
        })
        .eq("id", studentId)

      if (error) throw error

      setPopup({ 
        show: true, 
        message: "Security credentials updated. You may now access the portal.", 
        isSuccess: true 
      })
      
      setTimeout(() => router.push('/'), 2000)
    } catch (error) {
      setPopup({ show: true, message: "Update failed: " + error.message, isSuccess: false })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center px-4 relative overflow-hidden font-sans pt-safe">
      
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-600/10 blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-violet-600/10 blur-[120px]" />
      
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
              {popup.isSuccess ? 'Success' : 'Attention'}
            </h2>
            <p className="text-slate-400 text-center text-sm mb-6 leading-relaxed">{popup.message}</p>
            {!popup.isSuccess && (
              <button 
                onClick={() => setPopup({ show: false, message: '', isSuccess: false })} 
                className="cursor-pointer w-full bg-indigo-600 text-white font-bold py-3.5 rounded-xl uppercase text-[10px] tracking-widest hover:bg-indigo-500 transition-colors"
              >
                Try Again
              </button>
            )}
          </div>
        </div>
      )}

      <div className={`bg-slate-900 w-full max-w-md p-8 md:p-12 rounded-[2.5rem] shadow-2xl border border-white/5 transition-all duration-500 ${popup.show ? 'blur-md opacity-50 scale-95' : 'opacity-100'}`}>
        <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-full text-[11px] font-black text-amber-500 uppercase tracking-[0.2em] mb-6">
              Security Update Required
            </div>
            <h2 className="text-3xl font-black text-white tracking-tighter uppercase italic leading-none">
              Setup <span className="text-indigo-500">Account</span>
            </h2>
            <p className="text-slate-500 mt-3 text-[10px] font-bold uppercase tracking-[0.3em]">Create your personal password</p>
        </div>

        <form onSubmit={handleUpdate} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">New Password</label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              className="w-full bg-slate-800 p-4 rounded-xl border border-slate-700 focus:border-indigo-500 outline-none font-medium text-white transition-all placeholder:text-slate-600"
              placeholder="New Password"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Confirm Password</label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="w-full bg-slate-800 p-4 rounded-xl border border-slate-700 focus:border-indigo-500 outline-none font-medium text-white transition-all placeholder:text-slate-600"
              placeholder="Confirm Password"
            />
          </div>

          <button
            type="submit"
            disabled={loading || popup.isSuccess}
            className="cursor-pointer w-full bg-indigo-600 text-white py-4 rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Updating..." : "Finalize Setup"}
          </button>
        </form>
      </div>

      <style jsx>{`
        @keyframes pop-in {
          0% { transform: scale(0.98); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-pop-in {
          animation: pop-in 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  )
}

export default function ChangePasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0f172a] flex items-center justify-center text-indigo-400 font-black uppercase text-[10px] tracking-widest">Loading Security Portal...</div>}>
      <ChangePasswordContent />
    </Suspense>
  )
}
