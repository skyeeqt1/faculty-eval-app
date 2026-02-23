'use client'
import { useState, useEffect, Suspense } from 'react'
import { db, auth } from '../../lib/firebase'
import { collection, getDocs, writeBatch, doc, serverTimestamp, getDoc, query, where } from 'firebase/firestore'
import { useRouter, useSearchParams } from 'next/navigation'
import { onAuthStateChanged } from 'firebase/auth'

export default function EvaluationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0f172a]">
        <div className="w-12 h-12 border-4 border-indigo-600/20 border-t-indigo-500 rounded-full animate-spin"></div>
      </div>
    }>
      <EvaluationContent />
    </Suspense>
  )
}

function EvaluationContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const selectedYear = searchParams.get('year')

  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [evaluations, setEvaluations] = useState([])
  const [isFormOpen, setIsFormOpen] = useState(true)
  const [hasAlreadyEvaluated, setHasAlreadyEvaluated] = useState(false)
  const [currentStudent, setCurrentStudent] = useState(null)
  
  const [modalConfig, setModalConfig] = useState({ 
    isOpen: false, 
    type: 'success', 
    title: '', 
    message: '', 
    callback: null,
    showCancel: false 
  })

  const [isConfirmingSubmit, setIsConfirmingSubmit] = useState(false)

  const showModal = (type, title, message, callback = null, showCancel = false) => {
    setModalConfig({ isOpen: true, type, title, message, callback, showCancel })
  }

  const closeModal = () => {
    setModalConfig({ ...modalConfig, isOpen: false })
  }

  useEffect(() => {
    const checkAccess = async () => {
      const sessionData = sessionStorage.getItem("studentSession")
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        const student = user ? { email: user.email } : (sessionData ? JSON.parse(sessionData) : null);
        if (!student) {
          router.replace('/')
          return
        }
        setCurrentStudent(student)
        if (!selectedYear) {
          router.replace('/StudentDashboard')
          return
        }
        await checkStatusAndFetch(student)
      })
      return () => unsubscribe()
    }

    const checkStatusAndFetch = async (student) => {
      try {
        const studentId = student.email.toLowerCase().trim();
        
    // Check if already evaluated
        const statusRef = doc(db, "submissionStatus", studentId)
        const statusSnap = await getDoc(statusRef)
        if (statusSnap.exists()) {
          setHasAlreadyEvaluated(true)
          setFetching(false)
          return
        }

    // Check form settings
        const settingsRef = doc(db, "settings", "formConfig")
        const settingsSnap = await getDoc(settingsRef)
        if (settingsSnap.exists()) {
          setIsFormOpen(settingsSnap.data().isOpen)
        }

        // FETCH PROFESSORS
        const cleanYear = decodeURIComponent(selectedYear).trim();
        
        // Query assigned years
        const profQuery = query(
          collection(db, "professors"), 
          where("assignedYears", "array-contains", cleanYear) 
        )
        
        const querySnapshot = await getDocs(profQuery)

        const profList = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            name: data.name,
            image: data.imageUrl || "",
            subjects: data.subjects || []
          }
        })

        setEvaluations(profList.map(p => ({
          ...p,
          selectedSubject: '',
          rating: 5,
          comment: ''
        })))

      } catch (error) {
        console.error("Error fetching data:", error)
      } finally {
        setFetching(false)
      }
    }

    checkAccess()
  }, [router, selectedYear])

  const updateEval = (index, field, value) => {
    const newEvals = [...evaluations]
    newEvals[index][field] = value
    setEvaluations(newEvals)
  }

  const initiateSubmission = () => {
    const incomplete = evaluations.some(e => e.selectedSubject === '')
    if (incomplete) {
      showModal('warning', 'Form Incomplete', 'Please select the subject for every faculty member before submitting.')
      return
    }
    setIsConfirmingSubmit(true)
  }

  const handleFinalSubmit = async () => {
    setIsConfirmingSubmit(false)
    if (!currentStudent) {
        showModal('error', 'Session Expired', 'Please log in again to continue.', () => router.push('/'))
        return
    }
    setLoading(true)
    const batch = writeBatch(db)
    const studentId = currentStudent.email.toLowerCase().trim();
    try {
      evaluations.forEach((item) => {
        const docRef = doc(collection(db, "evaluations"))
        batch.set(docRef, {
          professorName: item.name,
          subject: item.selectedSubject,
          yearLevel: selectedYear,
          rating: Number(item.rating),
          comment: item.comment.trim() || "No comment provided",
          submittedAt: serverTimestamp(),
          isAnonymous: true
        })
      })
      const statusRef = doc(db, "submissionStatus", studentId)
      batch.set(statusRef, { hasEvaluate: true, EvaluateAt: serverTimestamp(), email: studentId })
      await batch.commit()
      showModal('success', 'Success', 'Your evaluations have been securely transmitted.', () => router.push('/StudentDashboard'))
    } catch (error) {
      showModal('error', 'Transmission Failed', "Could not save your evaluation.")
    } finally {
      setLoading(false)
    }
  }

  if (fetching) return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f172a]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-indigo-600/20 border-t-indigo-500 rounded-full animate-spin"></div>
        <p className="text-slate-500 font-black text-[10px] uppercase tracking-[0.3em]">Loading Faculty...</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0f172a] p-4 md:p-12 flex flex-col items-center text-slate-200 relative overflow-hidden">
      {modalConfig.isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-white/10 w-full max-w-sm rounded-[2rem] p-8 shadow-2xl text-center">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 ${modalConfig.type === 'success' ? 'bg-emerald-500/10 text-emerald-500' : modalConfig.type === 'warning' ? 'bg-amber-500/10 text-amber-500' : 'bg-rose-500/10 text-rose-500'}`}>
              {modalConfig.type === 'success' && <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"/></svg>}
              {modalConfig.type === 'warning' && <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>}
              {modalConfig.type === 'error' && <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>}
            </div>
            <h3 className="text-white font-black uppercase italic tracking-tighter text-xl mb-2">{modalConfig.title}</h3>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wide leading-relaxed mb-8">{modalConfig.message}</p>
            <button onClick={() => { if (modalConfig.callback) modalConfig.callback(); closeModal(); }} className="cursor-pointer w-full bg-indigo-600 hover:bg-indigo-500 text-white py-4 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg">Continue</button>
          </div>
        </div>
      )}

      {isConfirmingSubmit && (
        <div className="fixed inset-0 z-[105] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <div className="bg-slate-900 border border-white/5 w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent"></div>
                <div className="w-20 h-20 bg-indigo-500/10 text-indigo-400 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-indigo-500/20 shadow-inner"><svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg></div>
                <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter mb-4">Confirm Submission?</h3>
                <p className="text-slate-400 text-[11px] font-bold uppercase tracking-widest leading-loose mb-10">You are about to submit evaluations for <span className="text-indigo-400">{evaluations.length}</span> faculty members.</p>
                <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => setIsConfirmingSubmit(false)} className="cursor-pointer bg-slate-800 hover:bg-slate-700 text-slate-400 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all">Cancel</button>
                    <button onClick={handleFinalSubmit} className="cursor-pointer bg-indigo-600 hover:bg-indigo-500 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg">Confirm</button>
                </div>
            </div>
        </div>
      )}

      <div className="w-full max-w-4xl z-10">
        {(hasAlreadyEvaluated || !isFormOpen) ? (
            <div className="min-h-[70vh] flex items-center justify-center text-center">
                 <div className="bg-slate-900 p-10 rounded-[2.5rem] shadow-2xl border border-white/5 max-w-md w-full">
                    <div className="w-16 h-16 bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6"><svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>
                    <h1 className="text-xl font-black mb-3 uppercase italic text-white tracking-wider">{hasAlreadyEvaluated ? "Evaluation Complete" : "Access Denied"}</h1>
                    <p className="text-slate-400 mb-8 text-xs leading-relaxed font-medium uppercase tracking-wide">{hasAlreadyEvaluated ? "Submission detected for this academic term." : "The evaluation portal is currently locked."}</p>
                    <button onClick={() => router.push('/StudentDashboard')} className="cursor-pointer w-full bg-indigo-600 hover:bg-indigo-500 text-white py-4 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] transition-all">Return to Dashboard</button>
                </div>
            </div>
        ) : (
          <>
            <button onClick={() => router.push('/StudentDashboard')} className="cursor-pointer flex items-center gap-2 mb-8 text-slate-500 hover:text-indigo-400 font-black text-[10px] uppercase tracking-widest transition-colors"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>Return to Dashboard</button>
            <div className="bg-slate-900 rounded-[2.5rem] shadow-2xl p-10 mb-12 text-center border border-white/5 relative overflow-hidden">
              <h2 className="text-3xl font-black uppercase italic tracking-tighter text-white"><span className="text-indigo-500">{selectedYear}</span> Faculty Evaluation</h2>
              <p className="text-slate-500 mt-3 font-bold uppercase tracking-[0.2em] text-[10px]">Encryption Active • Responses Anonymous</p>
            </div>
            <div className="space-y-10">
              {evaluations.length === 0 ? (
                <div className="text-center py-20 bg-slate-900 rounded-[2.5rem] border border-dashed border-white/10"><p className="text-slate-500 font-black uppercase tracking-widest text-[10px]">No Faculty Data assigned to {selectedYear}.</p></div>
              ) : (
                evaluations.map((item, index) => (
                    <div key={index} className="bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl border border-white/5 relative group transition-all hover:border-indigo-500/20">
                      <div className="flex flex-col lg:flex-row gap-10">
                        <div className="lg:w-1/4 flex flex-col items-center lg:items-start"><img src={item.image || `https://ui-avatars.com/api/?name=${item.name}`} className="w-24 h-24 rounded-2xl mb-4 object-cover border-2 border-slate-800 shadow-xl" alt={item.name} /><h3 className="font-black text-center lg:text-left leading-tight text-white uppercase italic text-sm tracking-wide">{item.name}</h3><span className="text-[9px] text-indigo-400 font-black uppercase mt-2 tracking-widest bg-indigo-500/10 px-2 py-1 rounded-md">Instructor</span></div>
                        <div className="flex-1 w-full space-y-6">
                          <div><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-3 ml-1">Assigned Subject</label><select required value={item.selectedSubject} onChange={(e) => updateEval(index, 'selectedSubject', e.target.value)} className="cursor-pointer w-full bg-slate-800 p-4 rounded-xl border border-slate-700 outline-none focus:border-indigo-500 font-bold text-xs text-white transition-all appearance-none"><option value="">-- SELECT SUBJECT --</option>{item.subjects.map((sub, i) => (<option key={i} value={sub}>{sub}</option>))}</select></div>
                          <div><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-3 ml-1">Efficiency Rating (1-10)</label><div className="grid grid-cols-5 md:grid-cols-10 gap-2">{[...Array(10)].map((_, i) => (<button key={i+1} onClick={() => updateEval(index, 'rating', i+1)} className={`cursor-pointer h-10 rounded-xl font-black text-[10px] transition-all border-2 ${item.rating === i+1 ? 'bg-indigo-600 border-indigo-600 text-white shadow-[0_0_15px_rgba(79,70,229,0.3)] scale-105' : 'bg-slate-800 border-slate-700 text-slate-500 hover:border-slate-600 hover:text-slate-300'}`}>{i+1}</button>))}</div></div>
                          <div><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-3 ml-1">Performance Feedback</label><textarea className="w-full bg-slate-800 p-5 rounded-2xl outline-none border border-slate-700 focus:border-indigo-500 text-xs text-white min-h-[120px] transition-all placeholder:text-slate-600" placeholder="ENTERING SECURE FEEDBACK DATA..." value={item.comment} onChange={(e) => updateEval(index, 'comment', e.target.value)} /></div>
                        </div>
                      </div>
                    </div>
                  ))
              )}
            </div>
            <button onClick={initiateSubmission} disabled={loading || evaluations.length === 0} className="cursor-pointer w-full mt-16 bg-indigo-600 hover:bg-indigo-500 text-white py-6 rounded-3xl font-black uppercase tracking-[0.3em] text-xs shadow-2xl active:scale-[0.98] mb-20">{loading ? "Transmitting Data..." : "Finalize & Submit All"}</button>
          </>
        )}
      </div>
    </div>
  )
}