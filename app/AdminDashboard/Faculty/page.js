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
  
  const [toast, setToast] = useState({ show: false, message: '' })
  const [confirmModal, setConfirmModal] = useState({ show: false, id: null, name: '' })

  // Form States
  const [name, setName] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [selectedYears, setSelectedYears] = useState([]) 

  const yearOptions = ["1st Year", "2nd Year", "3rd Year", "4th Year"]

  useEffect(() => {
    const unsubProfs = onSnapshot(collection(db, "professors"), (snap) => {
      setProfessors(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })))
      setLoading(false)
    })
    return () => unsubProfs()
  }, [])

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

  const handleYearToggle = (year) => {
    setSelectedYears(prev => 
      prev.includes(year) ? prev.filter(y => y !== year) : [...prev, year]
    )
  }

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
      await logActivity("REGISTER_INSTRUCTOR", `Registered: ${name.trim()}`)
      setName(''); setImageUrl(''); setSelectedYears([]);
      setIsAddFormOpen(false)
      showToast("Instructor Registered")
    } catch (err) { showToast("Registration failed") }
  }

  const confirmDelete = async () => {
    try {
      await deleteDoc(doc(db, "professors", confirmModal.id))
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
    <div className="p-4 md:p-8 lg:p-12 max-w-6xl mx-auto w-full h-screen flex flex-col space-y-6 md:space-y-8 overflow-hidden">
      
      {/* DESKTOP HEADER */}
      <div className="hidden md:flex shrink-0 items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-black text-white uppercase italic tracking-tight">Faculty Management</h2>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-1">Total Registered: {professors.length}</p>
        </div>
        <button onClick={() => setIsAddFormOpen(true)} className="px-6 py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest cursor-pointer hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 transition-all active:scale-95">
          Add New Instructor
        </button>
      </div>

      {/* MOBILE HEADER */}
      <div className="flex md:hidden shrink-0 items-center justify-between">
        <h2 className="text-lg font-black text-white uppercase italic tracking-tight">Faculty</h2>
        <div className="px-3 py-1 bg-slate-900 border border-white/5 rounded-lg text-[9px] font-black text-slate-500 uppercase tracking-widest">
          {professors.length} Total
        </div>
      </div>

      {/* SEARCH BAR */}
      <div className="shrink-0 relative">
        <input 
          type="text" placeholder="Search instructors..." 
          value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} 
          className="w-full bg-slate-900/50 border border-white/5 p-5 rounded-2xl outline-none text-white text-xs font-bold uppercase tracking-widest focus:border-indigo-500/50 transition-all shadow-inner"
        />
      </div>

      {/* REGISTRATION MODAL */}
      {isAddFormOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300">
          <section className="w-full max-w-2xl bg-slate-900 border border-indigo-500/30 p-8 rounded-[2.5rem] shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-xl font-black text-white uppercase italic tracking-tight">Register Instructor</h3>
                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1">Faculty Access Provisioning</p>
              </div>
              <button onClick={() => setIsAddFormOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <form onSubmit={handleAddFaculty} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.2em] ml-1">Full Name</label>
                  <input type="text" placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-slate-800 border border-white/5 rounded-2xl px-5 py-4 text-xs font-bold uppercase tracking-widest focus:border-indigo-500 outline-none text-white"/>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.2em] ml-1">Profile Image URL (Optional)</label>
                  <input type="text" placeholder="HTTPS://IMAGE.LINK" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className="w-full bg-slate-800 border border-white/5 rounded-2xl px-5 py-4 text-xs font-bold uppercase tracking-widest focus:border-indigo-500 outline-none text-white"/>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.2em] ml-1">Assign Year Levels</label>
                <div className="flex flex-wrap gap-2">
                  {yearOptions.map(year => (
                    <button key={year} type="button" onClick={() => handleYearToggle(year)} className={`px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all cursor-pointer ${selectedYears.includes(year) ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg' : 'bg-slate-800 border-white/5 text-slate-500 hover:text-slate-300'}`}>{year}</button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsAddFormOpen(false)} className="flex-1 py-4 bg-slate-800 text-slate-400 font-black text-[10px] uppercase tracking-widest rounded-2xl">Discard</button>
                <button type="submit" className="flex-[2] py-4 bg-indigo-600 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 active:scale-95 transition-all">Confirm Faculty</button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* FACULTY TABLE */}
      <section className="flex-1 min-h-0 bg-slate-900/50 border border-white/5 rounded-[2.5rem] overflow-hidden backdrop-blur-sm flex flex-col shadow-2xl mb-24 md:mb-0">
        <div className="overflow-y-auto custom-scrollbar flex-1">
          <table className="w-full text-left min-w-full border-collapse">
            <thead className="sticky top-0 z-10 bg-[#151c2e]">
              <tr className="border-b border-white/5">
                <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Instructor Profile</th>
                <th className="hidden md:table-cell p-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Assigned Levels</th>
                <th className="p-6 text-right text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredProfs.map((prof) => (
                <tr key={prof.id} className="group hover:bg-white/[0.03] transition-colors">
                  <td className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/10 flex items-center justify-center overflow-hidden shrink-0">
                        {prof.imageUrl ? <img src={prof.imageUrl} alt="" className="w-full h-full object-cover" /> : <span className="text-indigo-400 font-black text-sm">{prof.name[0]}</span>}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-black text-slate-200 uppercase italic text-sm group-hover:text-indigo-400 transition-colors truncate">{prof.name}</span>
                        <span className="md:hidden text-[9px] text-indigo-500 font-black uppercase tracking-widest mt-0.5">{prof.assignedYears?.length} Years Assigned</span>
                      </div>
                    </div>
                  </td>
                  <td className="hidden md:table-cell p-6">
                    <div className="flex flex-wrap gap-2">
                      {prof.assignedYears?.map(year => (
                        <span key={year} className="px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[9px] font-black uppercase rounded-lg">{year}</span>
                      ))}
                    </div>
                  </td>
                  <td className="p-6 text-right">
                    <button onClick={() => setConfirmModal({ show: true, id: prof.id, name: prof.name })} className="p-3 text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all cursor-pointer">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredProfs.length === 0 && (
            <div className="p-20 text-center">
              <p className="text-slate-600 font-black text-[10px] uppercase tracking-[0.2em]">No faculty members found</p>
            </div>
          )}
        </div>
      </section>

      {/* MOBILE FAB */}
      {!isAddFormOpen && (
        <button onClick={() => setIsAddFormOpen(true)} className="md:hidden fixed bottom-8 right-6 w-14 h-14 bg-indigo-600 text-white rounded-2xl shadow-2xl flex items-center justify-center z-[500] active:scale-90 transition-transform">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>
        </button>
      )}

      {/* CONFIRM MODAL */}
      {confirmModal.show && (
        <div className="fixed inset-0 flex items-center justify-center z-[2000] bg-slate-950/90 backdrop-blur-md p-4">
          <div className="bg-slate-900 border border-white/10 rounded-[2.5rem] p-10 max-w-sm w-full text-center shadow-2xl animate-in zoom-in-95">
            <h3 className="text-xl font-black text-white mb-2 uppercase italic leading-tight">Remove Faculty?</h3>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-8 leading-relaxed">Confirm deletion of<br/><span className="text-rose-500">{confirmModal.name}</span></p>
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => setConfirmModal({ show: false, id: null, name: '' })} className="py-4 bg-slate-800 text-slate-300 rounded-2xl font-black text-[10px] uppercase">Back</button>
              <button onClick={confirmDelete} className="py-4 bg-rose-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg shadow-rose-600/20 active:scale-95">Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST */}
      {toast.show && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[3000] bg-indigo-600 text-white px-8 py-4 rounded-2xl shadow-2xl">
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