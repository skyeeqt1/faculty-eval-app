'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import Toast from '../../../components/ui/Toast'
import Modal from '../../../components/ui/Modal'
import { generateUUID } from '../../../lib/utils'
import { logActivity } from '../../../lib/logger'
import { YEAR_LEVELS, SEMESTERS } from '../../../lib/constants'

export default function SubjectsManagement() {
  const [loading, setLoading] = useState(true)
  const [subjects, setSubjects] = useState([])
  const [newSubName, setNewSubName] = useState('')
  const [newSubYear, setNewSubYear] = useState('1st Year')
  const [newSubSemester, setNewSubSemester] = useState('1st Semester')
  const [isAddFormOpen, setIsAddFormOpen] = useState(false)

  const [selectedFilter, setSelectedFilter] = useState('All')
  const yearLevels = ['All', ...YEAR_LEVELS]
  const semesters = SEMESTERS

  const [toast, setToast] = useState({ show: false, message: '' })
  const [confirmModal, setConfirmModal] = useState({ show: false, id: null, name: '' })

  useEffect(() => {
    // Fetch initial data
    fetchSubjects()

    // Set up realtime subscription
    const channel = supabase
      .channel('subjects-realtime')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'subjects' },
        (payload) => {
          fetchSubjects()
        }
      )
      .subscribe((status) => {
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // Handle mobile back button to close form
  useEffect(() => {
    const handleBackButton = (e) => {
      if (isAddFormOpen) {
        e.preventDefault()
        setIsAddFormOpen(false)
      } else if (confirmModal.show) {
        e.preventDefault()
        setConfirmModal({ show: false, id: null, name: '' })
      }
    }

    if (isAddFormOpen) {
      window.history.pushState({ formOpen: true }, '')
      window.addEventListener('popstate', handleBackButton)
    } else if (confirmModal.show) {
      window.history.pushState({ confirmModalOpen: true }, '')
      window.addEventListener('popstate', handleBackButton)
    }

    return () => {
      window.removeEventListener('popstate', handleBackButton)
    }
  }, [isAddFormOpen, confirmModal.show])

  const fetchSubjects = async () => {
    try {
      const { data, error } = await supabase
        .from("subjects")
        .select("*")
        .order("createdat", { ascending: false })

      if (error) throw error
      setSubjects(data || [])
    } catch (err) {
      console.error("Error fetching subjects:", err)
    } finally {
      setLoading(false)
    }
  }

  const filteredSubjects = selectedFilter === 'All'
    ? subjects
    : subjects.filter(sub => sub.yearlevel === selectedFilter)

  const handleAddSubject = async (e) => {
    e.preventDefault()
    if (!newSubName.trim()) return showToast("Subject name required")

    // Check if subject already exists with same name
    const exists = subjects.some(s =>
      s.name.toLowerCase() === newSubName.trim().toLowerCase()
    )
    if (exists) {
      showToast("Subject name already exists")
      return
    }

    try {
      // Generate a random UUID for the subject
      const subjectId = generateUUID()

      const { data, error } = await supabase
        .from("subjects")
        .insert({
          id: subjectId,
          name: newSubName.trim(),
          yearlevel: newSubYear,
          semester: newSubSemester,
          createdat: new Date().toISOString()
        })
        .select()

      if (error) {
        console.error("Supabase error:", error)
        if (error.code === '23505') {
          showToast("Subject already exists")
        } else {
          showToast(error.message || "Error adding subject")
        }
        return
      }

      if (!data || data.length === 0) {
        showToast("Error: Could not add subject")
        return
      }

      await logActivity("REGISTER_SUBJECT", `Added: ${newSubName.trim()} for ${newSubYear} - ${newSubSemester}`)
      setNewSubName('')
      setIsAddFormOpen(false)
      showToast("Subject Registered")

      fetchSubjects()
    } catch (err) {
      console.error("Error:", err)
      showToast("Error adding subject")
    }
  }

  const confirmDelete = async () => {
    if (!confirmModal.id) return
    try {
      const { error } = await supabase
        .from("subjects")
        .delete()
        .eq("id", confirmModal.id)

      if (error) throw error

      await logActivity("REMOVE_SUBJECT", `Deleted: ${confirmModal.name}`)
      setConfirmModal({ show: false, id: null, name: '' })
      showToast("Subject Removed")

      fetchSubjects()
    } catch (err) { showToast("Delete failed") }
  }

  const showToast = (msg) => {
    setToast({ show: true, message: msg })
    setTimeout(() => setToast({ show: false, message: '' }), 2500)
  }

  if (loading) return (
    <div className="flex-1 flex items-center justify-center page-bg">
      <div className="text-sm font-medium text-indigo-500 dark:text-indigo-300 animate-pulse">Loading subjects...</div>
    </div>
  )

  return (
    <div className="p-4 md:p-8 lg:p-12 max-w-6xl mx-auto w-full h-screen flex flex-col space-y-4 md:space-y-6 overflow-hidden page-bg">

      {/* HEADER - HIDDEN ON MOBILE */}
      <div className="hidden md:flex items-center justify-between gap-6 shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Subject Management</h2>
          <p className="overline mt-1">Showing {filteredSubjects.length} of {subjects.length} total</p>
        </div>
        <button
          onClick={() => setIsAddFormOpen(true)}
          className="btn btn-primary px-5 py-3 text-sm"
        >
          Add New Subject
        </button>
      </div>

      {/* MODAL-STYLE ADD FORM */}
      {isAddFormOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-fade-in">
          <section className="w-full max-w-xl card p-8 animate-pop-in">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Register Subject</h3>
                <p className="overline mt-1">Create a new curriculum entry</p>
              </div>
              <button onClick={() => setIsAddFormOpen(false)} className="text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <form onSubmit={handleAddSubject} className="space-y-6">
              <div className="space-y-4">
                <div className="group">
                  <label className="overline ml-1 mb-2 block">Subject Name</label>
                  <input
                    type="text" placeholder="Subject Name" value={newSubName}
                    onChange={(e) => setNewSubName(e.target.value)}
                    className="input"
                  />
                </div>

                <div className="group">
                  <label className="overline ml-1 mb-2 block">Year Level Assignment</label>
                  <select
                    value={newSubYear} onChange={(e) => setNewSubYear(e.target.value)}
                    className="input cursor-pointer"
                  >
                    {YEAR_LEVELS.map(year => (
                      <option key={year} value={year} className="bg-white dark:bg-slate-900">{year}</option>
                    ))}
                  </select>
                </div>

                <div className="group">
                  <label className="overline ml-1 mb-2 block">Semester</label>
                  <select
                    value={newSubSemester} onChange={(e) => setNewSubSemester(e.target.value)}
                    className="input cursor-pointer"
                  >
                    {semesters.map(sem => (
                      <option key={sem} value={sem} className="bg-white dark:bg-slate-900">{sem}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsAddFormOpen(false)} className="flex-1 btn btn-ghost py-3 text-sm transition-all">
                  Discard
                </button>
                <button type="submit" className="flex-[2] btn btn-primary py-3 text-sm transition-all">
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
            className="w-full input cursor-pointer"
          >
            {yearLevels.map((year) => (
              <option key={year} value={year} className="bg-white dark:bg-slate-900">{year}</option>
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
              className={`px-5 py-2.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                selectedFilter === year
                ? 'btn btn-primary border-transparent'
                : 'surface-muted text-slate-500 dark:text-slate-400 border border-slate-200/60 dark:border-indigo-500/8 hover:bg-slate-50 dark:hover:bg-indigo-500/8 hover:text-indigo-600 dark:hover:text-indigo-300'
              }`}
            >
              {year}
            </button>
          ))}
        </div>
      </div>

      {/* TABLE SECTION */}
      <section className="flex-1 min-h-0 card overflow-hidden flex flex-col">
        <div className="overflow-y-auto scrollbar-thin flex-1">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-slate-100 dark:border-slate-800">
                <th className="p-6 overline">Subject Title</th>
                <th className="hidden md:table-cell p-6 overline">Level</th>
                <th className="p-6 overline text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredSubjects.length > 0 ? (
                filteredSubjects.map((sub) => (
                  <tr key={sub.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="p-5 md:p-6">
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-800 dark:text-slate-100 text-sm group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors truncate">{sub.name}</span>
                        <span className="md:hidden text-xs text-indigo-600 dark:text-indigo-300 font-medium mt-1">{sub.yearlevel}</span>
                      </div>
                    </td>
                    <td className="hidden md:table-cell p-6">
                      <span className="px-4 py-1.5 bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-500/20 rounded-lg text-xs font-medium">
                        {sub.yearlevel}
                      </span>
                    </td>
                    <td className="p-6 text-right">
                      <button
                        onClick={() => setConfirmModal({ show: true, id: sub.id, name: sub.name })}
                        className="p-3 text-rose-500 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/15 rounded-xl transition-all cursor-pointer"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="3" className="p-20 text-center">
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No subjects found</p>
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
          className="md:hidden fixed w-14 h-14 btn btn-primary rounded-2xl shadow-2xl flex items-center justify-center z-50"
          style={{ right: '1.5rem', bottom: 'calc(1.5rem + var(--sab))' }}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>
        </button>
      )}

      {/* CONFIRM DELETE MODAL */}
      <Modal open={confirmModal.show} onClose={() => setConfirmModal({ show: false, id: null, name: '' })}>
        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-50 mb-2 leading-tight">Remove Subject?</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">Confirm deletion of <br/> <span className="font-semibold text-slate-900 dark:text-slate-100">{confirmModal.name}</span></p>
        <div className="grid grid-cols-2 gap-4">
          <button onClick={() => setConfirmModal({ show: false, id: null, name: '' })} className="btn btn-ghost py-3 text-sm cursor-pointer">Back</button>
          <button onClick={confirmDelete} className="btn btn-danger py-3 text-sm cursor-pointer">Remove</button>
        </div>
      </Modal>

      <Toast show={toast.show} message={toast.message} variant="info" onClose={() => setToast({ show: false, message: '' })} />
    </div>
  )
}