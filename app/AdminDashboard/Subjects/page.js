'use client'
import { useState, useEffect } from 'react'
import { db, auth } from '../../../lib/firebase' // Added auth import
import { 
  collection, addDoc, deleteDoc, doc, 
  onSnapshot, serverTimestamp 
} from 'firebase/firestore'

export default function SubjectsManagement() {
  const [loading, setLoading] = useState(true)
  const [subjects, setSubjects] = useState([])
  const [newSubName, setNewSubName] = useState('')
  const [newSubYear, setNewSubYear] = useState('1st Year')
  const [isAddFormOpen, setIsAddFormOpen] = useState(false)
  
  const [activeSubject, setActiveSubject] = useState(null)
  const [isDrawerVisible, setIsDrawerVisible] = useState(false)

  const [toast, setToast] = useState({ show: false, message: '' })
  const [confirmModal, setConfirmModal] = useState({ show: false, id: null, name: '' })

  useEffect(() => {
    const unsubSubs = onSnapshot(collection(db, "subjects"), (snap) => {
      setSubjects(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })))
      setLoading(false)
    })
    return () => unsubSubs()
  }, [])

  // Helper for Logging
  const logActivity = async (action, details) => {
    try {
      await addDoc(collection(db, "audit_logs"), {
        action: action,
        adminEmail: auth.currentUser?.email || "admintest@gmail.com",
        details: details,
        timestamp: serverTimestamp()
      })
    } catch (err) { console.error("Log failed:", err) }
  }

  const handleOpenDrawer = (sub) => {
    if (window.innerWidth < 1024) {
      setActiveSubject(sub)
      setTimeout(() => setIsDrawerVisible(true), 10)
    }
  }

  const handleCloseDrawer = () => {
    setIsDrawerVisible(false)
    setTimeout(() => setActiveSubject(null), 400)
  }

  const handleAddSubject = async (e) => {
    e.preventDefault()
    if (!newSubName.trim()) return showToast("Subject name required")
    try {
      await addDoc(collection(db, "subjects"), {
        name: newSubName.trim(),
        yearLevel: newSubYear,
        createdAt: serverTimestamp()
      })

      // LOG ACTION
      await logActivity("REGISTER_SUBJECT", `Added: ${newSubName.trim()} for ${newSubYear}`)

      setNewSubName('')
      setIsAddFormOpen(false)
      showToast("Subject Registered")
    } catch (err) { showToast("Error adding subject") }
  }

  // FIXED DELETE FUNCTION
  const confirmDelete = async () => {
    if (!confirmModal.id) return
    try {
      await deleteDoc(doc(db, "subjects", confirmModal.id))
      
      // LOG ACTION
      await logActivity("REMOVE_SUBJECT", `Deleted: ${confirmModal.name}`)

      setConfirmModal({ show: false, id: null, name: '' })
      handleCloseDrawer()
      showToast("Subject Removed")
    } catch (err) { 
      console.error(err)
      showToast("Delete failed") 
    }
  }

  const showToast = (msg) => {
    setToast({ show: true, message: msg })
    setTimeout(() => setToast({ show: false, message: '' }), 2500)
  }

  if (loading) return (
    <div className="flex-1 flex items-center justify-center bg-[#0f172a]">
      <div className="text-indigo-400 font-black uppercase tracking-[0.3em] animate-pulse">Syncing Subjects...</div>
    </div>
  )

  return (
    <div className="p-4 md:p-8 lg:p-12 max-w-6xl mx-auto w-full h-screen flex flex-col space-y-4 md:space-y-8 overflow-hidden">
      
      {/* DESKTOP HEADER */}
      <div className="hidden md:flex shrink-0 items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-black text-white uppercase italic tracking-tight">Subject Management</h2>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-1">Total Curriculum: {subjects.length}</p>
        </div>
        <button 
          onClick={() => setIsAddFormOpen(!isAddFormOpen)} 
          className="px-6 py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest cursor-pointer hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 transition-all active:scale-95"
        >
          {isAddFormOpen ? 'Cancel Action' : 'Add New Subject'}
        </button>
      </div>

      {/* MOBILE ACTION BUTTON */}
      <button 
        onClick={() => setIsAddFormOpen(!isAddFormOpen)} 
        className="md:hidden shrink-0 py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-600/20 active:scale-95"
      >
        {isAddFormOpen ? 'Close Registration Form' : 'Register New Subject'}
      </button>

      {/* ADD FORM */}
      {isAddFormOpen && (
        <section className="shrink-0 bg-slate-900/50 border border-indigo-500/20 p-6 rounded-[2rem] backdrop-blur-sm shadow-xl animate-in fade-in slide-in-from-top-4 duration-300">
          <form onSubmit={handleAddSubject} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-8">
                <input 
                  type="text" placeholder="SUBJECT TITLE" value={newSubName} 
                  onChange={(e) => setNewSubName(e.target.value)} 
                  className="w-full bg-slate-800 border border-white/5 rounded-xl px-5 py-4 text-xs font-bold uppercase tracking-widest focus:border-indigo-500 outline-none text-white transition-all"
                />
              </div>
              <div className="md:col-span-4 relative">
                <select 
                  value={newSubYear} onChange={(e) => setNewSubYear(e.target.value)}
                  className="w-full bg-slate-800 border border-white/5 rounded-xl px-5 py-4 text-xs font-bold uppercase tracking-widest focus:border-indigo-500 outline-none text-white cursor-pointer appearance-none"
                >
                  {['1st Year', '2nd Year', '3rd Year', '4th Year'].map(year => (
                    <option key={year} value={year} className="bg-slate-900">{year.toUpperCase()}</option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" /></svg>
                </div>
              </div>
            </div>
            <button type="submit" className="w-full py-4 bg-indigo-600 text-white font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-indigo-500 transition-all">
              Confirm Registration
            </button>
          </form>
        </section>
      )}

      {/* TABLE SECTION */}
      <section className="flex-1 min-h-0 bg-slate-900/50 border border-white/5 rounded-[2.5rem] overflow-hidden backdrop-blur-sm flex flex-col shadow-2xl mb-24 md:mb-0">
        <div className="overflow-y-auto custom-scrollbar flex-1">
          <table className="w-full text-left min-w-full border-collapse">
            <thead className="sticky top-0 z-10 bg-[#151c2e]">
              <tr className="border-b border-white/5">
                <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Subject Title</th>
                <th className="hidden md:table-cell p-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Level</th>
                <th className="p-6 text-right text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {subjects.map((sub) => (
                <tr key={sub.id} onClick={() => handleOpenDrawer(sub)} className="group hover:bg-white/[0.03] transition-colors cursor-pointer lg:cursor-default">
                  <td className="p-5 md:p-6">
                    <div className="flex flex-col">
                      <span className="font-black text-slate-200 uppercase italic text-sm group-hover:text-indigo-400 transition-colors truncate">{sub.name}</span>
                      <span className="md:hidden text-[9px] text-indigo-500 font-bold uppercase tracking-widest mt-1">{sub.yearLevel}</span>
                    </div>
                  </td>
                  <td className="hidden md:table-cell p-6">
                    <span className="px-4 py-1.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/10 rounded-lg text-[10px] font-black uppercase tracking-widest">
                      {sub.yearLevel}
                    </span>
                  </td>
                  <td className="p-6 text-right">
                    <button 
                      onClick={(e) => { e.stopPropagation(); setConfirmModal({ show: true, id: sub.id, name: sub.name }) }} 
                      className="p-3 text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all cursor-pointer"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* CONFIRM DELETE MODAL */}
      {confirmModal.show && (
        <div className="fixed inset-0 flex items-center justify-center z-[2000] bg-slate-950/90 backdrop-blur-md p-4">
          <div className="bg-slate-900 border border-white/10 rounded-[2.5rem] p-8 max-w-sm w-full text-center shadow-2xl">
            <h3 className="text-xl font-black text-white mb-2 uppercase italic leading-tight">Remove Subject?</h3>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-8">Confirm deletion of {confirmModal.name}</p>
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => setConfirmModal({ show: false, id: null, name: '' })} className="py-4 bg-slate-800 text-slate-300 rounded-2xl font-black text-[10px] uppercase cursor-pointer">Back</button>
              <button onClick={confirmDelete} className="py-4 bg-rose-600 text-white rounded-2xl font-black text-[10px] uppercase cursor-pointer shadow-lg shadow-rose-600/20 active:scale-95">Remove</button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST */}
      {toast.show && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[3000] bg-indigo-600 text-white px-6 py-3 rounded-full shadow-2xl border border-white/10">
          <span className="text-[10px] font-black uppercase tracking-[0.2em]">{toast.message}</span>
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