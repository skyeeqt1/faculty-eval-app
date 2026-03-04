'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'

export default function FacultyManagement() {
  const [loading, setLoading] = useState(true)
  const [isAddFormOpen, setIsAddFormOpen] = useState(false)
  const [professors, setProfessors] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  
  // States for editing
  const [editingProf, setEditingProf] = useState(null)
  
  // States for Subjects
  const [availableSubjects, setAvailableSubjects] = useState([])
  const [selectedSubjects, setSelectedSubjects] = useState([])
  const [isSubjectDropdownOpen, setIsSubjectDropdownOpen] = useState(false)

  const [toast, setToast] = useState({ show: false, message: '' })
  const [confirmModal, setConfirmModal] = useState({ show: false, id: null, name: '' })

  // Form States
  const [name, setName] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [selectedFile, setSelectedFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [selectedYears, setSelectedYears] = useState([]) 

  const yearOptions = ["1st Year", "2nd Year", "3rd Year", "4th Year"]

  // Populate form when editing a professor
  useEffect(() => {
    if (editingProf) {
      setName(editingProf.name || '')
      setImageUrl(editingProf.imageurl || '')
      setSelectedYears(Array.isArray(editingProf.assignedyears) ? editingProf.assignedyears : [])
      setSelectedSubjects(Array.isArray(editingProf.subjects) ? editingProf.subjects : [])
      setSelectedFile(null)
    } else {
      // Reset form when closing
      setName('')
      setImageUrl('')
      setSelectedYears([])
      setSelectedSubjects([])
      setSelectedFile(null)
    }
  }, [editingProf])

  // Listen to Professors List
  useEffect(() => {
    const channel = supabase
      .channel('professors-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'professors' }, (payload) => {
        fetchProfessors()
      })
      .subscribe()

    fetchProfessors()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const fetchProfessors = async () => {
    try {
      const { data, error } = await supabase
        .from("professors")
        .select("*")
      
      if (error) throw error
      setProfessors(data || [])
    } catch (err) {
      console.error("Error fetching professors:", err)
    } finally {
      setLoading(false)
    }
  }

  // FETCH SUBJECTS BASED ON SELECTED YEARS
  useEffect(() => {
    const fetchRelevantSubjects = async () => {
      if (selectedYears.length === 0) {
        setAvailableSubjects([])
        setSelectedSubjects([])
        return
      }
      try {
        const { data, error } = await supabase
          .from("subjects")
          .select("*")
          .in("yearlevel", selectedYears)

        if (error) throw error
        
        const subs = (data || []).map(doc => ({
          id: doc.id, 
          title: doc.name, 
          year: doc.yearlevel 
        }))
        setAvailableSubjects(subs)
      } catch (err) {
        console.error("Error fetching subjects:", err)
      }
    }
    fetchRelevantSubjects()
  }, [selectedYears])

  const logActivity = async (action, details) => {
    try {
      const adminEmail = sessionStorage.getItem("adminEmail") || "admintest@gmail.com"
      const logId = crypto.randomUUID()
      const { data, error } = await supabase.from("audit_logs").insert({
        id: logId,
        action: action,
        adminemail: adminEmail,
        details: details,
        timestamp: new Date().toISOString()
      })
      
      if (error) {
        console.error("Audit log error:", error)
      } else {
        console.log("Activity logged:", action, details)
      }
    } catch (err) { console.error("Log failed:", err) }
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        showToast("Please select an image file")
        return
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        showToast("File size must be less than 5MB")
        return
      }
      setSelectedFile(file)
      // Create preview URL
      const previewUrl = URL.createObjectURL(file)
      setImageUrl(previewUrl)
    }
  }

  const uploadImage = async (file) => {
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `faculty/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('faculty-photos')
        .upload(filePath, file)

      if (uploadError) {
        // If bucket doesn't exist, try to create it or use public URL directly
        console.error('Upload error:', uploadError)
        // Fallback: return blob URL as temporary solution
        return URL.createObjectURL(file)
      }

      const { data: { publicUrl } } = supabase.storage
        .from('faculty-photos')
        .getPublicUrl(filePath)

      return publicUrl
    } catch (err) {
      console.error('Error uploading image:', err)
      // Fallback to blob URL if storage fails
      return URL.createObjectURL(file)
    }
  }

  const handleYearToggle = (year) => {
    setSelectedYears(prev => 
      prev.includes(year) ? prev.filter(y => y !== year) : [...prev, year]
    )
    setIsSubjectDropdownOpen(false)
  }

  const handleSubjectToggle = (subjectName) => {
    setSelectedSubjects(prev => 
      prev.includes(subjectName) ? prev.filter(s => s !== subjectName) : [...prev, subjectName]
    )
  }

  const handleAddFaculty = async (e) => {
    e.preventDefault()
    if (!name.trim()) return showToast("Name is required")
    if (selectedYears.length === 0) return showToast("Select at least one Year Level")
    if (selectedSubjects.length === 0) return showToast("Select at least one Subject")

    try {
      let finalImageUrl = imageUrl
      
      // Upload new file if selected
      if (selectedFile) {
        setUploading(true)
        finalImageUrl = await uploadImage(selectedFile)
        setUploading(false)
      }

      if (editingProf) {
        // Update existing professor
        const { error } = await supabase
          .from("professors")
          .update({
            name: name.trim(),
            imageurl: finalImageUrl || null,
            assignedyears: selectedYears,
            subjects: selectedSubjects
          })
          .eq("id", editingProf.id)

        if (error) throw error
        
        await logActivity("UPDATE_INSTRUCTOR", `Updated: ${name.trim()}`)
        setEditingProf(null)
        showToast("Instructor Updated")
        
        // Refresh the professors list
        fetchProfessors()
      } else {
        // Add new professor with random UUID
        const profId = crypto.randomUUID()
        
        const { error } = await supabase
          .from("professors")
          .insert({
            id: profId,
            name: name.trim(),
            imageurl: finalImageUrl || null,
            assignedyears: selectedYears,
            subjects: selectedSubjects,
            createdat: new Date().toISOString()
          })

        if (error) throw error
        
        await logActivity("REGISTER_INSTRUCTOR", `Registered: ${name.trim()}`)
        showToast("Instructor Registered")
        
        // Refresh the professors list
        fetchProfessors()
      }
      setName(''); setImageUrl(''); setSelectedYears([]); setSelectedSubjects([]); setSelectedFile(null);
      setIsAddFormOpen(false)
    } catch (err) { 
      console.error("Error:", err)
      setUploading(false)
      showToast("Action failed") 
    }
  }

  const confirmDelete = async () => {
    try {
      const { error } = await supabase
        .from("professors")
        .delete()
        .eq("id", confirmModal.id)

      if (error) throw error
      
      await logActivity("REMOVE_INSTRUCTOR", `Deleted: ${confirmModal.name}`)
      setConfirmModal({ show: false, id: null, name: '' })
      showToast("Instructor Removed")
      
      // Refresh the professors list
      fetchProfessors()
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
    <div className="flex-1 flex items-center justify-center bg-[#0f172a] h-screen">
      <div className="text-indigo-400 font-black uppercase tracking-[0.3em] animate-pulse">Syncing Faculty...</div>
    </div>
  )

  return (
    <div className="p-4 md:p-8 lg:p-12 max-w-6xl mx-auto w-full h-screen flex flex-col space-y-6 overflow-hidden bg-[#0f172a]">
      
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

      {/* SEARCH */}
      <div className="shrink-0 relative">
        <input 
          type="text" placeholder="Search instructors..." 
          value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} 
          className="w-full bg-slate-900/50 border border-slate-700 p-5 rounded-2xl outline-none text-white text-sm focus:border-indigo-500/50 transition-all shadow-inner"
        />
      </div>

      {/* REGISTRATION MODAL */}
      {isAddFormOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <section className="w-full max-w-2xl bg-slate-900 border border-indigo-500/30 p-8 rounded-[2.5rem] shadow-2xl overflow-y-auto max-h-[90vh] custom-scrollbar">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-xl font-black text-white uppercase italic tracking-tight">{editingProf ? 'Edit Instructor' : 'Register Instructor'}</h3>
                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1">{editingProf ? 'Update instructor details' : 'Add new faculty member'}</p>
              </div>
              <button onClick={() => { setIsAddFormOpen(false); setEditingProf(null); }} className="text-slate-500 hover:text-white cursor-pointer"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>

            <form onSubmit={handleAddFaculty} className="space-y-6">
              {/* CIRCULAR PHOTO UPLOAD AT TOP */}
              <div className="flex flex-col items-center mb-8">
                <div className="relative group">
                  <div className="w-32 h-32 rounded-full bg-slate-800 border-4 border-indigo-500/30 flex items-center justify-center overflow-hidden cursor-pointer hover:border-indigo-500 transition-all">
                    {imageUrl ? (
                      <img src={imageUrl} alt="Instructor profile photo" className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-500">
                        <svg className="w-10 h-10 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        <span className="text-[8px] font-black uppercase">Photo</span>
                      </div>
                    )}
                    {uploading && (
                      <div className="absolute inset-0 bg-slate-900/80 flex items-center justify-center">
                        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    )}
                  </div>
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={handleFileChange}
                    disabled={uploading}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  {imageUrl && !uploading && (
                    <button 
                      type="button"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSelectedFile(null); setImageUrl(''); }}
                      className="absolute -top-1 -right-1 w-7 h-7 bg-rose-500 rounded-full flex items-center justify-center text-white text-sm font-black shadow-lg hover:bg-rose-400 transition-all"
                    >
                      ×
                    </button>
                  )}
                </div>
                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-3">
                  {imageUrl ? 'Change Photo' : 'Click to upload photo'}
                </p>
              </div>

              {/* TEXT DETAILS BELOW */}
              <div className="space-y-2">
                <label className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.2em] ml-1">Full Name</label>
                <input type="text" placeholder="Enter full name" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-5 py-4 text-sm outline-none text-white focus:border-indigo-500 transition-all"/>
              </div>

              <div className="space-y-3">
                <label className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.2em] ml-1">1. Assign Year Levels</label>
                <div className="flex flex-wrap gap-2">
                  {yearOptions.map(year => (
                    <button key={year} type="button" onClick={() => handleYearToggle(year)} className={`px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all cursor-pointer ${selectedYears.includes(year) ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-slate-800 border-white/5 text-slate-500 hover:text-slate-300'}`}>{year}</button>
                  ))}
                </div>
              </div>

              {/* DROPDOWN SUBJECT SELECTION */}
              <div className="space-y-3 relative">
                <label className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.2em] ml-1">2. Assign Subjects ({selectedSubjects.length} Selected)</label>
                {selectedYears.length === 0 ? (
                  <div className="p-4 bg-slate-800/50 rounded-2xl border border-dashed border-white/5 text-center">
                    <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">Select a Year Level first</p>
                  </div>
                ) : (
                  <div className="relative">
                    <button type="button" onClick={() => setIsSubjectDropdownOpen(!isSubjectDropdownOpen)} className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-5 py-4 text-sm text-left text-white flex justify-between items-center hover:border-indigo-500 transition-all cursor-pointer">
                      <span className="truncate">{Array.isArray(selectedSubjects) && selectedSubjects.length > 0 ? selectedSubjects.join(", ") : "-- Select Subjects --"}</span>
                      <svg className={`w-4 h-4 transition-transform ${isSubjectDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"/></svg>
                    </button>
                    {isSubjectDropdownOpen && (
                      <div className="absolute z-[1100] top-full left-0 w-full mt-2 bg-slate-800 border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2">
                        <div className="max-h-60 overflow-y-auto custom-scrollbar p-2 space-y-1">
                          {availableSubjects.map(sub => (
                            <button key={sub.id} type="button" onClick={() => handleSubjectToggle(sub.title)} className={`w-full p-3 rounded-xl text-left flex justify-between items-center transition-all cursor-pointer ${Array.isArray(selectedSubjects) && selectedSubjects.includes(sub.title) ? 'bg-indigo-600 text-white' : 'hover:bg-white/5 text-slate-400'}`}>
                              <span className="text-[10px] font-black uppercase tracking-tight">{sub.title}</span>
                              <span className={`text-[8px] font-bold uppercase ${Array.isArray(selectedSubjects) && selectedSubjects.includes(sub.title) ? 'text-indigo-200' : 'text-slate-600'}`}>{sub.year}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-12">
                <button type="button" onClick={() => { setIsAddFormOpen(false); setEditingProf(null); }} className="flex-1 py-4 bg-slate-800 text-slate-400 font-black text-[10px] uppercase rounded-2xl cursor-pointer">Discard</button>
                <button type="submit" disabled={uploading} className="flex-[2] py-4 bg-indigo-600 text-white font-black text-[10px] uppercase rounded-2xl hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">{uploading ? 'Uploading...' : (editingProf ? 'Update Faculty' : 'Confirm Faculty')}</button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* LIST TABLE */}
      <section className="flex-1 min-h-0 bg-slate-900/50 border border-white/5 rounded-[2.5rem] overflow-hidden backdrop-blur-sm flex flex-col shadow-2xl mb-24 md:mb-0">
        <div className="overflow-y-auto custom-scrollbar flex-1 overflow-x-hidden">
          <table className="w-full text-left min-w-0 border-collapse">
            <thead className="sticky top-0 z-10 bg-[#151c2e]">
              <tr className="border-b border-white/5">
                <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Instructor</th>
                <th className="hidden md:table-cell p-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Subjects</th>
                <th className="p-6 text-right text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredProfs.map((prof) => (
                <tr key={prof.id} className="group hover:bg-white/[0.03] transition-colors">
                  <td className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/10 flex items-center justify-center overflow-hidden shrink-0">
                        {prof.imageurl ? <img src={prof.imageurl} alt="" className="w-full h-full object-cover" /> : <span className="text-indigo-400 font-black text-xs">{prof.name[0]}</span>}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-black text-slate-200 uppercase italic text-sm group-hover:text-indigo-400 truncate transition-colors">{prof.name}</span>
                        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">
                          {Array.isArray(prof.assignedyears) 
                            ? prof.assignedyears.join(" • ") 
                            : typeof prof.assignedyears === 'string' 
                              ? prof.assignedyears.replace(/[\[\]"]/g, '') 
                              : prof.assignedyears}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="hidden md:table-cell p-6">
                    <div className="flex flex-wrap gap-1">
                      {Array.isArray(prof.subjects) ? prof.subjects.map(sub => (
                        <span key={sub} className="px-2 py-0.5 bg-slate-800 border border-white/5 text-slate-400 text-[8px] font-black uppercase rounded-md">{sub}</span>
                      )) : <span className="text-slate-500 text-[8px]">-</span>}
                    </div>
                  </td>
                  <td className="p-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => { setEditingProf(prof); setIsAddFormOpen(true); }} className="p-3 text-indigo-500 hover:bg-indigo-500/10 rounded-xl transition-all cursor-pointer">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                      <button onClick={() => setConfirmModal({ show: true, id: prof.id, name: prof.name })} className="p-3 text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all cursor-pointer">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* MOBILE FAB - ADDED BACK HERE */}
      {!isAddFormOpen && (
        <button onClick={() => setIsAddFormOpen(true)} className="md:hidden fixed bottom-13 right-6 w-14 h-14 bg-indigo-600 text-white rounded-2xl shadow-2xl flex items-center justify-center z-[500] active:scale-90 transition-transform cursor-pointer">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>
        </button>
      )}

      {/* CONFIRMATION & TOAST */}
      {confirmModal.show && (
        <div className="fixed inset-0 flex items-center justify-center z-[2000] bg-slate-950/90 backdrop-blur-md p-4">
          <div className="bg-slate-900 border border-white/10 rounded-[2.5rem] p-10 max-w-sm w-full text-center shadow-2xl">
            <h3 className="text-xl font-black text-white mb-2 uppercase italic leading-tight">Remove Faculty?</h3>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-8 leading-relaxed text-rose-500">{confirmModal.name}</p>
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => setConfirmModal({ show: false, id: null, name: '' })} className="py-4 bg-slate-800 text-slate-300 rounded-2xl font-black text-[10px] uppercase cursor-pointer">Back</button>
              <button onClick={confirmDelete} className="py-4 bg-rose-600 text-white rounded-2xl font-black text-[10px] uppercase cursor-pointer">Confirm</button>
            </div>
          </div>
        </div>
      )}

      {toast.show && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[3000] bg-indigo-600 text-white px-8 py-4 rounded-2xl shadow-2xl">
          <span className="text-[10px] font-black uppercase tracking-widest">{toast.message}</span>
        </div>
      )}

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(99, 102, 241, 0.1); border-radius: 20px; }
      `}</style>
    </div>
  )
}
