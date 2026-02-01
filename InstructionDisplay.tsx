
import React, { useState } from 'react';
import { Instruction, TranslationDictionary } from '../types';
import { requestNotificationPermission } from '../services/notificationService';

interface InstructionDisplayProps {
  instruction: Instruction;
  onUpdate: (updatedInstruction: Instruction) => void;
  translations: TranslationDictionary['en'];
}

export const InstructionDisplay: React.FC<InstructionDisplayProps> = ({ instruction, onUpdate, translations }) => {
  const [isAddingTime, setIsAddingTime] = useState(false);
  const [newTime, setNewTime] = useState('');

  const addReminder = () => {
    if (newTime) {
      const currentReminders = instruction.reminders || [];
      const updated = { ...instruction, reminders: [...currentReminders, newTime].sort() };
      onUpdate(updated);
      setNewTime('');
      setIsAddingTime(false);
    }
  };

  const handleAddTimeClick = async () => {
    await requestNotificationPermission();
    setIsAddingTime(true);
  };

  const removeReminder = (timeToRemove: string) => {
    const currentReminders = instruction.reminders || [];
    const updated = { ...instruction, reminders: currentReminders.filter(t => t !== timeToRemove) };
    onUpdate(updated);
  };

  return (
    <div className="flex flex-col bg-slate-900 p-5 rounded-xl border border-slate-800 shadow-sm relative animate-fade-in">
      <div className="mb-3 pr-2">
         <span className="text-lg font-medium text-slate-100 leading-snug block">{instruction.description}</span>
      </div>
      
      {/* Reminders Section */}
      <div className="mt-2 bg-slate-950 p-3 rounded-lg border border-slate-900">
        <div className="flex justify-between items-center mb-2">
           <span className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1 tracking-wider">
             ⏰ {translations.setAlarm}
           </span>
           {!isAddingTime && (
             <button 
                onClick={handleAddTimeClick} 
                className="bg-orange-950/30 text-orange-400 px-3 py-1 rounded-full text-xs font-bold hover:bg-orange-900/50 border border-orange-900/30 transition-colors"
             >
               + ADD
             </button>
           )}
        </div>

        {isAddingTime && (
          <div className="flex gap-2 mb-3 animate-fade-in">
            <input 
              type="time" 
              value={newTime}
              onChange={(e) => setNewTime(e.target.value)}
              className="flex-1 p-2 rounded-lg border border-orange-900/30 bg-slate-900 text-orange-400 text-lg focus:ring-2 focus:ring-orange-500 outline-none"
            />
            <button onClick={addReminder} className="bg-orange-600 text-white px-4 rounded-lg font-bold shadow-sm">✓</button>
            <button onClick={() => setIsAddingTime(false)} className="bg-slate-800 text-slate-300 px-3 rounded-lg font-bold">✕</button>
          </div>
        )}

        {instruction.reminders && instruction.reminders.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {instruction.reminders.map((time) => (
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
          <div className="text-slate-700 text-xs italic py-1">No reminders</div>
        )}
      </div>
    </div>
  );
};
