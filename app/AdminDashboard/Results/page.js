'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import Modal from '../../../components/ui/Modal'

export default function RealTimeResults() {
  const [professors, setProfessors] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedProf, setSelectedProf] = useState(null)
  const [selectedSubject, setSelectedSubject] = useState(null)
  const [viewComments, setViewComments] = useState(false)
  const [isExiting, setIsExiting] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [isResetting, setIsResetting] = useState(false)

  useEffect(() => {
    const channel = supabase
      .channel('evaluations-results-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'evaluations' }, (payload) => {
        fetchEvaluations()
      })
      .subscribe()

    fetchEvaluations()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  useEffect(() => {
    const handleBackButton = (e) => {
      if (selectedProf) {
        e.preventDefault()
        handleCloseModal()
      } else if (showResetConfirm) {
        e.preventDefault()
        setShowResetConfirm(false)
      }
    }

    if (selectedProf) {
      window.history.pushState({ profModalOpen: true }, '')
      window.addEventListener('popstate', handleBackButton)
    } else if (showResetConfirm) {
      window.history.pushState({ resetConfirmOpen: true }, '')
      window.addEventListener('popstate', handleBackButton)
    }

    return () => {
      window.removeEventListener('popstate', handleBackButton)
    }
  }, [selectedProf, showResetConfirm])

  const fetchEvaluations = async () => {
    try {
      const { data, error } = await supabase
        .from("evaluations")
        .select("*")
        .order("submittedat", { ascending: false })

      if (error) throw error

      const allEvals = data || []

      const grouped = allEvals.reduce((acc, curr) => {
        const profName = curr.professorname || "Unknown Professor"
        const subjectName = curr.subject || "General"
        const ratingValue = parseFloat(curr.rating) || 0
        const comment = curr.comment?.trim()

        if (!acc[profName]) {
          acc[profName] = { name: profName, overallTotalScore: 0, overallCount: 0, subjects: {} }
        }

        if (!acc[profName].subjects[subjectName]) {
          acc[profName].subjects[subjectName] = { totalRating: 0, count: 0, comments: [] }
        }

        const sub = acc[profName].subjects[subjectName]
        sub.totalRating += ratingValue
        sub.count += 1
        if(comment && comment !== "No comment provided") sub.comments.push(comment)

        acc[profName].overallTotalScore += ratingValue
        acc[profName].overallCount += 1

        return acc
      }, {})

      const sortedProfessors = Object.values(grouped).map(prof => ({
        ...prof,
        finalAvg: prof.overallCount > 0 ? prof.overallTotalScore / prof.overallCount : 0
      })).sort((a, b) => b.finalAvg - a.finalAvg)

      setProfessors(sortedProfessors)
    } catch (err) {
      console.error("Error fetching evaluations:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleResetEvaluations = async () => {
    setIsResetting(true)
    try {
      const { error } = await supabase
        .from("evaluations")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000")

      if (error) throw error

      await supabase
        .from("submissionstatus")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000")

      await fetchEvaluations()

      setShowResetConfirm(false)
    } catch (error) {
      console.error("Reset failed:", error)
    } finally {
      setIsResetting(false)
    }
  }

  const handleCloseModal = () => {
    setIsExiting(true)
    setTimeout(() => {
      setSelectedProf(null); setSelectedSubject(null);
      setViewComments(false); setIsExiting(false);
    }, 150)
  }

  if (loading) return (
    <div className="flex-1 flex items-center justify-center page-bg">
      <div className="flex items-center gap-3 text-indigo-600 dark:text-indigo-400 text-xs font-bold uppercase tracking-[0.3em]">
        <div className="relative w-5 h-5">
          <div className="absolute inset-0 border-[2.5px] border-indigo-500/10 rounded-full" />
          <div className="absolute inset-0 border-[2.5px] border-transparent border-t-indigo-600 dark:border-t-indigo-400 rounded-full animate-spin" />
        </div>
        Loading results...
      </div>
    </div>
  )

  return (
    <div className="p-4 md:p-12 max-w-6xl mx-auto w-full h-screen flex flex-col space-y-8 overflow-hidden page-bg">

      {/* DESKTOP HEADER */}
      <div className="hidden md:flex shrink-0 items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Evaluation Report</h2>
          <p className="overline mt-1">Real-time Faculty Analytics</p>
        </div>
        <button
          onClick={() => setShowResetConfirm(true)}
          className="btn btn-ghost px-5 py-3 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20 rounded-xl font-semibold text-sm transition-all cursor-pointer active:scale-95"
        >
          Reset All Data
        </button>
      </div>

      {/* MOBILE ACTION STRIP */}
      <div className="md:hidden shrink-0">
        <button
          onClick={() => setShowResetConfirm(true)}
          className="w-full py-3 bg-rose-50 dark:bg-rose-500/8 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/15 rounded-xl font-semibold text-sm active:scale-95 transition-all"
        >
          Reset All Records
        </button>
      </div>

      {/* Results Grid - SCROLLABLE */}
      <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin space-y-6 pb-24 md:pb-8">
        {professors.map((prof, idx) => (
          <div
            key={idx}
            onClick={() => setSelectedProf(prof)}
            className="group card card-interactive p-6 sm:p-8 transition-all active:scale-[0.99] cursor-pointer"
          >
            <div className="flex flex-col gap-6">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white font-bold text-xl shadow-md shadow-indigo-500/20">
                  {prof.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight truncate">{prof.name}</h2>
                  <span className="text-xs font-medium text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded-md mt-1 inline-block border border-indigo-100 dark:border-indigo-500/15">
                    {prof.overallCount} Feedbacks
                  </span>
                </div>
                <div className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-500/8 px-4 py-3 rounded-xl border border-indigo-100 dark:border-indigo-500/15">
                  <span className="text-2xl font-black text-indigo-600 dark:text-indigo-300">{prof.finalAvg.toFixed(1)}</span>
                </div>
              </div>
              <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800/60 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-indigo-600 to-violet-500 transition-all duration-1000" style={{ width: `${(prof.finalAvg / 10) * 100}%` }} />
              </div>
            </div>
          </div>
        ))}

        {professors.length === 0 && (
          <div className="text-center py-24 card border-dashed">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No Evaluations Recorded</p>
          </div>
        )}
      </div>

      {/* --- DETAILS MODAL --- */}
      {selectedProf && (
        <div className={`fixed inset-0 z-[1000] flex items-end sm:items-center justify-center p-0 sm:p-4 transition-opacity duration-150 ${isExiting ? 'opacity-0' : 'opacity-100'}`}>
          <div className="absolute inset-0 bg-slate-900/30 dark:bg-black/50 backdrop-blur-xl" onClick={handleCloseModal} />
          <div className={`relative card-glass border-t sm:border border-slate-200/60 dark:border-indigo-500/8 w-full max-w-4xl rounded-t-2xl sm:rounded-2xl shadow-elevated overflow-hidden transition-all duration-300 transform h-[90vh] sm:h-auto ${isExiting ? 'translate-y-full' : 'translate-y-0'}`}>

            {/* Modal header */}
            <div className="p-8 border-b border-slate-100/60 dark:border-indigo-500/8 flex justify-between items-center glass-thick sticky top-0 z-10">
              <div className="max-w-[70%]">
                <p className="text-xs font-medium text-indigo-600 dark:text-indigo-300 uppercase tracking-wider mb-1">{selectedSubject ? `Subject: ${selectedSubject}` : "Performance Matrix"}</p>
                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white truncate">{selectedProf.name}</h2>
              </div>
              <div className="flex gap-3">
                {selectedSubject && (
                    <button onClick={() => {setSelectedSubject(null); setViewComments(false)}} className="p-3 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 rounded-xl border border-indigo-100 dark:border-indigo-500/15 active:scale-90 transition-all">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M11 15l-3-3m0 0l3-3m-3 3h8" /></svg>
                    </button>
                )}
                <button onClick={handleCloseModal} className="p-3 bg-slate-100 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 rounded-xl active:scale-90 transition-all hover:text-rose-500">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>

            {/* Modal body */}
            <div className="p-8 overflow-y-auto scrollbar-thin h-[calc(90vh-160px)] sm:h-auto min-h-[450px]">
              {!viewComments ? (
                <div className="h-full flex flex-col">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-8 text-center">Tap a subject bar to read feedback</p>
                  <div className="relative flex items-end justify-center gap-4 sm:gap-10 h-72 pb-16 overflow-x-auto scrollbar-thin">
                    {Object.entries(selectedProf.subjects).map(([subName, data], i) => {
                      const subAvg = (data.totalRating / data.count);
                      const isSelected = selectedSubject === subName;
                      return (
                        <div key={i} onClick={() => setSelectedSubject(subName)} className={`flex-1 min-w-[80px] flex flex-col items-center group relative h-full justify-end cursor-pointer transition-all ${selectedSubject && !isSelected ? 'opacity-20 scale-95' : 'opacity-100'}`}>
                          <div className={`w-12 sm:w-16 rounded-t-xl overflow-hidden relative border transition-all h-full ${isSelected ? 'border-indigo-400' : 'border-slate-200/60 dark:border-slate-700/60 bg-slate-100 dark:bg-slate-800/60'}`}>
                            <div className={`absolute bottom-0 w-full bg-gradient-to-t transition-all duration-1000 ${isSelected ? 'from-indigo-600 to-violet-400' : 'from-indigo-200 to-violet-200 dark:from-indigo-500/40 dark:to-violet-500/40'}`} style={{ height: `${(subAvg / 10) * 100}%` }} />
                          </div>
                          <div className="absolute -bottom-14 flex flex-col items-center w-full">
                            <span className={`text-sm font-bold ${isSelected ? 'text-indigo-600 dark:text-indigo-300' : 'text-slate-500 dark:text-slate-400'}`}>{subAvg.toFixed(1)}</span>
                            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate w-24 text-center mt-1.5">{subName}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {selectedSubject && (
                      <div className="mt-20 p-6 bg-indigo-50/60 dark:bg-indigo-500/6 border border-indigo-100/60 dark:border-indigo-500/12 rounded-2xl flex flex-col sm:flex-row justify-between items-center gap-4">
                          <div className="text-center sm:text-left">
                              <p className="text-xs font-medium text-indigo-600 dark:text-indigo-300 uppercase tracking-wider">Subject Insight</p>
                              <h4 className="text-slate-900 dark:text-slate-100 font-semibold text-sm">{selectedProf.subjects[selectedSubject].comments.length} Registered Responses</h4>
                          </div>
                          <button onClick={() => setViewComments(true)} className="w-full sm:w-auto btn btn-primary px-8 py-3 text-sm">View Comments</button>
                      </div>
                  )}
                </div>
              ) : (
                <div className="h-full animate-fade-in">
                    <h3 className="text-slate-900 dark:text-white font-semibold text-sm mb-6 flex items-center gap-3 sticky top-0 py-2 z-10">
                      <div className="w-8 h-px bg-indigo-500" /> Feedback History
                    </h3>
                    <div className="flex flex-col gap-4">
                        {selectedProf.subjects[selectedSubject].comments.map((comm, idx) => (
                            <div key={idx} className="card p-6 rounded-xl text-slate-600 dark:text-slate-300 text-sm leading-relaxed relative">
                               <span className="text-indigo-500/20 text-4xl absolute top-2 left-3 font-serif">&ldquo;</span>
                               <p className="relative z-10 pl-6">{comm}</p>
                            </div>
                        ))}
                    </div>
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div className="p-8 surface-muted flex justify-between items-center border-t border-slate-100/60 dark:border-indigo-500/8 mt-auto">
              <div className="card-glass px-6 py-3 rounded-xl border border-indigo-100/60 dark:border-indigo-500/12">
                <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-300 uppercase tracking-wider mb-1">Global Mean Score</p>
                <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">{selectedProf.finalAvg.toFixed(1)}</p>
              </div>
              <div className="flex gap-2">
                {[...Array(5)].map((_, n) => (
                  <div key={n} className={`w-8 h-1.5 rounded-full transition-colors ${n < Math.round(selectedProf.finalAvg / 2) ? 'bg-indigo-500 shadow-[0_0_12px_rgba(129,140,248,0.4)]' : 'bg-slate-200 dark:bg-slate-800/60'}`} />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Wipe Confirmation */}
      <Modal open={showResetConfirm} onClose={() => setShowResetConfirm(false)}>
        <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-4">Wipe Data?</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">Permanently delete all evaluations from the database.</p>
        <div className="grid grid-cols-2 gap-4">
          <button disabled={isResetting} onClick={() => setShowResetConfirm(false)} className="btn btn-ghost py-3 text-sm cursor-pointer">Cancel</button>
          <button disabled={isResetting} onClick={handleResetEvaluations} className="btn btn-danger py-3 text-sm cursor-pointer">
            {isResetting ? "..." : "Wipe"}
          </button>
        </div>
      </Modal>
    </div>
  )
}
