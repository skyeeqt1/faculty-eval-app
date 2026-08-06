'use client'
import { useState, useEffect, Suspense } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import { hashPassword } from '../../lib/bcrypt'
import Modal from '../../components/ui/Modal'
import { PASSWORD_MIN_LENGTH } from '../../lib/constants'

function ChangePasswordContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const studentId = searchParams.get('id')

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [popup, setPopup] = useState({ show: false, message: '', isSuccess: false })

  useEffect(() => {
    if (!studentId) router.replace('/')
  }, [studentId, router])

  const handleUpdate = async (e) => {
    e.preventDefault()

    if (newPassword.length < PASSWORD_MIN_LENGTH) {
      setPopup({ show: true, message: `Security requirement: Password must be at least ${PASSWORD_MIN_LENGTH} characters.`, isSuccess: false })
      return
    }
    if (newPassword !== confirmPassword) {
      setPopup({ show: true, message: "Mismatch: Passwords do not match.", isSuccess: false })
      return
    }

    setLoading(true)
    try {
      const hashedPassword = await hashPassword(newPassword, 10)

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

  const togglePassword = () => setShowPassword(s => !s)

  return (
    <div className="min-h-screen page-bg flex items-center justify-center px-4 relative overflow-hidden pt-safe">
      {/* Ambient orbs */}
      <div className="ambient-orb w-[400px] h-[400px] bg-amber-300/12 dark:bg-amber-400/6 top-[-12%] left-[-10%] animate-float" />
      <div className="ambient-orb w-[350px] h-[350px] bg-violet-400/10 dark:bg-violet-500/6 bottom-[-10%] right-[-8%] animate-float" style={{ animationDelay: '1.5s' }} />

      <Modal open={popup.show} onClose={() => popup.isSuccess ? null : setPopup({ show: false, message: '', isSuccess: false })}>
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg ${popup.isSuccess ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/12 dark:text-emerald-400 shadow-emerald-500/15' : 'bg-rose-50 text-rose-600 dark:bg-rose-500/12 dark:text-rose-400 shadow-rose-500/15'}`}>
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {popup.isSuccess ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            )}
          </svg>
        </div>
        <h2 className="text-xl font-extrabold text-center text-slate-900 dark:text-white mb-2">
          {popup.isSuccess ? 'Success' : 'Attention'}
        </h2>
        <p className="text-slate-500 dark:text-slate-400 text-center text-sm mb-6 leading-relaxed">{popup.message}</p>
        {!popup.isSuccess && (
          <button
            onClick={() => setPopup({ show: false, message: '', isSuccess: false })}
            className="btn btn-primary w-full py-3.5 text-sm"
          >
            Try Again
          </button>
        )}
      </Modal>

      <div className={`card-glass w-full max-w-md p-8 md:p-12 transition-all duration-500 ${popup.show ? 'blur-md opacity-50 scale-[0.97]' : 'opacity-100'}`}>
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 rounded-full text-[11px] font-bold mb-6 border border-amber-100 dark:border-amber-500/12">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Security Update Required
          </div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Setup <span className="text-gradient">Account</span></h2>
          <p className="text-slate-500 dark:text-slate-400 mt-3 text-sm leading-relaxed">Create your personal password.</p>
        </div>

        <form onSubmit={handleUpdate} className="space-y-6">
          <div className="space-y-2">
            <label className="overline block">New Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="input pr-12"
                placeholder="New Password"
                autoComplete="new-password"
              />
              <button type="button" onClick={togglePassword} className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors" aria-label={showPassword ? "Hide password" : "Show password"}>
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                )}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="overline block">Confirm Password</label>
            <input
              type={showPassword ? "text" : "password"}
              required
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="input"
              placeholder="Confirm Password"
              autoComplete="new-password"
            />
          </div>

          <button
            type="submit"
            disabled={loading || popup.isSuccess}
            className="btn btn-primary w-full py-4 text-sm font-bold"
          >
            {loading ? "Updating..." : "Finalize Setup"}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function ChangePasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen page-bg flex items-center justify-center">
        <div className="flex items-center gap-3 text-indigo-600 dark:text-indigo-400 text-xs font-bold uppercase tracking-[0.3em]">
          <div className="relative w-6 h-6">
            <div className="absolute inset-0 border-[2.5px] border-indigo-500/10 rounded-full" />
            <div className="absolute inset-0 border-[2.5px] border-transparent border-t-indigo-600 dark:border-t-indigo-400 rounded-full animate-spin" />
          </div>
          Loading Security Portal...
        </div>
      </div>
    }>
      <ChangePasswordContent />
    </Suspense>
  )
}
