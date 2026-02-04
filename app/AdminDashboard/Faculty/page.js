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
  
  // Drawer Animation States
  const [activeInstructor, setActiveInstructor] = useState(null)
  const [isDrawerVisible, setIsDrawerVisible] = useState(false)

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

  // DRAWER ANIMATION HANDLERS
  const handleOpenDrawer = (prof) => {
    if (window.innerWidth < 1024) {
      setActiveInstructor(prof)
      setTimeout(() => setIsDrawerVisible(true), 10)
    }
  }

  const handleCloseDrawer = () => {
    setIsDrawerVisible(false)
    setTimeout(() => setActiveInstructor(null), 400)
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
      setName(''); setImageUrl(''); setSelectedYears([]);
      setIsAddFormOpen(false)
      showToast("Instructor Registered")
    } catch (err) { showToast("Registration failed") }
  }

  const handleDeleteTrigger = (e, id, name) => {
    e.stopPropagation() 
    setConfirmModal({ show: true, id, name })
  }

  const confirmDelete = async () => {
    try {
      await deleteDoc(doc(db, "professors", confirmModal.id))
      setConfirmModal({ show: false, id: null, name: '' })
      handleCloseDrawer()
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
    <div className="p-4 md:p-8 lg:p-12 max-w-6xl mx-auto w-full h-screen flex flex-col space-y-8 overflow-hidden">
      
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

      {/* Add Faculty Form Drawer-style Section */}
      {isAddFormOpen && (
        <section className="shrink-0 bg-slate-900/50 border border-indigo-500/20 p-6 md:p-8 rounded-[2rem] backdrop-blur-sm shadow-xl">
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

      {/* Faculty List Table */}
      <section className="flex-1 min-h-0 bg-slate-900/50 border border-white/5 rounded-[2.5rem] overflow-hidden backdrop-blur-sm flex flex-col shadow-2xl">
        <div className="overflow-y-auto custom-scrollbar flex-1">
          <table className="w-full text-left min-w-full border-collapse">
            <thead className="sticky top-0 z-10 bg-[#151c2e]">
              <tr className="border-b border-white/5">
                <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Instructor Name</th>
                <th className="hidden md:table-cell p-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Assigned Levels</th>
                <th className="hidden lg:table-cell p-6 text-right text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredProfs.map((prof) => (
                <tr 
                  key={prof.id} 
                  onClick={() => handleOpenDrawer(prof)}
                  className="group hover:bg-white/[0.03] transition-colors cursor-pointer lg:cursor-default"
                >
                  <td className="p-6">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/10 flex items-center justify-center overflow-hidden shrink-0">
                          {prof.imageUrl ? <img src={prof.imageUrl} alt="" className="w-full h-full object-cover" /> : <span className="text-indigo-400 font-black text-xs">{prof.name[0]}</span>}
                        </div>
                        <span className="font-black text-slate-200 uppercase italic text-sm group-hover:text-indigo-400 transition-colors truncate max-w-[150px] sm:max-w-none">{prof.name}</span>
                      </div>
                      
                      {/* Mobile Badge on Right */}
                      <div className="md:hidden flex gap-1">
                        {prof.assignedYears?.slice(0, 1).map(y => (
                          <span key={y} className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/10 px-2 py-1 rounded text-[8px] font-black uppercase tracking-tighter whitespace-nowrap">
                            {y} {prof.assignedYears.length > 1 && `+${prof.assignedYears.length - 1}`}
                          </span>
                        ))}
                      </div>
                    </div>
                  </td>
                  <td className="hidden md:table-cell p-6">
                    <div className="flex flex-wrap gap-2">
                      {prof.assignedYears?.map(year => (
                        <span key={year} className="px-2 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[9px] font-black uppercase rounded-md">{year}</span>
                      ))}
                    </div>
                  </td>
                  <td className="hidden lg:table-cell p-6 text-right">
                    <button onClick={(e) => handleDeleteTrigger(e, prof.id, prof.name)} className="p-3 text-slate-600 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all cursor-pointer">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* MOBILE ACTION DRAWER */}
      {activeInstructor && (
        <div className="fixed inset-0 z-[400] flex items-end justify-center lg:hidden">
          <div 
            className={`fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity duration-500 ${isDrawerVisible ? 'opacity-100' : 'opacity-0'}`} 
            onClick={handleCloseDrawer} 
          />
          <div 
            className={`relative w-full bg-slate-900 border-t border-white/10 rounded-t-[3rem] p-8 pb-12 shadow-2xl transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${isDrawerVisible ? 'translate-y-0' : 'translate-y-full'}`}
          >
            <div className="w-12 h-1.5 bg-slate-800 rounded-full mx-auto mb-8" />
            
            <div className="flex flex-col items-center text-center mb-8">
              <div className="w-20 h-20 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 p-1 mb-4">
                <div className="w-full h-full rounded-2xl overflow-hidden bg-slate-800 flex items-center justify-center">
                   {activeInstructor.imageUrl ? <img src={activeInstructor.imageUrl} className="w-full h-full object-cover" alt="" /> : <span className="text-2xl font-black text-indigo-400">{activeInstructor.name[0]}</span>}
                </div>
              </div>
              <h3 className="text-xl font-black text-white uppercase italic mb-1">{activeInstructor.name}</h3>
              <div className="flex flex-wrap justify-center gap-2 mt-2">
                {activeInstructor.assignedYears?.map(y => (
                  <span key={y} className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">{y}</span>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <button 
                onClick={(e) => handleDeleteTrigger(e, activeInstructor.id, activeInstructor.name)} 
                className="w-full py-5 bg-rose-600/10 border border-rose-500/20 text-rose-500 rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all"
              >
                Remove Instructor
              </button>
              <button 
                onClick={handleCloseDrawer} 
                className="w-full py-5 text-slate-500 font-black text-[10px] uppercase tracking-widest"
              >
                Close Menu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmModal.show && (
        <div className="fixed inset-0 flex items-center justify-center z-[500] bg-slate-950/90 backdrop-blur-md p-4 text-center">
          <div className="bg-slate-900 border border-rose-500/20 rounded-[2.5rem] p-10 max-w-sm w-full shadow-2xl animate-in zoom-in duration-200">
            <h3 className="text-xl font-black text-white mb-2 uppercase italic">Remove Faculty?</h3>
            <p className="text-slate-500 text-[10px] mb-8 font-bold uppercase tracking-widest leading-relaxed">Permanently delete {confirmModal.name}?</p>
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => setConfirmModal({ show: false, id: null, name: '' })} className="py-4 bg-slate-800 text-slate-300 rounded-2xl font-black text-[10px] uppercase cursor-pointer">Cancel</button>
              <button onClick={confirmDelete} className="py-4 bg-rose-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg shadow-rose-600/20 cursor-pointer active:scale-95 transition-colors">Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast.show && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[600] bg-indigo-600 text-white px-8 py-4 rounded-2xl shadow-2xl animate-in slide-in-from-top-full duration-300">
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