'use client'
import { useState, useEffect } from 'react'
import { db, auth } from '../../../lib/firebase'
import { 
  collection, onSnapshot, query, orderBy, getDocs, writeBatch, doc 
} from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'
import { useRouter } from 'next/navigation'

export default function RealTimeResults() {
  const [professors, setProfessors] = useState([])
  const [loading, setLoading] = useState(true)
  const [authLoading, setAuthLoading] = useState(true) 
  
  const [selectedProf, setSelectedProf] = useState(null)
  const [selectedSubject, setSelectedSubject] = useState(null) 
  const [viewComments, setViewComments] = useState(false)
  const [isExiting, setIsExiting] = useState(false)
  
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  
  const router = useRouter()

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (!user || user.email.toLowerCase() !== "admintest@gmail.com") {
        router.replace('/')
      } else {
        setAuthLoading(false)
      }
    })

    const q = query(collection(db, "evaluations"), orderBy("submittedAt", "desc"))
    const unsubscribeData = onSnapshot(q, (snapshot) => {
      const allEvals = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      
      const grouped = allEvals.reduce((acc, curr) => {
        const profName = curr.professorName || "Unknown Professor"
        const subjectName = curr.subject || "General"
        const ratingValue = parseFloat(curr.rating) || 0
        const comment = curr.comment ? curr.comment.trim() : ""

        if (!acc[profName]) {
          acc[profName] = {
            name: profName,
            overallTotalScore: 0,
            overallCount: 0,
            subjects: {}
          }
        }

        if (!acc[profName].subjects[subjectName]) {
          acc[profName].subjects[subjectName] = { 
            totalRating: 0, 
            count: 0,
            comments: [] 
          }
        }

        acc[profName].subjects[subjectName].totalRating += ratingValue
        acc[profName].subjects[subjectName].count += 1
        
        if(comment && comment !== "No comment provided") {
            acc[profName].subjects[subjectName].comments.push(comment)
        }
        
        acc[profName].overallTotalScore += ratingValue
        acc[profName].overallCount += 1
        
        return acc
      }, {})

      const result = Object.values(grouped).map(prof => ({
        ...prof,
        finalAvg: prof.overallCount > 0 ? prof.overallTotalScore / prof.overallCount : 0
      })).sort((a, b) => b.finalAvg - a.finalAvg);

      setProfessors(result)
      setLoading(false)
    }, (error) => {
      console.error("Firestore Error:", error)
      setLoading(false)
    })

    return () => {
      unsubscribeAuth()
      unsubscribeData()
    }
  }, [router])

  const handleResetEvaluations = async () => {
    setIsResetting(true)
    try {
      const querySnapshot = await getDocs(collection(db, "evaluations"))
      const batch = writeBatch(db)
      querySnapshot.forEach((document) => {
        batch.delete(doc(db, "evaluations", document.id))
      })
      await batch.commit()
      setShowResetConfirm(false)
    } catch (error) {
      console.error("Reset failed:", error)
    } finally {
      setIsResetting(false)
    }
  }

  const handleClose = () => {
    setIsExiting(true)
    setTimeout(() => {
      setSelectedProf(null); setSelectedSubject(null);
      setViewComments(false); setIsExiting(false);
    }, 150)
  }

  if (authLoading) return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-indigo-400 font-black uppercase tracking-widest text-[9px] animate-pulse">Verifying Session...</p>
      </div>
    </div>
  )

  if (loading) return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-indigo-400 font-black uppercase tracking-widest text-[9px]">Analyzing Faculty...</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 p-4 md:p-8 relative overflow-x-hidden font-sans pb-24 md:pb-8">
      
      {/* Background Glow matched to Indigo theme */}
      <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-indigo-600/10 blur-[100px] pointer-events-none" />

      {/* --- RESET CONFIRMATION MODAL --- */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm" onClick={() => !isResetting && setShowResetConfirm(false)} />
          <div className="relative bg-[#111827] border border-rose-500/20 w-full max-w-sm rounded-[2rem] p-8 shadow-2xl text-center">
            <div className="w-16 h-16 bg-rose-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </div>
            <h3 className="text-xl font-black text-white uppercase tracking-tight mb-2">Clear All Data?</h3>
            <p className="text-slate-400 text-xs mb-8 leading-relaxed">This action will permanently delete every student evaluation in the database. This cannot be undone.</p>
            <div className="grid grid-cols-2 gap-3">
              <button disabled={isResetting} onClick={() => setShowResetConfirm(false)} className="cursor-pointer py-4 bg-slate-800 text-slate-400 rounded-2xl font-black text-[9px] uppercase tracking-widest active:scale-95 transition-all">Cancel</button>
              <button disabled={isResetting} onClick={handleResetEvaluations} className="cursor-pointer py-4 bg-rose-600 text-white rounded-2xl font-black text-[9px] uppercase tracking-widest active:scale-95 transition-all shadow-lg shadow-rose-600/20">{isResetting ? "Wiping..." : "Yes, Reset"}</button>
            </div>
          </div>
        </div>
      )}

      {/* --- PROFESSOR DETAILS MODAL --- */}
      {selectedProf && (
        <div className={`fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 transition-opacity duration-150 ${isExiting ? 'opacity-0' : 'opacity-100'}`}>
          <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md" onClick={handleClose} />
          <div className={`relative bg-[#111827] border-t sm:border border-white/10 w-full max-w-4xl rounded-t-[2rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden transition-all duration-200 transform ${isExiting ? 'translate-y-full' : 'translate-y-0'}`}>
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-slate-900/40">
              <div className="max-w-[80%]">
                <p className="text-indigo-400 text-[9px] font-black uppercase tracking-[0.2em] mb-1">{selectedSubject ? `Subject: ${selectedSubject}` : "Performance Matrix"}</p>
                <h2 className="text-xl sm:text-2xl font-black text-white truncate">{selectedProf.name}</h2>
              </div>
              <div className="flex gap-2">
                {selectedSubject && (
                    <button onClick={() => {setSelectedSubject(null); setViewComments(false)}} className="cursor-pointer p-3 bg-indigo-500/10 text-indigo-400 rounded-2xl active:scale-90 transition-all border border-indigo-500/20">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M11 15l-3-3m0 0l3-3m-3 3h8M3 12a9 9 0 1118 0 9 9 0 0118 0z" /></svg>
                    </button>
                )}
                <button onClick={handleClose} className="cursor-pointer p-3 bg-white/5 rounded-2xl active:scale-90 transition-all">
                    <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>

            <div className="p-8 min-h-[400px]">
              {!viewComments ? (
                <div className="h-full">
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-10 text-center">Tap a bar to view subject ratings & comments</p>
                  <div className="relative flex items-end justify-start gap-8 h-64 pb-12 overflow-x-auto scrollbar-hide">
                    {Object.entries(selectedProf.subjects).map(([subName, data], i) => {
                      const subAvg = (data.totalRating / data.count);
                      const isSelected = selectedSubject === subName;
                      return (
                        <div key={i} onClick={() => {setSelectedSubject(subName); setViewComments(false);}} className={`flex-1 min-w-[70px] flex flex-col items-center group relative h-full justify-end cursor-pointer transition-all ${selectedSubject && !isSelected ? 'opacity-20' : 'opacity-100'}`}>
                          <div className={`w-12 sm:w-16 rounded-t-xl overflow-hidden relative border transition-all h-full ${isSelected ? 'border-indigo-400 ring-4 ring-indigo-500/20' : 'border-white/5 bg-slate-800/40'}`}>
                            <div className={`absolute bottom-0 w-full bg-gradient-to-t transition-all duration-1000 ${isSelected ? 'from-indigo-500 to-violet-400 shadow-[0_0_20px_rgba(129,140,248,0.5)]' : 'from-slate-700 to-slate-500'}`} style={{ height: `${(subAvg / 10) * 100}%` }} />
                          </div>
                          <div className="absolute -bottom-10 flex flex-col items-center w-full">
                            <span className={`text-xs font-black italic ${isSelected ? 'text-indigo-400' : 'text-white'}`}>{subAvg.toFixed(1)}</span>
                            <span className="text-[7px] font-bold text-slate-500 uppercase truncate w-20 text-center mt-0.5">{subName}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {selectedSubject && (
                      <div className="mt-16 p-6 bg-indigo-600/5 border border-indigo-500/10 rounded-3xl flex justify-between items-center animate-pop-in">
                          <div>
                              <p className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.2em]">Subject Insight</p>
                              <h4 className="text-white font-bold">{selectedProf.subjects[selectedSubject].comments.length} Responses</h4>
                          </div>
                          {selectedProf.subjects[selectedSubject].comments.length > 0 ? (
                            <button onClick={() => setViewComments(true)} className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-indigo-600/20 cursor-pointer">View Subject Comments</button>
                          ) : (
                            <span className="text-[9px] font-black text-slate-600 uppercase border border-white/5 px-4 py-2 rounded-xl">No specific comments found</span>
                          )}
                      </div>
                  )}
                </div>
              ) : (
                <div className="animate-pop-in h-full">
                    <h3 className="text-white font-black uppercase text-xs italic tracking-widest mb-6">Student Feedback for {selectedSubject}</h3>
                    <div className="space-y-4 max-h-[300px] overflow-y-auto pr-4 custom-scrollbar">
                        {selectedProf.subjects[selectedSubject].comments.map((comm, idx) => (
                            <div key={idx} className="bg-white/5 p-4 rounded-2xl border border-white/5 text-slate-300 text-xs leading-relaxed italic">"{comm}"</div>
                        ))}
                    </div>
                </div>
              )}
            </div>

            <div className="p-6 bg-black/40 flex justify-between items-center">
              <div className="bg-indigo-600/10 px-4 py-2 rounded-xl border border-indigo-500/20">
                <p className="text-[8px] font-black text-indigo-400 uppercase tracking-tighter">Total Mean Score</p>
                <p className="text-xl font-black text-white italic">{selectedProf.finalAvg.toFixed(1)}</p>
              </div>
              <div className="flex gap-1">
                {[...Array(5)].map((_, n) => (
                  <div key={n} className={`w-6 h-1 rounded-full ${n < Math.round(selectedProf.finalAvg / 2) ? 'bg-indigo-500 shadow-[0_0_8px_rgba(129,140,248,0.5)]' : 'bg-slate-800'}`} />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MAIN PAGE --- */}
      <div className={`max-w-6xl mx-auto relative z-10 transition-all duration-500 ${selectedProf || showResetConfirm ? 'blur-xl scale-95' : ''}`}>
        
        {/* Navigation Row - EXACT MATCH TO STUDENT LIST */}
        <div className="flex justify-between items-center mb-6">
          <button 
            onClick={() => router.push('/AdminDashboard')} 
            className="cursor-pointer text-[#818cf8] text-[10px] font-black uppercase tracking-[0.25em] flex items-center gap-2 group transition-colors hover:text-indigo-300"
          >
            <span className="text-sm group-hover:-translate-x-1 transition-transform duration-200">←</span>
            <span>Dashboard</span>
          </button>

          <button 
            onClick={() => setShowResetConfirm(true)} 
            className="cursor-pointer px-6 py-2 bg-rose-600/10 hover:bg-rose-600/20 border border-rose-500/20 rounded-full text-[9px] font-black text-rose-500 uppercase tracking-widest transition-all"
          >
            Reset System
          </button>
        </div>

        {/* Title Header Card */}
        <div className="bg-slate-900/60 p-6 sm:p-8 rounded-[2rem] border border-white/10 backdrop-blur-md mb-8">
            <h1 className="text-2xl font-black text-white uppercase tracking-tighter">
              Evaluation<span className="text-indigo-500 italic">Report</span>
            </h1>
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">
              Real-time Faculty Analytics
            </p>
        </div>

        {/* Professor List Grid */}
        <div className="grid grid-cols-1 gap-4 sm:gap-6">
          {professors.map((prof, idx) => (
            <div 
              key={idx} 
              onClick={() => setSelectedProf(prof)}
              className="group bg-slate-900/50 border border-white/5 rounded-[1.8rem] sm:rounded-[2.5rem] p-5 sm:p-8 hover:border-indigo-500/30 transition-all active:scale-[0.98] cursor-pointer shadow-xl"
            >
              <div className="flex flex-col gap-5">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-indigo-400 font-black text-lg border border-white/5 group-hover:border-indigo-500/20">
                    {prof.name.charAt(0)}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <h2 className="text-lg font-bold text-white truncate">{prof.name}</h2>
                    <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest">{prof.overallCount} Feedbacks</p>
                  </div>
                  <div className="flex items-center gap-2 bg-black/40 px-3 py-2 rounded-xl border border-white/5">
                    <span className="text-xl font-black text-white italic">{prof.finalAvg.toFixed(1)}</span>
                  </div>
                </div>
                <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 group-hover:bg-indigo-400 transition-colors" style={{ width: `${(prof.finalAvg / 10) * 100}%` }} />
                </div>
              </div>
            </div>
          ))}
          {professors.length === 0 && (
            <div className="text-center py-20 bg-slate-900/30 rounded-[2.5rem] border border-dashed border-white/5">
              <p className="text-slate-500 font-black uppercase tracking-widest text-xs">No Evaluations Recorded Yet</p>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes pop-in { 0% { opacity: 0; transform: scale(0.95); } 100% { opacity: 1; transform: scale(1); } }
        .animate-pop-in { animation: pop-in 0.2s ease-out forwards; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
      `}</style>
    </div>
  )
}