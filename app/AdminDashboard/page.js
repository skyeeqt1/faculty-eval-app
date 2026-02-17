'use client'
import { useState, useEffect } from 'react'
import { db } from '../../lib/firebase'
import { doc, getDoc, setDoc, collection, onSnapshot, query } from 'firebase/firestore'

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true)
  const [isFormOpen, setIsFormOpen] = useState(true)
  const [toast, setToast] = useState({ show: false, message: '' })
  const [confirmModal, setConfirmModal] = useState({ show: false, title: '', onConfirm: null })
  const [ranking, setRanking] = useState([])

  useEffect(() => {
    fetchSettings()
    const q = query(collection(db, "evaluations"))
    const unsubRanking = onSnapshot(q, (snapshot) => {
      const allEvals = snapshot.docs.map(doc => doc.data())
      const grouped = allEvals.reduce((acc, curr) => {
        const name = curr.professorName || "Unknown"
        const rating = parseFloat(curr.rating) || 0
        if (!acc[name]) {
          acc[name] = { name, total: 0, count: 0, imageUrl: curr.professorImage || null }
        }
        acc[name].total += rating
        acc[name].count += 1
        return acc
      }, {})
      const sortedProfs = Object.values(grouped)
        .map((p) => ({
          id: p.name,
          name: p.name,
          rating: p.total / p.count,
          imageUrl: p.imageUrl
        }))
        .sort((a, b) => b.rating - a.rating)
      setRanking(sortedProfs)
      setLoading(false)
    })
    return () => unsubRanking()
  }, [])

  const fetchSettings = async () => {
    try {
      const docSnap = await getDoc(doc(db, "settings", "formConfig"))
      if (docSnap.exists()) setIsFormOpen(docSnap.data().isOpen)
    } catch (err) { console.error("Error fetching settings:", err) }
  }

  const togglePortal = async () => {
    const nextStatus = !isFormOpen;
    setConfirmModal({
      show: true,
      title: `Switch evaluation portal to ${nextStatus ? 'LIVE' : 'OFFLINE'}?`,
      onConfirm: async () => {
        await setDoc(doc(db, "settings", "formConfig"), { isOpen: nextStatus, updatedAt: new Date() });
        setIsFormOpen(nextStatus);
        setToast({ show: true, message: `System: ${nextStatus ? 'Live' : 'Offline'}` });
        setTimeout(() => setToast({ show: false, message: '' }), 2000);
      }
    });
  }

  if (loading) return (
    <div className="flex-1 flex items-center justify-center bg-[#0f172a]">
      <div className="text-center font-bold text-indigo-400 uppercase tracking-[0.3em]">Analyzing Ratings...</div>
    </div>
  )

  return (
    <div className="p-4 md:p-12 max-w-6xl mx-auto w-full h-screen flex flex-col space-y-8 overflow-hidden">
      
      {/* DESKTOP HEADER (Only visible on MD and larger) */}
      <div className="hidden md:flex shrink-0 flex-col md:items-start justify-between gap-6">
        <div>
          <h2 className="text-2xl font-black text-white uppercase italic tracking-tight">Main Dashboard</h2>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-1">System Overview & Performance</p>
        </div>
      </div>

      {/* Portal Status Card */}
      <section className={`shrink-0 p-8 rounded-[2.5rem] border transition-all flex flex-col md:flex-row items-center justify-between gap-6 ${isFormOpen ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-slate-900 border-white/5'}`}>
        <div className="text-center md:text-left">
          <h2 className={`text-xl font-black uppercase italic ${isFormOpen ? 'text-emerald-500' : 'text-slate-300'}`}>System Status: {isFormOpen ? 'Live' : 'Offline'}</h2>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">Evaluation portal is currently {isFormOpen ? 'accepting' : 'blocking'} student submissions.</p>
        </div>
        <button onClick={togglePortal} className={`px-10 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 cursor-pointer transition-all ${isFormOpen ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'bg-slate-800 text-slate-400 hover:text-slate-200'}`}>
          {isFormOpen ? 'Close Portal' : 'Open Portal'}
        </button>
      </section>

      {/* Ranking Section */}
      <section className="flex-1 flex flex-col min-h-0 space-y-4">
        <div className="shrink-0 flex items-center justify-between px-4">
          <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.3em] italic">Faculty Performance Overview</h3>
          <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Ratings</span>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-900/50 border border-white/5 rounded-[2.5rem] backdrop-blur-sm">
          {ranking.length > 0 ? (
            <div className="divide-y divide-white/5">
              {ranking.map((prof) => (
                <div key={prof.id} className="flex items-center justify-between p-6 hover:bg-white/[0.02] transition-colors group">
                  <div className="flex items-center gap-6">
                    <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                      {prof.imageUrl ? (
                        <img src={prof.imageUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-indigo-400 font-black text-xs">{prof.name?.charAt(0)}</span>
                      )}
                    </div>
                    <div>
                      <h4 className="text-md font-black text-slate-100 uppercase italic group-hover:text-indigo-400 transition-colors">{prof.name}</h4>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Verified Academic Staff</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2 justify-end">
                      <span className="text-2xl font-black text-white italic tracking-tighter">{(prof.rating || 0).toFixed(1)}</span>
                      <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center p-20">
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] italic">No evaluation data found</p>
            </div>
          )}
        </div>
      </section>

      {/* Confirmation Modal and Toast remains the same... */}
      {confirmModal.show && (
        <div className="fixed inset-0 flex items-center justify-center z-[300] bg-slate-950/90 backdrop-blur-md p-4 text-center">
          <div className="bg-slate-900 border border-white/5 rounded-[2.5rem] p-10 max-w-sm w-full shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-2 uppercase italic tracking-widest text-indigo-400">System Action</h3>
            <p className="text-slate-400 text-[10px] mb-8 font-bold uppercase tracking-widest leading-relaxed">{confirmModal.title}</p>
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => setConfirmModal({ ...confirmModal, show: false })} className="py-4 bg-slate-800 text-slate-300 rounded-2xl font-black text-[10px] uppercase cursor-pointer">Cancel</button>
              <button onClick={() => { confirmModal.onConfirm(); setConfirmModal({ ...confirmModal, show: false }); }} className="py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase cursor-pointer">Confirm</button>
            </div>
          </div>
        </div>
      )}

      {toast.show && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[500] bg-indigo-600 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-3">
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