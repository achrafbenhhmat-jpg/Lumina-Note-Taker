
import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, Square, ChevronRight, Clock, FileText, History, Plus, 
  ChevronLeft, Loader2, Trash2, Moon, Sun, BrainCircuit, 
  Layers, Edit2, CheckCircle2, XCircle, Settings, Image as ImageIcon,
  Palette, Save, X, Send, MessageCircle, Sparkles
} from 'lucide-react';
import { LessonNote, ViewState, DetailTab, QuizItem, FlashCard, ChatMessage } from './types';
import { processLessonAudio, chatWithBuddyStream } from './services/gemini';

const COLOR_PRESETS = [
  { name: 'Orange', value: '#f97316' },
  { name: 'Blue', value: '#0ea5e9' },
  { name: 'Purple', value: '#8b5cf6' },
  { name: 'Emerald', value: '#10b981' },
  { name: 'Rose', value: '#f43f5e' },
  { name: 'Indigo', value: '#6366f1' },
];

// --- Sub-Components moved outside to prevent re-creation/focus loss ---

const BuddyChatView: React.FC<{
  selectedLesson: LessonNote | null;
  chatInput: string;
  setChatInput: (val: string) => void;
  handleSendMessage: () => void;
  isTyping: boolean;
  chatEndRef: React.RefObject<HTMLDivElement | null>;
}> = ({ selectedLesson, chatInput, setChatInput, handleSendMessage, isTyping, chatEndRef }) => (
  <div className="flex flex-col h-full overflow-hidden">
    <div className="flex-1 overflow-y-auto space-y-4 px-1 py-2 no-scrollbar">
      {selectedLesson?.chatHistory?.map((msg, idx) => (
        <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} message-enter`}>
          <div dir="auto" className={`max-w-[85%] p-4 rounded-3xl text-sm font-medium leading-relaxed shadow-sm ${
            msg.role === 'user' 
              ? 'bg-custom text-white rounded-tr-none' 
              : 'bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 rounded-tl-none border border-zinc-100 dark:border-zinc-700'
          }`}>
            {msg.text || (msg.role === 'buddy' && <span className="opacity-50 italic">Thinking...</span>)}
          </div>
        </div>
      ))}
      <div ref={chatEndRef} />
    </div>
    
    <div className="pt-3 pb-2 flex items-center space-x-2">
      <div className="flex-1">
        <input 
          type="text" 
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
          placeholder="Ask Study Buddy..."
          className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-5 py-4 text-sm font-semibold outline-none focus:ring-4 ring-custom/10 dark:text-white transition-all shadow-sm"
        />
      </div>
      <button 
        onClick={handleSendMessage}
        disabled={!chatInput.trim() || isTyping}
        className="w-12 h-12 rounded-full bg-custom text-white flex items-center justify-center shadow-custom disabled:opacity-30 transition-all active:scale-90 shrink-0"
      >
        {isTyping ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
      </button>
    </div>
  </div>
);

const QuizView: React.FC<{
  items: QuizItem[];
  quizAnswers: Record<number, number>;
  setQuizAnswers: React.Dispatch<React.SetStateAction<Record<number, number>>>;
}> = ({ items, quizAnswers, setQuizAnswers }) => (
  <div className="space-y-6 pb-20 overflow-y-auto no-scrollbar">
    {items.map((q, idx) => (
      <div key={idx} className="bg-white/90 dark:bg-zinc-900/70 backdrop-blur p-6 rounded-[2rem] border border-white/20 dark:border-zinc-800 shadow-sm space-y-4">
        <p dir="auto" className="font-bold text-zinc-900 dark:text-zinc-100 text-lg leading-snug">
          <span className="text-custom mr-2">Q{idx + 1}.</span>
          {q.question}
        </p>
        <div className="grid gap-2">
          {q.options.map((opt, optIdx) => {
            const isSelected = quizAnswers[idx] === optIdx;
            const isCorrect = optIdx === q.correctAnswer;
            const showResult = quizAnswers[idx] !== undefined;
            
            let bgColor = "bg-zinc-100/50 dark:bg-zinc-800/40";
            let borderColor = "border-transparent";
            
            if (showResult) {
              if (isCorrect) {
                bgColor = "bg-green-500 text-white";
              } else if (isSelected) {
                bgColor = "bg-red-500 text-white";
              }
            } else if (isSelected) {
              borderColor = "border-custom ring-4 ring-custom/10";
            }

            return (
              <button
                key={optIdx}
                disabled={showResult}
                onClick={() => setQuizAnswers(prev => ({ ...prev, [idx]: optIdx }))}
                dir="auto"
                className={`text-left p-4 rounded-xl border transition-all flex items-center justify-between font-bold text-sm ${bgColor} ${borderColor} ${!showResult && "active:scale-[0.98]"}`}
              >
                <span className={showResult && isCorrect ? "text-white" : "text-zinc-700 dark:text-zinc-300"}>
                  {opt}
                </span>
                {showResult && isCorrect && <CheckCircle2 size={16} />}
                {showResult && isSelected && !isCorrect && <XCircle size={16} />}
              </button>
            );
          })}
        </div>
      </div>
    ))}
    <button 
      onClick={() => setQuizAnswers({})}
      className="w-full py-4 bg-zinc-100 dark:bg-zinc-900 text-custom font-black rounded-2xl active:scale-[0.98] transition-all uppercase tracking-widest text-xs"
    >
      Reset Quiz
    </button>
  </div>
);

const FlashCardView: React.FC<{
  cards: FlashCard[];
  currentCardIndex: number;
  setCurrentCardIndex: React.Dispatch<React.SetStateAction<number>>;
  isFlipped: boolean;
  setIsFlipped: (val: boolean) => void;
}> = ({ cards, currentCardIndex, setCurrentCardIndex, isFlipped, setIsFlipped }) => {
  const card = cards[currentCardIndex];
  if (!card) return null;
  
  return (
    <div className="flex flex-col items-center space-y-8 pt-2 h-full overflow-hidden">
      <div 
        className={`w-full h-[320px] flip-card cursor-pointer ${isFlipped ? 'flipped' : ''}`}
        onClick={() => setIsFlipped(!isFlipped)}
      >
        <div className="flip-card-inner">
          <div className="flip-card-front bg-white dark:bg-zinc-900 shadow-2xl border border-white/20 dark:border-zinc-800 backdrop-blur-3xl">
            <Sparkles className="absolute top-6 right-6 text-custom/20" size={24} />
            <div className="absolute top-6 left-6 text-[9px] font-black text-custom/40 uppercase tracking-[0.3em]">Concept</div>
            <p dir="auto" className="text-xl font-black text-center text-zinc-900 dark:text-zinc-100 px-6">{card.front}</p>
            <div className="absolute bottom-6 text-zinc-400 text-[9px] font-black uppercase tracking-widest opacity-40">Tap to Reveal</div>
          </div>
          <div className="flip-card-back bg-custom text-white shadow-custom border border-white/10">
            <div className="absolute top-6 left-6 text-[9px] font-black text-white/40 uppercase tracking-[0.3em]">Explanation</div>
            <p dir="auto" className="text-lg font-bold leading-relaxed text-center px-6">{card.back}</p>
            <div className="absolute bottom-6 text-white/50 text-[9px] font-black uppercase tracking-widest">Tap to Return</div>
          </div>
        </div>
      </div>
      
      <div className="flex items-center justify-between w-full px-6">
        <button 
          disabled={currentCardIndex === 0}
          onClick={(e) => { e.stopPropagation(); setCurrentCardIndex(prev => prev - 1); setIsFlipped(false); }}
          className="w-14 h-14 rounded-2xl flex items-center justify-center bg-white dark:bg-zinc-900 text-zinc-400 disabled:opacity-10 border border-zinc-100 dark:border-zinc-800 shadow-sm transition-all active:scale-90"
        >
          <ChevronLeft size={24} />
        </button>
        <div className="text-center">
           <div className="text-2xl font-black text-zinc-900 dark:text-zinc-100 tracking-tighter">{currentCardIndex + 1}</div>
           <div className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.2em]">of {cards.length}</div>
        </div>
        <button 
          disabled={currentCardIndex === cards.length - 1}
          onClick={(e) => { e.stopPropagation(); setCurrentCardIndex(prev => prev + 1); setIsFlipped(false); }}
          className="w-14 h-14 rounded-2xl flex items-center justify-center bg-white dark:bg-zinc-900 text-zinc-400 disabled:opacity-10 border border-zinc-100 dark:border-zinc-800 shadow-sm transition-all active:scale-90"
        >
          <ChevronRight size={24} />
        </button>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('list');
  const [detailTab, setDetailTab] = useState<DetailTab>('summary');
  const [lessons, setLessons] = useState<LessonNote[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<LessonNote | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('lumina_theme') === 'dark');
  const [accentColor, setAccentColor] = useState(() => localStorage.getItem('lumina_accent') || '#f97316');
  const [bgImage, setBgImage] = useState(() => localStorage.getItem('lumina_bg') || '');

  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [isRenaming, setIsRenaming] = useState(false);
  const [tempTitle, setTempTitle] = useState('');
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('lumina_lessons');
    if (saved) setLessons(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem('lumina_lessons', JSON.stringify(lessons));
  }, [lessons]);

  useEffect(() => {
    document.documentElement.style.setProperty('--brand-color', accentColor);
    localStorage.setItem('lumina_accent', accentColor);
  }, [accentColor]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('lumina_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('lumina_theme', 'light');
    }
  }, [isDarkMode]);

  useEffect(() => {
    if (detailTab === 'buddy') {
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  }, [selectedLesson?.chatHistory, detailTab, isTyping]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await handleFinishRecording(audioBlob);
      };
      mediaRecorder.start();
      setIsRecording(true);
      setView('recording');
      setRecordTime(0);
      timerRef.current = window.setInterval(() => {
        setRecordTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Microphone access denied", err);
      alert("Please allow microphone access to record.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      if (timerRef.current) clearInterval(timerRef.current);
      setIsRecording(false);
    }
  };

  const handleFinishRecording = async (blob: Blob) => {
    setIsProcessing(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        const base64Audio = (reader.result as string).split(',')[1];
        const result = await processLessonAudio(base64Audio);
        const newLesson: LessonNote = {
          id: Date.now().toString(),
          title: `Lesson ${lessons.length + 1}`,
          timestamp: Date.now(),
          duration: formatTime(recordTime),
          transcript: result.transcript,
          summary: result.summary,
          quizzes: result.quizzes,
          flashcards: result.flashcards,
          chatHistory: [{ role: 'buddy', text: "Hello! I'm Study Buddy. Ask me anything about this lesson!" }]
        };
        setLessons(prev => [newLesson, ...prev]);
        setSelectedLesson(newLesson);
        setView('detail');
        setDetailTab('summary');
        setIsProcessing(false);
      };
    } catch (err) {
      console.error("Processing failed", err);
      setIsProcessing(false);
      setView('list');
      alert("AI processing failed. Check your API key.");
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || !selectedLesson || isTyping) return;
    const userMsg: ChatMessage = { role: 'user', text: chatInput };
    const currentHistory = selectedLesson.chatHistory || [];
    const historyWithUser = [...currentHistory, userMsg];
    const lessonWithUser = { ...selectedLesson, chatHistory: [...historyWithUser, { role: 'buddy', text: '' }] };
    setSelectedLesson(lessonWithUser);
    const inputToProcess = chatInput;
    setChatInput('');
    setIsTyping(true);
    try {
      await chatWithBuddyStream(
        inputToProcess, 
        currentHistory, 
        { summary: selectedLesson.summary, transcript: selectedLesson.transcript },
        (streamedText) => {
          setSelectedLesson(prev => {
            if (!prev) return null;
            const newHistory = [...historyWithUser, { role: 'buddy', text: streamedText }];
            return { ...prev, chatHistory: newHistory };
          });
        }
      );
      setSelectedLesson(current => {
        if (current) setLessons(prev => prev.map(l => l.id === current.id ? current : l));
        return current;
      });
    } catch (err) {
      console.error("Buddy Chat Error:", err);
    } finally {
      setIsTyping(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const b64 = reader.result as string;
        setBgImage(b64);
        localStorage.setItem('lumina_bg', b64);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearBg = () => {
    setBgImage('');
    localStorage.removeItem('lumina_bg');
  };

  const renameLesson = () => {
    if (selectedLesson && tempTitle.trim()) {
      const updatedLessons = lessons.map(l => l.id === selectedLesson.id ? { ...l, title: tempTitle } : l);
      setLessons(updatedLessons);
      setSelectedLesson({ ...selectedLesson, title: tempTitle });
      setIsRenaming(false);
    }
  };

  const deleteLesson = (id: string) => {
    if (window.confirm('Delete this lesson permanently?')) {
      setLessons(prev => prev.filter(l => l.id !== id));
      setView('list');
      setSelectedLesson(null);
    }
  };

  const renderListView = () => (
    <div className="flex flex-col h-full app-background view-transition" style={{ backgroundImage: bgImage ? `url(${bgImage})` : 'none' }}>
      <div className={`flex-1 flex flex-col ${bgImage ? 'bg-zinc-50/70 dark:bg-black/85 backdrop-blur-sm' : 'bg-zinc-50 dark:bg-black'}`}>
        <header className="px-6 pt-16 pb-4 flex justify-between items-end safe-top">
          <div className="space-y-1">
            <h1 className="text-5xl font-black tracking-tighter text-zinc-900 dark:text-white">Lumina</h1>
            <p className="text-zinc-500 dark:text-zinc-400 text-[10px] font-black uppercase tracking-[0.2em]">Study Smarter</p>
          </div>
          <button 
            onClick={() => setView('settings')}
            className="p-4 rounded-3xl bg-white dark:bg-zinc-900 text-zinc-500 shadow-lg border border-zinc-100 dark:border-zinc-800 active:scale-90 transition-all"
          >
            <Settings size={22} strokeWidth={2.5} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 pb-40 no-scrollbar">
          {lessons.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-400 space-y-6 pb-20">
              <div className="w-32 h-32 rounded-[2.5rem] bg-white dark:bg-zinc-900 flex items-center justify-center shadow-2xl">
                <Mic size={48} className="text-zinc-200 dark:text-zinc-800" strokeWidth={1.5} />
              </div>
              <p className="text-sm px-12 text-center font-medium opacity-60">Record a lecture to generate notes and chat with Study Buddy.</p>
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              {lessons.map(lesson => (
                <div 
                  key={lesson.id}
                  onClick={() => { setSelectedLesson(lesson); setView('detail'); setDetailTab('summary'); }}
                  className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl rounded-[2.5rem] p-5 shadow-sm flex items-center justify-between active:scale-[0.97] transition-all cursor-pointer border border-white/40 dark:border-zinc-800/50"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white bg-custom shadow-custom">
                      <BrainCircuit size={28} strokeWidth={2.5} />
                    </div>
                    <div className="space-y-0.5">
                      <h3 className="font-black text-zinc-900 dark:text-white text-lg tracking-tight truncate max-w-[160px]">{lesson.title}</h3>
                      <div className="flex items-center text-[9px] font-black text-zinc-400 uppercase tracking-widest">
                        <span>{lesson.duration}</span>
                        <span className="mx-2 opacity-30">•</span>
                        <span>{new Date(lesson.timestamp).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="text-zinc-300" size={20} strokeWidth={3} />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="fixed bottom-0 left-0 right-0 p-8 flex justify-center safe-bottom ios-blur bg-white/30 dark:bg-black/30">
          <button onClick={startRecording} className="w-20 h-20 rounded-full bg-custom text-white flex items-center justify-center shadow-custom transition-all active:scale-75 border-4 border-white dark:border-black">
            <Mic size={32} strokeWidth={3} />
          </button>
        </div>
      </div>
    </div>
  );

  const renderRecordingView = () => (
    <div className="flex flex-col h-full bg-black text-white view-transition">
      <div className="flex-1 flex flex-col items-center justify-center space-y-12">
        <div className="text-center space-y-6">
          <div className="inline-flex items-center bg-red-500/10 text-red-500 border border-red-500/20 px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-[0.3em] animate-pulse">
            Capturing Audio
          </div>
          <div className="text-8xl font-black tracking-tighter tabular-nums animate-breathe">{formatTime(recordTime)}</div>
        </div>
        <div className="relative group">
          <div className="relative w-64 h-64 rounded-full border border-white/5 flex items-center justify-center">
            <div className="w-48 h-48 rounded-full bg-custom flex items-center justify-center shadow-2xl transition-transform duration-500">
              <Mic size={72} className="text-white" strokeWidth={3} />
            </div>
          </div>
        </div>
      </div>
      <div className="p-20 pb-40 flex justify-center safe-bottom">
        <button onClick={stopRecording} className="bg-white/5 w-20 h-20 flex items-center justify-center rounded-[2.5rem] border border-white/10 transition-all hover:bg-white/10 active:scale-75">
          <Square size={36} fill="white" strokeWidth={0} />
        </button>
      </div>
      {isProcessing && (
        <div className="fixed inset-0 bg-black/98 flex flex-col items-center justify-center space-y-8 z-50 p-10 text-center backdrop-blur-3xl animate-in fade-in">
          <Loader2 size={80} className="animate-spin text-custom" strokeWidth={3} />
          <h2 className="text-4xl font-black text-white tracking-tight">AI Thinking...</h2>
        </div>
      )}
    </div>
  );

  const renderDetailView = () => {
    if (!selectedLesson) return null;
    return (
      <div className="flex flex-col h-full app-background overflow-hidden view-transition" style={{ backgroundImage: bgImage ? `url(${bgImage})` : 'none' }}>
        <div className={`flex-1 flex flex-col overflow-hidden ${bgImage ? 'bg-zinc-50/85 dark:bg-black/90 backdrop-blur-md' : 'bg-zinc-50 dark:bg-black'}`}>
          <header className="px-5 pt-16 pb-4 safe-top bg-white/40 dark:bg-black/40">
            <div className="flex items-center justify-between mb-6">
              <button onClick={() => setView('list')} className="p-3 bg-white dark:bg-zinc-900 rounded-xl text-custom active:scale-90"><ChevronLeft size={24} strokeWidth={3} /></button>
              <div className="flex items-center space-x-2 flex-1 justify-center px-4 overflow-hidden" onClick={() => { setIsRenaming(true); setTempTitle(selectedLesson.title); }}>
                <h2 className="text-lg font-black truncate text-zinc-900 dark:text-white tracking-tight">{selectedLesson.title}</h2>
                <Edit2 size={14} className="text-zinc-400 shrink-0" />
              </div>
              <button onClick={() => deleteLesson(selectedLesson.id)} className="p-3 text-zinc-300 active:scale-90"><Trash2 size={22} /></button>
            </div>
            <div className="flex bg-zinc-200/40 dark:bg-zinc-900/40 p-1 rounded-3xl border border-zinc-200/30 dark:border-zinc-800/30 overflow-x-auto no-scrollbar">
              {[
                { id: 'summary', icon: <FileText size={16} />, label: 'Guide' },
                { id: 'quiz', icon: <BrainCircuit size={16} />, label: 'Quiz' },
                { id: 'flashcards', icon: <Layers size={16} />, label: 'Cards' },
                { id: 'buddy', icon: <MessageCircle size={16} />, label: 'Buddy' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setDetailTab(tab.id as DetailTab)}
                  className={`flex-1 min-w-[75px] flex items-center justify-center space-x-1.5 py-3 rounded-2xl text-[10px] font-black transition-all ${
                    detailTab === tab.id ? "bg-white dark:bg-zinc-800 text-custom shadow-lg" : "text-zinc-400"
                  }`}
                >
                  {tab.icon}
                  <span className="uppercase tracking-widest">{tab.label}</span>
                </button>
              ))}
            </div>
          </header>

          <div className="flex-1 overflow-y-auto px-6 py-4 no-scrollbar">
            {detailTab === 'summary' && (
              <div className="space-y-8 animate-in fade-in duration-300">
                <section className="space-y-3">
                  <div className="bg-white/95 dark:bg-zinc-900/95 p-6 rounded-[2rem] border border-white/20 dark:border-zinc-800 shadow-xl leading-relaxed text-zinc-800 dark:text-zinc-100 whitespace-pre-wrap text-base font-medium tracking-tight">
                    {selectedLesson.summary}
                  </div>
                </section>
                <section className="space-y-3">
                  <div className="text-zinc-400 dark:text-zinc-500 text-sm italic leading-relaxed pl-4 border-l-2 border-custom/20 py-1 font-medium">
                    {selectedLesson.transcript}
                  </div>
                </section>
              </div>
            )}
            {detailTab === 'quiz' && (
              <QuizView items={selectedLesson.quizzes} quizAnswers={quizAnswers} setQuizAnswers={setQuizAnswers} />
            )}
            {detailTab === 'flashcards' && (
              <FlashCardView 
                cards={selectedLesson.flashcards} 
                currentCardIndex={currentCardIndex} 
                setCurrentCardIndex={setCurrentCardIndex} 
                isFlipped={isFlipped} 
                setIsFlipped={setIsFlipped} 
              />
            )}
            {detailTab === 'buddy' && (
              <BuddyChatView 
                selectedLesson={selectedLesson} 
                chatInput={chatInput} 
                setChatInput={setChatInput} 
                handleSendMessage={handleSendMessage} 
                isTyping={isTyping} 
                chatEndRef={chatEndRef} 
              />
            )}
          </div>
        </div>
        
        {isRenaming && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-8 bg-black/80 backdrop-blur-2xl animate-in fade-in">
            <div className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-[3rem] p-8 space-y-6 shadow-2xl border border-white/10">
              <h3 className="text-2xl font-black text-center dark:text-white tracking-tighter">Rename</h3>
              <input autoFocus type="text" value={tempTitle} onChange={(e) => setTempTitle(e.target.value)}
                className="w-full bg-zinc-100 dark:bg-zinc-800 p-5 rounded-2xl outline-none ring-4 ring-custom/10 dark:text-white font-black text-xl text-center"
              />
              <div className="flex space-x-3">
                <button onClick={() => setIsRenaming(false)} className="flex-1 py-4 text-zinc-400 font-black text-xs uppercase tracking-widest">Cancel</button>
                <button onClick={renameLesson} className="flex-1 py-4 bg-custom text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-custom">Update</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderSettingsView = () => (
    <div className="flex flex-col h-full app-background view-transition" style={{ backgroundImage: bgImage ? `url(${bgImage})` : 'none' }}>
      <div className={`flex-1 flex flex-col ${bgImage ? 'bg-zinc-50/85 dark:bg-black/90 backdrop-blur-md' : 'bg-zinc-50 dark:bg-black'}`}>
        <header className="px-6 pt-20 pb-6 safe-top flex items-center space-x-4">
          <button onClick={() => setView('list')} className="p-3 bg-white dark:bg-zinc-900 rounded-xl text-zinc-400 shadow-sm active:scale-90"><ChevronLeft size={24} strokeWidth={3} /></button>
          <h1 className="text-4xl font-black tracking-tighter dark:text-white">Settings</h1>
        </header>
        <div className="flex-1 overflow-y-auto px-6 space-y-8 pb-20 no-scrollbar">
          <section className="space-y-4">
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] border border-zinc-100 dark:border-zinc-800 shadow-sm flex items-center justify-between">
              <div>
                <p className="font-black text-base dark:text-white">Dark Mode</p>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Aesthetic appearance</p>
              </div>
              <button onClick={() => setIsDarkMode(!isDarkMode)} className={`w-14 h-8 rounded-full transition-all flex items-center px-1 ${isDarkMode ? 'bg-custom' : 'bg-zinc-200'}`}>
                 <div className={`w-6 h-6 rounded-full bg-white shadow-xl transition-all ${isDarkMode ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
            </div>
          </section>
          <section className="space-y-4">
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] border border-zinc-100 dark:border-zinc-800 shadow-sm grid grid-cols-3 gap-4">
              {COLOR_PRESETS.map(c => (
                <button key={c.value} onClick={() => setAccentColor(c.value)} className={`h-12 rounded-xl transition-all border-4 ${accentColor === c.value ? 'border-zinc-900 dark:border-white scale-110 shadow-lg' : 'border-transparent active:scale-95'}`} style={{ backgroundColor: c.value }} />
              ))}
            </div>
          </section>
          <section className="space-y-4">
            <div className="bg-white dark:bg-zinc-900 p-8 rounded-[2rem] border border-zinc-100 dark:border-zinc-800 shadow-sm space-y-6">
               <input type="file" hidden ref={fileInputRef} onChange={handleImageUpload} accept="image/*" />
               <button onClick={() => fileInputRef.current?.click()} className="w-full py-4 bg-custom text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-custom flex items-center justify-center space-x-2 active:scale-95">
                 <ImageIcon size={16} /> <span>Import Wallpaper</span>
               </button>
               {bgImage && (
                 <div className="h-40 w-full rounded-2xl overflow-hidden border-2 border-zinc-100 dark:border-zinc-800 relative shadow-lg">
                    <img src={bgImage} className="w-full h-full object-cover" />
                    <button onClick={clearBg} className="absolute top-2 right-2 p-2 bg-black/50 text-white rounded-full"><X size={16}/></button>
                 </div>
               )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );

  return (
    <div className="w-full h-screen bg-zinc-50 dark:bg-black overflow-hidden flex flex-col relative">
      {view === 'list' && renderListView()}
      {view === 'recording' && renderRecordingView()}
      {view === 'detail' && renderDetailView()}
      {view === 'settings' && renderSettingsView()}
    </div>
  );
};

export default App;
