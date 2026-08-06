'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import Toast from '../../components/ui/Toast'
import { ConfirmModal } from '../../components/ui/Modal'
import { logActivity } from '../../lib/logger'
import { SEMESTERS, SETTINGS_ID } from '../../lib/constants'

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true)
  const [isFormOpen, setIsFormOpen] = useState(true)
  const [semester, setSemester] = useState('1st Semester')
  const [toast, setToast] = useState({ show: false, message: '' })
  const [confirmModal, setConfirmModal] = useState({ show: false, title: '', onConfirm: null })
  const [ranking, setRanking] = useState([])

  useEffect(() => {
    fetchSettings()

    const channel = supabase
      .channel('evaluations-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'evaluations' }, () => {
        fetchEvaluations()
      })
      .subscribe()

    fetchEvaluations()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const fetchEvaluations = async () => {
    try {
      const { data: allEvals, error } = await supabase
        .from("evaluations")
        .select("*")

      if (error) throw error

      const grouped = allEvals.reduce((acc, curr) => {
        const name = curr.professorname || "Unknown"
        const rating = parseFloat(curr.rating) || 0
        if (!acc[name]) {
          acc[name] = { name, total: 0, count: 0, imageUrl: curr.professorimage || null }
        }
        acc[name].total += rating
        acc[name].count += 1
        return acc
      }, {})

      const sortedProfs = Object.values(grouped)
        .map((p) => ({
          id: p.name,
          name: p.name,
          rating: p.total / p.count,
          imageUrl: p.imageUrl
        }))
        .sort((a, b) => b.rating - a.rating)

      setRanking(sortedProfs)
    } catch (err) {
      console.error("Error fetching evaluations:", err)
    } finally {
      setLoading(false)
    }
  }

  const fetchSettings = async () => {
    try {
      const { data } = await supabase
        .from("settings")
        .select("*")
        .eq("id", SETTINGS_ID)
        .single()

      if (data) {
        setIsFormOpen(data.isopen)
        setSemester(data.semester || '1st Semester')
      }
    } catch (err) {
      console.error("Error fetching settings:", err)
    }
  }

  const togglePortal = async () => {
    const nextStatus = !isFormOpen;
    setConfirmModal({
      show: true,
      title: `Switch evaluation portal to ${nextStatus ? 'LIVE' : 'OFFLINE'} for ${semester}?`,
      onConfirm: async () => {
        const { error } = await supabase
          .from("settings")
          .upsert({
            id: SETTINGS_ID,
            isopen: nextStatus,
            semester: semester,
            updatedat: new Date().toISOString()
          }, { onConflict: 'id' })

        if (!error) {
          setIsFormOpen(nextStatus);
          setToast({ show: true, message: `System: ${nextStatus ? 'Live' : 'Offline'} for ${semester}` });
          await logActivity(nextStatus ? "PORTAL_OPENED" : "PORTAL_CLOSED", `Evaluation portal ${nextStatus ? 'opened' : 'closed'} for ${semester}`);
        }
      }
    });
  }

  const handleSemesterChange = async (newSemester) => {
    setSemester(newSemester)
    const { error } = await supabase
      .from("settings")
      .upsert({
        id: SETTINGS_ID,
        isopen: isFormOpen,
        semester: newSemester,
        updatedat: new Date().toISOString()
      }, { onConflict: 'id' })

    if (!error) {
      setToast({ show: true, message: `Semester set to ${newSemester}` });
      await logActivity("SEMESTER_CHANGED", `Changed semester to ${newSemester}`);
    }
  }

  if (loading) return (
    <div className="flex-1 flex items-center justify-center page-bg">
      <div className="flex items-center gap-3 text-indigo-600 dark:text-indigo-400 text-xs font-bold uppercase tracking-[0.3em]">
        <div className="relative w-5 h-5">
          <div className="absolute inset-0 border-[2.5px] border-indigo-500/10 rounded-full" />
          <div className="absolute inset-0 border-[2.5px] border-transparent border-t-indigo-600 dark:border-t-indigo-400 rounded-full animate-spin" />
        </div>
        Analyzing Ratings...
      </div>
    </div>
  )

  return (
    <div className="p-4 md:p-12 max-w-6xl mx-auto w-full h-screen flex flex-col space-y-6 overflow-hidden">

      {/* DESKTOP HEADER */}
      <div className="hidden md:flex shrink-0 flex-col md:items-start justify-between gap-6">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Main Dashboard</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">System overview &amp; performance</p>
        </div>
      </div>

      {/* Portal Status Card — premium gradient accent */}
      <section className={`shrink-0 p-6 sm:p-8 rounded-2xl border transition-all flex flex-col md:flex-row items-center justify-between gap-6 ${isFormOpen ? 'bg-gradient-to-r from-emerald-50 to-emerald-50/50 border-emerald-200/60 dark:from-emerald-500/8 dark:to-emerald-500/3 dark:border-emerald-500/15' : 'card-glass'}`}>
        <div className="text-center md:text-left">
          <div className="flex items-center gap-2.5 justify-center md:justify-start">
            <span className={`w-3 h-3 rounded-full shadow-sm ${isFormOpen ? 'bg-emerald-500 shadow-emerald-500/30 animate-pulse' : 'bg-rose-500 shadow-rose-500/30'}`}></span>
            <h2 className={`text-xl font-black ${isFormOpen ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-800 dark:text-white'}`}>System Status: {isFormOpen ? 'Live' : 'Offline'}</h2>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1.5">Evaluation portal is currently {isFormOpen ? 'accepting' : 'blocking'} student submissions.</p>
        </div>
        <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
          <select
            value={semester}
            onChange={(e) => handleSemesterChange(e.target.value)}
            className="input md:w-56 cursor-pointer"
          >
            {SEMESTERS.map(sem => (
              <option key={sem} value={sem}>{sem}</option>
            ))}
          </select>
          <button onClick={togglePortal} className={`btn w-full md:w-auto px-8 py-3.5 text-xs font-bold uppercase tracking-wider ${isFormOpen ? 'btn-primary' : 'btn-ghost text-slate-600 dark:text-slate-300'}`}>
            {isFormOpen ? 'Close Portal' : 'Open Portal'}
          </button>
        </div>
      </section>

      {/* Ranking Section */}
      <section className="flex-1 flex flex-col min-h-0 space-y-4">
        <div className="shrink-0 flex items-center justify-between px-2">
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">Faculty Performance Overview</h3>
          <span className="text-xs font-bold text-indigo-600 dark:text-indigo-300">Ratings</span>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin card-glass p-2">
          {ranking.length > 0 ? (
            <div className="divide-y divide-slate-100/60 dark:divide-indigo-500/5">
              {ranking.map((prof, i) => (
                <div key={prof.id} className="flex items-center justify-between p-4 rounded-xl hover:bg-indigo-50/50 dark:hover:bg-indigo-500/5 transition-colors group">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-500/10 dark:to-violet-500/10 border border-indigo-100/60 dark:border-indigo-500/15 flex items-center justify-center overflow-hidden shrink-0 text-indigo-600 dark:text-indigo-300 font-bold">
                        {prof.imageUrl ? (
                          <img src={prof.imageUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                          <span className="font-bold text-sm">{prof.name?.charAt(0)}</span>
                        )}
                      </div>
                      {i < 3 && (
                        <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black text-white shadow-sm ${
                          i === 0 ? 'bg-amber-400 shadow-amber-400/30' : i === 1 ? 'bg-slate-400 shadow-slate-400/30' : 'bg-amber-600 shadow-amber-600/30'
                        }`}>
                          {i + 1}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-slate-800 dark:text-slate-100 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors">{prof.name}</h4>
                      <p className="text-xs text-slate-400 dark:text-slate-500 font-medium mt-0.5">Faculty Member</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="hidden sm:flex items-center gap-0.5">
                      {[1,2,3,4,5].map(n => (
                        <svg key={n} className={`w-4 h-4 transition-colors ${n <= Math.round((prof.rating || 0) / 2) ? 'text-amber-400' : 'text-slate-200 dark:text-slate-700'}`} fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                      ))}
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-black text-slate-900 dark:text-white">{(prof.rating || 0).toFixed(1)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center p-20">
              <p className="text-slate-400 dark:text-slate-500 text-sm font-medium">No evaluation data found</p>
            </div>
          )}
        </div>
      </section>

      <ConfirmModal
        open={confirmModal.show}
        onCancel={() => setConfirmModal({ ...confirmModal, show: false })}
        onConfirm={() => { confirmModal.onConfirm(); setConfirmModal({ ...confirmModal, show: false }); }}
        title="System Action"
        message={confirmModal.title}
      >
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-500/25">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
        </div>
      </ConfirmModal>

      <Toast show={toast.show} message={toast.message} onClose={() => setToast({ show: false, message: '' })} />
    </div>
  )
}
