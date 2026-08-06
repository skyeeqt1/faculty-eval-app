'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import Toast from '../../../components/ui/Toast'
import Modal from '../../../components/ui/Modal'
import { generateUUID, generateTempPassword } from '../../../lib/utils'
import { hashPassword } from '../../../lib/bcrypt'
import { logActivity } from '../../../lib/logger'
import { YEAR_LEVELS, BLOCKS } from '../../../lib/constants'

export default function StudentListPage() {
  const [loading, setLoading] = useState(true)
  const [students, setStudents] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [activeYearFilter, setActiveYearFilter] = useState('All')
  const [isAddFormOpen, setIsAddFormOpen] = useState(false)
  const [editingStudent, setEditingStudent] = useState(null)

  // Registration State
  const [newStudent, setNewStudent] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    yearLevel: '',
    block: ''
  })

  const [confirmModal, setConfirmModal] = useState({ show: false, id: null, name: '' })
  const [resetConfirmModal, setResetConfirmModal] = useState({ show: false, student: null })
  const [globalVoteResetModal, setGlobalVoteResetModal] = useState(false)

  const [deleteReason, setDeleteReason] = useState('')
  const [toast, setToast] = useState({ show: false, message: '' })
  const [generatedPassword, setGeneratedPassword] = useState('')
  const [copied, setCopied] = useState(false)
  const [actionPopup, setActionPopup] = useState({ show: false, student: null })

  const yearLevels = YEAR_LEVELS
  const blocks = BLOCKS

  // Populate form when editing a student
  useEffect(() => {
    if (editingStudent) {
      setNewStudent({
        firstName: editingStudent.firstname || '',
        lastName: editingStudent.lastname || '',
        email: editingStudent.email || '',
        password: '', // Don't pre-fill password for editing
        yearLevel: editingStudent.yearlevel || '',
        block: editingStudent.block || ''
      })
    } else {
      // Reset form when closing
      setNewStudent({ firstName: '', lastName: '', email: '', password: '', yearLevel: '', block: '' })
    }
  }, [editingStudent])

  useEffect(() => {
    const channel = supabase
      .channel('students-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'authorized_students' }, (payload) => {
        fetchStudents()
      })
      .subscribe()

    fetchStudents()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const fetchStudents = async () => {
    try {
      const { data, error } = await supabase
        .from("authorized_students")
        .select("*")
        .order("createdat", { ascending: false })

      if (error) throw error
      setStudents(data || [])
    } catch (err) {
      console.error("Error fetching students:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleAddStudent = async (e) => {
    e.preventDefault()
    if (!newStudent.firstName || !newStudent.lastName || !newStudent.email || !newStudent.yearLevel || !newStudent.block) {
      return showToast("All fields are required")
    }
    if (!editingStudent && !newStudent.password) {
      return showToast("Password is required for new students")
    }
    try {
      const studentName = `${newStudent.firstName.trim()} ${newStudent.lastName.trim()}`

      if (editingStudent) {
        // Update existing student
        const updateData = {
          firstname: newStudent.firstName.trim(),
          lastname: newStudent.lastName.trim(),
          email: newStudent.email.trim().toLowerCase(),
          yearlevel: newStudent.yearLevel,
          block: newStudent.block
        }
        // Only update password if a new one is provided (hash off-thread)
        if (newStudent.password) {
          updateData.password = await hashPassword(newStudent.password, 10)
        }

        const { error } = await supabase
          .from("authorized_students")
          .update(updateData)
          .eq("id", editingStudent.id)

        if (error) {
          console.error("Update student error:", error)
          if (error.code === '23505' || error.message.includes('duplicate')) {
            showToast("Email already exists")
            return
          }
          showToast(error.message || "Failed to update student")
          return
        }

        await logActivity("UPDATE_STUDENT", `Updated: ${studentName} (${newStudent.yearLevel} - ${newStudent.block})`)
        setEditingStudent(null)
        showToast("Student Updated")

        fetchStudents()
      } else {
        // Add new student with hashed password (off-thread)
        const studentId = generateUUID()
        const hashedPassword = await hashPassword(newStudent.password, 10)

        const { error } = await supabase
          .from("authorized_students")
          .insert({
            id: studentId,
            firstname: newStudent.firstName.trim(),
            lastname: newStudent.lastName.trim(),
            email: newStudent.email.trim().toLowerCase(),
            password: hashedPassword,
            yearlevel: newStudent.yearLevel,
            block: newStudent.block,
            mustchangepassword: true,
            hasevaluate: false,
            createdat: new Date().toISOString()
          })

        if (error) {
          console.error("Insert student error:", error)
          if (error.code === '23505' || error.message.includes('duplicate')) {
            showToast("Email already exists")
            return
          }
          showToast(error.message || "Failed to register student")
          return
        }

        await logActivity("REGISTER_STUDENT", `Registered: ${studentName} (${newStudent.yearLevel} - ${newStudent.block})`)
        showToast("Student Registered")

        fetchStudents()
      }
      setNewStudent({ firstName: '', lastName: '', email: '', password: '', yearLevel: '', block: '' })
      setIsAddFormOpen(false)
    } catch (err) {
      console.error("Error:", err)
      showToast("Action failed")
    }
  }

  const executeGlobalVoteReset = async () => {
    try {
      // Get all students first
      const { data: allStudents, error: fetchError } = await supabase
        .from("authorized_students")
        .select("id")

      if (fetchError) throw fetchError

      // Update each student
      for (const student of allStudents) {
        await supabase
          .from("authorized_students")
          .update({ hasevaluate: false, evaluateat: null })
          .eq("id", student.id)
      }

      // Delete all submission status records
      await supabase.from("submissionstatus").delete().neq("id", "00000000-0000-0000-0000-000000000000")

      fetchStudents()

      await logActivity("GLOBAL_VOTE_STATUS_RESET", "Reset all evaluation statuses")
      showToast("Global status reset")
      setGlobalVoteResetModal(false)
    } catch (err) {
      console.error("Error:", err)
      showToast("Global reset failed")
    }
  }

  const executePasswordReset = async () => {
    const student = resetConfirmModal.student
    if (!student) return
    try {
      // Generate a temp password (unambiguous charset, off-thread hashing)
      const tempPassword = generateTempPassword(8)
      const hashedPassword = await hashPassword(tempPassword, 10)

      const { error } = await supabase
        .from("authorized_students")
        .update({
          password: hashedPassword,
          mustchangepassword: true
        })
        .eq("id", student.id)

      if (error) throw error

      await logActivity("PASSWORD_RESET", `Reset password for ${student.firstname} ${student.lastname}`)
      setGeneratedPassword(tempPassword)
      setResetConfirmModal({ show: false, student: null })
      setIsAddFormOpen(false)
      setEditingStudent(null)
    } catch (err) {
      console.error("Reset error:", err)
      showToast("Reset failed")
    }
  }

  const handleDelete = async () => {
    if (!deleteReason.trim()) return showToast("Reason required")
    try {
      const { error, data } = await supabase
        .from("authorized_students")
        .delete()
        .eq("id", confirmModal.id)

      if (error) {
        console.error("Delete error:", error)
        showToast(error.message || "Remove failed")
        return
      }

      if (!data || data.length === 0) {
        console.log("Delete returned empty - checking if student still exists")
      }

      await logActivity("REMOVE_ACCESS", `Removed: ${confirmModal.name}. Reason: ${deleteReason}`)
      setConfirmModal({ show: false, id: null, name: '' })
      setDeleteReason('')
      showToast("Access Removed")

      fetchStudents()
    } catch (err) {
      console.error("Delete catch error:", err)
      showToast("Remove failed")
    }
  }

  const showToast = (msg) => {
    setToast({ show: true, message: msg })
    setTimeout(() => setToast({ show: false, message: '' }), 2500)
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(generatedPassword)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const filteredStudents = students.filter(s => {
    const matchesSearch =
      `${s.firstname} ${s.lastname}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesYear = activeYearFilter === 'All' || s.yearlevel === activeYearFilter;
    return matchesSearch && matchesYear;
  })

  if (loading) return (
    <div className="flex-1 flex items-center justify-center page-bg">
      <div className="text-sm font-medium text-indigo-500 dark:text-indigo-300 animate-pulse">Loading directory...</div>
    </div>
  )

  return (
    <div className="p-4 md:p-8 lg:p-12 max-w-6xl mx-auto w-full h-screen flex flex-col space-y-6 md:space-y-8 overflow-hidden page-bg">

      {/* HEADER */}
      <div className="hidden md:flex shrink-0 items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Student Directory</h2>
          <p className="overline mt-1">Total Authorized: {students.length}</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setGlobalVoteResetModal(true)} className="px-5 py-3 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-300 rounded-xl font-semibold text-sm cursor-pointer hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-all active:scale-95">
            Reset All
          </button>
          <button onClick={() => setIsAddFormOpen(true)} className="btn btn-primary px-5 py-3 text-sm">
            Register Student
          </button>
        </div>
      </div>

      {/* MOBILE HEADER - ONLY RESET BUTTON */}
      <div className="flex md:hidden shrink-0 items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">Directory</h2>
        <button onClick={() => setGlobalVoteResetModal(true)} className="px-4 py-2.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/20 rounded-xl font-semibold text-sm">
          Reset All
        </button>
      </div>

      {/* MODAL-STYLE REGISTRATION FORM */}
      {isAddFormOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-fade-in">
          <section className="w-full max-w-2xl card p-8 animate-pop-in">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">{editingStudent ? 'Edit Student' : 'Register New Student'}</h3>
                <p className="overline mt-1">{editingStudent ? 'Update student details' : 'Authorized access provision'}</p>
              </div>
              <button onClick={() => { setIsAddFormOpen(false); setEditingStudent(null); }} className="text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <form onSubmit={handleAddStudent} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="overline ml-1">First Name</label>
                  <input type="text" placeholder="First Name" value={newStudent.firstName} onChange={(e) => setNewStudent({...newStudent, firstName: e.target.value})} className="input"/>
                </div>
                <div className="space-y-2">
                  <label className="overline ml-1">Last Name</label>
                  <input type="text" placeholder="Last Name" value={newStudent.lastName} onChange={(e) => setNewStudent({...newStudent, lastName: e.target.value})} className="input"/>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="overline ml-1">Academic Year</label>
                  <select value={newStudent.yearLevel} onChange={(e) => setNewStudent({...newStudent, yearLevel: e.target.value})} className="input cursor-pointer">
                    <option value="" disabled>Select Level</option>
                    {yearLevels.map(lvl => <option key={lvl} value={lvl} className="bg-white dark:bg-slate-900">{lvl}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="overline ml-1">Block</label>
                  <select value={newStudent.block} onChange={(e) => setNewStudent({...newStudent, block: e.target.value})} className="input cursor-pointer">
                    <option value="" disabled>Select Block</option>
                    {blocks.map(blk => <option key={blk} value={blk} className="bg-white dark:bg-slate-900">{blk}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="overline ml-1">Email Address</label>
                  <input type="email" placeholder="Email Address" value={newStudent.email} onChange={(e) => setNewStudent({...newStudent, email: e.target.value})} className="input"/>
                </div>
              </div>

              {!editingStudent && (
                <div className="space-y-2">
                  <label className="overline ml-1">Security Password</label>
                  <div className="flex gap-2">
                    <input type="text" placeholder="Password" value={newStudent.password} onChange={(e) => setNewStudent({...newStudent, password: e.target.value})} className="flex-1 input"/>
                    <button type="button" onClick={() => {
                      setNewStudent({ ...newStudent, password: generateTempPassword(10) })
                    }} className="p-4 bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 rounded-xl hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-500 transition-all">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    </button>
                  </div>
                </div>
              )}

              {editingStudent && (
                <div className="space-y-2">
                  <label className="overline ml-1">Password Management</label>
                  <button type="button" onClick={() => setResetConfirmModal({ show: true, student: editingStudent })} className="w-full py-3 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-300 font-semibold text-sm rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-all cursor-pointer flex items-center justify-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    Reset Password
                  </button>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => { setIsAddFormOpen(false); setEditingStudent(null); }} className="flex-1 btn btn-ghost py-3 text-sm">Discard</button>
                <button type="submit" className="flex-[2] btn btn-primary py-3 text-sm">{editingStudent ? 'Update Student' : 'Grant Access'}</button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* SEARCH & FILTER CONTROLS */}
      <div className="shrink-0 space-y-4">
        <div className="relative group">
          <input
            type="text" placeholder="Search by name or email..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            className="input"
          />
        </div>

        <div className="shrink-0">
          <div className="md:hidden relative">
            <select
              value={activeYearFilter}
              onChange={(e) => setActiveYearFilter(e.target.value)}
              className="w-full input cursor-pointer"
            >
              {['All', ...yearLevels].map((lvl) => (
                <option key={lvl} value={lvl} className="bg-white dark:bg-slate-900">{lvl}</option>
              ))}
            </select>
            <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-indigo-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg>
            </div>
          </div>

          <div className="hidden md:flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {['All', ...yearLevels].map((lvl) => (
              <button
                key={lvl}
                onClick={() => setActiveYearFilter(lvl)}
                className={`px-5 py-2.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap border cursor-pointer ${
                  activeYearFilter === lvl
                    ? 'btn btn-primary border-transparent'
                    : 'surface-muted border-slate-200/60 dark:border-indigo-500/8 text-slate-500 dark:text-slate-400 hover:border-indigo-300 dark:hover:border-indigo-500/30 hover:text-indigo-600 dark:hover:text-indigo-300'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* STUDENT TABLE */}
      <section className="flex-1 min-h-0 card overflow-hidden flex flex-col mb-24 md:mb-0">
        <div className="overflow-y-auto scrollbar-thin flex-1 overflow-x-auto">
          <div className="min-w-[300px]"></div>
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-slate-100 dark:border-slate-800">
                <th className="p-4 md:p-6 overline w-1/3">Student</th>
                <th className="hidden lg:table-cell p-4 md:p-6 overline">Year Level</th>
                <th className="hidden md:table-cell p-4 md:p-6 overline">Email</th>
                <th className="p-4 md:p-6 overline text-right w-20 hidden md:table-cell">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredStudents.map((s) => (
                <tr key={s.id} onClick={() => window.innerWidth < 768 && setActionPopup({ show: true, student: s })} className="group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer md:cursor-default md:hover:bg-transparent">
                  <td className="p-4 md:p-6">
                    <div className="flex items-center gap-3 md:gap-4">
                      <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/15 border border-indigo-100 dark:border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-300 font-semibold text-xs shrink-0">
                        {s.firstname?.[0]}{s.lastname?.[0]}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-semibold text-slate-800 dark:text-slate-100 text-sm group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors truncate">{s.firstname} {s.lastname}</span>
                        <span className="lg:hidden text-xs text-indigo-600 dark:text-indigo-300 font-medium mt-0.5">{s.yearlevel || 'Unset'}</span>
                      </div>
                    </div>
                  </td>
                  <td className="hidden lg:table-cell p-4 md:p-6">
                    <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-500/20 rounded-lg text-xs font-medium">
                      {s.yearlevel || 'N/A'}
                    </span>
                  </td>
                  <td className="hidden md:table-cell p-4 md:p-6">
                    <span className="text-xs text-slate-500 dark:text-slate-400 truncate block max-w-[150px]">{s.email}</span>
                  </td>
                  <td className="p-4 md:p-6 text-right w-20 hidden md:table-cell">
                    <div className="flex items-center justify-end gap-1 md:gap-2">
                      <button onClick={(e) => { e.stopPropagation(); setEditingStudent(s); setIsAddFormOpen(true); }} className="p-2 md:p-3 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-500/15 rounded-xl transition-all cursor-pointer">
                        <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); setConfirmModal({ show: true, id: s.id, name: `${s.firstname} ${s.lastname}` }) }} className="p-2 md:p-3 text-rose-500 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/15 rounded-xl transition-all cursor-pointer">
                        <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredStudents.length === 0 && (
            <div className="p-12 text-center"><p className="text-sm font-medium text-slate-400 dark:text-slate-500">No students found</p></div>
          )}
        </div>
      </section>

      {/* MOBILE FAB */}
      {!isAddFormOpen && (
        <button onClick={() => setIsAddFormOpen(true)} className="md:hidden fixed w-14 h-14 btn btn-primary rounded-2xl shadow-2xl flex items-center justify-center z-[500]" style={{ right: '1.5rem', bottom: 'calc(1.5rem + var(--sab))' }}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>
        </button>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      <Modal open={confirmModal.show} onClose={() => { setConfirmModal({ show: false, id: null, name: '' }); setDeleteReason('') }}>
        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-50 leading-tight mb-2">Remove Access?</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">Confirm deletion of<br /><span className="font-semibold text-rose-500">{confirmModal.name}</span></p>
        <input
          type="text"
          placeholder="Reason for deletion"
          value={deleteReason}
          onChange={(e) => setDeleteReason(e.target.value)}
          className="input mb-6"
        />
        <div className="grid grid-cols-2 gap-4">
          <button onClick={() => {setConfirmModal({ show: false, id: null, name: '' }); setDeleteReason('')}} className="btn btn-ghost py-3 text-sm">Back</button>
          <button onClick={handleDelete} className="btn btn-danger py-3 text-sm">Confirm</button>
        </div>
      </Modal>

      {/* GLOBAL RESET MODAL */}
      <Modal open={globalVoteResetModal} onClose={() => setGlobalVoteResetModal(false)}>
        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-50 leading-tight mb-2">Reset All?</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">This will reset evaluation status<br />for ALL students.</p>
        <div className="grid grid-cols-2 gap-4">
          <button onClick={() => setGlobalVoteResetModal(false)} className="btn btn-ghost py-3 text-sm">Back</button>
          <button onClick={executeGlobalVoteReset} className="py-3 bg-emerald-600 text-white rounded-xl text-sm font-semibold shadow-lg shadow-emerald-600/20 active:scale-95">Confirm</button>
        </div>
      </Modal>

      {/* PASSWORD RESET MODAL */}
      <Modal open={resetConfirmModal.show} onClose={() => setResetConfirmModal({ show: false, student: null })}>
        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-50 leading-tight mb-2">Reset Password?</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">Generate new temporary credentials<br />for <span className="font-semibold text-indigo-600 dark:text-indigo-300">{resetConfirmModal.student?.firstname}</span>?</p>
        <div className="grid grid-cols-2 gap-4">
          <button onClick={() => setResetConfirmModal({ show: false, student: null })} className="btn btn-ghost py-3 text-sm">Back</button>
          <button onClick={executePasswordReset} className="btn btn-primary py-3 text-sm">Confirm</button>
        </div>
      </Modal>

      {/* NEW PASSWORD DISPLAY */}
      {generatedPassword && (
        <Modal open={!!generatedPassword} onClose={() => setGeneratedPassword('')}>
          <h3 className="text-xl font-bold text-slate-900 dark:text-slate-50 mb-6">New Password</h3>
          <div className="bg-indigo-50 dark:bg-indigo-500/15 p-6 rounded-xl mb-6 flex items-center justify-between group">
            <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-300 tracking-widest">{generatedPassword}</span>
            <button onClick={handleCopy} className="p-3 surface-muted text-indigo-600 dark:text-indigo-300 rounded-xl border border-indigo-100 dark:border-indigo-500/15 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-500 transition-all">
              {copied ? <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg> : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>}
            </button>
          </div>
          <button onClick={() => setGeneratedPassword('')} className="w-full btn btn-primary py-3 text-sm">Done</button>
        </Modal>
      )}

      {/* MOBILE ACTION POPUP */}
      {actionPopup.show && actionPopup.student && (
        <Modal open={actionPopup.show} onClose={() => setActionPopup({ show: false, student: null })}>
          <div className="w-16 h-16 rounded-full bg-indigo-50 dark:bg-indigo-500/15 border border-indigo-100 dark:border-indigo-500/20 flex items-center justify-center mx-auto mb-4">
            <span className="text-indigo-600 dark:text-indigo-300 font-bold text-xl">{actionPopup.student.firstname?.[0]}{actionPopup.student.lastname?.[0]}</span>
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 leading-tight mb-6">{actionPopup.student.firstname} {actionPopup.student.lastname}</h3>
          <div className="grid grid-cols-2 gap-4">
            <button onClick={() => { setActionPopup({ show: false, student: null }); setEditingStudent(actionPopup.student); setIsAddFormOpen(true); }} className="btn btn-primary py-3 text-sm flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              Edit
            </button>
            <button onClick={() => { setActionPopup({ show: false, student: null }); setConfirmModal({ show: true, id: actionPopup.student.id, name: `${actionPopup.student.firstname} ${actionPopup.student.lastname}` }) }} className="btn btn-danger py-3 text-sm flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              Delete
            </button>
          </div>
          <button onClick={() => setActionPopup({ show: false, student: null })} className="mt-4 w-full py-3 text-sm font-medium text-slate-500 dark:text-slate-400 cursor-pointer">Cancel</button>
        </Modal>
      )}

      <Toast show={toast.show} message={toast.message} variant="info" onClose={() => setToast({ show: false, message: '' })} />
    </div>
  )
}