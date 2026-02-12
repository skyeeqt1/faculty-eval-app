'use client'
import { useState, useEffect } from 'react'
import { db } from '../../../lib/firebase'
import { 
  collection, deleteDoc, doc, onSnapshot, query, orderBy, addDoc, 
  serverTimestamp, getDocs, writeBatch, updateDoc 
} from 'firebase/firestore'

export default function StudentListPage() {
  const [loading, setLoading] = useState(true)
  const [students, setStudents] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isAddFormOpen, setIsAddFormOpen] = useState(false)
  
  // Drawer States
  const [activeStudent, setActiveStudent] = useState(null)
  const [isDrawerVisible, setIsDrawerVisible] = useState(false)
  
  const [newStudent, setNewStudent] = useState({ firstName: '', lastName: '', email: '', password: '' })
  const [confirmModal, setConfirmModal] = useState({ show: false, id: null, name: '' })
  const [resetConfirmModal, setResetConfirmModal] = useState({ show: false, student: null })
  const [globalVoteResetModal, setGlobalVoteResetModal] = useState(false)
  
  const [deleteReason, setDeleteReason] = useState('')
  const [toast, setToast] = useState({ show: false, message: '' })
  const [generatedPassword, setGeneratedPassword] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const q = query(collection(db, "authorized_students"), orderBy("createdAt", "desc"))
    const unsubStudents = onSnapshot(q, (snap) => {
      setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    })
    return () => unsubStudents()
  }, [])

  const handleOpenDrawer = (student) => {
    if (window.innerWidth < 1024) {
      setActiveStudent(student)
      setTimeout(() => setIsDrawerVisible(true), 10)
    }
  }

  const handleCloseDrawer = () => {
    setIsDrawerVisible(false)
    setTimeout(() => setActiveStudent(null), 400)
  }

  const generateRandomPassword = () => {
    const charset = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let pwd = "";
    for (let i = 0; i < 10; i++) pwd += charset.charAt(Math.floor(Math.random() * charset.length))
    setNewStudent({ ...newStudent, password: pwd })
  }

  const handleAddStudent = async (e) => {
    e.preventDefault()
    if (!newStudent.firstName || !newStudent.lastName || !newStudent.email || !newStudent.password) {
      return showToast("All fields are required")
    }
    try {
      await addDoc(collection(db, "authorized_students"), {
        firstName: newStudent.firstName.trim(),
        lastName: newStudent.lastName.trim(),
        email: newStudent.email.trim().toLowerCase(),
        password: newStudent.password,
        mustChangePassword: true,
        hasEvaluate: false,
        createdAt: serverTimestamp()
      })
      setNewStudent({ firstName: '', lastName: '', email: '', password: '' })
      setIsAddFormOpen(false)
      showToast("Student Registered")
    } catch (err) { showToast("Error adding student") }
  }

  const executeGlobalVoteReset = async () => {
    try {
      const batch = writeBatch(db)
      const studentSnapshot = await getDocs(collection(db, "authorized_students"))
      studentSnapshot.forEach((studentDoc) => {
        batch.update(studentDoc.ref, { hasEvaluate: false, EvaluateAt: null })
      })
      const statusSnapshot = await getDocs(collection(db, "submissionStatus"))
      statusSnapshot.forEach((statusDoc) => { batch.delete(statusDoc.ref) })
      await batch.commit()
      showToast("Global status reset")
      setGlobalVoteResetModal(false)
    } catch (err) { showToast("Global reset failed") }
  }

  const executePasswordReset = async () => {
    const student = resetConfirmModal.student
    if (!student) return
    try {
      const charset = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
      let tempPassword = ""
      for (let i = 0; i < 8; i++) tempPassword += charset.charAt(Math.floor(Math.random() * charset.length))
      await updateDoc(doc(db, "authorized_students", student.id), { 
        password: tempPassword, 
        mustChangePassword: true, 
        passwordResetAt: serverTimestamp() 
      })
      setGeneratedPassword(tempPassword)
      setResetConfirmModal({ show: false, student: null })
      handleCloseDrawer()
    } catch (err) { showToast("Reset failed") }
  }

  const handleDelete = async () => {
    if (!deleteReason.trim()) return
    try {
      await deleteDoc(doc(db, "authorized_students", confirmModal.id))
      setConfirmModal({ show: false, id: null, name: '' })
      setDeleteReason('')
      handleCloseDrawer()
      showToast("Access Revoked")
    } catch (err) { showToast("Revoke failed") }
  }

  const showToast = (msg) => {
    setToast({ show: true, message: msg })
    setTimeout(() => setToast({ show: false, message: '' }), 2500)
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(generatedPassword)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const filteredStudents = students.filter(s => 
    `${s.firstName} ${s.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) return (
    <div className="flex-1 flex items-center justify-center bg-[#0f172a]">
      <div className="text-indigo-400 font-black uppercase tracking-[0.3em]">Syncing Directory...</div>
    </div>
  )

  return (
    <div className="p-4 md:p-8 lg:p-12 max-w-6xl mx-auto w-full h-screen flex flex-col space-y-8 overflow-hidden">
      
      {/* Header Section - Matched with Faculty Management */}
      <div className="shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-black text-white uppercase italic tracking-tight">Student Directory</h2>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-1">Total Authorized: {students.length}</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setGlobalVoteResetModal(true)} className="px-6 py-4 bg-emerald-600/10 border border-emerald-500/20 text-emerald-500 rounded-2xl font-black text-[10px] uppercase tracking-widest cursor-pointer hover:bg-emerald-600/20 transition-all active:scale-95">
            Reset All
          </button>
          <button onClick={() => setIsAddFormOpen(!isAddFormOpen)} className="px-6 py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest cursor-pointer hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 transition-all active:scale-95">
            {isAddFormOpen ? 'Cancel Action' : 'Register Student'}
          </button>
        </div>
      </div>

      {/* Registration Form - Matched with Faculty Form UI */}
      {isAddFormOpen && (
        <section className="shrink-0 bg-slate-900/50 border border-indigo-500/20 p-6 md:p-8 rounded-[2rem] backdrop-blur-sm shadow-xl animate-in fade-in slide-in-from-top-4 duration-300">
          <form onSubmit={handleAddStudent} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <input type="text" placeholder="FIRST NAME" value={newStudent.firstName} onChange={(e) => setNewStudent({...newStudent, firstName: e.target.value})} className="bg-slate-800 border border-white/5 rounded-xl px-5 py-4 text-xs font-bold uppercase tracking-widest focus:border-indigo-500 outline-none text-white"/>
              <input type="text" placeholder="LAST NAME" value={newStudent.lastName} onChange={(e) => setNewStudent({...newStudent, lastName: e.target.value})} className="bg-slate-800 border border-white/5 rounded-xl px-5 py-4 text-xs font-bold uppercase tracking-widest focus:border-indigo-500 outline-none text-white"/>
              <input type="email" placeholder="EMAIL ADDRESS" value={newStudent.email} onChange={(e) => setNewStudent({...newStudent, email: e.target.value})} className="bg-slate-800 border border-white/5 rounded-xl px-5 py-4 text-xs font-bold uppercase tracking-widest focus:border-indigo-500 outline-none text-white"/>
              <div className="flex gap-2">
                <input type="text" placeholder="PASSWORD" value={newStudent.password} onChange={(e) => setNewStudent({...newStudent, password: e.target.value})} className="flex-1 bg-slate-800 border border-white/5 rounded-xl px-5 py-4 text-xs font-bold uppercase tracking-widest focus:border-indigo-500 outline-none text-white"/>
                <button type="button" onClick={generateRandomPassword} className="p-4 bg-indigo-600/10 text-indigo-400 rounded-xl hover:bg-indigo-600 hover:text-white active:scale-90 transition-all cursor-pointer">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                </button>
              </div>
            </div>
            <button type="submit" className="w-full py-4 bg-indigo-600 text-white font-black text-[10px] uppercase tracking-widest rounded-xl cursor-pointer hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20 active:scale-[0.98]">Complete Registration</button>
          </form>
        </section>
      )}

      {/* Filter/Search */}
      <div className="shrink-0 relative group">
        <input 
          type="text" placeholder="Search directory by name or email..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-slate-900/50 border border-white/5 p-5 rounded-2xl outline-none text-white text-xs font-bold uppercase tracking-widest focus:border-indigo-500/50 transition-all"
        />
      </div>

      {/* List Table - Matched with Faculty Management UI */}
      <section className="flex-1 min-h-0 bg-slate-900/50 border border-white/5 rounded-[2.5rem] overflow-hidden backdrop-blur-sm flex flex-col shadow-2xl">
        <div className="overflow-y-auto custom-scrollbar flex-1">
          <table className="w-full text-left min-w-full border-collapse">
            <thead className="sticky top-0 z-10 bg-[#151c2e]">
              <tr className="border-b border-white/5">
                <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Student Identity</th>
                <th className="hidden md:table-cell p-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Email Address</th>
                <th className="hidden lg:table-cell p-6 text-right text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredStudents.map((s) => (
                <tr key={s.id} onClick={() => handleOpenDrawer(s)} className="group hover:bg-white/[0.03] transition-colors cursor-pointer lg:cursor-default">
                  <td className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/10 flex items-center justify-center text-indigo-400 font-black text-xs shrink-0">
                        {s.firstName[0]}{s.lastName[0]}
                      </div>
                      <span className="font-black text-slate-200 uppercase italic text-sm group-hover:text-indigo-400 transition-colors truncate">{s.firstName} {s.lastName}</span>
                    </div>
                  </td>
                  <td className="hidden md:table-cell p-6">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{s.email}</span>
                  </td>
                  <td className="hidden lg:table-cell p-6 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <button onClick={(e) => { e.stopPropagation(); setResetConfirmModal({ show: true, student: s }) }} className="px-4 py-2 bg-slate-800 text-slate-400 rounded-lg text-[9px] font-black uppercase tracking-widest cursor-pointer hover:bg-indigo-600 hover:text-white transition-all">Reset Password</button>
                      <button onClick={(e) => { e.stopPropagation(); setConfirmModal({ show: true, id: s.id, name: `${s.firstName} ${s.lastName}` }) }} className="p-3 text-slate-600 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all cursor-pointer">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* MOBILE ACTION DRAWER */}
      {activeStudent && (
        <div className="fixed inset-0 z-[400] flex items-end justify-center lg:hidden">
          <div className={`fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity duration-500 ${isDrawerVisible ? 'opacity-100' : 'opacity-0'}`} onClick={handleCloseDrawer} />
          <div className={`relative w-full bg-slate-900 border-t border-white/10 rounded-t-[3rem] p-8 pb-12 shadow-2xl transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${isDrawerVisible ? 'translate-y-0' : 'translate-y-full'}`}>
            <div className="w-12 h-1.5 bg-slate-800 rounded-full mx-auto mb-8" />
            <div className="text-center mb-8">
              <h3 className="text-xl font-black text-white uppercase italic mb-1">{activeStudent.firstName} {activeStudent.lastName}</h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{activeStudent.email}</p>
            </div>
            <div className="space-y-4">
              <button onClick={() => setResetConfirmModal({ show: true, student: activeStudent })} className="w-full py-5 bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 rounded-2xl font-black text-[10px] uppercase tracking-widest active:bg-indigo-600 active:text-white transition-all">Reset Password</button>
              <button onClick={() => setConfirmModal({ show: true, id: activeStudent.id, name: `${activeStudent.firstName} ${activeStudent.lastName}` })} className="w-full py-5 bg-rose-600/10 border border-rose-500/20 text-rose-500 rounded-2xl font-black text-[10px] uppercase tracking-widest active:bg-rose-600 active:text-white transition-all">Revoke Access</button>
              <button onClick={handleCloseDrawer} className="w-full py-5 text-slate-500 font-black text-[10px] uppercase tracking-widest">Close Menu</button>
            </div>
          </div>
        </div>
      )}

      {/* MODALS & TOASTS - Standardized with Faculty UI */}
      {globalVoteResetModal && (
        <div className="fixed inset-0 flex items-center justify-center z-[500] bg-slate-950/90 backdrop-blur-md p-4 text-center">
          <div className="bg-slate-900 border border-white/10 rounded-[2.5rem] p-10 max-w-sm w-full shadow-2xl animate-in zoom-in duration-200">
            <h3 className="text-xl font-black text-white uppercase italic mb-2">Global Reset?</h3>
            <p className="text-slate-500 text-[10px] mb-8 font-bold uppercase tracking-widest leading-relaxed">Wipe all student evaluation statuses?</p>
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => setGlobalVoteResetModal(false)} className="py-4 bg-slate-800 text-slate-300 rounded-2xl font-black text-[10px] uppercase hover:bg-slate-700 transition-colors cursor-pointer">Cancel</button>
              <button onClick={executeGlobalVoteReset} className="py-4 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg shadow-emerald-600/20 hover:bg-emerald-500 transition-colors cursor-pointer active:scale-95">Confirm</button>
            </div>
          </div>
        </div>
      )}

      {generatedPassword && (
        <div className="fixed inset-0 flex items-center justify-center z-[600] bg-slate-950/95 backdrop-blur-xl p-4 text-center">
          <div className="bg-slate-900 border border-indigo-500/30 rounded-[2.5rem] p-10 w-full max-w-sm shadow-2xl animate-in zoom-in duration-200">
            <h3 className="text-xl font-black text-white uppercase mb-8 italic text-indigo-400">Temporary PWD</h3>
            <div className="bg-slate-950 border border-white/5 rounded-2xl p-6 mb-8 flex flex-col items-center gap-4">
              <span className="text-2xl font-black text-white tracking-widest font-mono">{generatedPassword}</span>
              <button onClick={handleCopy} className="text-[9px] font-black uppercase tracking-widest px-6 py-2 bg-indigo-600/10 border border-indigo-500/20 rounded-lg text-indigo-400 hover:bg-indigo-600 hover:text-white transition-all cursor-pointer">
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
            <button onClick={() => setGeneratedPassword('')} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase hover:bg-indigo-500 transition-colors cursor-pointer active:scale-95">Close</button>
          </div>
        </div>
      )}

      {resetConfirmModal.show && (
        <div className="fixed inset-0 flex items-center justify-center z-[550] bg-slate-950/90 backdrop-blur-md p-4 text-center">
          <div className="bg-slate-900 border border-white/10 rounded-[2.5rem] p-10 max-w-sm w-full shadow-2xl animate-in zoom-in duration-200">
              <h3 className="text-xl font-black text-white uppercase mb-2 italic">Reset PWD?</h3>
              <p className="text-slate-500 text-[10px] mb-8 font-bold uppercase tracking-widest leading-relaxed">For {resetConfirmModal.student.firstName}?</p>
              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => setResetConfirmModal({ show: false, student: null })} className="py-4 bg-slate-800 text-slate-300 rounded-2xl font-black text-[10px] uppercase hover:bg-slate-700 transition-colors cursor-pointer">Cancel</button>
                <button onClick={executePasswordReset} className="py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase hover:bg-indigo-500 transition-colors cursor-pointer active:scale-95">Generate</button>
              </div>
          </div>
        </div>
      )}

      {confirmModal.show && (
        <div className="fixed inset-0 flex items-center justify-center z-[550] bg-slate-950/90 backdrop-blur-md p-4 text-center">
          <div className="bg-slate-900 border border-rose-500/20 rounded-[2.5rem] p-10 max-w-sm w-full shadow-2xl animate-in zoom-in duration-200">
              <h3 className="text-xl font-black text-white mb-2 uppercase italic">Revoke Access?</h3>
              <input type="text" placeholder="REASON" value={deleteReason} onChange={(e) => setDeleteReason(e.target.value)} className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-[10px] text-white my-6 outline-none font-bold uppercase tracking-widest text-center focus:border-rose-500/50 transition-all"/>
              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => setConfirmModal({ show: false, id: null, name: '' })} className="py-4 bg-slate-800 text-slate-300 rounded-2xl font-black text-[10px] uppercase hover:bg-slate-700 transition-colors cursor-pointer">No</button>
                <button onClick={handleDelete} className="py-4 bg-rose-600 text-white rounded-2xl font-black text-[10px] uppercase hover:bg-rose-500 transition-colors cursor-pointer active:scale-95 shadow-lg shadow-rose-600/20">Confirm</button>
              </div>
          </div>
        </div>
      )}

      {toast.show && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[700] bg-indigo-600 text-white px-8 py-4 rounded-2xl shadow-2xl animate-in slide-in-from-top-full duration-300">
           <span className="text-[10px] font-black uppercase tracking-widest">{toast.message}</span>
        </div>
      )}

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(99, 102, 241, 0.2); border-radius: 20px; }
      `}</style>
    </div>
  )
}