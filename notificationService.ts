
import { getHistory, getSavedLanguage } from './storageService';
import { HistoryItem, SupportedLanguage } from '../types';
import { TRANSLATIONS } from '../constants';

let lastCheckedMinute = '';
const firedAlarms = new Set<string>();

export interface AlarmContext {
  historyId: string;
  type: 'medication' | 'instruction';
  index: number;
  title: string;
  body: string;
  textToSpeak: string; // The specific text we want the AI to read
}

// Callback to trigger in-app modal
type AlarmCallback = (context: AlarmContext) => void;
let alarmCallback: AlarmCallback | null = null;

export const setAlarmCallback = (cb: AlarmCallback) => {
  alarmCallback = cb;
};

export const requestNotificationPermission = async () => {
  if (!("Notification" in window)) {
    console.warn("Notifications not supported");
    return;
  }
  
  if (Notification.permission !== "granted") {
    try {
      await Notification.requestPermission();
    } catch (e) {
      console.warn("Permission request failed", e);
    }
  }
};

export const triggerAlarm = (context: AlarmContext) => {
  // 1. Trigger In-App Callback (Primary for foreground dynamic audio)
  if (alarmCallback) {
    alarmCallback(context);
  }

  // 2. Try System Notification (Backup for background)
  if ("Notification" in window && Notification.permission === "granted") {
    try {
      const notification = new Notification(context.title, {
        body: context.body,
        icon: 'https://cdn-icons-png.flaticon.com/512/2966/2966327.png', // Medical icon
        requireInteraction: true, 
        tag: context.historyId + Date.now(), // Unique tag
        silent: false
      });
      
      // Basic click handling
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    } catch (e) {
      console.warn("Notification API failed", e);
    }
  }
};

export const checkReminders = () => {
  const now = new Date();
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const currentMinute = `${hours}:${minutes}`;

  // If we have moved to a new minute, reset the fired alarms tracking
  if (currentMinute !== lastCheckedMinute) {
    firedAlarms.clear();
    lastCheckedMinute = currentMinute;
  }

  const history = getHistory();
  const currentLang = (getSavedLanguage() as SupportedLanguage) || 'en';
  const t = TRANSLATIONS[currentLang] || TRANSLATIONS['en'];

  history.forEach((item: HistoryItem) => {
    // Check Medications
    item.medications.forEach((med, idx) => {
      if (med.reminders && med.reminders.includes(currentMinute)) {
        // Create a unique key for this specific alarm event
        const alarmKey = `${item.id}-med-${idx}-${currentMinute}`;
        
        if (!firedAlarms.has(alarmKey)) {
          // Construct the text for the AI to speak
          // Example: "Time to take Dolo 650. It is for Fever."
          const speakText = `${t.setAlarm}. ${med.nameNative || med.name}. ${med.dosage}. ${t.medicinePurpose}: ${med.purpose}`;

          triggerAlarm({
            historyId: item.id,
            type: 'medication',
            index: idx,
            title: `⏰ ${med.name}`,
            body: `${t.medicinePurpose}: ${med.purpose}\n${med.dosage}`,
            textToSpeak: speakText
          });
          firedAlarms.add(alarmKey);
        }
      }
    });

    // Check Instructions
    item.instructions.forEach((inst, idx) => {
      if (inst.reminders && inst.reminders.includes(currentMinute)) {
        const alarmKey = `${item.id}-inst-${idx}-${currentMinute}`;
        
        if (!firedAlarms.has(alarmKey)) {
          const speakText = `${t.setAlarm}. ${t.instructions}: ${inst.description}`;

          triggerAlarm({
            historyId: item.id,
            type: 'instruction',
            index: idx,
            title: `⏰ ${t.instructions}`,
            body: inst.description,
            textToSpeak: speakText
          });
          firedAlarms.add(alarmKey);
        }
      }
    });
  });
};

export const startReminderService = () => {
  // Request permission immediately on app load
  requestNotificationPermission();

  // Check every 10 seconds to save battery but still be accurate enough
  setInterval(checkReminders, 10000);
  
  // Also run immediately
  checkReminders();
};
