'use client'
import { useState, useEffect } from 'react'
import { db, auth } from '../../lib/firebase'
import { 
  collection, addDoc, deleteDoc, doc, 
  getDoc, setDoc, onSnapshot, serverTimestamp 
} from 'firebase/firestore'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged, signOut } from 'firebase/auth'

export default function AdminDashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [isFormOpen, setIsFormOpen] = useState(true)
  
  const [toast, setToast] = useState({ show: false, message: '' })
  const [confirmModal, setConfirmModal] = useState({ show: false, title: '', onConfirm: null })
  const [errorModal, setErrorModal] = useState({ show: false, message: '' })
  
  const [selectedProfDetails, setSelectedProfDetails] = useState(null)
  const [professors, setProfessors] = useState([])
  const [allSubjects, setAllSubjects] = useState([]) 
  const [filteredSubjects, setFilteredSubjects] = useState([]) 

  const [newProfName, setNewProfName] = useState('')
  const [newProfImage, setNewProfImage] = useState('')
  const [yearLevel, setYearLevel] = useState('1st Year')
  const [selectedProfSubjects, setSelectedProfSubjects] = useState([])
  
  const [newGlobalSubName, setNewGlobalSubName] = useState('')
  const [newGlobalSubYear, setNewGlobalSubYear] = useState('1st Year')

  const [studentFirstName, setStudentFirstName] = useState('')
  const [studentMiddleName, setStudentMiddleName] = useState('')
  const [studentLastName, setStudentLastName] = useState('')
  const [studentEmail, setStudentEmail] = useState('')
  const [studentPassword, setStudentPassword] = useState('')

  const fieldFocusClasses = "focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:scale-[1.01] transition-all duration-300 ease-out"

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && user.email.toLowerCase() === "admintest@gmail.com") {
        fetchSettings()
        const unsubProfs = onSnapshot(collection(db, "professors"), (snap) => {
          setProfessors(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        })
        const unsubSubs = onSnapshot(collection(db, "subjects"), (snap) => {
          setAllSubjects(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        })
        setLoading(false)
        return () => { unsubProfs(); unsubSubs(); }
      } else { 
        router.replace('/') 
      }
    })
    return () => unsubscribe()
  }, [router])

  useEffect(() => {
    setFilteredSubjects(allSubjects.filter(sub => sub.yearLevel === yearLevel))
  }, [yearLevel, allSubjects])

  const showError = (msg) => {
    setErrorModal({ show: true, message: msg })
  }

  const generateRandomPassword = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*"
    let pass = ""
    for (let i = 0; i < 12; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setStudentPassword(pass)
  }

  const fetchSettings = async () => {
    try {
      const docSnap = await getDoc(doc(db, "settings", "formConfig"))
      if (docSnap.exists()) setIsFormOpen(docSnap.data().isOpen)
    } catch (err) { console.error("Error fetching settings:", err) }
  }

  const showToast = (msg) => {
    setToast({ show: true, message: msg })
    setTimeout(() => setToast({ show: false, message: '' }), 2000)
  }

  const triggerConfirm = (title, action) => {
    setConfirmModal({ show: true, title, onConfirm: action })
  }

  const handleAddProfessor = async (e) => {
    e.preventDefault()
    if (!newProfName.trim() || selectedProfSubjects.length === 0) {
      showError("Faculty name and at least one linked subject are required.")
      return
    }
    setProcessing(true)
    try {
      await addDoc(collection(db, "professors"), {
        name: newProfName.trim(), 
        imageUrl: newProfImage.trim(),
        yearLevel, 
        subjects: selectedProfSubjects, 
        createdAt: serverTimestamp()
      })
      setNewProfName(''); setNewProfImage(''); setSelectedProfSubjects([]);
      showToast("Faculty Member Added!")
    } catch (err) { showError(err.message) }
    setProcessing(false)
  }

  const handleDeleteProf = (e, id) => {
    e.stopPropagation();
    triggerConfirm("Delete this faculty member record?", async () => {
      try {
        await deleteDoc(doc(db, "professors", id))
        showToast("Removed Successfully")
      } catch (err) { showError(err.message) }
    })
  }

  const handleDeleteSubject = (id) => {
    triggerConfirm("Remove this subject from the global database?", async () => {
      try {
        await deleteDoc(doc(db, "subjects", id))
        showToast("Subject Deleted")
      } catch (err) { showError(err.message) }
    })
  }

  const handleAddStudent = async (e) => {
    e.preventDefault(); 
    if (!studentEmail.trim() || !studentFirstName.trim() || !studentLastName.trim() || !studentPassword.trim()) {
      showError("All fields including password are required.");
      return;
    }
    setProcessing(true);
    try {
      await addDoc(collection(db, "authorized_students"), { 
        firstName: studentFirstName.trim(),
        middleName: studentMiddleName.trim(),
        lastName: studentLastName.trim(),
        email: studentEmail.toLowerCase().trim(), 
        password: studentPassword,
        createdAt: serverTimestamp() 
      });
      setStudentFirstName(''); setStudentMiddleName(''); setStudentLastName('');
      setStudentEmail(''); setStudentPassword(''); 
      showToast("Student Registered Successfully");
    } catch (err) { showError(err.message) }
    setProcessing(false);
  }

  if (loading) return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
      <div className="text-center font-bold text-indigo-400 uppercase tracking-[0.3em] animate-pulse">Initializing Admin...</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 p-4 md:p-8 relative overflow-x-hidden font-sans">
      
      {/* Background Glows */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-600/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-violet-600/5 blur-[120px] pointer-events-none" />

      {/* --- MODALS --- */}
      {errorModal.show && (
        <div className="fixed inset-0 flex items-center justify-center z-[150] bg-slate-950/90 backdrop-blur-md p-4">
          <div className="bg-slate-900 border border-rose-500/20 rounded-[2rem] p-8 max-w-sm w-full shadow-2xl animate-center-pop">
            <div className="w-16 h-16 bg-rose-500/10 text-rose-500 rounded-2xl flex items-center justify-center mb-6 border border-rose-500/20 mx-auto">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-2 text-center tracking-tight">Action Required</h3>
            <p className="text-slate-400 text-sm mb-8 text-center leading-relaxed">{errorModal.message}</p>
            <button onClick={() => setErrorModal({ show: false, message: '' })} className="cursor-pointer w-full py-4 bg-slate-800 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-700 transition-all active:scale-95">Understood</button>
          </div>
        </div>
      )}

      {selectedProfDetails && (
        <div className="fixed inset-0 flex items-center justify-center z-[130] bg-slate-950/80 backdrop-blur-md p-4" onClick={() => setSelectedProfDetails(null)}>
          <div className="bg-slate-900 border border-white/10 rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl animate-center-pop relative overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-r from-indigo-600/20 to-violet-600/20" />
            <button onClick={() => setSelectedProfDetails(null)} className="absolute top-6 right-6 text-slate-400 hover:text-white transition-colors cursor-pointer z-10">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <div className="relative mt-4 flex flex-col items-center">
              <img 
                src={selectedProfDetails.imageUrl && selectedProfDetails.imageUrl.includes('http') ? selectedProfDetails.imageUrl : `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedProfDetails.name)}&background=1e293b&color=fff&size=256`} 
                className="w-28 h-28 rounded-[2rem] object-cover shadow-2xl border-4 border-slate-900 bg-slate-800 mb-4" 
                alt={selectedProfDetails.name}
              />
              <h3 className="text-2xl font-black text-white text-center">{selectedProfDetails.name}</h3>
              <span className="text-xs font-black text-indigo-400 uppercase tracking-widest mt-1">{selectedProfDetails.yearLevel} Instructor</span>
              <div className="w-full h-px bg-white/5 my-6" />
              <div className="w-full">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Subjects</p>
                <div className="flex flex-wrap gap-2">
                  {selectedProfDetails.subjects?.map((sub, i) => (
                    <span key={i} className="bg-slate-800 border border-white/5 px-4 py-2 rounded-xl text-xs font-bold text-slate-300">{sub}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {confirmModal.show && (
        <div className="fixed inset-0 flex items-center justify-center z-[110] bg-slate-950/90 backdrop-blur-md p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-[2rem] p-8 max-w-sm w-full shadow-2xl animate-center-pop">
            <div className="w-14 h-14 bg-rose-500/10 text-rose-500 rounded-2xl flex items-center justify-center mb-6 border border-rose-500/20">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-2 tracking-tight">System Confirmation</h3>
            <p className="text-slate-400 text-sm mb-8 leading-relaxed">{confirmModal.title}</p>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setConfirmModal({ ...confirmModal, show: false })} className="cursor-pointer py-3.5 bg-slate-800 text-slate-300 rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-slate-700 transition-all">Cancel</button>
              <button onClick={() => { confirmModal.onConfirm(); setConfirmModal({ ...confirmModal, show: false }); }} className="cursor-pointer py-3.5 bg-rose-600 text-white rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-rose-700 shadow-lg shadow-rose-600/20 transition-all">Delete</button>
            </div>
          </div>
        </div>
      )}

      {toast.show && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[120] pointer-events-none">
          <div className="bg-slate-800 border border-white/10 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-center-pop pointer-events-auto">
            <div className="bg-emerald-500 rounded-full p-1">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
            </div>
            <span className="text-xs font-bold uppercase tracking-widest">{toast.message}</span>
          </div>
        </div>
      )}

      <div className={`max-w-7xl mx-auto transition-all duration-500 ${toast.show || confirmModal.show || selectedProfDetails || errorModal.show ? 'blur-md scale-[0.98] opacity-50' : 'opacity-100'}`}>
        
        {/* --- HEADER --- */}
<div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-10 gap-6 bg-slate-900/50 p-6 rounded-[2rem] border border-white/10 backdrop-blur-md relative">
  
  {/* Mobile Logout Button (Pin to Upper Right) */}
  <button 
    onClick={() => signOut(auth)} 
    className="lg:hidden absolute top-6 right-8 text-slate-500 hover:text-rose-400 text-[9px] font-black uppercase tracking-widest transition-colors cursor-pointer z-20"
  >
    Logout
  </button>

  <div className="w-full lg:w-auto mt-2 lg:mt-0">
    <h1 className="text-3xl font-black tracking-tight text-white uppercase italic">Admin<span className="text-indigo-500">Panel</span></h1>
    <div className="flex items-center gap-2 mt-1">
      <span className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]"></span>
      <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em]">Root Authorization Active</p>
    </div>
  </div>

  <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
    <button onClick={() => router.push('/AdminDashboard/StudentList')} className="cursor-pointer flex-1 lg:flex-none px-6 py-3 rounded-xl font-bold text-[10px] bg-slate-800 text-slate-300 border border-white/5 hover:bg-slate-700 transition-all uppercase tracking-widest active:scale-95">VIEW STUDENTS</button>
    <button onClick={() => router.push('/AdminDashboard/Results')} className="cursor-pointer flex-1 lg:flex-none px-6 py-3 rounded-xl font-bold text-[10px] bg-indigo-600 text-white hover:bg-indigo-500 transition-all uppercase tracking-widest shadow-lg shadow-indigo-600/20 active:scale-95">VIEW RESULTS</button>
    <button onClick={async () => {
      const newStatus = !isFormOpen; setIsFormOpen(newStatus);
      await setDoc(doc(db, "settings", "formConfig"), { isOpen: newStatus, updatedAt: new Date() });
      showToast(`System ${newStatus ? 'Opened' : 'Closed'}`);
    }} className={`cursor-pointer flex-1 lg:flex-none px-6 py-3 rounded-xl font-bold text-[10px] transition-all uppercase tracking-widest active:scale-95 border ${isFormOpen ? "bg-emerald-600/10 border-emerald-500/50 text-emerald-500" : "bg-slate-800 border-white/10 text-slate-400"}`}>
      {isFormOpen ? "PORTAL: LIVE" : "PORTAL: CLOSED"}
    </button>
    
    {/* Desktop Logout Button (Hidden on Mobile) */}
    <button onClick={() => signOut(auth)} className="hidden lg:block cursor-pointer px-4 py-3 text-slate-500 hover:text-rose-400 text-[10px] font-black uppercase transition-colors">Logout</button>
  </div>
</div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">
          {/* Add Faculty Form */}
          <div className="lg:col-span-4 bg-slate-900 rounded-[2.5rem] p-6 md:p-8 border border-white/5 shadow-2xl">
            <h2 className="text-xl font-black mb-8 text-white uppercase tracking-tight flex items-center gap-3">
              <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
              Add Faculty Member
            </h2>
            <form onSubmit={handleAddProfessor} className="space-y-5">
              <div className="space-y-1.5 group">
                <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 group-focus-within:text-indigo-400 transition-colors">Name</label>
                <input type="text" placeholder="Full Name" value={newProfName} onChange={(e) => setNewProfName(e.target.value)} className={`w-full bg-slate-800 border border-slate-700 p-4 rounded-xl outline-none text-white text-base md:text-sm ${fieldFocusClasses}`} />
              </div>

              <div className="space-y-1.5 relative group">
                <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 group-focus-within:text-indigo-400 transition-colors">Year Level</label>
                <div className="relative">
                  <select value={yearLevel} onChange={(e) => { setYearLevel(e.target.value); setSelectedProfSubjects([]); }} className={`cursor-pointer w-full bg-slate-800 border border-slate-700 p-4 pr-10 rounded-xl outline-none text-white font-bold text-base md:text-sm appearance-none ${fieldFocusClasses}`}>
                    {['1st Year', '2nd Year', '3rd Year', '4th Year'].map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>
              </div>

              <div className="bg-slate-950/50 rounded-2xl p-5 border border-white/5 transition-all focus-within:border-indigo-500/30">
                <label className="text-[10px] font-black text-indigo-400 uppercase mb-3 block tracking-widest">Subjects</label>
                <div className="flex flex-wrap gap-2 mb-4 min-h-[40px]">
                  {selectedProfSubjects.map((s, i) => (
                    <span key={i} className="bg-indigo-600/10 border border-indigo-600/20 text-indigo-400 px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-2 animate-center-pop">
                      {s} <button type="button" onClick={() => setSelectedProfSubjects(selectedProfSubjects.filter(x => x !== s))} className="cursor-pointer hover:text-white text-base px-1 leading-none">×</button>
                    </span>
                  ))}
                </div>
                <div className="relative group">
                  <select onChange={(e) => e.target.value && !selectedProfSubjects.includes(e.target.value) && setSelectedProfSubjects([...selectedProfSubjects, e.target.value])} className={`cursor-pointer w-full bg-slate-800 border border-slate-700 p-3 pr-10 rounded-xl outline-none text-base md:text-xs text-slate-400 appearance-none ${fieldFocusClasses}`}>
                    <option value="">Choose Subject...</option>
                    {filteredSubjects.map(sub => <option key={sub.id} value={sub.name}>{sub.name}</option>)}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 group">
                <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 group-focus-within:text-indigo-400 transition-colors">Profile Image URL</label>
                <input type="text" placeholder="https://image-link.com/photo.jpg" value={newProfImage} onChange={(e) => setNewProfImage(e.target.value)} className={`w-full bg-slate-800 border border-slate-700 p-4 rounded-xl outline-none text-white text-base md:text-sm ${fieldFocusClasses}`} />
              </div>

              <button disabled={processing} className="cursor-pointer w-full bg-indigo-600 text-white py-4 rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20 active:scale-95">
                {processing ? "Processing..." : "Add Faculty Member"}
              </button>
            </form>
          </div>

          {/* Faculty List */}
          <div className="lg:col-span-4 bg-slate-900 rounded-[2.5rem] p-6 md:p-8 border border-white/5 shadow-2xl h-[500px] md:h-[650px] flex flex-col">
            <h2 className="text-xl font-black mb-8 text-white uppercase tracking-tight flex items-center gap-3">
              <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
              Faculty List
            </h2>
            <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar flex-1">
              {professors.length === 0 && <p className="text-center text-slate-600 text-[10px] py-10 font-bold uppercase tracking-widest italic">Directory Empty</p>}
              {professors.map(p => (
                <div key={p.id} onClick={() => setSelectedProfDetails(p)} className="group flex items-center justify-between p-4 bg-slate-800/40 rounded-2xl border border-transparent hover:border-white/10 hover:bg-slate-800/60 transition-all cursor-pointer">
                  <div className="flex items-center gap-4 overflow-hidden">
                    <img src={p.imageUrl && p.imageUrl.includes('http') ? p.imageUrl : `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=1e293b&color=fff&size=128`} className="w-11 h-11 rounded-xl object-cover shadow-sm bg-slate-700 border border-white/5" alt={p.name} />
                    <div className="overflow-hidden">
                      <span className="font-bold text-slate-200 text-sm block truncate">{p.name}</span>
                      <span className="text-[9px] font-black text-indigo-400 uppercase">{p.yearLevel}</span>
                    </div>
                  </div>
                  <button onClick={(e) => handleDeleteProf(e, p.id)} className="cursor-pointer text-slate-500 hover:text-rose-500 p-2 transition-all active:scale-90">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Student Access */}
          <div className="lg:col-span-4 bg-slate-900 rounded-[2.5rem] p-6 md:p-8 border border-white/5 shadow-2xl h-fit">
            <h2 className="text-xl font-black mb-8 text-white uppercase tracking-tight flex items-center gap-3">
              <span className="w-2 h-2 bg-slate-400 rounded-full"></span>
              Add Student
            </h2>
            <form onSubmit={handleAddStudent} className="space-y-4">
              <div className="space-y-1 group">
                <label className="text-[9px] font-bold text-slate-500 uppercase ml-1 group-focus-within:text-indigo-400 transition-colors">First Name</label>
                <input type="text" placeholder="First Name" value={studentFirstName} onChange={(e) => setStudentFirstName(e.target.value)} className={`w-full bg-slate-800 border border-slate-700 p-4 rounded-xl outline-none text-white text-sm ${fieldFocusClasses}`} />
              </div>
              <div className="space-y-1 group">
                <label className="text-[9px] font-bold text-slate-500 uppercase ml-1 group-focus-within:text-indigo-400 transition-colors">Middle Name (Optional)</label>
                <input type="text" placeholder="Middle Name" value={studentMiddleName} onChange={(e) => setStudentMiddleName(e.target.value)} className={`w-full bg-slate-800 border border-slate-700 p-4 rounded-xl outline-none text-white text-sm ${fieldFocusClasses}`} />
              </div>
              <div className="space-y-1 group">
                <label className="text-[9px] font-bold text-slate-500 uppercase ml-1 group-focus-within:text-indigo-400 transition-colors">Last Name</label>
                <input type="text" placeholder="Surname" value={studentLastName} onChange={(e) => setStudentLastName(e.target.value)} className={`w-full bg-slate-800 border border-slate-700 p-4 rounded-xl outline-none text-white text-sm ${fieldFocusClasses}`} />
              </div>
              <div className="space-y-1 group">
                <label className="text-[9px] font-bold text-slate-500 uppercase ml-1 group-focus-within:text-indigo-400 transition-colors">Student Email</label>
                <input type="email" placeholder="Email Address" value={studentEmail} onChange={(e) => setStudentEmail(e.target.value)} className={`w-full bg-slate-800 border border-slate-700 p-4 rounded-xl outline-none text-white text-sm ${fieldFocusClasses}`} />
              </div>
              <div className="space-y-1 group">
                <label className="text-[9px] font-bold text-slate-500 uppercase ml-1 group-focus-within:text-indigo-400 transition-colors">System Password</label>
                <div className="relative">
                  <input type="text" placeholder="Password" value={studentPassword} onChange={(e) => setStudentPassword(e.target.value)} className={`w-full bg-slate-800 border border-slate-700 p-4 pr-28 rounded-xl outline-none text-white text-sm ${fieldFocusClasses}`} />
                  <button type="button" onClick={generateRandomPassword} className="absolute right-2 top-2 bottom-2 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-400 hover:text-white px-4 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all border border-indigo-500/30 cursor-pointer active:scale-95">Generate</button>
                </div>
              </div>
              <button disabled={processing} className="cursor-pointer w-full mt-2 bg-indigo-600 text-white py-4 rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20 active:scale-95">
                {processing ? "Processing..." : "Add Student Account"}
              </button>
            </form>
          </div>
        </div>

        {/* Subjects Section */}
        <div className="pt-12 border-t border-white/5">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-4 bg-slate-900 rounded-[2rem] p-6 md:p-8 border border-white/5 shadow-2xl h-fit">
              <h3 className="text-sm font-black text-indigo-400 uppercase mb-6 tracking-widest">Register Subject</h3>
              <form onSubmit={async (e) => {
                e.preventDefault(); if (!newGlobalSubName.trim()) { showError("Course name cannot be empty."); return; }
                setProcessing(true);
                try {
                  await addDoc(collection(db, "subjects"), { 
                    name: newGlobalSubName.trim(), 
                    yearLevel: newGlobalSubYear, 
                    createdAt: serverTimestamp() 
                  });
                  setNewGlobalSubName(''); 
                  showToast("Course Registered");
                } catch (err) { showError(err.message) }
                setProcessing(false);
              }} className="space-y-4">
                <div className="group">
                  <input type="text" placeholder="Course Name" value={newGlobalSubName} onChange={(e) => setNewGlobalSubName(e.target.value)} className={`w-full bg-slate-800 border border-slate-700 p-4 rounded-xl outline-none text-white text-base md:text-sm ${fieldFocusClasses}`} />
                </div>
                <div className="relative group">
                  <select value={newGlobalSubYear} onChange={(e) => setNewGlobalSubYear(e.target.value)} className={`cursor-pointer w-full bg-slate-800 border border-slate-700 p-4 pr-10 rounded-xl text-white text-base md:text-sm font-bold appearance-none ${fieldFocusClasses}`}>
                    {['1st Year', '2nd Year', '3rd Year', '4th Year'].map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>
                <button disabled={processing} className="cursor-pointer w-full bg-indigo-600 text-white py-4 rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20 active:scale-95">Add Subject</button>
              </form>
            </div>
            
            <div className="lg:col-span-8 bg-slate-900/50 rounded-[2rem] border border-white/10 overflow-hidden shadow-2xl backdrop-blur-sm">
              <div className="max-h-[300px] overflow-x-auto custom-scrollbar">
                <table className="w-full text-left min-w-[500px]">
                  <thead className="bg-white/5 border-b border-white/10 sticky top-0 z-10">
                    <tr>
                      <th className="p-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Course Title</th>
                      <th className="p-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Level</th>
                      <th className="p-5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Delete</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {allSubjects.map((s) => (
                      <tr key={s.id} className="hover:bg-white/5 transition-colors">
                        <td className="p-5 font-bold text-slate-300 text-sm">{s.name}</td>
                        <td className="p-5"><span className="text-[9px] font-black bg-indigo-500/10 text-indigo-400 px-3 py-1.5 rounded-lg uppercase border border-indigo-500/20">{s.yearLevel}</span></td>
                        <td className="p-5 text-right">
                          <button onClick={() => handleDeleteSubject(s.id)} className="cursor-pointer text-slate-500 hover:text-rose-500 p-2 transition-all active:scale-90">
                            <svg className="w-4 h-4 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(99, 102, 241, 0.2); border-radius: 10px; }
        @keyframes center-pop { 0% { transform: scale(0.98); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
        .animate-center-pop { animation: center-pop 0.3s ease-out forwards; }
        select { -webkit-appearance: none; -moz-appearance: none; appearance: none; }
        input:focus, select:focus { transform: translateY(-1px); }
      `}</style>
    </div>
  )
}