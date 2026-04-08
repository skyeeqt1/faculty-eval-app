'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import bcrypt from 'bcryptjs'

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

export default function StudentListPage() {
  const [loading, setLoading] = useState(true)
  const [students, setStudents] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [activeYearFilter, setActiveYearFilter] = useState('All')
  const [isAddFormOpen, setIsAddFormOpen] = useState(false)
  const [editingStudent, setEditingStudent] = useState(null)
  
  // Drawer States
  const [activeStudent, setActiveStudent] = useState(null)
  
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

  const yearLevels = ["1st Year", "2nd Year", "3rd Year", "4th Year"]
  const blocks = ["Blk A", "Blk B", "Blk C", "Blk D", "Blk E", "Blk F", "Blk G"]

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

  const logActivity = async (action, details) => {
    try {
      const adminEmail = sessionStorage.getItem("adminEmail") || "admintest@gmail.com"
      const logId = generateUUID()
      const { data, error } = await supabase.from("audit_logs").insert({
        id: logId,
        action: action,
        adminemail: adminEmail,
        details: details,
        timestamp: new Date().toISOString()
      })
      
      if (error) {
        console.error("Audit log error:", error)
      }
    } catch (err) { console.error("Log failed:", err) }
  }

  const handleOpenDrawer = (student) => {
    if (window.innerWidth < 1024) {
      setActiveStudent(student)
      setTimeout(() => setIsDrawerVisible(true), 10)
    }
  }

  const handleCloseDrawer = () => {
    setIsDrawerVisible(false)
    setTimeout(() => setActiveStudent(null), 400)
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
        // Only update password if a new one is provided (hash it)
        if (newStudent.password) {
          updateData.password = await bcrypt.hash(newStudent.password, 10)
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
        
        // Refresh the students list
        fetchStudents()
      } else {
        // Add new student with hashed password
        const studentId = generateUUID()
        
        // Hash the password
        const hashedPassword = await bcrypt.hash(newStudent.password, 10)
        
        // Store student data with hashed password
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
        
        // Refresh the students list
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
      
      // Refresh the students list
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
      // Generate a temp password
      const charset = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
      let tempPassword = ""
      for (let i = 0; i < 8; i++) tempPassword += charset.charAt(Math.floor(Math.random() * charset.length))
      
      // Hash the temp password
      const hashedPassword = await bcrypt.hash(tempPassword, 10)
      
      // Update password directly in database
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
      const { error } = await supabase
        .from("authorized_students")
        .delete()
        .eq("id", confirmModal.id)

      if (error) throw error
      
      await logActivity("REMOVE_ACCESS", `Removed: ${confirmModal.name}. Reason: ${deleteReason}`)
      setConfirmModal({ show: false, id: null, name: '' })
      setDeleteReason('')
      handleCloseDrawer()
      showToast("Access Removed")
      
      // Refresh the students list
      fetchStudents()
    } catch (err) { showToast("Remove failed") }
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
    <div className="flex-1 flex items-center justify-center bg-[#0f172a]">
      <div className="text-indigo-400 font-black uppercase tracking-[0.3em] animate-pulse">Syncing Directory...</div>
    </div>
  )

  return (
    <div className="p-4 md:p-8 lg:p-12 max-w-6xl mx-auto w-full h-screen flex flex-col space-y-6 md:space-y-8 overflow-hidden">
       
      {/* HEADER */}
      <div className="hidden md:flex shrink-0 items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-black text-white uppercase italic tracking-tight">Student Directory</h2>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-1">Total Authorized: {students.length}</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setGlobalVoteResetModal(true)} className="px-6 py-4 bg-emerald-600/10 border border-emerald-500/20 text-emerald-500 rounded-2xl font-black text-[10px] uppercase tracking-widest cursor-pointer hover:bg-emerald-600/20 transition-all active:scale-95">
            Reset All
          </button>
          <button onClick={() => setIsAddFormOpen(true)} className="px-6 py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest cursor-pointer hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 transition-all active:scale-95">
            Register Student
          </button>
        </div>
      </div>

      {/* MOBILE HEADER - ONLY RESET BUTTON */}
      <div className="flex md:hidden shrink-0 items-center justify-between">
        <h2 className="text-lg font-black text-white uppercase italic tracking-tight">Directory</h2>
        <button onClick={() => setGlobalVoteResetModal(true)} className="px-4 py-3 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-xl font-black text-[10px] uppercase">
          Reset All
        </button>
      </div>

      {/* MODAL-STYLE REGISTRATION FORM */}
      {isAddFormOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300">
          <section className="w-full max-w-2xl bg-slate-900 border border-indigo-500/30 p-8 rounded-[2.5rem] shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-xl font-black text-white uppercase italic tracking-tight">{editingStudent ? 'Edit Student' : 'Register New Student'}</h3>
                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1">{editingStudent ? 'Update student details' : 'Authorized access provision'}</p>
              </div>
              <button onClick={() => { setIsAddFormOpen(false); setEditingStudent(null); }} className="text-slate-500 hover:text-white transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <form onSubmit={handleAddStudent} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.2em] ml-1">First Name</label>
                  <input type="text" placeholder="First Name" value={newStudent.firstName} onChange={(e) => setNewStudent({...newStudent, firstName: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-5 py-4 text-sm outline-none text-white focus:border-indigo-500 transition-all"/>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.2em] ml-1">Last Name</label>
                  <input type="text" placeholder="Last Name" value={newStudent.lastName} onChange={(e) => setNewStudent({...newStudent, lastName: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-5 py-4 text-sm outline-none text-white focus:border-indigo-500 transition-all"/>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.2em] ml-1">Academic Year</label>
                  <select value={newStudent.yearLevel} onChange={(e) => setNewStudent({...newStudent, yearLevel: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-5 py-4 text-sm outline-none text-white focus:border-indigo-500 appearance-none cursor-pointer transition-all">
                    <option value="" disabled>SELECT LEVEL</option>
                    {yearLevels.map(lvl => <option key={lvl} value={lvl} className="bg-slate-900">{lvl.toUpperCase()}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.2em] ml-1">Block</label>
                  <select value={newStudent.block} onChange={(e) => setNewStudent({...newStudent, block: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-5 py-4 text-sm outline-none text-white focus:border-indigo-500 appearance-none cursor-pointer transition-all">
                    <option value="" disabled>SELECT BLOCK</option>
                    {blocks.map(blk => <option key={blk} value={blk} className="bg-slate-900">{blk.toUpperCase()}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.2em] ml-1">Email Address</label>
                  <input type="email" placeholder="Email Address" value={newStudent.email} onChange={(e) => setNewStudent({...newStudent, email: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-5 py-4 text-sm outline-none text-white focus:border-indigo-500 transition-all"/>
                </div>
              </div>

              {!editingStudent && (
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.2em] ml-1">Security Password</label>
                  <div className="flex gap-2">
                    <input type="text" placeholder="Password" value={newStudent.password} onChange={(e) => setNewStudent({...newStudent, password: e.target.value})} className="flex-1 bg-slate-800 border border-slate-700 rounded-2xl px-5 py-4 text-sm outline-none text-white focus:border-indigo-500 transition-all"/>
                    <button type="button" onClick={() => {
                      const charset = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
                      let pwd = "";
                      for (let i = 0; i < 10; i++) pwd += charset.charAt(Math.floor(Math.random() * charset.length))
                      setNewStudent({ ...newStudent, password: pwd })
                    }} className="p-4 bg-indigo-600/10 text-indigo-400 rounded-2xl hover:bg-indigo-600 hover:text-white transition-all">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    </button>
                  </div>
                </div>
              )}

              {editingStudent && (
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.2em] ml-1">Password Management</label>
                  <button type="button" onClick={() => setResetConfirmModal({ show: true, student: editingStudent })} className="w-full py-4 bg-slate-800 border border-white/5 text-slate-400 font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-emerald-600 hover:text-white hover:border-emerald-500 transition-all cursor-pointer flex items-center justify-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    Reset Password
                  </button>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => { setIsAddFormOpen(false); setEditingStudent(null); }} className="flex-1 py-4 bg-slate-800 text-slate-400 font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-slate-700">Discard</button>
                <button type="submit" className="flex-[2] py-4 bg-indigo-600 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 active:scale-95 transition-all">{editingStudent ? 'Update Student' : 'Grant Access'}</button>
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
            className="w-full bg-slate-900/50 border border-slate-700 p-5 rounded-2xl outline-none text-white text-sm focus:border-indigo-500/50 transition-all shadow-inner"
          />
        </div>

        <div className="shrink-0">
          <div className="md:hidden relative">
            <select 
              value={activeYearFilter}
              onChange={(e) => setActiveYearFilter(e.target.value)}
              className="w-full bg-slate-900/80 text-white border border-slate-700 rounded-2xl px-6 py-4 text-sm outline-none focus:border-indigo-500 appearance-none"
            >
              {['All', ...yearLevels].map((lvl) => (
                <option key={lvl} value={lvl} className="bg-slate-900 text-white uppercase">{lvl.toUpperCase()}</option>
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
                className={`px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap border cursor-pointer ${
                  activeYearFilter === lvl
                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/20'
                    : 'bg-slate-900/50 border-white/5 text-slate-500 hover:border-white/10 hover:text-slate-300'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* STUDENT TABLE */}
      <section className="flex-1 min-h-0 bg-slate-900/50 border border-white/5 rounded-[2.5rem] overflow-hidden backdrop-blur-sm flex flex-col shadow-2xl mb-24 md:mb-0">
        <div className="overflow-y-auto custom-scrollbar flex-1 overflow-x-auto">
          <div className="min-w-[300px]"></div>
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10 bg-[#151c2e]">
              <tr className="border-b border-white/5">
                <th className="p-4 md:p-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] w-1/3">Student</th>
                <th className="hidden lg:table-cell p-4 md:p-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Year Level</th>
                <th className="hidden md:table-cell p-4 md:p-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Email</th>
                <th className="p-4 md:p-6 text-right text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] w-20 hidden md:table-cell">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredStudents.map((s) => (
                <tr key={s.id} onClick={() => window.innerWidth < 768 && setActionPopup({ show: true, student: s })} className="group hover:bg-white/[0.03] transition-colors cursor-pointer md:cursor-default md:hover:bg-transparent">
                  <td className="p-4 md:p-6">
                    <div className="flex items-center gap-3 md:gap-4">
                      <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/10 flex items-center justify-center text-indigo-400 font-black text-xs shrink-0">
                        {s.firstname?.[0]}{s.lastname?.[0]}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-black text-slate-200 uppercase italic text-sm group-hover:text-indigo-400 transition-colors truncate">{s.firstname} {s.lastname}</span>
                        <span className="lg:hidden text-[9px] text-indigo-500 font-black uppercase tracking-widest mt-0.5">{s.yearlevel || 'Unset'}</span>
                      </div>
                    </div>
                  </td>
                  <td className="hidden lg:table-cell p-4 md:p-6">
                    <span className="px-3 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/10 rounded-lg text-[9px] font-black uppercase tracking-widest">
                      {s.yearlevel || 'N/A'}
                    </span>
                  </td>
                  <td className="hidden md:table-cell p-4 md:p-6">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest truncate block max-w-[150px]">{s.email}</span>
                  </td>
                  <td className="p-4 md:p-6 text-right w-20 hidden md:table-cell">
                    <div className="flex items-center justify-end gap-1 md:gap-2">
                      <button onClick={(e) => { e.stopPropagation(); setEditingStudent(s); setIsAddFormOpen(true); }} className="p-2 md:p-3 text-indigo-500 hover:bg-indigo-500/10 rounded-xl transition-all cursor-pointer">
                        <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); setConfirmModal({ show: true, id: s.id, name: `${s.firstname} ${s.lastname}` }) }} className="p-2 md:p-3 text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all cursor-pointer">
                        <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* MOBILE FAB */}
      {!isAddFormOpen && (
        <button onClick={() => setIsAddFormOpen(true)} className="md:hidden fixed bottom-13 right-6 w-14 h-14 bg-indigo-600 text-white rounded-2xl shadow-2xl flex items-center justify-center z-[500] active:scale-90 transition-transform">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>
        </button>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {confirmModal.show && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
          <div className="w-full max-w-sm bg-slate-900 border border-white/10 rounded-[2.5rem] p-10 text-center shadow-2xl animate-in zoom-in-95">
            <h3 className="text-xl font-black text-white uppercase italic leading-tight mb-2">Remove Access?</h3>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-8 leading-relaxed">Confirm deletion of<br/><span className="text-rose-500">{confirmModal.name}</span></p>
            <input 
              type="text" 
              placeholder="Reason for deletion" 
              value={deleteReason} 
              onChange={(e) => setDeleteReason(e.target.value)} 
              className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-5 py-4 text-sm outline-none text-white focus:border-rose-500 transition-all mb-6"
            />
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => {setConfirmModal({ show: false, id: null, name: '' }); setDeleteReason('')}} className="py-4 bg-slate-800 text-slate-300 rounded-2xl font-black text-[10px] uppercase">Back</button>
              <button onClick={handleDelete} className="py-4 bg-rose-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg shadow-rose-600/20 active:scale-95">Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* GLOBAL RESET MODAL */}
      {globalVoteResetModal && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
          <div className="w-full max-w-sm bg-slate-900 border border-white/10 rounded-[2.5rem] p-10 text-center shadow-2xl animate-in zoom-in-95">
            <h3 className="text-xl font-black text-white uppercase italic leading-tight mb-2">Reset All?</h3>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-8 leading-relaxed">This will reset evaluation status<br/>for ALL students.</p>
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => setGlobalVoteResetModal(false)} className="py-4 bg-slate-800 text-slate-300 rounded-2xl font-black text-[10px] uppercase">Back</button>
              <button onClick={executeGlobalVoteReset} className="py-4 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg shadow-emerald-600/20 active:scale-95">Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* PASSWORD RESET MODAL */}
      {resetConfirmModal.show && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
          <div className="w-full max-w-sm bg-slate-900 border border-white/10 rounded-[2.5rem] p-10 text-center shadow-2xl animate-in zoom-in-95">
            <h3 className="text-xl font-black text-white uppercase italic leading-tight mb-2">Reset Password?</h3>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-8 leading-relaxed">Generate new temporary credentials<br/>for <span className="text-indigo-400">{resetConfirmModal.student?.firstname}</span>?</p>
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => setResetConfirmModal({ show: false, student: null })} className="py-4 bg-slate-800 text-slate-300 rounded-2xl font-black text-[10px] uppercase">Back</button>
              <button onClick={executePasswordReset} className="py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg shadow-indigo-600/20 active:scale-95">Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* NEW PASSWORD DISPLAY */}
      {generatedPassword && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-xl">
          <div className="w-full max-w-sm bg-slate-900 border-2 border-indigo-500/50 rounded-[2.5rem] p-10 text-center shadow-2xl">
            <h3 className="text-xl font-black text-white uppercase italic mb-6">New Password</h3>
            <div className="bg-slate-800 p-6 rounded-2xl mb-6 flex items-center justify-between group">
              <span className="text-2xl font-black text-indigo-400 tracking-widest">{generatedPassword}</span>
              <button onClick={handleCopy} className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl hover:bg-indigo-600 hover:text-white transition-all">
                {copied ? <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg> : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>}
              </button>
            </div>
            <button onClick={() => setGeneratedPassword('')} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase">Done</button>
          </div>
        </div>
      )}

      {/* MOBILE ACTION POPUP */}
      {actionPopup.show && actionPopup.student && (
        <div className="fixed inset-0 flex items-center justify-center z-[2000] bg-slate-950/90 backdrop-blur-md p-4">
          <div className="bg-slate-900 border border-white/10 rounded-[2.5rem] p-8 max-w-sm w-full text-center shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto mb-4">
              <span className="text-indigo-400 font-black text-xl">{actionPopup.student.firstname?.[0]}{actionPopup.student.lastname?.[0]}</span>
            </div>
            <h3 className="text-lg font-black text-white uppercase italic leading-tight mb-6">{actionPopup.student.firstname} {actionPopup.student.lastname}</h3>
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => { setActionPopup({ show: false, student: null }); setEditingStudent(actionPopup.student); setIsAddFormOpen(true); }} className="py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase cursor-pointer flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                Edit
              </button>
              <button onClick={() => { setActionPopup({ show: false, student: null }); setConfirmModal({ show: true, id: actionPopup.student.id, name: `${actionPopup.student.firstname} ${actionPopup.student.lastname}` }) }} className="py-4 bg-rose-600 text-white rounded-2xl font-black text-[10px] uppercase cursor-pointer flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                Delete
              </button>
            </div>
            <button onClick={() => setActionPopup({ show: false, student: null })} className="mt-4 w-full py-3 text-slate-500 text-[10px] font-bold uppercase tracking-widest cursor-pointer">Cancel</button>
          </div>
        </div>
      )}

      {/* TOAST */}
      {toast.show && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[4000] bg-indigo-600 text-white px-8 py-4 rounded-2xl shadow-2xl">
          <span className="text-[10px] font-black uppercase tracking-widest">{toast.message}</span>
        </div>
      )}

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(99, 102, 241, 0.2); border-radius: 20px; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  )
}
