'use client'
import { useState, useEffect } from 'react'
import { db } from '../../../lib/firebase'
import { 
  collection, addDoc, deleteDoc, doc, 
  onSnapshot, serverTimestamp 
} from 'firebase/firestore'

export default function FacultyManagement() {
  const [loading, setLoading] = useState(true)
  const [isAddFormOpen, setIsAddFormOpen] = useState(false)
  const [professors, setProfessors] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  
  // Selection State for Details
  const [selectedInstructor, setSelectedInstructor] = useState(null)

  // Form States
  const [name, setName] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [selectedYears, setSelectedYears] = useState([]) 
  
  const [toast, setToast] = useState({ show: false, message: '' })
  const [confirmModal, setConfirmModal] = useState({ show: false, id: null, name: '' })

  const yearOptions = ["1st Year", "2nd Year", "3rd Year", "4th Year"]

  useEffect(() => {
    const unsubProfs = onSnapshot(collection(db, "professors"), (snap) => {
      setProfessors(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })))
      setLoading(false)
    })
    return () => unsubProfs()
  }, [])

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
      setName(''); setImageUrl(''); setSelectedYears([]);
      setIsAddFormOpen(false)
      showToast("Instructor Registered")
    } catch (err) { showToast("Registration failed") }
  }

  const handleDelete = async (e, id, name) => {
    e.stopPropagation() 
    setConfirmModal({ show: true, id, name })
  }

  const confirmDelete = async () => {
    try {
      await deleteDoc(doc(db, "professors", confirmModal.id))
      setConfirmModal({ show: false, id: null, name: '' })
      setSelectedInstructor(null) 
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
      <div className="text-indigo-400 font-black uppercase tracking-[0.3em]">Syncing Faculty...</div>
    </div>
  )

  return (
    <div className="p-4 md:p-12 max-w-6xl mx-auto w-full h-screen flex flex-col space-y-8 overflow-hidden">
      {/* Header Section */}
      <div className="shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-black text-white uppercase italic tracking-tight">Faculty Management</h2>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-1">Total Registered: {professors.length}</p>
        </div>
        <button onClick={() => setIsAddFormOpen(!isAddFormOpen)} className="px-6 py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest cursor-pointer hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 transition-all active:scale-95">
          {isAddFormOpen ? 'Cancel Action' : 'Add New Instructor'}
        </button>
      </div>

      {/* Add Faculty Form */}
      {isAddFormOpen && (
        <section className="shrink-0 bg-slate-900/50 border border-indigo-500/20 p-6 md:p-8 rounded-[2rem] backdrop-blur-sm">
          <form onSubmit={handleAddFaculty} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <input type="text" placeholder="FULL NAME" value={name} onChange={(e) => setName(e.target.value)} className="bg-slate-800 border border-white/5 rounded-xl px-5 py-4 text-xs font-bold uppercase tracking-widest focus:border-indigo-500 outline-none text-white"/>
               <input type="text" placeholder="IMAGE URL (OPTIONAL)" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className="bg-slate-800 border border-white/5 rounded-xl px-5 py-4 text-xs font-bold uppercase tracking-widest focus:border-indigo-500 outline-none text-white"/>
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Assign Year Levels</label>
              <div className="flex flex-wrap gap-3">
                {yearOptions.map(year => (
                  <button 
                    key={year} 
                    type="button" 
                    onClick={() => handleYearToggle(year)} 
                    className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all cursor-pointer active:scale-90 ${
                      selectedYears.includes(year) 
                      ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-500' 
                      : 'bg-slate-800 border-white/5 text-slate-500 hover:border-indigo-500/50 hover:text-slate-300'
                    }`}
                  >
                    {year}
                  </button>
                ))}
              </div>
            </div>
            <button type="submit" className="w-full py-4 bg-indigo-600 text-white font-black text-[10px] uppercase tracking-widest rounded-xl cursor-pointer hover:bg-indigo-500 transition-all">Register Instructor</button>
          </form>
        </section>
      )}

      {/* Search Bar */}
      <div className="shrink-0 relative group">
        <input type="text" placeholder="Search instructors..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-slate-900/50 border border-white/5 p-5 rounded-2xl outline-none text-white text-xs font-bold uppercase tracking-widest focus:border-indigo-500/50 transition-all"/>
      </div>

      {/* Faculty Table */}
      <section className="flex-1 min-h-0 bg-slate-900/50 border border-white/5 rounded-[2.5rem] overflow-hidden backdrop-blur-sm flex flex-col">
        <div className="overflow-y-auto custom-scrollbar flex-1">
          <table className="w-full text-left min-w-[600px] border-collapse">
            <thead className="sticky top-0 z-10 bg-[#0f172a]">
              <tr className="border-b border-white/5">
                <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Instructor</th>
                <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Assigned Levels</th>
                <th className="p-6 text-right text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredProfs.map((prof) => (
                <tr 
                  key={prof.id} 
                  onClick={() => setSelectedInstructor(prof)}
                  className="group hover:bg-white/[0.03] transition-colors cursor-pointer"
                >
                  <td className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/10 flex items-center justify-center overflow-hidden shrink-0">
                        {prof.imageUrl ? <img src={prof.imageUrl} alt="" className="w-full h-full object-cover" /> : <span className="text-indigo-400 font-black text-xs">{prof.name[0]}</span>}
                      </div>
                      <span className="font-black text-slate-200 uppercase italic text-sm group-hover:text-indigo-400 transition-colors">{prof.name}</span>
                    </div>
                  </td>
                  <td className="p-6">
                    <div className="flex flex-wrap gap-2">
                      {prof.assignedYears?.map(year => (
                        <span key={year} className="px-2 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[9px] font-black uppercase rounded-md">{year}</span>
                      ))}
                    </div>
                  </td>
                  <td className="p-6 text-right">
                    <button onClick={(e) => handleDelete(e, prof.id, prof.name)} className="p-3 text-slate-600 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all cursor-pointer">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* INSTRUCTOR DETAILS MODAL */}
      {selectedInstructor && (
        <div className="fixed inset-0 z-[400] bg-slate-950/95 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-slate-900 border border-white/5 rounded-[3rem] p-8 md:p-12 relative shadow-2xl overflow-hidden">
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-600/10 blur-[100px]" />
            
            <button onClick={() => setSelectedInstructor(null)} className="absolute top-8 right-8 p-3 bg-white/5 hover:bg-white/10 text-slate-400 rounded-full transition-all cursor-pointer">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>

            <div className="flex flex-col items-center text-center space-y-6">
              <div className="w-32 h-32 rounded-[2.5rem] bg-indigo-500/10 border-2 border-indigo-500/20 p-2">
                <div className="w-full h-full rounded-[2rem] overflow-hidden bg-slate-800 flex items-center justify-center">
                  {selectedInstructor.imageUrl ? (
                    <img src={selectedInstructor.imageUrl} className="w-full h-full object-cover" alt="" />
                  ) : (
                    <span className="text-4xl font-black text-indigo-400">{selectedInstructor.name[0]}</span>
                  )}
                </div>
              </div>

              <div>
                <h2 className="text-3xl font-black text-white uppercase italic tracking-tight">{selectedInstructor.name}</h2>
                <p className="text-[10px] text-indigo-500 font-bold uppercase tracking-[0.4em] mt-2">Verified Faculty Member</p>
              </div>

              <div className="w-full grid grid-cols-2 gap-4 mt-8">
                <div className="bg-white/5 rounded-3xl p-6 border border-white/5 group/card hover:border-indigo-500/30 transition-all duration-300">
                  <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-2">Assignment</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {selectedInstructor.assignedYears?.map(y => (
                      <span key={y} className="text-xs font-bold text-slate-200 group-hover/card:text-indigo-300 transition-colors">{y}</span>
                    ))}
                  </div>
                </div>
                <div className="bg-white/5 rounded-3xl p-6 border border-white/5 hover:border-emerald-500/30 transition-all duration-300">
                  <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-2">Status</p>
                  <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest italic">Active Profile</p>
                </div>
              </div>

              <div className="w-full pt-8 flex gap-4">
                <button 
                  onClick={(e) => handleDelete(e, selectedInstructor.id, selectedInstructor.name)}
                  className="flex-1 py-4 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all cursor-pointer shadow-lg hover:shadow-rose-500/20"
                >
                  Remove Instructor
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmModal.show && (
        <div className="fixed inset-0 flex items-center justify-center z-[500] bg-slate-950/90 backdrop-blur-md p-4 text-center">
          <div className="bg-slate-900 border border-rose-500/20 rounded-[2.5rem] p-10 max-w-sm w-full shadow-2xl">
            <h3 className="text-xl font-black text-white mb-2 uppercase italic">Remove Faculty?</h3>
            <p className="text-slate-500 text-[10px] mb-8 font-bold uppercase tracking-widest leading-relaxed">Permanently delete {confirmModal.name}?</p>
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => setConfirmModal({ show: false, id: null, name: '' })} className="py-4 bg-slate-800 text-slate-300 rounded-2xl font-black text-[10px] uppercase cursor-pointer hover:bg-slate-700 transition-colors">Cancel</button>
              <button onClick={confirmDelete} className="py-4 bg-rose-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg shadow-rose-600/20 cursor-pointer hover:bg-rose-500 transition-colors">Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast.show && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[600] bg-indigo-600 text-white px-8 py-4 rounded-2xl shadow-2xl">
           <span className="text-[10px] font-black uppercase tracking-widest">{toast.message}</span>
        </div>
      )}

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(99, 102, 241, 0.2); border-radius: 20px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(99, 102, 241, 0.4); }
      `}</style>
    </div>
  )
}