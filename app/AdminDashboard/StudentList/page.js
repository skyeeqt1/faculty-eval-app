'use client'
import { useState, useEffect } from 'react'
import { db, auth } from '../../../lib/firebase'
import { 
  collection, deleteDoc, doc, onSnapshot, query, orderBy, addDoc, serverTimestamp, getDocs, writeBatch 
} from 'firebase/firestore'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged } from 'firebase/auth'

export default function StudentListPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [students, setStudents] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  
  // Modals & UI States
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [confirmModal, setConfirmModal] = useState({ show: false, id: null, name: '' })
  const [resetConfirmModal, setResetConfirmModal] = useState({ show: false, student: null })
  const [globalVoteResetModal, setGlobalVoteResetModal] = useState(false)
  const [passwordModal, setPasswordModal] = useState({ show: false, password: '', name: '' })
  const [errorModal, setErrorModal] = useState({ show: false, message: '' })
  
  const [deleteReason, setDeleteReason] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [isGlobalResetting, setIsGlobalResetting] = useState(false)
  const [toast, setToast] = useState({ show: false, message: '' })

  // --- AUTH CHECK: MATCHES ADMIN DASHBOARD ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      // Strict Admin check - if not met, boot back to root Login page
      if (user && user.email.toLowerCase() === "admintest@gmail.com") {
        const q = query(collection(db, "authorized_students"), orderBy("createdAt", "desc"))
        const unsubStudents = onSnapshot(q, (snap) => {
          const data = snap.docs.map(d => ({ id: d.id, ...d.data() }))
          setStudents(data)
          setLoading(false)
        })
        return () => unsubStudents()
      } else {
        router.replace('/') 
      }
    })
    return () => unsubscribe()
  }, [router])

  const showToast = (msg) => {
    setToast({ show: true, message: msg })
    setTimeout(() => setToast({ show: false, message: '' }), 2500)
  }

  const copyToClipboard = (text) => {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text);
    } else {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.left = "-9999px";
      textArea.style.top = "0";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try { document.execCommand('copy'); } catch (err) { console.error(err); }
      document.body.removeChild(textArea);
    }
    showToast("Copied to clipboard");
  };

  // --- FULL GLOBAL RESET: WIPES BOTH COLLECTIONS ---
  const executeGlobalVoteReset = async () => {
    setIsGlobalResetting(true)
    try {
      const batch = writeBatch(db)
      
      // 1. Reset 'hasEvaluate' flags in authorized_students so students can re-access the form
      const studentSnapshot = await getDocs(collection(db, "authorized_students"))
      studentSnapshot.forEach((studentDoc) => {
        batch.update(studentDoc.ref, {
          hasEvaluate: false,
          EvaluateAt: null
        })
      })

      // 2. Delete all records in submissionStatus so the portal thinks nobody has voted yet
      const statusSnapshot = await getDocs(collection(db, "submissionStatus"))
      statusSnapshot.forEach((statusDoc) => {
        batch.delete(statusDoc.ref)
      })

      await batch.commit()
      
      await addDoc(collection(db, "audit_logs"), {
        action: "GLOBAL_VOTE_STATUS_RESET",
        adminEmail: auth.currentUser?.email,
        timestamp: serverTimestamp(),
        details: "Reset submissionStatus collections"
      })

      showToast("All voting records cleared")
      setGlobalVoteResetModal(false)
    } catch (err) {
      setErrorModal({ show: true, message: "Global reset failed: " + err.message })
    } finally {
      setIsGlobalResetting(false)
    }
  }

  const executePasswordReset = async () => {
    const student = resetConfirmModal.student;
    if (!student) return;
    setIsResetting(true)
    // Stronger temporary password generation
    const newPass = Math.random().toString(36).slice(-8) + "!" + Math.floor(Math.random() * 99)
    try {
      await addDoc(collection(db, "audit_logs"), {
        action: "PASSWORD_RESET_GENERATED",
        studentName: `${student.firstName} ${student.lastName}`,
        studentEmail: student.email,
        timestamp: serverTimestamp()
      })
      setPasswordModal({ show: true, password: newPass, name: student.firstName })
      setResetConfirmModal({ show: false, student: null })
      setSelectedStudent(null) 
    } catch (err) {
      setErrorModal({ show: true, message: "Failed: " + err.message })
    } finally { setIsResetting(false) }
  }

  const handleDelete = async () => {
    if (!deleteReason.trim()) {
      setErrorModal({ show: true, message: "A reason is required." })
      return
    }
    setIsDeleting(true)
    try {
      await addDoc(collection(db, "audit_logs"), {
        action: "REVOKE_STUDENT_ACCESS",
        studentName: confirmModal.name,
        studentId: confirmModal.id,
        reason: deleteReason,
        timestamp: serverTimestamp()
      })
      await deleteDoc(doc(db, "authorized_students", confirmModal.id))
      setConfirmModal({ show: false, id: null, name: '' })
      setSelectedStudent(null)
      setDeleteReason('')
      showToast("Access Revoked Successfully")
    } catch (err) {
      setErrorModal({ show: true, message: "Revoke failed: " + err.message })
    } finally { setIsDeleting(false) }
  }

  const filteredStudents = students.filter(s => 
    `${s.firstName} ${s.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
      <div className="text-center font-bold text-indigo-400 uppercase tracking-widest animate-pulse text-xs">Syncing Directory...</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 p-4 sm:p-6 md:p-8 font-sans selection:bg-indigo-500/30">
      
      {toast.show && (
        <div className="fixed top-6 left-4 right-4 md:left-1/2 md:right-auto md:-translate-x-1/2 z-[200]">
          <div className="bg-emerald-500 text-white px-6 py-4 rounded-2xl shadow-2xl font-bold text-[10px] uppercase tracking-widest text-center animate-center-pop">
            {toast.message}
          </div>
        </div>
      )}

      {/* --- MODALS --- */}

      {globalVoteResetModal && (
        <div className="fixed inset-0 flex items-center justify-center z-[300] bg-slate-950/90 backdrop-blur-md p-4">
          <div className="bg-slate-900 border border-emerald-500/20 rounded-[2.5rem] p-8 w-full max-w-sm text-center animate-center-pop">
            <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-emerald-500/20">
              <svg className="w-8 h-8 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            </div>
            <h3 className="text-xl font-black text-white uppercase mb-2">Reset All Votes?</h3>
            <p className="text-slate-400 text-xs mb-8 leading-relaxed">This will allow EVERY student to vote again by clearing individual records and the system submission ledger.</p>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setGlobalVoteResetModal(false)} className="cursor-pointer py-4 bg-slate-800 text-slate-400 rounded-2xl font-bold text-[10px] uppercase tracking-widest hover:bg-slate-700 transition-all">Cancel</button>
              <button disabled={isGlobalResetting} onClick={executeGlobalVoteReset} className="cursor-pointer py-4 bg-emerald-600 text-white rounded-2xl font-bold text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-600/20 hover:bg-emerald-500 transition-all">
                {isGlobalResetting ? "Syncing..." : "Yes, Reset All"}
              </button>
            </div>
          </div>
        </div>
      )}

      {errorModal.show && (
        <div className="fixed inset-0 flex items-center justify-center z-[300] bg-slate-950/80 backdrop-blur-md p-4">
          <div className="bg-slate-900 border border-rose-500/20 rounded-[2rem] p-8 w-full max-w-sm text-center animate-center-pop">
            <h3 className="text-white font-black uppercase mb-2">Attention</h3>
            <p className="text-slate-400 text-sm mb-6">{errorModal.message}</p>
            <button onClick={() => setErrorModal({ show: false, message: '' })} className="cursor-pointer w-full py-4 bg-slate-800 text-white rounded-2xl font-bold text-[10px] uppercase tracking-widest">Acknowledge</button>
          </div>
        </div>
      )}

      {resetConfirmModal.show && (
        <div className="fixed inset-0 flex items-center justify-center z-[260] bg-slate-950/90 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-indigo-500/20 rounded-[2.5rem] p-8 w-full max-w-sm shadow-2xl animate-center-pop">
            <h3 className="text-xl font-black text-white uppercase tracking-tight mb-2">Reset Password?</h3>
            <p className="text-slate-400 text-sm mb-6">This will generate a new temporary password for <span className="text-indigo-400 font-bold">{resetConfirmModal.student?.firstName}</span>.</p>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setResetConfirmModal({ show: false, student: null })} className="cursor-pointer py-4 bg-slate-800 text-slate-400 rounded-2xl font-bold text-[10px] uppercase tracking-widest">Cancel</button>
              <button onClick={executePasswordReset} className="cursor-pointer py-4 bg-indigo-600 text-white rounded-2xl font-bold text-[10px] uppercase tracking-widest active:scale-95 transition-all">Confirm</button>
            </div>
          </div>
        </div>
      )}

      {passwordModal.show && (
        <div className="fixed inset-0 flex items-center justify-center z-[270] bg-slate-950/95 p-4">
          <div className="bg-slate-900 border border-indigo-500/30 rounded-[2.5rem] p-8 w-full max-w-sm text-center animate-center-pop">
            <h3 className="text-xl font-black text-white uppercase mb-2">New Password</h3>
            <div className="bg-slate-950 p-4 rounded-2xl my-6 font-mono text-indigo-400 font-bold border border-white/5 break-all select-all text-lg tracking-widest">
              {passwordModal.password}
            </div>
            <button 
              onClick={() => {
                copyToClipboard(passwordModal.password);
                setPasswordModal({ show: false, password: '', name: '' });
              }} 
              className="cursor-pointer w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold text-[10px] uppercase tracking-widest hover:bg-indigo-500 active:scale-95 transition-all"
            >
              Copy & Close
            </button>
          </div>
        </div>
      )}

      {confirmModal.show && (
        <div className="fixed inset-0 flex items-center justify-center z-[260] bg-slate-950/95 p-4">
          <div className="bg-slate-900 border border-rose-500/20 rounded-[2.5rem] p-8 w-full max-w-md animate-center-pop">
            <h3 className="text-xl font-black text-white uppercase mb-1 text-rose-500">Confirm Revocation</h3>
            <p className="text-slate-500 text-[10px] font-bold uppercase mb-4 tracking-widest">User: {confirmModal.name}</p>
            <textarea 
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              placeholder="Reason (Required for Audit)..."
              className="w-full bg-slate-950 border border-white/5 rounded-2xl p-4 text-sm text-white outline-none focus:border-rose-500/50 min-h-[120px] mb-6 shadow-inner transition-colors"
            />
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setConfirmModal({ show: false })} className="cursor-pointer py-4 bg-slate-800 text-slate-400 rounded-2xl font-bold text-[10px] uppercase tracking-widest hover:bg-slate-700 transition-all">Back</button>
              <button disabled={isDeleting} onClick={handleDelete} className="cursor-pointer py-4 bg-rose-600 text-white rounded-2xl font-bold text-[10px] uppercase tracking-widest hover:bg-rose-500 active:scale-95 transition-all">
                {isDeleting ? "Revoking..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedStudent && (
        <div className="fixed inset-0 flex items-center justify-center z-[150] bg-slate-950/80 backdrop-blur-md p-4" onClick={() => setSelectedStudent(null)}>
          <div className="bg-slate-900 border border-white/10 rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl animate-center-pop" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-8">
              <h3 className="text-2xl font-black text-white uppercase tracking-tighter italic">Manage Student</h3>
              <button onClick={() => setSelectedStudent(null)} className="cursor-pointer text-slate-500 hover:text-white p-2 text-2xl transition-colors">×</button>
            </div>
            <div className="bg-slate-950/50 rounded-2xl p-6 mb-8 border border-white/5">
              <p className="text-white font-bold text-lg">{selectedStudent.firstName} {selectedStudent.lastName}</p>
              <p className="text-slate-500 text-xs font-medium">{selectedStudent.email}</p>
            </div>
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => setResetConfirmModal({ show: true, student: selectedStudent })}
                className="cursor-pointer w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold text-[10px] uppercase tracking-widest hover:bg-indigo-500 transition-all active:scale-95"
              >
                Generate New Password
              </button>
              <button 
                onClick={() => setConfirmModal({ show: true, id: selectedStudent.id, name: `${selectedStudent.firstName} ${selectedStudent.lastName}` })}
                className="cursor-pointer w-full py-4 bg-rose-600/10 text-rose-500 border border-rose-500/20 rounded-2xl font-bold text-[10px] uppercase tracking-widest hover:bg-rose-600/20 transition-all active:scale-95"
              >
                Revoke System Access
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MAIN PAGE CONTENT --- */}
      <div className={`max-w-6xl mx-auto transition-all duration-300 ${selectedStudent || confirmModal.show || globalVoteResetModal ? 'blur-md opacity-40 scale-[0.98]' : ''}`}>
        <div className="flex flex-col gap-6 mb-10">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <button onClick={() => router.back()} className="cursor-pointer text-indigo-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 mb-2 group">
                <span className="group-hover:-translate-x-1 transition-transform">←</span> Dashboard
              </button>
              <h1 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-tighter">Student<span className="text-indigo-500">Directory</span></h1>
            </div>
            <button 
              onClick={() => setGlobalVoteResetModal(true)}
              className="cursor-pointer px-6 py-3 bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-500/20 rounded-2xl text-[9px] font-black text-emerald-500 uppercase tracking-widest transition-all active:scale-95"
            >
              Reset All Voting Status
            </button>
          </div>
          <div className="relative group">
            <input 
              type="text" 
              placeholder="Search by Name or Email..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900 border border-white/5 p-4 pl-12 rounded-2xl outline-none text-white text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/30 transition-all"
            />
            <svg className="w-5 h-5 text-slate-600 absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-indigo-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>
        </div>

        {/* Desktop List */}
        <div className="hidden md:block bg-slate-900/50 rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl backdrop-blur-sm">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white/5 border-b border-white/10 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                <th className="p-6">Student Information</th>
                <th className="p-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredStudents.length === 0 && (
                <tr>
                  <td colSpan="2" className="p-12 text-center text-slate-600 text-xs font-black uppercase tracking-[0.2em]">No Matches Found</td>
                </tr>
              )}
              {filteredStudents.map((s) => (
                <tr key={s.id} onClick={() => setSelectedStudent(s)} className="hover:bg-indigo-500/5 transition-all group cursor-pointer">
                  <td className="p-6">
                    <p className="font-bold text-white text-sm">{s.firstName} {s.lastName}</p>
                    <p className="text-[11px] text-slate-500 font-medium">{s.email}</p>
                  </td>
                  <td className="p-6 text-right">
                    <span className="text-[10px] font-black uppercase text-indigo-500 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0 inline-block">Manage User →</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden flex flex-col gap-4">
          {filteredStudents.map((s) => (
            <div key={s.id} onClick={() => setSelectedStudent(s)} className="cursor-pointer bg-slate-900 border border-white/5 p-5 rounded-[2rem] shadow-lg flex items-center justify-between active:scale-[0.98] transition-all">
              <div>
                <p className="font-bold text-white text-sm">{s.firstName} {s.lastName}</p>
                <p className="text-[10px] text-slate-500 font-medium">{s.email}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-indigo-500/5 flex items-center justify-center">
                <span className="text-indigo-500 font-bold">→</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes center-pop {
          0% { transform: scale(0.95); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-center-pop {
          animation: center-pop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
      `}</style>
    </div>
  )
}