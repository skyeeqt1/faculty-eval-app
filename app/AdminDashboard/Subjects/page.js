'use client'
import { useState, useEffect } from 'react'
import { db } from '../../../lib/firebase'
import { 
  collection, addDoc, deleteDoc, doc, 
  onSnapshot, serverTimestamp 
} from 'firebase/firestore'

export default function SubjectsManagement() {
  const [loading, setLoading] = useState(true)
  const [subjects, setSubjects] = useState([])
  const [newSubName, setNewSubName] = useState('')
  const [newSubYear, setNewSubYear] = useState('1st Year')
  
  const [toast, setToast] = useState({ show: false, message: '' })
  const [confirmModal, setConfirmModal] = useState({ show: false, id: null, name: '' })

  useEffect(() => {
    const unsubSubs = onSnapshot(collection(db, "subjects"), (snap) => {
      setSubjects(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })))
      setLoading(false)
    })
    return () => unsubSubs()
  }, [])

  const handleAddSubject = async (e) => {
    e.preventDefault()
    if (!newSubName.trim()) {
      showToast("Subject name required")
      return
    }
    try {
      await addDoc(collection(db, "subjects"), {
        name: newSubName.trim(),
        yearLevel: newSubYear,
        createdAt: serverTimestamp()
      })
      setNewSubName('')
      showToast("Subject Registered")
    } catch (err) { 
      showToast("Error adding subject") 
    }
  }

  const handleDelete = async () => {
    try {
      await deleteDoc(doc(db, "subjects", confirmModal.id))
      setConfirmModal({ show: false, id: null, name: '' })
      showToast("Subject Removed")
    } catch (err) { 
      showToast("Delete failed") 
    }
  }

  const showToast = (msg) => {
    setToast({ show: true, message: msg })
    setTimeout(() => setToast({ show: false, message: '' }), 2500)
  }

  if (loading) return (
    <div className="flex-1 flex items-center justify-center bg-[#0f172a]">
      <div className="text-indigo-400 font-black uppercase tracking-[0.3em]">Loading Curriculum...</div>
    </div>
  )

  return (
    <div className="p-4 md:p-12 max-w-6xl mx-auto w-full space-y-8 h-screen flex flex-col">
      
      {/* Header section - Non-scrollable */}
      <div className="shrink-0">
        <h2 className="text-2xl font-black text-white uppercase italic tracking-tight">Subject Management</h2>
        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-1">
          Total Curriculum Items: {subjects.length}
        </p>
      </div>

      {/* Add Subject Form Card - Non-scrollable */}
      <section className="shrink-0 bg-slate-900/50 border border-indigo-500/20 p-5 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] backdrop-blur-sm shadow-xl">
        <h3 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-6 italic">Add New Subject</h3>
        <form onSubmit={handleAddSubject} className="flex flex-col gap-4 sm:grid sm:grid-cols-12">
          <div className="sm:col-span-6 lg:col-span-7">
            <input 
              type="text" 
              placeholder="Subject TITLE" 
              value={newSubName} 
              onChange={(e) => setNewSubName(e.target.value)} 
              className="w-full bg-slate-800 border border-white/5 rounded-xl px-5 py-4 text-xs font-bold uppercase tracking-widest focus:border-indigo-500 outline-none text-white transition-all"
            />
          </div>
          <div className="sm:col-span-3 lg:col-span-2 relative">
            <select 
              value={newSubYear} 
              onChange={(e) => setNewSubYear(e.target.value)}
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
          <button type="submit" className="sm:col-span-3 lg:col-span-3 py-4 bg-indigo-600 text-white font-black text-[10px] uppercase tracking-widest rounded-xl cursor-pointer hover:bg-indigo-500 transition-all active:scale-95 shadow-lg shadow-indigo-600/20">
            Add Subject
          </button>
        </form>
      </section>

      {/* Subjects Table - SCROLLABLE SECTION */}
      <section className="flex-1 min-h-0 bg-slate-900/50 border border-white/5 rounded-[2.5rem] flex flex-col overflow-hidden backdrop-blur-sm shadow-2xl">
        <div className="overflow-y-auto flex-1 custom-scrollbar">
          <table className="w-full text-left min-w-[500px] border-collapse">
            <thead className="sticky top-0 z-20 bg-[#151c2e]">
              <tr className="border-b border-white/5 shadow-sm">
                <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Subject Information</th>
                <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Year Level</th>
                <th className="p-6 text-right text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {subjects.map((sub) => (
                <tr key={sub.id} className="group hover:bg-white/[0.01] transition-colors">
                  <td className="p-6">
                    <div className="flex flex-col">
                      <span className="font-black text-slate-200 uppercase italic text-sm sm:text-base">{sub.name}</span>
                      <span className="text-[9px] text-slate-600 font-bold uppercase tracking-widest mt-1">ID: {sub.id.slice(0,8).toUpperCase()}</span>
                    </div>
                  </td>
                  <td className="p-6">
                    <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/10 px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest">
                      {sub.yearLevel}
                    </span>
                  </td>
                  <td className="p-6 text-right">
                    <button onClick={() => setConfirmModal({ show: true, id: sub.id, name: sub.name })} className="p-3 text-slate-600 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all cursor-pointer">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </td>
                </tr>
              ))}
              {subjects.length === 0 && (
                <tr>
                  <td colSpan="3" className="p-20 text-center text-[10px] font-black text-slate-600 uppercase tracking-widest italic">
                    Database empty. Please add a Subject above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modals & Toasts (Remain outside scroll container) */}
      {confirmModal.show && (
        <div className="fixed inset-0 flex items-center justify-center z-[300] bg-slate-950/90 backdrop-blur-md p-4 text-center">
          <div className="bg-slate-900 border border-rose-500/20 rounded-[2.5rem] p-10 max-w-sm w-full shadow-2xl">
            <h3 className="text-xl font-black text-white mb-2 uppercase italic">Remove Subject?</h3>
            <p className="text-slate-500 text-[10px] mb-8 font-bold uppercase tracking-widest leading-relaxed">
              Deleting "{confirmModal.name}" will detach it from all associated data.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => setConfirmModal({ show: false, id: null, name: '' })} className="py-4 bg-slate-800 text-slate-300 rounded-2xl font-black text-[10px] uppercase cursor-pointer">Cancel</button>
              <button onClick={handleDelete} className="py-4 bg-rose-600 text-white rounded-2xl font-black text-[10px] uppercase cursor-pointer">Delete</button>
            </div>
          </div>
        </div>
      )}

      {toast.show && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[500] bg-indigo-600 text-white px-8 py-4 rounded-2xl shadow-2xl">
           <span className="text-[10px] font-black uppercase tracking-widest">{toast.message}</span>
        </div>
      )}

      {/* CSS for custom scrollbar */}
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(15, 23, 42, 0.5);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(99, 102, 241, 0.3);
          border-radius: 20px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(99, 102, 241, 0.5);
        }
      `}</style>
    </div>
  )
}