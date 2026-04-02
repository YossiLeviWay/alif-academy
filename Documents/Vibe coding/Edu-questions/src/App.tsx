import React, { useState, useEffect } from 'react';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  doc, 
  deleteDoc, 
  updateDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { 
  signInAnonymously, 
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { 
  Plus, 
  Minus, 
  Settings, 
  Trash2, 
  Edit2, 
  PlusCircle, 
  Menu, 
  X,
  LogOut,
  HelpCircle,
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown
} from 'lucide-react';
import { db, auth } from './firebase';

const appId = 'edu-questions-app';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [questions, setQuestions] = useState<any[]>([]);
  const [folders, setFolders] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [answers, setAnswers] = useState<any[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [currentStudentId, setCurrentStudentId] = useState<string | null>(null);
  const [expandedFolderIds, setExpandedFolderIds] = useState<string[]>([]);
  const [sidebarTab, setSidebarTab] = useState<'questions' | 'students'>('questions');
  const [viewMode, setViewMode] = useState<'board' | 'archive'>('board');
  const [fontSize, setFontSize] = useState(22);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showAddAnswerModal, setShowAddAnswerModal] = useState(false);
  const [showAddQuestionModal, setShowAddQuestionModal] = useState(false);
  const [showAddFolderModal, setShowAddFolderModal] = useState(false);
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [editQuestionData, setEditQuestionData] = useState<any>(null);
  const [editAnswerData, setEditAnswerData] = useState<any>(null);
  const [editFolderData, setEditFolderData] = useState<any>(null);
  const [editStudentData, setEditStudentData] = useState<any>(null);
  const [loginPassword, setLoginPassword] = useState('');
  const [isQuestionExpanded, setIsQuestionExpanded] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, question: any } | null>(null);

  const [authError, setAuthError] = useState<string | null>(null);

  const handleFirestoreError = (error: any, operationType: OperationType, path: string) => {
    const errInfo = {
      error: error?.message || String(error),
      operationType,
      path,
      userId: auth.currentUser?.uid,
    };
    console.error('Firestore Error:', errInfo);
    alert(`שגיאת מסד נתונים: ${errInfo.error}`);
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (err: any) {
        console.error("Auth error:", err);
        if (err.code === 'auth/admin-restricted-operation') {
          setAuthError("יש להפעיל 'Anonymous Authentication' ב-Firebase Console תחת לשונית Sign-in method.");
        } else {
          setAuthError(err.message);
        }
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  if (authError) {
    return (
      <div className="min-h-screen bg-red-50 flex items-center justify-center p-4 text-right" style={{ direction: 'rtl' }}>
        <div className="bg-white p-8 rounded-[2rem] shadow-xl border-2 border-red-200 max-w-md w-full">
          <h2 className="text-2xl font-black text-red-600 mb-4">שגיאת התחברות ל-Firebase</h2>
          <p className="text-slate-700 font-bold mb-6">{authError}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="w-full bg-red-600 text-white py-4 rounded-2xl font-black"
          >
            נסה שוב
          </button>
        </div>
      </div>
    );
  }

  useEffect(() => {
    if (!user) return;
    const fCol = collection(db, 'artifacts', appId, 'public', 'data', 'folders');
    const unsubscribe = onSnapshot(fCol, (snapshot) => {
      const fs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setFolders(fs.sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const sCol = collection(db, 'artifacts', appId, 'public', 'data', 'students');
    const unsubscribe = onSnapshot(sCol, (snapshot) => {
      const ss = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setStudents(ss.sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const qCol = collection(db, 'artifacts', appId, 'public', 'data', 'questions');
    const unsubscribe = onSnapshot(qCol, (snapshot) => {
      const qs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const sorted = qs.sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setQuestions(sorted);
      if (sorted.length > 0 && !currentQuestion) {
        // Optional: set first question as default
      }
    }, (err) => console.error(err));
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const aCol = collection(db, 'artifacts', appId, 'public', 'data', 'answers');
    const unsubscribe = onSnapshot(aCol, (snapshot) => {
      const allAnswers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAnswers(allAnswers.sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
    }, (err) => console.error(err));
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const handleLogin = () => {
    if (loginPassword === '123qwe123') {
      setIsAdmin(true);
      setShowLoginModal(false);
      setLoginPassword('');
    } else {
      alert("סיסמה שגויה");
    }
  };

  const toggleFolder = (id: string) => {
    setExpandedFolderIds(prev => 
      prev.includes(id) ? prev.filter(fid => fid !== id) : [...prev, id]
    );
  };

  const handleAddQuestion = async (title: string, text: string, folderId: string) => {
    if (!isAdmin || !text.trim() || !title.trim()) return;
    const path = `artifacts/${appId}/public/data/questions`;
    try {
      if (editQuestionData) {
        const docRef = doc(db, path, editQuestionData.id);
        await updateDoc(docRef, { title, text, folderId });
        setEditQuestionData(null);
      } else {
        await addDoc(collection(db, path), {
          title,
          text,
          folderId,
          createdAt: serverTimestamp()
        });
      }
      setShowAddQuestionModal(false);
    } catch (err) {
      handleFirestoreError(err, editQuestionData ? OperationType.UPDATE : OperationType.CREATE, path);
    }
  };

  const handleAddFolder = async (name: string) => {
    if (!isAdmin || !name.trim()) return;
    const path = `artifacts/${appId}/public/data/folders`;
    try {
      if (editFolderData) {
        const docRef = doc(db, path, editFolderData.id);
        await updateDoc(docRef, { name });
        setEditFolderData(null);
      } else {
        await addDoc(collection(db, path), {
          name,
          createdAt: serverTimestamp()
        });
      }
      setShowAddFolderModal(false);
    } catch (err) {
      handleFirestoreError(err, editFolderData ? OperationType.UPDATE : OperationType.CREATE, path);
    }
  };

  const handleAddStudent = async (name: string) => {
    if (!isAdmin || !name.trim()) return;
    const path = `artifacts/${appId}/public/data/students`;
    try {
      if (editStudentData) {
        const docRef = doc(db, path, editStudentData.id);
        await updateDoc(docRef, { name });
        setEditStudentData(null);
      } else {
        await addDoc(collection(db, path), {
          name,
          createdAt: serverTimestamp()
        });
      }
      setShowAddStudentModal(false);
    } catch (err) {
      handleFirestoreError(err, editStudentData ? OperationType.UPDATE : OperationType.CREATE, path);
    }
  };

  const handleAddAnswer = async (name: string, text: string, studentId: string) => {
    if (!currentQuestion || !text.trim()) return;
    const path = `artifacts/${appId}/public/data/answers`;
    try {
      if (editAnswerData) {
        const docRef = doc(db, path, editAnswerData.id);
        await updateDoc(docRef, { name, text, studentId });
        setEditAnswerData(null);
      } else {
        await addDoc(collection(db, path), {
          questionId: currentQuestion.id,
          name: name || "משתתפת אנונימית",
          text,
          studentId: studentId || "",
          createdAt: serverTimestamp()
        });
      }
      setShowAddAnswerModal(false);
    } catch (err) {
      handleFirestoreError(err, editAnswerData ? OperationType.UPDATE : OperationType.CREATE, path);
    }
  };

  const handleQuestionContextMenu = (e: React.MouseEvent, question: any) => {
    if (!isAdmin) return;
    e.preventDefault();
    
    const menuWidth = 224; // w-56 = 14rem = 224px
    const menuHeight = 220; // Estimated height of the menu
    
    let x = e.clientX;
    let y = e.clientY;
    
    // Adjust X position if it would go off the right edge
    if (x + menuWidth > window.innerWidth) {
      x = window.innerWidth - menuWidth - 10;
    }
    
    // Adjust Y position if it would go off the bottom edge
    if (y + menuHeight > window.innerHeight) {
      y = window.innerHeight - menuHeight - 10;
    }
    
    // Ensure it doesn't go off the left or top edges
    x = Math.max(10, x);
    y = Math.max(10, y);

    setContextMenu({
      x,
      y,
      question
    });
  };

  return (
    <div 
      className="min-h-screen bg-stone-50 text-slate-900 flex flex-col transition-all font-sans"
      style={{ fontSize: `${fontSize}px`, direction: 'rtl' }}
    >
      <header className="bg-white border-b-2 border-slate-100 shadow-sm sticky top-0 z-40 w-full">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-3">
            <button onClick={() => setIsSidebarOpen(true)} className="p-2 md:p-3 bg-slate-50 hover:bg-blue-50 text-slate-600 rounded-xl md:rounded-2xl border border-slate-100 cursor-pointer">
              <Menu size={24} />
            </button>
            <h1 className="font-black text-blue-600 text-lg md:text-2xl mr-1 md:mr-2 truncate max-w-[150px] md:max-w-none">הלוח השיתופי</h1>
          </div>
          <div className="flex items-center gap-1 md:gap-2">
            <div className="flex bg-slate-50 rounded-xl md:rounded-2xl p-1 gap-1 border border-slate-200">
              <button onClick={() => setFontSize(f => Math.min(f + 4, 64))} className="p-1 md:p-2 text-blue-700 cursor-pointer"><Plus size={20} /></button>
              <button onClick={() => setFontSize(f => Math.max(f - 4, 12))} className="p-1 md:p-2 text-blue-700 cursor-pointer"><Minus size={20} /></button>
            </div>
            {!isAdmin ? (
              <button onClick={() => setShowLoginModal(true)} className="p-2 md:p-3 text-slate-400 hover:text-blue-600 cursor-pointer"><Settings size={20} /></button>
            ) : (
              <button onClick={() => setIsAdmin(false)} className="flex items-center gap-2 p-2 md:p-3 bg-red-50 text-red-600 rounded-xl md:rounded-2xl font-bold cursor-pointer">
                <LogOut size={18} /><span className="hidden sm:inline">יציאה</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {currentQuestion && viewMode === 'board' && (
        <div className="sticky top-[65px] md:top-[80px] z-30 flex justify-center px-4 pointer-events-none w-full">
          <div 
            className={`pointer-events-auto group relative bg-white border-2 border-blue-500 rounded-2xl md:rounded-[2rem] shadow-2xl transition-all duration-300 max-w-2xl w-full ${isQuestionExpanded ? 'p-4 md:p-8' : 'p-2 md:p-3 text-center cursor-pointer'}`}
            onClick={() => setIsQuestionExpanded(!isQuestionExpanded)}
          >
            {!isQuestionExpanded ? (
              <div className="flex items-center justify-center gap-2 md:gap-3 text-blue-700 font-black text-sm md:text-base">
                <HelpCircle size={20} />
                <span className="truncate">{currentQuestion.title || 'צפייה בשאלה'}</span>
              </div>
            ) : (
              <div className="space-y-3 md:space-y-4 text-right">
                <div className="flex justify-between items-center border-b border-blue-100 pb-2">
                  <span className="text-xs md:text-sm font-black text-blue-600 uppercase tracking-widest truncate">{currentQuestion.title}</span>
                  <X size={18} className="text-slate-300 cursor-pointer" onClick={(e) => { e.stopPropagation(); setIsQuestionExpanded(false); }} />
                </div>
                <div className="max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                  <div 
                    className="font-bold text-slate-800 leading-relaxed whitespace-pre-wrap text-right" 
                    style={{ fontSize: `${Math.max(fontSize * 0.9, 14)}px` }}
                  >
                    {currentQuestion.text.split('\n').map((line: string, i: number) => {
                      const isListItem = /^\d+[\.)]/.test(line.trim());
                      return (
                        <div key={i} className={`${isListItem ? 'mt-3 mb-1 text-blue-900 border-r-4 border-blue-200 pr-3 mr-1' : ''}`}>
                          {line}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full mt-2 md:mt-4 overflow-x-hidden">
        {viewMode === 'board' ? (
          currentQuestion ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {answers.filter(a => a.questionId === currentQuestion.id).map((ans) => (
                <div key={ans.id} className="bg-white p-6 rounded-[2.5rem] shadow-lg border border-slate-100 flex flex-col gap-4 group">
                  <div className="flex justify-between items-start border-b border-slate-50 pb-3">
                    <div className="flex flex-col">
                      <span className="font-black text-blue-700 bg-blue-50 px-4 py-1 rounded-2xl text-base">{ans.name}</span>
                      {ans.studentId && (
                        <span className="text-xs text-slate-400 mt-1 mr-2">משויך ל: {students.find(s => s.id === ans.studentId)?.name}</span>
                      )}
                    </div>
                    {isAdmin && (
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setEditAnswerData(ans); setShowAddAnswerModal(true); }} className="p-2 text-slate-400 hover:text-blue-600 cursor-pointer"><Edit2 size={18} /></button>
                        <button onClick={() => { if(confirm("למחוק?")) deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'answers', ans.id)) }} className="p-2 text-red-400 hover:text-red-600 cursor-pointer"><Trash2 size={18} /></button>
                      </div>
                    )}
                  </div>
                  <div className="whitespace-pre-wrap leading-relaxed text-slate-700 text-right">
                    {ans.text.split('\n').map((line: string, i: number) => {
                      const isListItem = /^\d+[\.)]/.test(line.trim());
                      return (
                        <div key={i} className={`${isListItem ? 'mt-2 font-black text-blue-800' : ''}`}>
                          {line}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : <div className="text-center py-40 opacity-40 text-2xl font-bold">בחרו שאלה מהתפריט</div>
        ) : (
          <div className="space-y-8">
            <div className="flex items-center justify-between border-b-2 border-slate-200 pb-4">
              <h2 className="text-3xl font-black text-slate-800">ארכיון משיבים: {students.find(s => s.id === currentStudentId)?.name}</h2>
              <button onClick={() => setViewMode('board')} className="bg-slate-200 px-6 py-2 rounded-xl font-bold hover:bg-slate-300 transition-colors">חזרה ללוח</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {answers.filter(a => a.studentId === currentStudentId).map(ans => {
                const q = questions.find(q => q.id === ans.questionId);
                const f = folders.find(f => f.id === q?.folderId);
                return (
                  <div key={ans.id} className="bg-white p-6 rounded-3xl shadow-md border border-slate-100 space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <div className="text-xs font-black text-blue-500 uppercase tracking-widest">{f?.name || 'ללא תיקייה'}</div>
                        <div className="text-lg font-black text-slate-800">{q?.title || 'שאלה נמחקה'}</div>
                      </div>
                      {isAdmin && (
                        <button onClick={() => { if(confirm("להסיר מהארכיון?")) updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'answers', ans.id), { studentId: "" }) }} className="text-red-400 hover:text-red-600 p-2"><Trash2 size={18}/></button>
                      )}
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl text-slate-600 text-sm whitespace-pre-wrap leading-relaxed">
                      {ans.text}
                    </div>
                  </div>
                );
              })}
              {answers.filter(a => a.studentId === currentStudentId).length === 0 && (
                <div className="col-span-full text-center py-20 text-slate-400 font-bold">אין תגובות משויכות למשתמש זה</div>
              )}
            </div>
          </div>
        )}
      </main>

      {currentQuestion && (
        <button onClick={() => { setEditAnswerData(null); setShowAddAnswerModal(true); }} className="fixed bottom-10 left-10 bg-blue-600 text-white p-6 rounded-full shadow-2xl z-30 flex items-center gap-4 hover:-translate-y-2 transition-all cursor-pointer">
          <Plus size={40} strokeWidth={3} />
          <span className="font-black text-2xl ml-2 hidden md:inline">להוספת תגובה</span>
        </button>
      )}

      {isSidebarOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />
          <div className="relative bg-white w-96 max-w-[90vw] h-full flex flex-col shadow-2xl animate-slide-in-right">
            <div className="p-6 border-b-2 flex justify-between items-center bg-slate-50">
              <h2 className="font-black text-2xl">תפריט ניווט</h2>
              <button onClick={() => setIsSidebarOpen(false)} className="cursor-pointer"><X size={32} /></button>
            </div>
            
            {/* Sidebar Tabs */}
            <div className="flex border-b-2 border-slate-100">
              <button 
                onClick={() => setSidebarTab('questions')}
                className={`flex-1 py-4 font-black text-sm uppercase tracking-widest transition-all ${sidebarTab === 'questions' ? 'text-blue-600 border-b-4 border-blue-600 bg-blue-50/50' : 'text-slate-400 hover:bg-slate-50'}`}
              >
                שאלות ותיקיות
              </button>
              <button 
                onClick={() => setSidebarTab('students')}
                className={`flex-1 py-4 font-black text-sm uppercase tracking-widest transition-all ${sidebarTab === 'students' ? 'text-blue-600 border-b-4 border-blue-600 bg-blue-50/50' : 'text-slate-400 hover:bg-slate-50'}`}
              >
                ארכיון משיבים
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {sidebarTab === 'questions' ? (
                <section className="space-y-4">
                  <div className="flex items-center justify-between px-2">
                    <h3 className="font-black text-slate-400 text-xs uppercase tracking-widest">מבנה עץ שאלות</h3>
                    {isAdmin && (
                      <button onClick={() => setShowAddFolderModal(true)} className="text-blue-600 hover:bg-blue-50 p-1 rounded-lg flex items-center gap-1 text-xs font-black">
                        <Plus size={16}/> תיקייה
                      </button>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    {/* Uncategorized Questions */}
                    {questions.filter(q => !q.folderId).map(q => (
                      <div 
                        key={q.id}
                        onClick={() => { setCurrentQuestion(q); setViewMode('board'); setIsSidebarOpen(false); }}
                        onContextMenu={(e) => handleQuestionContextMenu(e, q)}
                        className={`p-4 rounded-2xl cursor-pointer border-2 transition-all text-right flex items-center justify-between group ${currentQuestion?.id === q.id && viewMode === 'board' ? 'bg-blue-600 border-blue-700 text-white shadow-md' : 'bg-white border-slate-100 hover:border-blue-100 text-slate-700'}`}
                      >
                        <div className="flex items-center gap-2">
                          <HelpCircle size={18} className={currentQuestion?.id === q.id ? 'text-white' : 'text-blue-500'} />
                          <p className="font-bold">{q.title}</p>
                        </div>
                      </div>
                    ))}

                    {/* Folders */}
                    {folders.map(folder => {
                      const isExpanded = expandedFolderIds.includes(folder.id);
                      const folderQuestions = questions.filter(q => q.folderId === folder.id);
                      
                      return (
                        <div key={folder.id} className="space-y-1">
                          <div 
                            onClick={() => toggleFolder(folder.id)}
                            className={`flex items-center justify-between p-4 rounded-2xl cursor-pointer border-2 transition-all ${isExpanded ? 'bg-slate-50 border-slate-200' : 'bg-white border-slate-100 hover:border-slate-200'}`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="text-blue-600">
                                {isExpanded ? <FolderOpen size={22} /> : <Folder size={22} />}
                              </div>
                              <span className="font-black text-slate-700 text-lg">{folder.name}</span>
                              <div className="text-slate-400">
                                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                              </div>
                            </div>
                            {isAdmin && (
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={(e) => { e.stopPropagation(); setEditFolderData(folder); setShowAddFolderModal(true); }} className="p-1 text-slate-400 hover:text-blue-600"><Edit2 size={14}/></button>
                                <button onClick={(e) => { e.stopPropagation(); if(confirm("למחוק תיקייה?")) deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'folders', folder.id)) }} className="p-1 text-slate-400 hover:text-red-600"><Trash2 size={14}/></button>
                              </div>
                            )}
                          </div>
                          
                          {isExpanded && (
                            <div className="pr-6 space-y-2 border-r-4 border-blue-100 mr-4 mt-1 animate-in slide-in-from-top-2 duration-200">
                              {folderQuestions.map(q => (
                                <div 
                                  key={q.id}
                                  onClick={() => { setCurrentQuestion(q); setViewMode('board'); setIsSidebarOpen(false); }}
                                  onContextMenu={(e) => handleQuestionContextMenu(e, q)}
                                  className={`p-3 rounded-xl cursor-pointer border-2 transition-all text-right flex items-center gap-2 ${currentQuestion?.id === q.id && viewMode === 'board' ? 'bg-blue-600 border-blue-700 text-white shadow-md' : 'bg-white border-slate-50 hover:border-blue-50 text-slate-600'}`}
                                >
                                  <HelpCircle size={16} className={currentQuestion?.id === q.id ? 'text-white' : 'text-blue-400'} />
                                  <p className="font-bold text-sm">{q.title}</p>
                                </div>
                              ))}
                              {folderQuestions.length === 0 && (
                                <div className="text-xs text-slate-400 italic p-2">תיקייה ריקה</div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {isAdmin && (
                    <button onClick={() => { setEditQuestionData(null); setShowAddQuestionModal(true); }} className="w-full flex items-center justify-center gap-2 p-4 text-blue-600 border-2 border-dashed border-blue-100 rounded-2xl hover:bg-blue-50 transition-colors">
                      <PlusCircle size={24} /><span className="font-black">שאלה חדשה</span>
                    </button>
                  )}
                </section>
              ) : (
                <section className="space-y-4">
                  <div className="flex items-center justify-between px-2">
                    <h3 className="font-black text-slate-400 text-xs uppercase tracking-widest">רשימת משיבים</h3>
                    {isAdmin && (
                      <button onClick={() => setShowAddStudentModal(true)} className="text-blue-600 hover:bg-blue-50 p-1 rounded-lg flex items-center gap-1 text-xs font-black">
                        <Plus size={16}/> משיב
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    {students.map(student => (
                      <div 
                        key={student.id}
                        onClick={() => { setCurrentStudentId(student.id); setViewMode('archive'); setIsSidebarOpen(false); }}
                        className={`p-4 rounded-2xl cursor-pointer border-2 transition-all flex items-center justify-between group ${currentStudentId === student.id && viewMode === 'archive' ? 'bg-blue-600 border-blue-700 text-white shadow-md' : 'bg-slate-50 border-transparent hover:border-blue-100 text-slate-700'}`}
                      >
                        <span className="font-black">{student.name}</span>
                        {isAdmin && (
                          <div className="flex gap-2">
                            <button onClick={(e) => { e.stopPropagation(); setEditStudentData(student); setShowAddStudentModal(true); }} className="p-1 text-slate-400 hover:text-blue-400"><Edit2 size={16}/></button>
                            <button onClick={(e) => { e.stopPropagation(); if(confirm("למחוק משיב?")) deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', student.id)) }} className="p-1 text-slate-400 hover:text-red-400"><Trash2 size={16}/></button>
                          </div>
                        )}
                      </div>
                    ))}
                    {students.length === 0 && (
                      <div className="text-center py-10 text-slate-400 font-bold">אין משיבים רשומים</div>
                    )}
                  </div>
                </section>
              )}
            </div>
          </div>
        </div>
      )}

      {showAddAnswerModal && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md"
          onClick={() => setShowAddAnswerModal(false)}
        >
          <div 
            className="bg-white w-full max-w-3xl rounded-2xl md:rounded-[3rem] p-6 md:p-10 shadow-2xl text-right overflow-y-auto max-h-[95vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6 md:mb-8">
              <h2 className="text-2xl md:text-3xl font-black">{editAnswerData ? 'עריכת תגובה' : 'הוסיפי תגובה'}</h2>
              <div className="flex bg-slate-100 rounded-xl p-1">
                <button onClick={() => setFontSize(f => Math.min(f+4, 64))} className="p-2 text-blue-600 cursor-pointer"><Plus size={18}/></button>
                <button onClick={() => setFontSize(f => Math.max(f-4, 12))} className="p-2 text-blue-600 cursor-pointer"><Minus size={18}/></button>
              </div>
            </div>
            <div className="mb-4 md:mb-6 p-4 md:p-6 bg-blue-50 border-2 border-blue-100 rounded-2xl md:rounded-[2rem] max-h-[30vh] overflow-y-auto custom-scrollbar">
              <div 
                className="font-bold text-slate-800 whitespace-pre-wrap leading-relaxed" 
                style={{ fontSize: `${Math.max(fontSize * 0.8, 14)}px` }}
              >
                {currentQuestion?.text.split('\n').map((line: string, i: number) => {
                  const isListItem = /^\d+[\.)]/.test(line.trim());
                  return (
                    <div key={i} className={`${isListItem ? 'mt-2 font-black text-blue-800' : ''}`}>
                      {line}
                    </div>
                  );
                })}
              </div>
            </div>
            <form onSubmit={(e: any) => { e.preventDefault(); handleAddAnswer(e.target.name.value, e.target.text.value, e.target.studentId.value); }}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <input name="name" defaultValue={editAnswerData?.name} placeholder="שם המשיבה" className="w-full p-4 md:p-6 bg-slate-50 border-2 border-slate-100 rounded-2xl md:rounded-3xl text-right" />
                <select name="studentId" defaultValue={editAnswerData?.studentId} className="w-full p-4 md:p-6 bg-slate-50 border-2 border-slate-100 rounded-2xl md:rounded-3xl text-right font-bold">
                  <option value="">שיוך למשיב (אופציונלי)</option>
                  {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <textarea name="text" defaultValue={editAnswerData?.text} rows={5} placeholder="תשובה" className="w-full p-4 md:p-6 bg-slate-50 border-2 border-slate-100 rounded-2xl md:rounded-3xl mb-6 text-right resize-none" style={{ fontSize: `${Math.max(fontSize, 16)}px` }} required />
              <div className="flex gap-4">
                <button type="submit" className="flex-2 bg-blue-600 text-white py-4 md:py-6 px-6 md:px-10 rounded-2xl md:rounded-3xl font-black text-xl md:text-2xl shadow-xl cursor-pointer">שלחי</button>
                <button type="button" onClick={() => setShowAddAnswerModal(false)} className="flex-1 bg-slate-100 py-4 md:py-6 rounded-2xl md:rounded-3xl font-black cursor-pointer">ביטול</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddQuestionModal && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md"
          onClick={() => { setShowAddQuestionModal(false); setEditQuestionData(null); }}
        >
          <div 
            className="bg-white w-full max-w-2xl rounded-[2rem] md:rounded-[3rem] p-6 md:p-10 shadow-2xl text-right overflow-y-auto max-h-[95vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl md:text-3xl font-black mb-6">{editQuestionData ? 'עריכת שאלה' : 'שאלה חדשה'}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <input 
                id="qTitle" 
                defaultValue={editQuestionData?.title}
                placeholder="כותרת השאלה" 
                className="w-full p-4 md:p-6 bg-slate-50 border-2 border-slate-200 rounded-2xl md:rounded-3xl text-right font-bold" 
              />
              <select id="qFolder" defaultValue={editQuestionData?.folderId} className="w-full p-4 md:p-6 bg-slate-50 border-2 border-slate-200 rounded-2xl md:rounded-3xl text-right font-bold">
                <option value="">ללא תיקייה</option>
                {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <div className="mb-2 text-xs text-slate-400 font-bold">טיפ: התחילי שורה במספר (למשל 1.) כדי ליצור סעיפים ברורים</div>
            <textarea 
              id="qText" 
              defaultValue={editQuestionData?.text}
              placeholder="תוכן השאלה המלא" 
              className="w-full p-4 md:p-6 bg-slate-50 border-2 border-slate-200 rounded-2xl md:rounded-3xl text-lg md:text-xl min-h-[200px] text-right" 
            />
            <div className="flex gap-4 mt-8">
              <button onClick={() => {
                const title = (document.getElementById('qTitle') as HTMLInputElement).value;
                const text = (document.getElementById('qText') as HTMLTextAreaElement).value;
                const folderId = (document.getElementById('qFolder') as HTMLSelectElement).value;
                handleAddQuestion(title, text, folderId);
              }} className="flex-2 bg-blue-600 text-white py-4 md:py-6 px-6 md:px-10 rounded-2xl md:rounded-3xl font-black text-xl md:text-2xl shadow-xl cursor-pointer">
                {editQuestionData ? 'עדכן' : 'פרסם'}
              </button>
              <button onClick={() => { setShowAddQuestionModal(false); setEditQuestionData(null); }} className="flex-1 bg-slate-100 py-4 md:py-6 rounded-2xl md:rounded-3xl font-black cursor-pointer">ביטול</button>
            </div>
          </div>
        </div>
      )}

      {showLoginModal && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md"
          onClick={() => setShowLoginModal(false)}
        >
          <div 
            className="bg-white w-full max-w-md rounded-[2rem] p-8 shadow-2xl text-right"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-black mb-6">כניסת מנהל</h2>
            <input 
              type="password" 
              value={loginPassword} 
              onChange={(e) => setLoginPassword(e.target.value)}
              placeholder="סיסמה" 
              className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl mb-6 text-right" 
            />
            <div className="flex gap-3">
              <button onClick={handleLogin} className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-black cursor-pointer">כניסה</button>
              <button onClick={() => setShowLoginModal(false)} className="flex-1 bg-slate-100 py-4 rounded-2xl font-black cursor-pointer">ביטול</button>
            </div>
          </div>
        </div>
      )}

      {showAddFolderModal && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md"
          onClick={() => { setShowAddFolderModal(false); setEditFolderData(null); }}
        >
          <div 
            className="bg-white w-full max-w-md rounded-[2rem] p-8 shadow-2xl text-right"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-black mb-6">{editFolderData ? 'עריכת תיקייה' : 'תיקייה חדשה'}</h2>
            <input 
              id="folderName" 
              defaultValue={editFolderData?.name}
              placeholder="שם התיקייה" 
              className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl mb-6 text-right font-bold" 
            />
            <div className="flex gap-3">
              <button onClick={() => handleAddFolder((document.getElementById('folderName') as HTMLInputElement).value)} className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-black cursor-pointer">שמור</button>
              <button onClick={() => { setShowAddFolderModal(false); setEditFolderData(null); }} className="flex-1 bg-slate-100 py-4 rounded-2xl font-black cursor-pointer">ביטול</button>
            </div>
          </div>
        </div>
      )}

      {showAddStudentModal && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md"
          onClick={() => { setShowAddStudentModal(false); setEditStudentData(null); }}
        >
          <div 
            className="bg-white w-full max-w-md rounded-[2rem] p-8 shadow-2xl text-right"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-black mb-6">{editStudentData ? 'עריכת משיב' : 'הוספת משיב (סטודנט)'}</h2>
            <input 
              id="studentName" 
              defaultValue={editStudentData?.name}
              placeholder="שם המשיב" 
              className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl mb-6 text-right font-bold" 
            />
            <div className="flex gap-3">
              <button onClick={() => handleAddStudent((document.getElementById('studentName') as HTMLInputElement).value)} className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-black cursor-pointer">
                {editStudentData ? 'עדכן' : 'הוספה'}
              </button>
              <button onClick={() => { setShowAddStudentModal(false); setEditStudentData(null); }} className="flex-1 bg-slate-100 py-4 rounded-2xl font-black cursor-pointer">ביטול</button>
            </div>
          </div>
        </div>
      )}

      {contextMenu && (
        <div 
          className="fixed z-[200] bg-white border border-slate-200 shadow-2xl rounded-2xl py-2 w-56 animate-in fade-in zoom-in duration-150"
          style={{ top: contextMenu.y, left: contextMenu.x, direction: 'rtl' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-4 py-2 border-b border-slate-100 mb-1">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest truncate">{contextMenu.question.title}</p>
          </div>
          <button 
            onClick={() => {
              setEditQuestionData(contextMenu.question);
              setShowAddQuestionModal(true);
              setContextMenu(null);
            }}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-blue-50 text-slate-700 transition-colors text-right"
          >
            <Edit2 size={18} className="text-blue-500" />
            <span className="font-bold">עריכת שאלה</span>
          </button>
          <button 
            onClick={() => {
              setEditQuestionData(contextMenu.question);
              setShowAddQuestionModal(true);
              setContextMenu(null);
            }}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-blue-50 text-slate-700 transition-colors text-right"
          >
            <PlusCircle size={18} className="text-blue-500" />
            <span className="font-bold">העברה לתיקייה</span>
          </button>
          <div className="h-px bg-slate-100 my-1" />
          <button 
            onClick={() => {
              if (confirm("למחוק את השאלה?")) {
                deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'questions', contextMenu.question.id));
              }
              setContextMenu(null);
            }}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50 text-red-600 transition-colors text-right"
          >
            <Trash2 size={18} />
            <span className="font-bold">מחיקת שאלה</span>
          </button>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .animate-slide-in-right { animation: slide-in-right 0.4s cubic-bezier(0.16, 1, 0.3, 1); } 
        @keyframes slide-in-right { from { transform: translateX(100%); } to { transform: translateX(0); } }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      ` }} />
    </div>
  );
}
