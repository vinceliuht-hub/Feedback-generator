
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ClassroomNotes, FeedbackRecord, StudentProfile } from './types';
import { generateFeedback } from './services/geminiService';
import { Button } from './components/Button';

const App: React.FC = () => {
  const [notes, setNotes] = useState<ClassroomNotes>({
    studentName: '',
    classContent: '',
    highlights: '',
    improvementAreas: '',
    homework: ''
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [showStudentList, setShowStudentList] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentProfile | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  
  const studentInputRef = useRef<HTMLDivElement>(null);

  // Load students from local storage
  useEffect(() => {
    const savedStudents = localStorage.getItem('eduecho_students');
    if (savedStudents) {
      setStudents(JSON.parse(savedStudents));
    }

    // 点击外部关闭列表
    const handleClickOutside = (event: MouseEvent) => {
      if (studentInputRef.current && !studentInputRef.current.contains(event.target as Node)) {
        setShowStudentList(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const saveStudentsToStorage = (updatedStudents: StudentProfile[]) => {
    setStudents(updatedStudents);
    localStorage.setItem('eduecho_students', JSON.stringify(updatedStudents));
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return '上午好';
    if (hour >= 12 && hour < 18) return '下午好';
    return '晚上好';
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNotes(prev => ({ ...prev, [name]: value }));
    if (name === 'studentName') {
      setShowStudentList(value.length > 0);
      setIsSaved(false);
    }
  };

  const filteredStudents = useMemo(() => {
    if (!notes.studentName) return [];
    return students.filter(s => 
      s.name.toLowerCase().includes(notes.studentName.toLowerCase())
    );
  }, [students, notes.studentName]);

  const selectStudent = (student: StudentProfile) => {
    setNotes(prev => ({ ...prev, studentName: student.name }));
    setSelectedStudent(student);
    setShowStudentList(false);
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notes.studentName || !notes.classContent) {
      alert("请至少填写学生姓名和课堂内容");
      return;
    }

    setIsGenerating(true);
    setIsSaved(false);
    try {
      const greeting = getGreeting();
      const feedback = await generateFeedback(notes, greeting);
      setResult(feedback);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const saveToProfile = () => {
    if (!result) return;

    const newRecord: FeedbackRecord = {
      ...notes,
      id: Date.now().toString(),
      timestamp: Date.now(),
      generatedText: result
    };

    let updatedStudents = [...students];
    const studentIndex = updatedStudents.findIndex(s => s.name === notes.studentName);

    if (studentIndex >= 0) {
      updatedStudents[studentIndex] = {
        ...updatedStudents[studentIndex],
        records: [newRecord, ...updatedStudents[studentIndex].records].slice(0, 50),
        lastUpdated: Date.now()
      };
      setSelectedStudent(updatedStudents[studentIndex]);
    } else {
      const newStudent: StudentProfile = {
        name: notes.studentName,
        records: [newRecord],
        lastUpdated: Date.now()
      };
      updatedStudents.push(newStudent);
      setSelectedStudent(newStudent);
    }

    saveStudentsToStorage(updatedStudents);
    setIsSaved(true);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(result).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const clearForm = () => {
    setNotes({
      studentName: '',
      classContent: '',
      highlights: '',
      improvementAreas: '',
      homework: ''
    });
    setResult('');
    setSelectedStudent(null);
    setIsSaved(false);
    setShowStudentList(false);
  };

  const loadFromHistory = (record: FeedbackRecord) => {
    setNotes({
      studentName: record.studentName,
      classContent: record.classContent,
      highlights: record.highlights || '',
      improvementAreas: record.improvementAreas,
      homework: record.homework
    });
    setResult(record.generatedText);
    setIsSaved(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-12">
      <header className="bg-white border-b sticky top-0 z-20 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">E</span>
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-indigo-400 bg-clip-text text-transparent">
              EduEcho Feedback
            </h1>
          </div>
          <div className="text-sm text-slate-500 flex items-center gap-4">
            <span className="hidden sm:inline">AI 助力专业课堂沟通</span>
            <div className="h-4 w-px bg-slate-200"></div>
            <div className="flex items-center gap-1 font-medium text-indigo-600">
              <span className="text-lg">👤</span>
              {students.length} 名学生
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Side: Input Form */}
        <section className="space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <span className="text-indigo-600">✍️</span> 课堂笔记输入
              </h2>
            </div>
            <form onSubmit={handleGenerate} className="space-y-5">
              <div className="relative" ref={studentInputRef}>
                <label className="block text-sm font-medium text-slate-700 mb-1">学生姓名</label>
                <input
                  type="text"
                  name="studentName"
                  value={notes.studentName}
                  onChange={handleInputChange}
                  onFocus={() => notes.studentName && setShowStudentList(true)}
                  autoComplete="off"
                  placeholder="搜索或输入学生姓名..."
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  required
                />
                
                {showStudentList && (
                  <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-slate-100 shadow-xl rounded-xl max-h-48 overflow-y-auto">
                    {filteredStudents.length > 0 ? (
                      filteredStudents.map(s => (
                        <button
                          key={s.name}
                          type="button"
                          onClick={() => selectStudent(s)}
                          className="w-full text-left px-4 py-2.5 hover:bg-indigo-50 transition-colors flex justify-between items-center border-b border-slate-50 last:border-0"
                        >
                          <span className="font-medium text-slate-700">{s.name}</span>
                          <span className="text-[10px] text-slate-400">最近：{new Date(s.lastUpdated).toLocaleDateString()}</span>
                        </button>
                      ))
                    ) : notes.studentName ? (
                      <div className="p-3 text-sm text-slate-500 flex items-center gap-2 bg-slate-50">
                        <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
                        新学生：<span className="font-bold text-slate-700">"{notes.studentName}"</span>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">课堂内容</label>
                <textarea
                  name="classContent"
                  value={notes.classContent}
                  onChange={handleInputChange}
                  placeholder="本节课教授的核心内容..."
                  rows={2}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all resize-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">课堂闪光点</label>
                <textarea
                  name="highlights"
                  value={notes.highlights}
                  onChange={handleInputChange}
                  placeholder="表现优秀的地方..."
                  rows={2}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">待提高点</label>
                <textarea
                  name="improvementAreas"
                  value={notes.improvementAreas}
                  onChange={handleInputChange}
                  placeholder="问题点（保留英文术语）..."
                  rows={2}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">课后作业</label>
                <textarea
                  name="homework"
                  value={notes.homework}
                  onChange={handleInputChange}
                  placeholder="布置的作业任务..."
                  rows={2}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button 
                  type="submit" 
                  className="flex-1 py-3 text-lg"
                  isLoading={isGenerating}
                >
                  ✨ 生成专业反馈
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={clearForm}
                  className="px-6"
                >
                  清空
                </Button>
              </div>
            </form>
          </div>

          {/* Student Archive / History Section */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 min-h-[300px]">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <span className="text-indigo-600">👤</span> 
                {selectedStudent ? `${selectedStudent.name} 的成长档案` : "所有学生档案"}
              </h2>
              {selectedStudent && (
                <button 
                  onClick={() => setSelectedStudent(null)}
                  className="text-xs text-indigo-600 font-medium hover:underline"
                >
                  查看全部
                </button>
              )}
            </div>

            {selectedStudent ? (
              <div className="space-y-3">
                {selectedStudent.records.length === 0 ? (
                  <p className="text-sm text-slate-400 italic">该学生暂无保存记录</p>
                ) : (
                  selectedStudent.records.map(record => (
                    <div 
                      key={record.id}
                      onClick={() => loadFromHistory(record)}
                      className="p-3 border border-slate-50 bg-slate-50/50 rounded-xl hover:bg-indigo-50 cursor-pointer transition-colors group"
                    >
                      <div className="flex justify-between items-start">
                        <span className="text-xs font-semibold text-slate-600">{new Date(record.timestamp).toLocaleDateString()}</span>
                        <span className="text-[10px] px-1.5 py-0.5 bg-white rounded-md text-slate-400 group-hover:text-indigo-400">点击查看</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-1 italic">"{record.classContent}"</p>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {students.length === 0 ? (
                  <div className="col-span-full py-12 flex flex-col items-center justify-center text-slate-300">
                    <span className="text-4xl mb-2">📁</span>
                    <p className="text-sm">尚未建立学生档案</p>
                  </div>
                ) : (
                  students.sort((a,b) => b.lastUpdated - a.lastUpdated).map(s => (
                    <div 
                      key={s.name}
                      onClick={() => setSelectedStudent(s)}
                      className="p-4 border border-slate-100 rounded-xl hover:bg-indigo-50 cursor-pointer transition-colors flex justify-between items-center group"
                    >
                      <div>
                        <div className="font-bold text-slate-700">{s.name}</div>
                        <div className="text-[10px] text-slate-400 uppercase tracking-wider">{s.records.length} 条记录</div>
                      </div>
                      <span className="text-slate-200 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all">→</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </section>

        {/* Right Side: Feedback Result */}
        <section className="relative">
          <div className="bg-white p-8 rounded-2xl shadow-md border border-slate-100 min-h-[500px] flex flex-col sticky top-24">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <span className="text-indigo-600">📑</span> 反馈预览
              </h2>
              <div className="flex gap-2">
                {result && (
                  <>
                    <Button 
                      variant={isSaved ? "outline" : "primary"} 
                      onClick={saveToProfile}
                      disabled={isSaved}
                      className="text-xs py-1.5 px-3"
                    >
                      {isSaved ? "💾 已存档" : "💾 储存档案"}
                    </Button>
                    <Button 
                      variant="secondary" 
                      onClick={copyToClipboard}
                      className="text-xs py-1.5 px-3"
                    >
                      {copied ? "✅ 已复制" : "📋 复制全文"}
                    </Button>
                  </>
                )}
              </div>
            </div>

            {result ? (
              <div className="flex-1 bg-slate-50 p-6 rounded-xl border border-slate-100 font-normal leading-relaxed text-slate-800 whitespace-pre-wrap select-text selection:bg-indigo-100 overflow-y-auto max-h-[70vh]">
                {result}
              </div>
            ) : (
              <div className="flex-1 border-2 border-dashed border-slate-100 rounded-xl flex flex-col items-center justify-center text-slate-300 p-8 text-center">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 text-slate-200">
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <p className="font-medium">准备就绪</p>
                <p className="text-xs mt-2">点击“生成”开始编写。生成的反馈可以储存到对应学生的成长档案中。</p>
              </div>
            )}
          </div>
        </section>
      </main>

      <footer className="max-w-6xl mx-auto px-4 mt-12 text-center text-slate-400 text-sm">
        <p>© {new Date().getFullYear()} EduEcho Pro - 数字化课堂反馈专家</p>
      </footer>
    </div>
  );
};

export default App;
