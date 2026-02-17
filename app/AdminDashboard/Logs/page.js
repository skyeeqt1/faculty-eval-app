'use client'
import { useState, useEffect } from 'react'
import { db } from '../../../lib/firebase'
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  limit 
} from 'firebase/firestore'

export default function ActivityLogs() {
  const [loading, setLoading] = useState(true)
  const [logs, setLogs] = useState([])

  useEffect(() => {
    // Listens to your 'audit_logs' collection
    const q = query(
      collection(db, "audit_logs"), 
      orderBy("timestamp", "desc"),
      limit(100) 
    )

    const unsubLogs = onSnapshot(q, (snap) => {
      setLogs(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })))
      setLoading(false)
    }, (error) => {
      console.error("Firestore Error:", error)
      setLoading(false)
    })

    return () => unsubLogs()
  }, [])

  const formatTimestamp = (ts) => {
    if (!ts) return "---"
    // Handles both Firestore Timestamp objects and standard JS dates
    const date = ts.toDate ? ts.toDate() : new Date(ts)
    return new Intl.DateTimeFormat('en-PH', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(date)
  }

  if (loading) return (
    <div className="flex-1 flex items-center justify-center bg-[#0f172a]">
      <div className="text-indigo-400 font-black uppercase tracking-[0.3em] animate-pulse">
        Loading Audit Trails...
      </div>
    </div>
  )

  return (
    <div className="p-4 md:p-8 lg:p-12 max-w-6xl mx-auto w-full h-screen flex flex-col space-y-4 md:space-y-8 overflow-hidden">
      
      {/* DESKTOP HEADER */}
      <div className="hidden md:flex shrink-0 items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-white uppercase italic tracking-tight">System Audit Logs</h2>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-1">
            Tracking {logs.length} Recent Admin Actions
          </p>
        </div>
      </div>

      {/* LOGS TABLE CONTAINER */}
      <section className="flex-1 min-h-0 bg-slate-900/50 border border-white/5 rounded-[2.5rem] overflow-hidden backdrop-blur-sm flex flex-col shadow-2xl mb-24 md:mb-0">
        <div className="overflow-y-auto custom-scrollbar flex-1">
          <table className="w-full text-left min-w-full border-collapse">
            <thead className="sticky top-0 z-10 bg-[#151c2e]">
              <tr className="border-b border-white/5">
                <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Date & Time</th>
                <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Activity Details</th>
                <th className="hidden md:table-cell p-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Administrator</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {logs.length > 0 ? (
                logs.map((log) => {
                  // Style logic based on your Firestore strings
                  const isReset = log.action?.includes('RESET');
                  const isDelete = log.action?.toLowerCase().includes('delete') || log.action?.toLowerCase().includes('remove');
                  
                  return (
                    <tr key={log.id} className="group hover:bg-white/[0.02] transition-colors">
                      <td className="p-5 md:p-6 whitespace-nowrap">
                        <span className="text-[10px] font-bold text-slate-400 tabular-nums">
                          {formatTimestamp(log.timestamp)}
                        </span>
                      </td>
                      <td className="p-5 md:p-6">
                        <div className="flex flex-col">
                          <span className={`text-[11px] font-black uppercase italic tracking-wide ${
                            isReset ? 'text-amber-400' : isDelete ? 'text-rose-400' : 'text-emerald-400'
                          }`}>
                            {log.action?.replace(/_/g, ' ')}
                          </span>
                          <span className="text-[9px] text-slate-500 font-bold uppercase mt-0.5 leading-relaxed">
                            {log.details || 'No additional details provided'}
                          </span>
                        </div>
                      </td>
                      <td className="hidden md:table-cell p-6">
                        <div className="inline-flex items-center px-3 py-1 bg-slate-800/50 border border-white/5 rounded-full">
                          <span className="text-slate-400 text-[9px] font-black uppercase tracking-tighter">
                            {log.adminEmail}
                          </span>
                        </div>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan="3" className="p-20 text-center">
                    <p className="text-slate-600 font-bold uppercase text-[10px] tracking-widest italic">
                      No logs found in audit_logs collection
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { 
          background: rgba(99, 102, 241, 0.1); 
          border-radius: 20px; 
        }
      `}</style>
    </div>
  )
}