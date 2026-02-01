
import React, { useState, useEffect, useRef } from 'react';
import { AppView, SupportedLanguage, HistoryItem, Medication, Instruction } from './types';
import { TRANSLATIONS, LANGUAGES, LOGO_URL } from './constants';
import { analyzeMedicalDocument, translateHistoryItem, generateMedicalTTS, generateAnatomyImage, playRawAudio, transcribeAudio, initializeAudio, setupAudioAutoResume, playSystemAlarmSound, compressImage } from './services/geminiService';
import { saveHistoryItem, getHistory, saveLanguage, getSavedLanguage, deleteHistoryItem, saveFullHistory, clearHistory } from './services/storageService';
import { startReminderService, checkReminders, setAlarmCallback, AlarmContext } from './services/notificationService';
import { LanguageSelector } from './components/LanguageSelector';
import { BigButton } from './components/BigButton';
import { VoiceRecorder } from './components/VoiceRecorder';
import { MedicineDisplay } from './components/MedicineDisplay';
import { InstructionDisplay } from './components/InstructionDisplay';
import { DailyTimetable } from './components/DailyTimetable';

function App() {
  const [view, setView] = useState<AppView>(AppView.LOADING);
  const [language, setLanguage] = useState<SupportedLanguage>('en');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState(''); 
  const [currentAnalysis, setCurrentAnalysis] = useState<HistoryItem | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [fromHistory, setFromHistory] = useState(false);

  // Custom Confirmation Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isClearingAll, setIsClearingAll] = useState(false);

  // Feature state
  const [isGeneratingVisual, setIsGeneratingVisual] = useState(false);
  const [generatedVisualUrl, setGeneratedVisualUrl] = useState<string | null>(null);
  
  // Audio State
  const [isPlayingTTS, setIsPlayingTTS] = useState(false);
  const [playingSource, setPlayingSource] = useState<'summary' | 'transcript' | null>(null);
  const [isTTSLoading, setIsTTSLoading] = useState(false); 
  const stopTtsRef = useRef<(() => void) | null>(null);
  
  const [isTranscribing, setIsTranscribing] = useState(false);
  
  // Alarm State
  const [activeAlarm, setActiveAlarm] = useState<AlarmContext | null>(null);
  const [alarmAudioLoading, setAlarmAudioLoading] = useState(false);
  const [currentAlarmAudio, setCurrentAlarmAudio] = useState<string | null>(null);
  const alarmStopRef = useRef<(() => void) | null>(null);
  const alarmLoopTimeoutRef = useRef<any>(null);
  const alarmChirpStopRef = useRef<(() => void) | null>(null);
  const isAlarmActiveRef = useRef(false);

  const t = TRANSLATIONS[language];

  useEffect(() => {
    setupAudioAutoResume();
    startReminderService();
    setAlarmCallback(handleAlarmTrigger);

    const savedLang = getSavedLanguage();
    if (savedLang && TRANSLATIONS[savedLang as SupportedLanguage]) {
        setLanguage(savedLang as SupportedLanguage);
        setHistory(getHistory());
        setView(AppView.HOME);
    } else {
        setView(AppView.LANGUAGE_SELECT);
    }

    return () => {
      stopAlarmAudio();
      if (stopTtsRef.current) stopTtsRef.current();
    };
  }, []);

  const stopAlarmAudio = () => {
    isAlarmActiveRef.current = false;
    if (alarmStopRef.current) {
        alarmStopRef.current();
        alarmStopRef.current = null;
    }
    if (alarmLoopTimeoutRef.current) {
        clearTimeout(alarmLoopTimeoutRef.current);
        alarmLoopTimeoutRef.current = null;
    }
    if (alarmChirpStopRef.current) {
        alarmChirpStopRef.current();
        alarmChirpStopRef.current = null;
    }
    setCurrentAlarmAudio(null);
  };

  const handleAlarmTrigger = async (context: AlarmContext) => {
    stopAlarmAudio();
    if (stopTtsRef.current) stopTtsRef.current();

    isAlarmActiveRef.current = true;
    setActiveAlarm(context);
    alarmChirpStopRef.current = playSystemAlarmSound();
    setAlarmAudioLoading(true);

    const currentHistory = getHistory();
    const item = currentHistory.find(i => String(i.id) === String(context.historyId));
    let base64Audio = '';
    
    if (item) {
        if (context.type === 'medication' && item.medications[context.index]?.customAlarmAudioBase64) {
            base64Audio = item.medications[context.index].customAlarmAudioBase64!;
        } else if (context.type === 'instruction' && item.instructions[context.index]?.customAlarmAudioBase64) {
            base64Audio = item.instructions[context.index].customAlarmAudioBase64!;
        }
    }

    if (!base64Audio) {
        try {
            const speechLang = item?.analysisLanguage || language;
            base64Audio = await generateMedicalTTS(context.textToSpeak, speechLang);
            if (item) {
                const updatedItem = { ...item };
                if (context.type === 'medication') {
                    const meds = [...updatedItem.medications];
                    meds[context.index] = { ...meds[context.index], customAlarmAudioBase64: base64Audio };
                    updatedItem.medications = meds;
                } else {
                    const inst = [...updatedItem.instructions];
                    inst[context.index] = { ...inst[context.index], customAlarmAudioBase64: base64Audio };
                    updatedItem.instructions = inst;
                }
                saveHistoryItem(updatedItem);
                setHistory(getHistory());
            }
        } catch (error) {
            console.error(error);
        }
    }

    setAlarmAudioLoading(false);
    if (!isAlarmActiveRef.current) return;

    if (base64Audio) {
        if (alarmChirpStopRef.current) {
            alarmChirpStopRef.current();
            alarmChirpStopRef.current = null;
        }
        setCurrentAlarmAudio(base64Audio);
        playAlarmLoop(base64Audio);
    }
  };

  const playAlarmLoop = async (base64Audio: string) => {
    if (alarmStopRef.current) alarmStopRef.current();
    if (alarmLoopTimeoutRef.current) clearTimeout(alarmLoopTimeoutRef.current);

    const playOnce = async () => {
        if (!isAlarmActiveRef.current) return; 
        const stopFn = await playRawAudio(base64Audio, () => {
             if (isAlarmActiveRef.current) {
                 alarmLoopTimeoutRef.current = setTimeout(() => {
                     playOnce();
                 }, 1500);
             }
        });
        alarmStopRef.current = stopFn;
    };
    playOnce();
  };

  const dismissAlarm = () => {
    stopAlarmAudio();
    setActiveAlarm(null);
  };

  const triggerBackgroundAudioGeneration = async (item: HistoryItem) => {
    const lang = item.analysisLanguage || 'en';
    const tLocal = TRANSLATIONS[lang] || TRANSLATIONS['en'];
    let needsUpdate = false;
    const newItem = JSON.parse(JSON.stringify(item));

    const medPromises = newItem.medications.map(async (med: Medication, idx: number) => {
        if (med.isActive && med.reminders && med.reminders.length > 0 && !med.customAlarmAudioBase64) {
             const text = `${tLocal.setAlarm}. ${med.nameNative || med.name}. ${med.dosage}. ${tLocal.medicinePurpose}: ${med.purpose}`;
             try {
                 const audio = await generateMedicalTTS(text, lang);
                 return { idx, audio, type: 'med' };
             } catch (e) { return null; }
        }
        return null;
    });

    const instPromises = newItem.instructions.map(async (inst: Instruction, idx: number) => {
        if (inst.reminders && inst.reminders.length > 0 && !inst.customAlarmAudioBase64) {
             const text = `${tLocal.setAlarm}. ${tLocal.instructions}: ${inst.description}`;
             try {
                 const audio = await generateMedicalTTS(text, lang);
                 return { idx, audio, type: 'inst' };
             } catch (e) { return null; }
        }
        return null;
    });

    const results = await Promise.all([...medPromises, ...instPromises]);
    results.forEach(res => {
        if (!res) return;
        if (res.type === 'med') {
            newItem.medications[res.idx].customAlarmAudioBase64 = res.audio;
            needsUpdate = true;
        } else {
            newItem.instructions[res.idx].customAlarmAudioBase64 = res.audio;
            needsUpdate = true;
        }
    });

    if (needsUpdate) {
        saveHistoryItem(newItem);
        setHistory(getHistory());
        setCurrentAnalysis(prev => (prev && String(prev.id) === String(newItem.id) ? newItem : prev));
    }
  };

  const handleLanguageSelect = async (lang: SupportedLanguage) => {
    initializeAudio();
    const savedLang = getSavedLanguage();
    const isLanguageChanged = savedLang !== lang;

    if (isLanguageChanged) {
        setIsLoading(true);
        setLoadingText("Updating records...");
        setView(AppView.LOADING);
        const currentHistory = getHistory();
        if (currentHistory.length > 0) {
            try {
                const translatedHistory = [];
                let count = 0;
                for (const item of currentHistory) {
                    count++;
                    setLoadingText(`Updating records (${count}/${currentHistory.length})...`);
                    try {
                        const translated = await translateHistoryItem(item, lang);
                        translatedHistory.push(translated);
                        triggerBackgroundAudioGeneration(translated);
                        if (count < currentHistory.length) await new Promise(r => setTimeout(r, 5000));
                    } catch (e) { translatedHistory.push(item); }
                }
                saveFullHistory(translatedHistory);
                setHistory(translatedHistory);
            } catch (error) { console.error(error); }
        }
        if (currentAnalysis) {
            try {
                const translatedCurrent = await translateHistoryItem(currentAnalysis, lang);
                setCurrentAnalysis(translatedCurrent);
            } catch (error: any) { console.error(error); }
        }
    }

    setLanguage(lang);
    saveLanguage(lang);
    setIsLoading(false);
    if (currentAnalysis) setView(AppView.SCAN_RESULT);
    else setView(AppView.HOME);
  };

  const processImages = async (files: FileList): Promise<string[]> => {
    const fileReaders: Promise<string>[] = Array.from(files).map(file => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (reader.result) resolve(reader.result as string);
          else reject("Failed to read file");
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
   });
   return Promise.all(fileReaders);
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    initializeAudio();
    const files = event.target.files;
    if (!files || files.length === 0) return;
    setIsLoading(true);
    setLoadingText(t.processing);
    setView(AppView.LOADING);
    setGeneratedVisualUrl(null);
    try {
      const rawImages = await processImages(files);
      const analysis = await analyzeMedicalDocument(rawImages, language);
      
      // Compress the primary image for storage to avoid quota errors
      const compressedMainImage = await compressImage(rawImages[0], 600, 0.6);

      const newItem: HistoryItem = {
        ...analysis,
        id: Date.now().toString(),
        date: Date.now(),
        imageBase64: compressedMainImage
      };
      setCurrentAnalysis(newItem);
      setFromHistory(false);
      setView(AppView.SCAN_RESULT);
    } catch (error: any) {
      alert(error?.message || "Error");
      setView(AppView.HOME);
    } finally { setIsLoading(false); }
  };

  const handleTTS = async () => {
    initializeAudio();
    if (isPlayingTTS) {
      if (stopTtsRef.current) {
        stopTtsRef.current();
        stopTtsRef.current = null;
      }
      setIsPlayingTTS(false);
      setPlayingSource(null);
      if (playingSource === 'summary') return;
    }
    if (!currentAnalysis) return;
    setIsTTSLoading(true);
    setPlayingSource('summary');
    try {
      const script = `${t.condition}: ${currentAnalysis.condition}. ${t.summary}: ${currentAnalysis.explanation}. ${t.anatomy}: ${currentAnalysis.anatomy}`;
      const base64Audio = await generateMedicalTTS(script, language);
      const stopFn = await playRawAudio(base64Audio, () => {
        setIsPlayingTTS(false);
        setPlayingSource(null);
        stopTtsRef.current = null;
      });
      stopTtsRef.current = stopFn;
      setIsPlayingTTS(true);
    } catch (e: any) {
      setPlayingSource(null);
      alert(e.message || "Error");
    } finally { setIsTTSLoading(false); }
  };

  const handleTranscriptionTTS = async () => {
    initializeAudio(); 
    if (isPlayingTTS) {
      if (stopTtsRef.current) {
        stopTtsRef.current();
        stopTtsRef.current = null;
      }
      setIsPlayingTTS(false);
      setPlayingSource(null);
      if (playingSource === 'transcript') return;
    }
    if (!currentAnalysis?.voiceNoteTranscription) return;
    setIsTTSLoading(true);
    setPlayingSource('transcript');
    try {
      const base64Audio = await generateMedicalTTS(currentAnalysis.voiceNoteTranscription, language);
      const stopFn = await playRawAudio(base64Audio, () => {
        setIsPlayingTTS(false);
        setPlayingSource(null);
        stopTtsRef.current = null;
      });
      stopTtsRef.current = stopFn;
      setIsPlayingTTS(true);
    } catch (e: any) {
      setPlayingSource(null);
      alert(e.message || "Error");
    } finally { setIsTTSLoading(false); }
  };

  const handleVisualGeneration = async () => {
    if (!currentAnalysis?.visualPrompt) return;
    setIsGeneratingVisual(true);
    try {
      const imageUrl = await generateAnatomyImage(currentAnalysis.visualPrompt);
      setGeneratedVisualUrl(imageUrl);
    } catch (e: any) { 
        alert(e.message || "Error"); 
    }
    finally { setIsGeneratingVisual(false); }
  };

  const persistChange = (updatedItem: HistoryItem) => {
    if (fromHistory) {
      saveHistoryItem(updatedItem);
      setHistory(getHistory());
      checkReminders();
      triggerBackgroundAudioGeneration(updatedItem);
    }
  };

  const saveCurrentAnalysis = () => {
    initializeAudio();
    if (currentAnalysis) {
      saveHistoryItem(currentAnalysis);
      setHistory(getHistory());
      setFromHistory(true);
      checkReminders();
      triggerBackgroundAudioGeneration(currentAnalysis);
      setView(AppView.HISTORY);
    }
  };

  const deleteCurrentAnalysis = () => {
    if (fromHistory && currentAnalysis) {
        setDeleteTargetId(currentAnalysis.id);
        setIsClearingAll(false);
        setDeleteModalOpen(true);
    } else {
        setCurrentAnalysis(null);
        setView(AppView.HOME);
    }
  };

  const deleteItem = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation(); 
    setDeleteTargetId(id);
    setIsClearingAll(false);
    setDeleteModalOpen(true);
  };

  const handleClearAll = () => {
    setIsClearingAll(true);
    setDeleteTargetId(null);
    setDeleteModalOpen(true);
  };

  const confirmDeleteAction = () => {
      if (isClearingAll) {
          clearHistory();
          setHistory([]);
          setCurrentAnalysis(null);
          checkReminders();
          setView(AppView.HOME);
      } else if (deleteTargetId) {
          const updatedList = deleteHistoryItem(deleteTargetId);
          setHistory(updatedList);
          checkReminders();
          if (currentAnalysis && String(currentAnalysis.id) === String(deleteTargetId)) {
               setCurrentAnalysis(null);
               setView(AppView.HISTORY);
          }
      }
      setDeleteModalOpen(false);
      setDeleteTargetId(null);
      setIsClearingAll(false);
  };

  const handleBack = () => {
    if (stopTtsRef.current) {
        stopTtsRef.current();
        stopTtsRef.current = null;
        setIsPlayingTTS(false);
        setPlayingSource(null);
    }
    if (view === AppView.SCAN_RESULT && fromHistory) setView(AppView.HISTORY);
    else setView(AppView.HOME);
  };

  const updateVoiceNote = async (base64Audio: string) => {
    if (currentAnalysis) {
      // Compress voice note audio slightly if possible? 
      // Current base64 text analysis extracts are small enough, but let's keep audio as is.
      let updated = { ...currentAnalysis, voiceNoteBase64: base64Audio };
      setCurrentAnalysis(updated);
      persistChange(updated);
      setIsTranscribing(true);
      try {
        const result = await transcribeAudio(base64Audio, language);
        let newInstructions = updated.instructions || [];
        if (result.instructions && result.instructions.length > 0) newInstructions = [...newInstructions, ...result.instructions];
        const updatedWithTranscript = { ...updated, voiceNoteTranscription: result.text, instructions: newInstructions };
        setCurrentAnalysis(updatedWithTranscript);
        persistChange(updatedWithTranscript);
      } catch (e) { console.error(e); }
      finally { setIsTranscribing(false); }
    }
  };

  const updateMedication = (index: number, updatedMed: Medication) => {
    if (currentAnalysis) {
      const updatedMeds = [...currentAnalysis.medications];
      updatedMeds[index] = updatedMed;
      const updatedAnalysis = { ...currentAnalysis, medications: updatedMeds };
      setCurrentAnalysis(updatedAnalysis);
      persistChange(updatedAnalysis);
    }
  };

  const updateInstruction = (index: number, updatedInstruction: Instruction) => {
     if (currentAnalysis) {
      const updatedInstructions = [...(currentAnalysis.instructions || [])];
      updatedInstructions[index] = updatedInstruction;
      const updatedAnalysis = { ...currentAnalysis, instructions: updatedInstructions };
      setCurrentAnalysis(updatedAnalysis);
      persistChange(updatedAnalysis);
    }
  };

  const loadHistory = () => {
    setHistory(getHistory());
    setView(AppView.HISTORY);
  };

  const openTimetable = () => {
    setHistory(getHistory());
    setView(AppView.TIMETABLE);
  };

  const formatDate = (item: HistoryItem) => {
    let dateObj = item.visitDate ? new Date(item.visitDate) : new Date(item.date);
    if (isNaN(dateObj.getTime())) dateObj = new Date(item.date);
    return dateObj.toLocaleDateString(language, { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const AlarmOverlay = () => {
    if (!activeAlarm) return null;
    return (
      <div className="fixed inset-0 z-50 bg-red-800 flex flex-col items-center justify-center p-6 text-white animate-pulse-slow text-center">
        <div className="text-8xl mb-6">🔔</div>
        <h2 className="text-3xl font-extrabold mb-4">{activeAlarm.title}</h2>
        <p className="text-xl mb-10 font-bold whitespace-pre-wrap">{activeAlarm.body}</p>
        {alarmAudioLoading && <div className="mb-4 text-white text-lg font-bold animate-bounce text-center">🔊 Generating Voice...</div>}
        <button onClick={dismissAlarm} className="bg-white text-red-800 px-10 py-6 rounded-3xl text-3xl font-bold shadow-lg active:scale-95 transition-transform">{t.stopAlarm}</button>
      </div>
    );
  };

  if (view === AppView.LOADING) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="text-6xl animate-bounce mb-6">💊</div>
        <h2 className="text-2xl font-bold text-orange-500 animate-pulse">{loadingText || t.pleaseWait}</h2>
      </div>
    );
  }

  if (view === AppView.LANGUAGE_SELECT) return <LanguageSelector onSelect={handleLanguageSelect} />;

  const filteredHistory = history.filter(item => 
    item.doctorName.toLowerCase().includes(searchQuery.toLowerCase()) || 
    item.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.condition.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-950 font-sans pb-10 text-slate-100">
      <AlarmOverlay />
      {deleteModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 rounded-2xl shadow-2xl p-6 max-sm w-full border border-slate-800 transform scale-100 transition-all text-center">
               <div className="text-5xl mb-4">🗑️</div>
               <h3 className="text-xl font-bold text-slate-100 mb-2">{isClearingAll ? t.clearAll : t.delete}</h3>
               <p className="text-slate-400 font-medium">{isClearingAll ? t.clearAllConfirm : t.deleteConfirm}</p>
             <div className="grid grid-cols-2 gap-3 mt-6">
               <button onClick={() => setDeleteModalOpen(false)} className="py-3.5 px-4 rounded-xl font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors">No</button>
               <button onClick={confirmDeleteAction} className="py-3.5 px-4 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 shadow-lg shadow-red-900/40 transition-colors">{isClearingAll ? t.clearAll : t.delete}</button>
             </div>
          </div>
        </div>
      )}

      <div className="bg-orange-600 text-white p-4 sticky top-0 z-40 shadow-md flex justify-between items-center h-[70px]">
        <div className="flex items-center gap-2">
           <img src={LOGO_URL} alt="Logo" className="w-8 h-8 rounded-full bg-white p-0.5" />
           <h1 className="text-xl font-bold tracking-tight">DawAI</h1>
        </div>
        <button onClick={() => setView(AppView.LANGUAGE_SELECT)} className="text-sm font-bold bg-orange-700 px-3 py-1 rounded-full border border-orange-500">{LANGUAGES.find(l => l.code === language)?.nativeLabel}</button>
      </div>

      {view === AppView.HOME && (
        <div className="flex flex-col h-[calc(100vh-70px)] p-4 bg-slate-950">
          <div className="flex-grow flex flex-col bg-slate-900 rounded-3xl shadow-sm border border-slate-800 overflow-hidden relative">
            <div className="flex-grow relative m-4 mb-2 bg-orange-950/20 rounded-2xl border-4 border-dashed border-orange-900/50 flex flex-col items-center justify-center group active:scale-[0.98] transition-transform">
               <input type="file" accept="image/*" capture="environment" multiple onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer z-20" />
               <span className="text-8xl mb-4 group-hover:scale-110 transition-transform filter drop-shadow-sm">📸</span>
               <span className="text-3xl font-extrabold text-orange-500 text-center px-4 leading-tight">{t.scanNew}</span>
               <span className="text-lg text-orange-600 mt-2 px-6 text-center font-medium">{t.readsHandwritten}</span>
            </div>
            <div className="p-4 pt-2 grid grid-cols-2 gap-4 h-auto flex-shrink-0">
               <BigButton label={t.dailyTimetable} icon="⏰" onClick={openTimetable} className="bg-green-950/20 text-green-400 border-green-900/50 h-full min-h-[100px]" />
               <BigButton label={t.history} icon="📂" onClick={loadHistory} className="bg-blue-950/20 text-blue-400 border-blue-900/50 h-full min-h-[100px]" />
            </div>
          </div>
        </div>
      )}

      {view === AppView.TIMETABLE && <DailyTimetable history={history} translations={t} onBack={() => setView(AppView.HOME)} />}

      {view === AppView.HISTORY && (
        <div className="p-4 max-w-xl mx-auto">
          <div className="flex justify-between items-center mb-4">
            <button onClick={() => setView(AppView.HOME)} className="flex items-center text-slate-400 font-bold hover:text-white transition-colors">← {t.back}</button>
            {history.length > 0 && <button onClick={handleClearAll} className="text-red-400 font-bold text-sm bg-red-950/30 px-3 py-1 rounded-full border border-red-900/50 hover:bg-red-900/50 transition-colors">{t.clearAll}</button>}
          </div>
          <h2 className="text-2xl font-bold mb-4 text-slate-100">{t.history}</h2>
          <div className="flex flex-col gap-4">
             <input type="text" placeholder={t.searchPlaceholder} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="p-4 rounded-xl border border-slate-800 bg-slate-900 shadow-sm text-lg text-slate-100 focus:ring-2 focus:ring-orange-500 outline-none" />
             {filteredHistory.length === 0 ? <div className="text-center py-10 text-slate-600">{t.noHistory}</div> : (
               filteredHistory.map(item => (
                 <div key={item.id} className="bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-800 flex flex-col gap-2 relative group animate-fade-in">
                    <div onClick={() => { setCurrentAnalysis(item); setFromHistory(true); setView(AppView.SCAN_RESULT); }} className="cursor-pointer pr-10">
                        <h3 className="font-bold text-lg text-slate-100">{item.doctorName}</h3>
                        <div className="text-sm text-slate-500">{formatDate(item)}</div>
                        <div className="mt-2 bg-orange-950/30 text-orange-400 p-2 rounded-lg text-sm font-medium border border-orange-900/30">{item.condition}</div>
                    </div>
                    <button onClick={(e) => deleteItem(e, item.id)} className="absolute top-2 right-2 z-40 p-3 bg-red-950/30 hover:bg-red-900/50 text-red-400 rounded-full border border-red-900/30 shadow-sm transition-all active:scale-95 flex items-center justify-center w-12 h-12"><span className="text-xl">🗑️</span></button>
                 </div>
               ))
             )}
          </div>
        </div>
      )}

      {view === AppView.SCAN_RESULT && currentAnalysis && (
        <div className="p-4 max-w-xl mx-auto flex flex-col gap-5 animate-fade-in">
           <button onClick={handleBack} className="flex items-center text-slate-400 font-bold w-fit hover:text-white transition-colors">← {t.back}</button>
          <div className="bg-green-950/20 p-4 rounded-xl border border-green-900/30 flex justify-between items-center shadow-sm">
             <div><span className="text-xs uppercase font-bold text-green-500 tracking-wider">{t.patient}</span><div className="text-xl font-bold text-green-100">{currentAnalysis.patientName}</div></div>
             <div className="text-3xl">👤</div>
          </div>
          <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-sm flex justify-between items-center">
             <div><span className="text-xs uppercase font-bold text-slate-500 tracking-wider">{t.doctor}</span><div className="text-lg font-bold text-slate-200">{currentAnalysis.doctorName}</div></div>
             {currentAnalysis.doctorPhone && <a href={`tel:${currentAnalysis.doctorPhone}`} className="bg-blue-950/30 text-blue-400 border border-blue-900/30 p-2 rounded-xl font-bold text-sm flex items-center gap-1 hover:bg-blue-900/50 transition-colors">📞 {t.phone}</a>}
          </div>
          <div className="bg-slate-900 p-5 rounded-xl border-l-4 border-l-amber-500 shadow-md border-y border-r border-slate-800">
            <h3 className="text-amber-500 font-bold uppercase text-sm mb-2 tracking-wide">{currentAnalysis.condition}</h3>
            <p className="text-xl text-slate-100 font-medium leading-relaxed">{currentAnalysis.explanation}</p>
            <div className="grid grid-cols-2 gap-3 mt-5">
               <BigButton label={isPlayingTTS && playingSource === 'summary' ? t.stopExplanation : t.playExplanation} icon={isPlayingTTS && playingSource === 'summary' ? "⏹️" : (isTTSLoading && playingSource === 'summary' ? "⏳" : "🔈")} onClick={handleTTS} primary disabled={isTTSLoading} subLabel={isTTSLoading && playingSource === 'summary' ? t.generatingAudio : undefined} className={isTTSLoading && playingSource === 'summary' ? "opacity-80 cursor-wait" : ""} />
               <BigButton label={t.generateVisual} icon="🦴" onClick={handleVisualGeneration} className={isGeneratingVisual ? "opacity-50" : "bg-purple-950/30 text-purple-400 border-purple-900/30"} subLabel={isGeneratingVisual ? t.pleaseWait : undefined} />
            </div>
          </div>
          {generatedVisualUrl && <div className="bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-800 animate-fade-in"><div className="text-center font-bold text-slate-500 mb-2">{t.visualReady}</div><img src={generatedVisualUrl} alt="Anatomy" className="w-full rounded-lg bg-slate-950" /></div>}
          <div><h3 className="text-xl font-bold text-slate-100 mb-3 flex items-center gap-2">💊 {t.medications}</h3><div className="flex flex-col gap-3">{currentAnalysis.medications.map((med, idx) => <MedicineDisplay key={idx} medication={med} onUpdate={(updated) => updateMedication(idx, updated)} translations={t} />)}</div></div>
          <div><h3 className="text-xl font-bold text-slate-100 mb-3 flex items-center gap-2">📋 {t.todoList}</h3><div className="flex flex-col gap-3">{currentAnalysis.instructions?.map((inst, idx) => <InstructionDisplay key={idx} instruction={inst} onUpdate={(updated) => updateInstruction(idx, updated)} translations={t} />)} {(!currentAnalysis.instructions || currentAnalysis.instructions.length === 0) && <div className="text-slate-500 italic bg-slate-900 p-4 rounded-xl text-center border border-slate-800">No tasks or notes yet.</div>}</div></div>
          <div className="bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-800"><h3 className="text-lg font-bold text-slate-100 mb-2">{t.recordVoice}</h3><VoiceRecorder onSave={updateVoiceNote} existingAudio={currentAnalysis.voiceNoteBase64} transcription={currentAnalysis.voiceNoteTranscription} onPlayTranscript={handleTranscriptionTTS} isPlayingTranscript={isPlayingTTS && playingSource === 'transcript'} isTranscriptLoading={isTTSLoading && playingSource === 'transcript'} labels={{ record: t.recordVoice, stop: t.stopRecording, play: t.playVoice, saved: t.recordingSaved, listening: t.listening, playTranscript: t.playExplanation }} /> {isTranscribing && <div className="mt-3 text-sm text-orange-500 animate-pulse font-bold text-center">{t.transcribing}</div>}</div>
          <div className={`mt-4 pt-4 border-t border-slate-800 ${fromHistory ? "grid grid-cols-2 gap-4" : ""}`}>
             {fromHistory && <button onClick={deleteCurrentAnalysis} className="p-4 rounded-xl font-bold text-red-400 bg-red-950/30 border border-red-900/30 hover:bg-red-900/50 transition-colors">{t.delete}</button>}
             <button onClick={saveCurrentAnalysis} className={`p-4 rounded-xl font-bold text-white bg-green-700 hover:bg-green-600 shadow-md shadow-green-950/40 transition-colors ${fromHistory ? "" : "w-full"}`}>{fromHistory ? t.savedSuccess : t.save}</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
