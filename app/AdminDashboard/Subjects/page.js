'use client'
import { useState, useEffect } from 'react'
import { db, auth } from '../../../lib/firebase' 
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
  
  const [selectedFilter, setSelectedFilter] = useState('All')
  const yearLevels = ['All', '1st Year', '2nd Year', '3rd Year', '4th Year']

  const [toast, setToast] = useState({ show: false, message: '' })
  const [confirmModal, setConfirmModal] = useState({ show: false, id: null, name: '' })

  useEffect(() => {
    const unsubSubs = onSnapshot(collection(db, "subjects"), (snap) => {
      setSubjects(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })))
      setLoading(false)
    })
    return () => unsubSubs()
  }, [])

  const filteredSubjects = selectedFilter === 'All' 
    ? subjects 
    : subjects.filter(sub => sub.yearLevel === selectedFilter)

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

  const handleAddSubject = async (e) => {
    e.preventDefault()
    if (!newSubName.trim()) return showToast("Subject name required")
    try {
      await addDoc(collection(db, "subjects"), {
        name: newSubName.trim(),
        yearLevel: newSubYear,
        createdAt: serverTimestamp()
      })
      await logActivity("REGISTER_SUBJECT", `Added: ${newSubName.trim()} for ${newSubYear}`)
      setNewSubName('')
      setIsAddFormOpen(false)
      showToast("Subject Registered")
    } catch (err) { showToast("Error adding subject") }
  }

  const confirmDelete = async () => {
    if (!confirmModal.id) return
    try {
      await deleteDoc(doc(db, "subjects", confirmModal.id))
      await logActivity("REMOVE_SUBJECT", `Deleted: ${confirmModal.name}`)
      setConfirmModal({ show: false, id: null, name: '' })
      showToast("Subject Removed")
    } catch (err) { showToast("Delete failed") }
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
    <div className="p-4 md:p-8 lg:p-12 max-w-6xl mx-auto w-full h-screen flex flex-col space-y-4 md:space-y-6 overflow-hidden">
      
      {/* HEADER - HIDDEN ON MOBILE */}
      <div className="hidden md:flex items-center justify-between gap-6 shrink-0">
        <div>
          <h2 className="text-2xl font-black text-white uppercase italic tracking-tight">Subject Management</h2>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-1">Showing {filteredSubjects.length} of {subjects.length} total</p>
        </div>
        <button 
          onClick={() => setIsAddFormOpen(true)} 
          className="px-6 py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest cursor-pointer hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 transition-all active:scale-95"
        >
          Add New Subject
        </button>
      </div>

      {/* MODAL-STYLE ADD FORM (Student List Format) */}
      {isAddFormOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300">
          <section className="w-full max-w-xl bg-slate-900 border border-indigo-500/30 p-8 rounded-[2.5rem] shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-xl font-black text-white uppercase italic tracking-tight">Register Subject</h3>
                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1">Create a new curriculum entry</p>
              </div>
              <button onClick={() => setIsAddFormOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <form onSubmit={handleAddSubject} className="space-y-6">
              <div className="space-y-4">
                <div className="group">
                  <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1 mb-2 block">Subject Name</label>
                  <input 
                    type="text" placeholder="Subject Name" value={newSubName} 
                    onChange={(e) => setNewSubName(e.target.value)} 
                    className="w-full bg-slate-800/50 border border-white/5 rounded-2xl px-6 py-4 text-xs font-bold uppercase tracking-widest focus:border-indigo-500 outline-none text-white transition-all group-hover:bg-slate-800"
                  />
                </div>

                <div className="group">
                  <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1 mb-2 block">Year Level Assignment</label>
                  <select 
                    value={newSubYear} onChange={(e) => setNewSubYear(e.target.value)}
                    className="w-full bg-slate-800/50 border border-white/5 rounded-2xl px-6 py-4 text-xs font-bold uppercase tracking-widest focus:border-indigo-500 outline-none text-white cursor-pointer transition-all group-hover:bg-slate-800"
                  >
                    {yearLevels.filter(y => y !== 'All').map(year => (
                      <option key={year} value={year} className="bg-slate-900">{year.toUpperCase()}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsAddFormOpen(false)} className="flex-1 py-4 bg-slate-800 text-slate-400 font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-slate-700 transition-all">
                  Discard
                </button>
                <button type="submit" className="flex-[2] py-4 bg-indigo-600 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 transition-all active:scale-95">
                  Confirm Subject
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* ADAPTIVE FILTER SECTION */}
      <div className="shrink-0">
        <div className="md:hidden relative">
          <select 
            value={selectedFilter}
            onChange={(e) => setSelectedFilter(e.target.value)}
            className="w-full bg-slate-900 text-white border border-white/10 rounded-2xl px-6 py-4 text-[10px] font-black uppercase tracking-widest appearance-none outline-none focus:border-indigo-500"
          >
            {yearLevels.map((year) => (
              <option key={year} value={year} className="bg-slate-900 text-white">FILTER: {year.toUpperCase()}</option>
            ))}
          </select>
          <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-indigo-500">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg>
          </div>
        </div>

        <div className="hidden md:flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          {yearLevels.map((year) => (
            <button
              key={year}
              onClick={() => setSelectedFilter(year)}
              className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap cursor-pointer ${
                selectedFilter === year 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' 
                : 'bg-slate-900 text-slate-500 border border-white/5 hover:bg-slate-800'
              }`}
            >
              {year}
            </button>
          ))}
        </div>
      </div>

      {/* TABLE SECTION */}
      <section className="flex-1 min-h-0 bg-slate-900/50 border border-white/5 rounded-[2.5rem] md:rounded-[2.5rem] rounded-b-none overflow-hidden flex flex-col shadow-2xl">
        <div className="overflow-y-auto custom-scrollbar flex-1">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10 bg-[#151c2e]">
              <tr className="border-b border-white/5">
                <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Subject Title</th>
                <th className="hidden md:table-cell p-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Level</th>
                <th className="p-6 text-right text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredSubjects.length > 0 ? (
                filteredSubjects.map((sub) => (
                  <tr key={sub.id} className="group hover:bg-white/[0.03] transition-colors">
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
                        onClick={() => setConfirmModal({ show: true, id: sub.id, name: sub.name })} 
                        className="p-3 text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all cursor-pointer"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="3" className="p-20 text-center">
                    <p className="text-slate-600 font-black text-[10px] uppercase tracking-widest italic">No subjects found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* MOBILE FLOATING ACTION BUTTON */}
      {!isAddFormOpen && (
        <button 
          onClick={() => setIsAddFormOpen(true)}
          className="md:hidden fixed bottom-13 right-6 w-14 h-14 bg-indigo-600 text-white rounded-2xl shadow-2xl flex items-center justify-center z-50 active:scale-90 transition-transform"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>
        </button>
      )}

      {/* CONFIRM DELETE MODAL */}
      {confirmModal.show && (
        <div className="fixed inset-0 flex items-center justify-center z-[2000] bg-slate-950/90 backdrop-blur-md p-4">
          <div className="bg-slate-900 border border-white/10 rounded-[2.5rem] p-8 max-w-sm w-full text-center shadow-2xl animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-black text-white mb-2 uppercase italic leading-tight">Remove Subject?</h3>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-8 leading-relaxed">Confirm deletion of <br/> <span className="text-white italic">{confirmModal.name}</span></p>
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => setConfirmModal({ show: false, id: null, name: '' })} className="py-4 bg-slate-800 text-slate-300 rounded-2xl font-black text-[10px] uppercase cursor-pointer">Back</button>
              <button onClick={confirmDelete} className="py-4 bg-rose-600 text-white rounded-2xl font-black text-[10px] uppercase cursor-pointer shadow-lg shadow-rose-600/20">Remove</button>
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
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  )
}