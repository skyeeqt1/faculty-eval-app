'use client'
import { useState, useEffect } from 'react'
import { db, auth } from '../../../lib/firebase'
import { 
  collection, addDoc, deleteDoc, doc, 
  onSnapshot, serverTimestamp 
} from 'firebase/firestore'

export default function FacultyManagement() {
  const [loading, setLoading] = useState(true)
  const [isAddFormOpen, setIsAddFormOpen] = useState(false)
  const [professors, setProfessors] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  
  // Drawer & Modal States
  const [activeInstructor, setActiveInstructor] = useState(null)
  const [isDrawerVisible, setIsDrawerVisible] = useState(false)
  const [toast, setToast] = useState({ show: false, message: '' })
  const [confirmModal, setConfirmModal] = useState({ show: false, id: null, name: '' })

  // Form States
  const [name, setName] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [selectedYears, setSelectedYears] = useState([]) 

  const yearOptions = ["1st Year", "2nd Year", "3rd Year", "4th Year"]

  // 1. Listen for Faculty Updates
  useEffect(() => {
    const unsubProfs = onSnapshot(collection(db, "professors"), (snap) => {
      setProfessors(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })))
      setLoading(false)
    })
    return () => unsubProfs()
  }, [])

  // 2. Helper for Audit Logging
  const logActivity = async (action, details) => {
    try {
      await addDoc(collection(db, "audit_logs"), {
        action: action,
        adminEmail: auth.currentUser?.email || "admintest@gmail.com",
        details: details,
        timestamp: serverTimestamp()
      })
    } catch (err) {
      console.error("Log failed:", err)
    }
  }

  const handleYearToggle = (year) => {
    setSelectedYears(prev => 
      prev.includes(year) ? prev.filter(y => y !== year) : [...prev, year]
    )
  }

  // 3. Add Faculty Logic
  const handleAddFaculty = async (e) => {
    e.preventDefault()
    if (!name.trim()) return showToast("Name is required")
    if (selectedYears.length === 0) return showToast("Select at least one Year Level")

    try {
      await addDoc(collection(db, "professors"), {
        name: name.trim(),
        imageUrl: imageUrl.trim() || null,
        assignedYears: selectedYears,
        createdAt: serverTimestamp()
      })
      
      // LOG ACTION
      await logActivity("REGISTER_INSTRUCTOR", `Registered: ${name.trim()}`)

      setName(''); setImageUrl(''); setSelectedYears([]);
      setIsAddFormOpen(false)
      showToast("Instructor Registered")
    } catch (err) { showToast("Registration failed") }
  }

  // 4. Delete Logic
  const handleDeleteTrigger = (e, id, name) => {
    e.stopPropagation() 
    setConfirmModal({ show: true, id, name })
  }

  const confirmDelete = async () => {
    try {
      await deleteDoc(doc(db, "professors", confirmModal.id))
      
      // LOG ACTION
      await logActivity("REMOVE_INSTRUCTOR", `Deleted: ${confirmModal.name}`)

      setConfirmModal({ show: false, id: null, name: '' })
      showToast("Instructor Removed")
    } catch (err) { showToast("Action failed") }
  }

  const showToast = (msg) => {
    setToast({ show: true, message: msg })
    setTimeout(() => setToast({ show: false, message: '' }), 2500)
  }

  const filteredProfs = professors.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) return (
    <div className="flex-1 flex items-center justify-center bg-[#0f172a]">
      <div className="text-indigo-400 font-black uppercase tracking-[0.3em] animate-pulse">Syncing Faculty...</div>
    </div>
  )

  return (
    <div className="p-4 md:p-8 lg:p-12 max-w-6xl mx-auto w-full h-screen flex flex-col space-y-4 md:space-y-8 overflow-hidden">
      
      {/* HEADER SECTION */}
      <div className="hidden md:flex shrink-0 items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-black text-white uppercase italic tracking-tight">Faculty Management</h2>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-1">Total Registered: {professors.length}</p>
        </div>
        <button onClick={() => setIsAddFormOpen(!isAddFormOpen)} className="px-6 py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest cursor-pointer hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 transition-all active:scale-95">
          {isAddFormOpen ? 'Cancel Action' : 'Add New Instructor'}
        </button>
      </div>

      <div className="md:hidden flex flex-col gap-3 shrink-0">
        <button onClick={() => setIsAddFormOpen(!isAddFormOpen)} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-600/20 active:scale-95 transition-all">
          {isAddFormOpen ? 'Close Registration Form' : 'Register New Instructor'}
        </button>
      </div>

      {/* SEARCH BAR */}
      <div className="shrink-0 relative z-20">
        <input 
          type="text" placeholder="Search instructors..." 
          value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} 
          className="w-full bg-slate-900/50 border border-white/5 p-4 md:p-5 rounded-2xl outline-none text-white text-xs font-bold uppercase tracking-widest focus:border-indigo-500/50 transition-all shadow-inner"
        />
      </div>

      {/* ADD FORM */}
      {isAddFormOpen && (
        <section className="shrink-0 bg-slate-900/50 border border-indigo-500/20 p-6 rounded-[2rem] backdrop-blur-sm shadow-xl animate-in fade-in slide-in-from-top-4 duration-300 mb-4">
          <form onSubmit={handleAddFaculty} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <input type="text" placeholder="FULL NAME" value={name} onChange={(e) => setName(e.target.value)} className="bg-slate-800 border border-white/5 rounded-xl px-5 py-4 text-xs font-bold uppercase tracking-widest focus:border-indigo-500 outline-none text-white w-full"/>
               <input type="text" placeholder="IMAGE URL (OPTIONAL)" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className="bg-slate-800 border border-white/5 rounded-xl px-5 py-4 text-xs font-bold uppercase tracking-widest focus:border-indigo-500 outline-none text-white w-full"/>
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Assign Year Levels</label>
              <div className="flex flex-wrap gap-3">
                {yearOptions.map(year => (
                  <button key={year} type="button" onClick={() => handleYearToggle(year)} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all cursor-pointer ${selectedYears.includes(year) ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg' : 'bg-slate-800 border-white/5 text-slate-500'}`}>{year}</button>
                ))}
              </div>
            </div>
            <button type="submit" className="w-full py-4 bg-indigo-600 text-white font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-indigo-500 transition-all">Confirm Registration</button>
          </form>
        </section>
      )}

      {/* TABLE */}
      <section className="flex-1 min-h-0 bg-slate-900/50 border border-white/5 rounded-[2.5rem] overflow-hidden backdrop-blur-sm flex flex-col shadow-2xl mb-24 md:mb-0">
        <div className="overflow-y-auto custom-scrollbar flex-1">
          <table className="w-full text-left min-w-full border-collapse">
            <thead className="sticky top-0 z-10 bg-[#151c2e]">
              <tr className="border-b border-white/5">
                <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Instructor</th>
                <th className="hidden md:table-cell p-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Assigned Levels</th>
                <th className="p-6 text-right text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredProfs.map((prof) => (
                <tr key={prof.id} className="group hover:bg-white/[0.03] transition-colors">
                  <td className="p-5 md:p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/10 flex items-center justify-center overflow-hidden">
                        {prof.imageUrl ? <img src={prof.imageUrl} alt="" className="w-full h-full object-cover" /> : <span className="text-indigo-400 font-black text-xs">{prof.name[0]}</span>}
                      </div>
                      <span className="font-black text-slate-200 uppercase italic text-sm truncate">{prof.name}</span>
                    </div>
                  </td>
                  <td className="hidden md:table-cell p-6">
                    <div className="flex flex-wrap gap-2">
                      {prof.assignedYears?.map(year => (
                        <span key={year} className="px-2 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[9px] font-black uppercase rounded-md">{year}</span>
                      ))}
                    </div>
                  </td>
                  <td className="p-6 text-right">
                    <button onClick={(e) => handleDeleteTrigger(e, prof.id, prof.name)} className="p-3 text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all cursor-pointer">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* CONFIRM MODAL */}
      {confirmModal.show && (
        <div className="fixed inset-0 flex items-center justify-center z-[2000] bg-slate-950/90 backdrop-blur-md p-4">
          <div className="bg-slate-900 border border-white/10 rounded-[2.5rem] p-8 max-w-sm w-full text-center shadow-2xl">
            <h3 className="text-xl font-black text-white mb-2 uppercase italic leading-tight">Remove Faculty?</h3>
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
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[3000] bg-indigo-600 text-white px-6 py-3 rounded-full shadow-2xl border border-white/10 animate-bounce">
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