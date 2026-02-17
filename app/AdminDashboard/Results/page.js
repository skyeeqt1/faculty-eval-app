'use client'
import { useState, useEffect } from 'react'
import { db } from '../../../lib/firebase'
import { 
  collection, onSnapshot, query, orderBy, getDocs, writeBatch, doc 
} from 'firebase/firestore'

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
    const q = query(collection(db, "evaluations"), orderBy("submittedAt", "desc"))
    const unsubscribeData = onSnapshot(q, (snapshot) => {
      const allEvals = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      
      const grouped = allEvals.reduce((acc, curr) => {
        const profName = curr.professorName || "Unknown Professor"
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
      setLoading(false)
    })

    return () => unsubscribeData()
  }, [])

  const handleResetEvaluations = async () => {
    setIsResetting(true)
    try {
      const querySnapshot = await getDocs(collection(db, "evaluations"))
      const batch = writeBatch(db)
      querySnapshot.forEach((document) => batch.delete(doc(db, "evaluations", document.id)))
      await batch.commit()
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
    <div className="flex-1 flex items-center justify-center bg-[#0f172a]">
      <div className="text-indigo-400 font-black uppercase tracking-[0.3em]">Analyzing Results...</div>
    </div>
  )

  return (
    <div className="p-4 md:p-12 max-w-6xl mx-auto w-full h-screen flex flex-col space-y-8 overflow-hidden">
      
      {/* DESKTOP HEADER - Hidden on Mobile because AdminLayout covers it */}
      <div className="hidden md:flex shrink-0 items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-black text-white uppercase italic tracking-tight">Evaluation Report</h2>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-1">Real-time Faculty Analytics</p>
        </div>
        <button 
          onClick={() => setShowResetConfirm(true)} 
          className="px-6 py-4 bg-rose-600/10 hover:bg-rose-500 hover:text-white border border-rose-500/20 rounded-2xl text-[10px] font-black text-rose-500 uppercase tracking-widest transition-all cursor-pointer active:scale-95"
        >
          Reset All Data
        </button>
      </div>

      {/* MOBILE ACTION STRIP - Reset Button only for mobile */}
      <div className="md:hidden shrink-0">
        <button 
          onClick={() => setShowResetConfirm(true)} 
          className="w-full py-4 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all"
        >
          Reset All Records
        </button>
      </div>

      {/* Results Grid - SCROLLABLE */}
      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-6 pb-24 md:pb-8">
        {professors.map((prof, idx) => (
          <div 
            key={idx} 
            onClick={() => setSelectedProf(prof)}
            className="group bg-slate-900/50 border border-white/5 rounded-[2.5rem] p-6 sm:p-8 hover:border-indigo-500/30 transition-all active:scale-[0.99] cursor-pointer shadow-xl backdrop-blur-sm"
          >
            <div className="flex flex-col gap-6">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 rounded-2xl bg-slate-800 flex items-center justify-center text-indigo-400 font-black text-xl border border-white/5 group-hover:border-indigo-500/20">
                  {prof.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-black text-slate-200 uppercase italic tracking-tight truncate">{prof.name}</h2>
                  <span className="text-[9px] text-indigo-500 font-black uppercase tracking-widest bg-indigo-500/10 px-2 py-0.5 rounded-md mt-1 inline-block">
                    {prof.overallCount} Feedbacks
                  </span>
                </div>
                <div className="flex items-center gap-2 bg-black/40 px-4 py-3 rounded-2xl border border-white/5">
                  <span className="text-2xl font-black text-white italic">{prof.finalAvg.toFixed(1)}</span>
                </div>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-indigo-600 to-violet-500 transition-all duration-1000" style={{ width: `${(prof.finalAvg / 10) * 100}%` }} />
              </div>
            </div>
          </div>
        ))}
        
        {professors.length === 0 && (
          <div className="text-center py-24 bg-slate-900/30 rounded-[2.5rem] border border-dashed border-white/5">
            <p className="text-slate-600 font-black uppercase tracking-[0.3em] text-[10px] italic">No Evaluations Recorded</p>
          </div>
        )}
      </div>

      {/* --- DETAILS MODAL --- */}
      {selectedProf && (
        <div className={`fixed inset-0 z-[1000] flex items-end sm:items-center justify-center p-0 sm:p-4 transition-opacity duration-150 ${isExiting ? 'opacity-0' : 'opacity-100'}`}>
          <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md" onClick={handleCloseModal} />
          <div className={`relative bg-[#111827] border-t sm:border border-white/10 w-full max-w-4xl rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden transition-all duration-300 transform h-[90vh] sm:h-auto ${isExiting ? 'translate-y-full' : 'translate-y-0'}`}>
            
            <div className="p-8 border-b border-white/5 flex justify-between items-center bg-slate-900/40 sticky top-0 z-10">
              <div className="max-w-[70%]">
                <p className="text-indigo-400 text-[9px] font-black uppercase tracking-[0.2em] mb-1">{selectedSubject ? `Subject: ${selectedSubject}` : "Performance Matrix"}</p>
                <h2 className="text-xl sm:text-2xl font-black text-white uppercase italic truncate">{selectedProf.name}</h2>
              </div>
              <div className="flex gap-3">
                {selectedSubject && (
                    <button onClick={() => {setSelectedSubject(null); setViewComments(false)}} className="p-4 bg-indigo-500/10 text-indigo-400 rounded-2xl border border-indigo-500/20 active:scale-90 transition-all">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M11 15l-3-3m0 0l3-3m-3 3h8" /></svg>
                    </button>
                )}
                <button onClick={handleCloseModal} className="p-4 bg-white/5 text-slate-400 rounded-2xl active:scale-90 transition-all hover:text-rose-500">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>

            <div className="p-8 overflow-y-auto custom-scrollbar h-[calc(90vh-160px)] sm:h-auto min-h-[450px]">
              {!viewComments ? (
                <div className="h-full flex flex-col">
                  <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-12 text-center italic">Tap a subject bar to read feedback</p>
                  <div className="relative flex items-end justify-center gap-4 sm:gap-10 h-72 pb-16 overflow-x-auto custom-scrollbar">
                    {Object.entries(selectedProf.subjects).map(([subName, data], i) => {
                      const subAvg = (data.totalRating / data.count);
                      const isSelected = selectedSubject === subName;
                      return (
                        <div key={i} onClick={() => setSelectedSubject(subName)} className={`flex-1 min-w-[80px] flex flex-col items-center group relative h-full justify-end cursor-pointer transition-all ${selectedSubject && !isSelected ? 'opacity-20 scale-95' : 'opacity-100'}`}>
                          <div className={`w-12 sm:w-16 rounded-t-2xl overflow-hidden relative border transition-all h-full ${isSelected ? 'border-indigo-400' : 'border-white/5 bg-slate-800/40'}`}>
                            <div className={`absolute bottom-0 w-full bg-gradient-to-t transition-all duration-1000 ${isSelected ? 'from-indigo-600 to-violet-400' : 'from-slate-700 to-slate-500'}`} style={{ height: `${(subAvg / 10) * 100}%` }} />
                          </div>
                          <div className="absolute -bottom-14 flex flex-col items-center w-full">
                            <span className={`text-sm font-black italic ${isSelected ? 'text-indigo-400' : 'text-slate-300'}`}>{subAvg.toFixed(1)}</span>
                            <span className="text-[7px] font-black text-slate-600 uppercase truncate w-24 text-center mt-1.5 tracking-tighter">{subName}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {selectedSubject && (
                      <div className="mt-20 p-6 bg-indigo-600/5 border border-indigo-500/10 rounded-[2rem] flex flex-col sm:flex-row justify-between items-center gap-4">
                          <div className="text-center sm:text-left">
                              <p className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.2em]">Subject Insight</p>
                              <h4 className="text-white font-bold text-sm">{selectedProf.subjects[selectedSubject].comments.length} Registered Responses</h4>
                          </div>
                          <button onClick={() => setViewComments(true)} className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-600/20">View Comments</button>
                      </div>
                  )}
                </div>
              ) : (
                <div className="h-full animate-in fade-in slide-in-from-bottom-4">
                    <h3 className="text-white font-black uppercase text-[10px] italic tracking-[0.3em] mb-8 flex items-center gap-3 sticky top-0 bg-[#111827] py-2 z-10">
                      <div className="w-8 h-px bg-indigo-500" /> Feedback History
                    </h3>
                    <div className="flex flex-col gap-4">
                        {selectedProf.subjects[selectedSubject].comments.map((comm, idx) => (
                            <div key={idx} className="bg-white/[0.03] p-6 rounded-[1.5rem] border border-white/5 text-slate-300 text-xs leading-relaxed italic relative">
                               <span className="text-indigo-500/20 text-4xl absolute top-2 left-3 font-serif">“</span>
                               <p className="relative z-10 pl-6">{comm}</p>
                            </div>
                        ))}
                    </div>
                </div>
              )}
            </div>

            <div className="p-8 bg-black/40 flex justify-between items-center border-t border-white/5 mt-auto">
              <div className="bg-indigo-600/10 px-6 py-3 rounded-2xl border border-indigo-500/20">
                <p className="text-[8px] font-black text-indigo-400 uppercase tracking-widest mb-1">Global Mean Score</p>
                <p className="text-2xl font-black text-white italic tracking-tighter">{selectedProf.finalAvg.toFixed(1)}</p>
              </div>
              <div className="flex gap-2">
                {[...Array(5)].map((_, n) => (
                  <div key={n} className={`w-8 h-1.5 rounded-full ${n < Math.round(selectedProf.finalAvg / 2) ? 'bg-indigo-500 shadow-[0_0_12px_rgba(129,140,248,0.4)]' : 'bg-slate-800'}`} />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Wipe Confirmation */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-md">
          <div className="bg-slate-900 border border-rose-500/20 rounded-[2.5rem] p-10 max-w-sm w-full shadow-2xl text-center">
            <h3 className="text-2xl font-black text-white uppercase italic mb-4">Wipe Data?</h3>
            <p className="text-slate-500 text-[10px] mb-10 font-bold uppercase tracking-widest leading-relaxed">Permanently delete all evaluations from the database.</p>
            <div className="grid grid-cols-2 gap-4">
              <button disabled={isResetting} onClick={() => setShowResetConfirm(false)} className="py-4 bg-slate-800 text-slate-400 rounded-2xl font-black text-[10px] uppercase cursor-pointer">Cancel</button>
              <button disabled={isResetting} onClick={handleResetEvaluations} className="py-4 bg-rose-600 text-white rounded-2xl font-black text-[10px] uppercase cursor-pointer shadow-lg shadow-rose-600/20">
                {isResetting ? "..." : "Wipe"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(99, 102, 241, 0.2); border-radius: 20px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(99, 102, 241, 0.4); }
      `}</style>
    </div>
  )
}