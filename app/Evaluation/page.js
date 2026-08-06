'use client'
import { useState, useEffect, Suspense } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import Modal from '../../components/ui/Modal'
import { generateUUID, safeParse, safeParseObject } from '../../lib/utils'

export default function EvaluationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen page-bg flex flex-col items-center justify-center gap-4">
        <div className="relative w-10 h-10">
          <div className="absolute inset-0 border-[3px] border-indigo-500/10 rounded-full" />
          <div className="absolute inset-0 border-[3px] border-transparent border-t-indigo-600 dark:border-t-indigo-400 rounded-full animate-spin" />
        </div>
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
  const studentBlock = searchParams.get('block')

  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [evaluations, setEvaluations] = useState([])
  const [isFormOpen, setIsFormOpen] = useState(true)
  const [hasAlreadyEvaluated, setHasAlreadyEvaluated] = useState(false)
  const [currentStudent, setCurrentStudent] = useState(null)
  const [currentSemester, setCurrentSemester] = useState('1st Semester')

  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    type: 'success',
    title: '',
    message: '',
    callback: null,
    showCancel: false
  })

  const [isConfirmingSubmit, setIsConfirmingSubmit] = useState(false)
  const [showBackConfirm, setShowBackConfirm] = useState(false)

  const showModal = (type, title, message, callback = null, showCancel = false) => {
    setModalConfig({ isOpen: true, type, title, message, callback, showCancel })
  }

  const closeModal = () => {
    setModalConfig({ ...modalConfig, isOpen: false })
  }

  useEffect(() => {
    const handlePopState = (event) => {
      const hasChanges = evaluations.some(e => e.rating !== 5 || e.comment.trim() !== '')
      if (hasChanges) {
        event.preventDefault()
        setShowBackConfirm(true)
        window.history.pushState(null, '', window.location.href)
      }
    }

    window.history.pushState(null, '', window.location.href)
    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [evaluations])

  useEffect(() => {
    const checkAccess = async () => {
      const sessionData = sessionStorage.getItem("studentSession")
      const student = sessionData ? JSON.parse(sessionData) : null

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
    }

    checkAccess()
  }, [router, selectedYear])

  const checkStatusAndFetch = async (student) => {
    try {
      const studentId = student.email.toLowerCase().trim();

      try {
        const { data: statusData } = await supabase
          .from("submissionstatus")
          .select("*")
          .eq("email", studentId)
          .single()

        if (statusData && statusData.hasevaluate) {
          setHasAlreadyEvaluated(true)
          setFetching(false)
          return
        }
      } catch (e) {
        // Status check skipped
      }

      const { data: settingsData } = await supabase
        .from("settings")
        .select("*")
        .eq("id", "formConfig")
        .single()

      let semester = '1st Semester'
      if (settingsData) {
        setIsFormOpen(settingsData.isopen)
        semester = settingsData.semester || '1st Semester'
        setCurrentSemester(semester)
      }

      const cleanYear = decodeURIComponent(selectedYear).trim();

      let semesterSubjects = []
      try {
        const { data: subjectsData } = await supabase
          .from("subjects")
          .select("name")
          .eq("semester", semester)
          .eq("yearlevel", cleanYear)

        semesterSubjects = subjectsData?.map(doc => doc.name) || []
      } catch (err) {
        semesterSubjects = []
      }

      const { data: profsData } = await supabase.from("professors").select("*")

      const profList = (profsData || []).map(doc => {
        const data = doc

        const assignedYearsArray = safeParse(data.assignedyears, [])
        const subjectList = safeParse(data.subjects, [])
        const subjectBlockMap = safeParseObject(data.subjectblocks, {})
        const assignedBlocksArray = Object.keys(subjectBlockMap).length === 0 ? safeParse(data.block, []) : []

        const hasYear = assignedYearsArray.includes(cleanYear)

        let hasBlock = false
        if (!studentBlock || Object.keys(subjectBlockMap).length === 0) {
          hasBlock = !studentBlock || assignedBlocksArray.length === 0 || assignedBlocksArray.includes(studentBlock)
        } else {
          for (const sub of subjectList) {
            const subBlocks = subjectBlockMap[sub] || []
            if (subBlocks.includes(studentBlock)) {
              hasBlock = true
              break
            }
          }
        }

        let filteredSubjects = []
        if (hasYear) {
          if (semesterSubjects.length > 0) {
            filteredSubjects = subjectList.filter(sub => semesterSubjects.includes(sub))
          } else {
            filteredSubjects = subjectList
          }

          if (studentBlock && Object.keys(subjectBlockMap).length > 0) {
            filteredSubjects = filteredSubjects.filter(sub => {
              const subBlocks = subjectBlockMap[sub] || []
              return subBlocks.includes(studentBlock)
            })
          }
        }

        return {
          name: data.name,
          image: data.imageurl || "",
          subjects: filteredSubjects,
          hasYear: hasYear
        }
      }).filter(p => p.subjects.length > 0)

      setEvaluations(profList.map(p => ({
        ...p,
        selectedSubject: p.subjects[0] || '',
        rating: 5,
        comment: ''
      })))

    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setFetching(false)
    }
  }

  const hasChanges = evaluations.some(e => e.rating !== 5 || e.comment.trim() !== '')

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
    const studentId = currentStudent.email.toLowerCase().trim();
    try {
      const evaluationsData = evaluations.map(item => ({
        id: generateUUID(),
        professorname: item.name,
        subject: item.selectedSubject,
        yearlevel: selectedYear,
        rating: Number(item.rating),
        comment: item.comment.trim() || "No comment provided",
        submittedat: new Date().toISOString(),
        isanonymous: true
      }))

      const { error: evalError } = await supabase
        .from("evaluations")
        .insert(evaluationsData)

      if (evalError) throw evalError

      const { error: statusError } = await supabase
        .from("submissionstatus")
        .upsert({
          id: generateUUID(),
          email: studentId,
          hasevaluate: true,
          evaluateat: new Date().toISOString()
        }, { onConflict: 'email' })

      if (statusError) throw statusError

      showModal('success', 'Success', 'Your evaluations have been securely transmitted.', () => router.push('/StudentDashboard'))
    } catch (error) {
      console.error("Error:", error)
      showModal('error', 'Transmission Failed', "Could not save your evaluation.")
    } finally {
      setLoading(false)
    }
  }

  if (fetching) return (
    <div className="min-h-screen page-bg flex items-center justify-center p-4">
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-10 h-10">
          <div className="absolute inset-0 border-[3px] border-indigo-500/10 rounded-full" />
          <div className="absolute inset-0 border-[3px] border-transparent border-t-indigo-600 dark:border-t-indigo-400 rounded-full animate-spin" />
        </div>
        <p className="text-slate-500 dark:text-slate-400 font-semibold text-xs uppercase tracking-widest">Loading faculty...</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen page-bg p-4 md:p-8 lg:p-12 flex flex-col items-center relative overflow-hidden">
      {/* Ambient orbs */}
      <div className="ambient-orb w-[400px] h-[400px] bg-indigo-400/8 dark:bg-indigo-500/5 top-[-10%] left-[-8%] animate-float" />
      <div className="ambient-orb w-[300px] h-[300px] bg-violet-400/6 dark:bg-violet-500/4 bottom-[-8%] right-[-5%] animate-float" style={{ animationDelay: '2s' }} />

      {/* Status modal */}
      {modalConfig.isOpen && (
        <Modal open={modalConfig.isOpen} onClose={() => modalConfig.callback ? null : closeModal()}>
          <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-lg ${modalConfig.type === 'success' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/12 dark:text-emerald-400 shadow-emerald-500/15' : modalConfig.type === 'warning' ? 'bg-amber-50 text-amber-600 dark:bg-amber-500/12 dark:text-amber-300 shadow-amber-500/15' : 'bg-rose-50 text-rose-600 dark:bg-rose-500/12 dark:text-rose-400 shadow-rose-500/15'}`}>
            {modalConfig.type === 'success' && <svg className="w-7 h-7 sm:w-8 sm:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>}
            {modalConfig.type === 'warning' && <svg className="w-7 h-7 sm:w-8 sm:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>}
            {modalConfig.type === 'error' && <svg className="w-7 h-7 sm:w-8 sm:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>}
          </div>
          <h3 className="text-slate-900 dark:text-white font-extrabold text-lg sm:text-xl mb-2">{modalConfig.title}</h3>
          <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm leading-relaxed mb-6 sm:mb-8">{modalConfig.message}</p>
          <button onClick={() => { if (modalConfig.callback) modalConfig.callback(); closeModal(); }} className="btn btn-primary w-full py-3 sm:py-4 text-sm font-bold">Continue</button>
        </Modal>
      )}

      {isConfirmingSubmit && (
        <Modal open={isConfirmingSubmit} onClose={() => setIsConfirmingSubmit(false)} className="relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 brand-gradient" />
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-indigo-500 to-violet-500 text-white rounded-3xl flex items-center justify-center mx-auto mb-6 sm:mb-8 shadow-xl shadow-indigo-500/25"><svg className="w-8 h-8 sm:w-10 sm:h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg></div>
          <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white mb-3 sm:mb-4">Confirm Submission?</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-8 sm:mb-10">You are about to submit evaluations for <span className="font-bold text-indigo-600 dark:text-indigo-300">{evaluations.length}</span> faculty members.</p>
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <button onClick={() => setIsConfirmingSubmit(false)} className="btn btn-ghost py-3 sm:py-4 text-sm font-bold">Cancel</button>
            <button onClick={handleFinalSubmit} className="btn btn-primary py-3 sm:py-4 text-sm font-bold">Confirm</button>
          </div>
        </Modal>
      )}

      {showBackConfirm && (
        <Modal open={showBackConfirm} onClose={() => setShowBackConfirm(false)} className="relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-amber-400" />
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-300 rounded-3xl flex items-center justify-center mx-auto mb-6 sm:mb-8 shadow-lg shadow-amber-500/15"><svg className="w-8 h-8 sm:w-10 sm:h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg></div>
          <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white mb-3 sm:mb-4">Go Back?</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-8 sm:mb-10">Your current progress will be lost. Are you sure you want to go back?</p>
          <div className="flex gap-3 sm:gap-4">
            <button onClick={() => setShowBackConfirm(false)} className="btn btn-ghost flex-1 py-3 sm:py-4 text-sm font-bold">Cancel</button>
            <button onClick={() => { setShowBackConfirm(false); router.push('/StudentDashboard'); }} className="btn btn-danger flex-1 py-3 sm:py-4 text-sm font-bold">Go Back</button>
          </div>
        </Modal>
      )}

      <div className="w-full max-w-4xl z-10">
        {(hasAlreadyEvaluated || !isFormOpen) ? (
            <div className="min-h-[70vh] flex items-center justify-center text-center p-4">
                 <div className="card-glass p-8 sm:p-10 shadow-elevated max-w-md w-full animate-fade-in">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-indigo-500 to-violet-500 text-white rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-lg shadow-indigo-500/25"><svg className="w-7 h-7 sm:w-8 sm:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>
                    <h1 className="text-lg sm:text-xl font-extrabold mb-3 text-slate-900 dark:text-white">{hasAlreadyEvaluated ? "Evaluation Complete" : "Access Denied"}</h1>
                    <p className="text-slate-500 dark:text-slate-400 mb-6 sm:mb-8 text-xs sm:text-sm leading-relaxed">{hasAlreadyEvaluated ? "Submission detected for this academic term." : "The evaluation portal is currently locked."}</p>
                    <button onClick={() => router.push('/StudentDashboard')} className="btn btn-primary w-full py-3 sm:py-4 text-sm font-bold">Return to Dashboard</button>
                </div>
            </div>
        ) : (
          <>
            <button onClick={() => hasChanges ? setShowBackConfirm(true) : router.push('/StudentDashboard')} className="flex items-center gap-2 mb-6 sm:mb-8 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-300 font-semibold text-xs uppercase tracking-wider transition-colors group">
              <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
              <span className="hidden sm:inline">Return to Dashboard</span><span className="sm:hidden">Back</span>
            </button>

            {/* Header card — premium glass */}
            <div className="card-glass p-6 sm:p-8 lg:p-10 mb-6 sm:mb-8 text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 brand-gradient opacity-80" />
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                <span className="text-gradient">{selectedYear}</span>
                {studentBlock && <span> — {studentBlock}</span>} Faculty Evaluation
              </h2>
              <p className="text-slate-400 dark:text-slate-500 mt-2.5 text-xs font-medium">Anonymous responses &bull; Secure transmission</p>
            </div>

            <div className="space-y-6 sm:space-y-8 stagger-children">
              {evaluations.length === 0 ? (
                <div className="text-center py-16 sm:py-20 card-glass border-dashed"><p className="text-slate-400 dark:text-slate-500 font-semibold text-sm px-4">No faculty assigned to {selectedYear}.</p></div>
              ) : (
                evaluations.map((item, index) => (
                    <div key={index} className="card-glass card-interactive p-6 sm:p-8 relative group">
                      {/* Subtle top accent line */}
                      <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent" />

                      <div className="flex flex-col lg:flex-row gap-6 sm:gap-8">
                        <div className="lg:w-1/4 flex flex-col items-center lg:items-start">
                          <div className="relative">
                            <img src={item.image || `https://ui-avatars.com/api/?name=${item.name}`} className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl mb-3 sm:mb-4 object-cover shadow-lg ring-2 ring-white dark:ring-slate-800" alt={item.name} loading="lazy" />
                            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-800 shadow-sm" />
                          </div>
                          <h3 className="font-bold text-center lg:text-left leading-tight text-slate-900 dark:text-white text-sm">{item.name}</h3>
                          <span className="text-[10px] text-indigo-600 dark:text-indigo-300 font-bold mt-2 tracking-wider bg-indigo-50 dark:bg-indigo-500/10 px-2.5 py-1 rounded-lg uppercase border border-indigo-100 dark:border-indigo-500/15">Instructor</span>
                        </div>

                        <div className="flex-1 w-full space-y-5 sm:space-y-6">
                          <div>
                            <label className="overline block mb-2 ml-1">Assigned Subject</label>
                            <div className="w-full bg-indigo-50/80 dark:bg-indigo-500/6 p-3 sm:p-4 rounded-xl border border-indigo-100/60 dark:border-indigo-500/12 font-semibold text-xs text-indigo-700 dark:text-indigo-300">
                              {item.selectedSubject}
                            </div>
                          </div>
                          <div>
                            <label className="overline block mb-2 ml-1">Efficiency Rating (1-10)</label>
                            <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
                              {[...Array(10)].map((_, i) => (
                                <button key={i+1} onClick={() => updateEval(index, 'rating', i+1)} className={`rating-btn h-9 sm:h-10 rounded-xl font-bold text-xs border ${item.rating === i+1 ? 'btn-primary text-white shadow-md shadow-indigo-500/25' : 'bg-white dark:bg-slate-800/60 border-slate-200/60 dark:border-slate-700/60 text-slate-500 dark:text-slate-400 hover:border-indigo-300 dark:hover:border-indigo-500/50 hover:text-indigo-600 dark:hover:text-indigo-300'}`}>
                                  {i+1}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <label className="overline block mb-2 ml-1">Performance Feedback</label>
                            <textarea className="input min-h-[100px] sm:min-h-[120px] resize-none leading-relaxed" placeholder="Write your feedback here..." value={item.comment} onChange={(e) => updateEval(index, 'comment', e.target.value)} />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
              )}
            </div>

            <button onClick={initiateSubmission} disabled={loading || evaluations.length === 0} className="btn btn-primary w-full mt-10 sm:mt-14 py-5 sm:py-6 rounded-2xl text-sm font-bold tracking-wide shadow-xl mb-10 sm:mb-16 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none">{loading ? "Transmitting data..." : "Finalize & Submit All"}</button>
          </>
        )}
      </div>
    </div>
  )
}
