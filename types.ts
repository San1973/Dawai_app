
export enum AppView {
  LANGUAGE_SELECT = 'LANGUAGE_SELECT',
  HOME = 'HOME',
  SCAN_RESULT = 'SCAN_RESULT',
  HISTORY = 'HISTORY',
  LOADING = 'LOADING',
  TIMETABLE = 'TIMETABLE',
}

export type SupportedLanguage = 
  | 'en' | 'hi' | 'bn' | 'te' | 'ta' | 'mr' 
  | 'gu' | 'kn' | 'ml' | 'pa' | 'or' | 'as' 
  | 'ur' | 'sa' | 'ne' | 'ks' | 'sd' | 'kok' 
  | 'mai' | 'doi'
  // New Additions
  | 'ar' | 'sw' | 'am' | 'ha' | 'yo' | 'zu' | 'so';

export interface Medication {
  name: string;
  nameNative: string; // Transliterated name in local script
  dosage: string;
  timing: string;
  purpose: string;
  reminders?: string[]; // Array of time strings "HH:MM"
  isActive?: boolean; // Whether this is added to the daily schedule
  customAlarmAudioBase64?: string; // Cached TTS audio for the alarm
}

export interface Instruction {
  description: string;
  reminders?: string[];
  customAlarmAudioBase64?: string; // Cached TTS audio for the alarm
}

export interface MedicalDocumentAnalysis {
  // Common Metadata
  doctorName: string;
  patientName: string;
  doctorPhone: string;
  visitDate?: string;
  detectedLanguage?: string;
  analysisLanguage?: SupportedLanguage;
  
  // Document Type Identification
  type: 'Prescription' | 'Report' | 'Medical Note' | 'Other';

  // Report/Condition Section (The "Why")
  condition: string; // Diagnosis
  explanation: string; // Villager-style analogy explanation
  anatomy: string; // Simple anatomy description
  visualPrompt: string; // For generating images
  // nextSteps removed in favor of strict instructions

  // Prescription Section (The "What")
  medications: Medication[];
  instructions: Instruction[];
}

export interface HistoryItem extends MedicalDocumentAnalysis {
  id: string;
  date: number; // Scan timestamp
  voiceNoteBase64?: string; // Short voice note
  voiceNoteTranscription?: string; // Transcribed text from the voice note
  imageBase64?: string; // Thumbnail or full image
}

export interface TranslationDictionary {
  [key: string]: {
    welcome: string;
    scanNew: string;
    history: string;
    settings: string;
    processing: string;
    save: string;
    delete: string;
    recordVoice: string;
    stopRecording: string;
    playVoice: string;
    playExplanation: string;
    stopExplanation: string;
    generateVisual: string;
    visualReady: string;
    doctor: string;
    patient: string;
    phone: string;
    medications: string;
    summary: string;
    condition: string;
    anatomy: string;
    nextSteps: string;
    searchPlaceholder: string;
    noHistory: string;
    back: string;
    languageName: string;
    takePhoto: string;
    uploadPhoto: string;
    deleteConfirm: string;
    listening: string;
    recordingSaved: string;
    medicinePurpose: string;
    setAlarm: string;
    alarmSet: string;
    instructions: string;
    generalInstructions: string;
    open: string;
    stopAlarm: string;
    readsHandwritten: string;
    pleaseWait: string;
    simpleExplanation: string;
    transcribing: string;
    transcript: string;
    viewImage: string;
    healthAdvice: string;
    generatingAudio: string;
    savedSuccess: string;
    todoList: string;
    dailyTimetable: string;
    noEvents: string;
    addToSchedule: string;
    removeFromSchedule: string;
    autoScheduled: string;
    clearAll: string;
    clearAllConfirm: string;
  };
}
