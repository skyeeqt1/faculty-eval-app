'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import { formatTimestamp } from '../../../lib/utils'

export default function ActivityLogs() {
  const [loading, setLoading] = useState(true)
  const [logs, setLogs] = useState([])

  useEffect(() => {
    const channel = supabase
      .channel('audit-logs-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'audit_logs' }, (payload) => {
        fetchLogs()
      })
      .subscribe()

    fetchLogs()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const fetchLogs = async () => {
    try {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .order("timestamp", { ascending: false })
        .limit(100)

      if (error) throw error
      setLogs(data || [])
    } catch (err) {
      console.error("Error fetching logs:", err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return (
    <div className="flex-1 flex items-center justify-center page-bg">
      <div className="text-sm font-medium text-indigo-500 dark:text-indigo-300 animate-pulse">
        Loading audit trails...
      </div>
    </div>
  )

  return (
    <div className="p-4 md:p-8 lg:p-12 max-w-6xl mx-auto w-full h-screen flex flex-col space-y-4 md:space-y-8 overflow-hidden page-bg">

      {/* DESKTOP HEADER */}
      <div className="hidden md:flex shrink-0 items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">System Audit Logs</h2>
          <p className="overline mt-1">
            Tracking {logs.length} Recent Admin Actions
          </p>
        </div>
      </div>

      {/* LOGS TABLE CONTAINER */}
      <section className="flex-1 min-h-0 card overflow-hidden flex flex-col mb-24 md:mb-0">
        <div className="overflow-y-auto scrollbar-thin flex-1">
          <table className="w-full text-left min-w-full border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-slate-100 dark:border-slate-800">
                <th className="p-6 overline">Date & Time</th>
                <th className="p-6 overline">Activity Details</th>
                <th className="hidden md:table-cell p-6 overline">Administrator</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {logs.length > 0 ? (
                logs.map((log) => {
                  // Style logic based on the action strings
                  const isReset = log.action?.includes('RESET');
                  const isDelete = log.action?.toLowerCase().includes('delete') || log.action?.toLowerCase().includes('remove');

                  return (
                    <tr key={log.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="p-5 md:p-6 whitespace-nowrap">
                        <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                          {formatTimestamp(log.timestamp)}
                        </span>
                      </td>
                      <td className="p-5 md:p-6">
                        <div className="flex flex-col">
                          <span className={`text-xs font-semibold uppercase tracking-wide ${
                            isReset ? 'text-amber-600 dark:text-amber-400' : isDelete ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                          }`}>
                            {log.action?.replace(/_/g, ' ')}
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                            {log.details || 'No additional details provided'}
                          </span>
                        </div>
                      </td>
                      <td className="hidden md:table-cell p-6">
                        <div className="inline-flex items-center px-3 py-1 surface-muted border border-slate-200/60 dark:border-indigo-500/8 rounded-full">
                          <span className="text-slate-500 dark:text-slate-400 text-xs font-medium">
                            {log.adminemail}
                          </span>
                        </div>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan="3" className="p-20 text-center">
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                      No logs found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}