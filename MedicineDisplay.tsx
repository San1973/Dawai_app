
import React, { useState } from 'react';
import { Medication, TranslationDictionary } from '../types';
import { requestNotificationPermission } from '../services/notificationService';

interface MedicineDisplayProps {
  medication: Medication;
  onUpdate: (updatedMedication: Medication) => void;
  translations: TranslationDictionary['en']; // Use the inner type
}

export const MedicineDisplay: React.FC<MedicineDisplayProps> = ({ medication, onUpdate, translations }) => {
  const [isAddingTime, setIsAddingTime] = useState(false);
  const [newTime, setNewTime] = useState('');

  const addReminder = () => {
    if (newTime) {
      const currentReminders = medication.reminders || [];
      if (!currentReminders.includes(newTime)) {
        const updated = { 
            ...medication, 
            reminders: [...currentReminders, newTime].sort(),
            isActive: true 
        };
        onUpdate(updated);
      }
      setNewTime('');
      setIsAddingTime(false);
    }
  };

  const handleAddTimeClick = async () => {
    await requestNotificationPermission();
    setIsAddingTime(true);
  };

  const removeReminder = (timeToRemove: string) => {
    const currentReminders = medication.reminders || [];
    const updatedReminders = currentReminders.filter(t => t !== timeToRemove);
    const updated = { 
        ...medication, 
        reminders: updatedReminders,
    };
    onUpdate(updated);
  };

  const getTimesFromTimingString = (timingStr: string): string[] => {
    const t = timingStr.toLowerCase();
    const times = new Set<string>();

    if (t.includes('morning') || t.includes('breakfast') || t.includes('am') || t.includes('nashta')) {
        times.add("08:00");
    }
    
    if (t.includes('afternoon') || t.includes('lunch') || t.includes('noon') || t.includes('pm')) {
        times.add("13:00");
    }

    if (t.includes('evening') || t.includes('night') || t.includes('dinner') || t.includes('bed') || t.includes('sleep')) {
        times.add("20:00");
    }

    if (t.includes('twice') || t.includes('2 times') || t.includes('bd') || t.includes('bid')) {
        times.add("08:00");
        times.add("20:00");
    }
    if (t.includes('thrice') || t.includes('3 times') || t.includes('tds') || t.includes('tid')) {
        times.add("08:00");
        times.add("14:00");
        times.add("20:00");
    }
    if (t.includes('four') || t.includes('4 times') || t.includes('qid')) {
        times.add("08:00");
        times.add("12:00");
        times.add("16:00");
        times.add("20:00");
    }
    if (t.includes('once') || t.includes('od') || t.includes('1 time')) {
        if (times.size === 0) times.add("09:00"); 
    }

    if (times.size === 0) {
        times.add("09:00");
    }

    return Array.from(times).sort();
  };

  const toggleActive = async () => {
    const newActiveState = !medication.isActive;
    
    if (newActiveState) {
        await requestNotificationPermission();
        let newReminders = medication.reminders || [];
        if (newReminders.length === 0) {
            newReminders = getTimesFromTimingString(medication.timing);
        }

        onUpdate({
            ...medication,
            isActive: true,
            reminders: newReminders
        });
    } else {
        onUpdate({
            ...medication,
            isActive: false,
            reminders: [] 
        });
    }
  };

  return (
    <div className={`flex flex-col bg-slate-900 p-5 rounded-xl border shadow-sm transition-colors ${medication.isActive ? 'border-green-600 bg-green-950/20' : 'border-slate-800'}`}>
      <div className="flex justify-between items-start mb-3 border-b border-slate-800 pb-2">
        <div className="flex flex-col">
           <span className="text-xl font-bold text-slate-100 leading-tight">{medication.name}</span>
           {medication.nameNative && medication.nameNative !== medication.name && (
              <span className="text-lg text-orange-400 font-medium mt-1">{medication.nameNative}</span>
           )}
        </div>
        <a 
          href={`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(medication.name + " medicine")}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-center justify-center bg-slate-950 border-2 border-slate-800 rounded-xl w-16 h-16 shadow-sm hover:border-blue-500 hover:text-blue-400 transition-all ml-2 flex-shrink-0 active:scale-95"
          aria-label={translations.viewImage}
        >
           <span className="text-2xl" role="img" aria-label="image">🖼️</span>
           <span className="text-[9px] font-bold uppercase text-center leading-tight mt-1 text-slate-500">{translations.viewImage}</span>
        </a>
      </div>
      
      <div className="mb-4 text-slate-300 bg-slate-950 p-3 rounded-lg border border-slate-800">
        <span className="font-bold text-xs text-orange-500 uppercase block mb-1 tracking-wider">{translations.medicinePurpose}</span>
        {medication.purpose}
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <span className="bg-orange-950/30 text-orange-400 px-3 py-1.5 rounded-lg text-sm font-bold border border-orange-900/30 shadow-sm">{medication.dosage}</span>
        <span className="bg-amber-950/30 text-amber-400 px-3 py-1.5 rounded-lg text-sm font-bold border border-amber-900/30 shadow-sm">{medication.timing}</span>
      </div>

      <button 
        onClick={toggleActive}
        className={`w-full py-3 px-4 rounded-xl font-bold text-lg mb-3 flex items-center justify-center gap-2 shadow-sm transition-all ${
            medication.isActive 
            ? 'bg-green-700 text-white hover:bg-green-600' 
            : 'bg-slate-950 text-slate-400 border-2 border-slate-800 hover:border-green-600 hover:text-green-500'
        }`}
      >
        <span>{medication.isActive ? '✓' : '+'}</span>
        {medication.isActive ? translations.autoScheduled : translations.addToSchedule}
      </button>

      {medication.isActive && (
        <div className="bg-slate-950 p-3 rounded-lg border border-green-900/50 animate-fade-in">
            <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-bold text-slate-500 uppercase flex items-center gap-1">
                ⏰ {translations.setAlarm}
            </span>
            {!isAddingTime && (
                <button 
                    onClick={handleAddTimeClick} 
                    className="bg-orange-950/30 text-orange-400 px-3 py-1 rounded-full text-sm font-bold hover:bg-orange-900/50 border border-orange-900/30 transition-colors"
                >
                + {translations.setAlarm}
                </button>
            )}
            </div>

            {isAddingTime && (
            <div className="flex gap-2 mb-3 animate-fade-in">
                <input 
                type="time" 
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                className="flex-1 p-2 rounded-lg border border-orange-900/50 bg-slate-900 text-orange-400 text-lg focus:ring-2 focus:ring-orange-500 outline-none"
                />
                <button onClick={addReminder} className="bg-orange-600 text-white px-4 rounded-lg font-bold shadow-sm">✓</button>
                <button onClick={() => setIsAddingTime(false)} className="bg-slate-800 text-slate-300 px-3 rounded-lg font-bold">✕</button>
            </div>
            )}

            {medication.reminders && medication.reminders.length > 0 ? (
            <div className="flex flex-wrap gap-2">
                {medication.reminders.map((time) => (
                <div key={time} className="flex items-center bg-yellow-950/30 text-yellow-400 px-3 py-1 rounded-lg border border-yellow-900/30 shadow-sm">
                    <span className="font-bold text-lg mr-2">{time}</span>
                    <button 
                    onClick={() => removeReminder(time)}
                    className="w-5 h-5 flex items-center justify-center bg-yellow-900/50 text-yellow-100 rounded-full text-xs hover:bg-yellow-800 transition-colors"
                    >
                    ✕
                    </button>
                </div>
                ))}
            </div>
            ) : (
            <div className="text-slate-600 text-sm italic text-center py-1">No reminders set</div>
            )}
        </div>
      )}
    </div>
  );
};
