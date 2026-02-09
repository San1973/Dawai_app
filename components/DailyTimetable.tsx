
import React, { useMemo, useState, useEffect } from 'react';
import { HistoryItem, TranslationDictionary } from '../types';

interface DailyTimetableProps {
  history: HistoryItem[];
  translations: TranslationDictionary['en'];
  onBack: () => void;
}

interface TimelineEvent {
  time: string;
  title: string;
  subtitle: string;
  dosage?: string;
  type: 'medication' | 'instruction';
  sourceName: string;
  sourceLabel: string;
}

export const DailyTimetable: React.FC<DailyTimetableProps> = ({ history, translations, onBack }) => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  const currentTimeStr = useMemo(() => {
    const hh = now.getHours().toString().padStart(2, '0');
    const mm = now.getMinutes().toString().padStart(2, '0');
    return `${hh}:${mm}`;
  }, [now]);

  const events = useMemo(() => {
    const allEvents: TimelineEvent[] = [];

    history.forEach(item => {
      const hasPatient = item.patientName && item.patientName.trim().length > 0 && item.patientName.toLowerCase() !== 'unknown';
      const sourceName = hasPatient ? item.patientName : item.doctorName;
      const sourceLabel = hasPatient ? translations.patient : translations.doctor;

      item.medications.forEach(med => {
        if (med.reminders && med.reminders.length > 0) {
          med.reminders.forEach(time => {
            allEvents.push({
              time,
              title: med.nameNative && med.nameNative !== med.name ? med.nameNative : med.name,
              subtitle: med.purpose,
              dosage: med.dosage,
              type: 'medication',
              sourceName: sourceName,
              sourceLabel: sourceLabel
            });
          });
        }
      });

      if (item.instructions) {
        item.instructions.forEach(inst => {
          if (inst.reminders && inst.reminders.length > 0) {
            inst.reminders.forEach(time => {
              allEvents.push({
                time,
                title: translations.todoList,
                subtitle: inst.description,
                type: 'instruction',
                sourceName: sourceName,
                sourceLabel: sourceLabel
              });
            });
          }
        });
      }
    });

    return allEvents.sort((a, b) => a.time.localeCompare(b.time));
  }, [history, translations]);

  const getRelativeTimeString = (eventTime: string) => {
    const [evH, evM] = eventTime.split(':').map(Number);
    const eventDate = new Date(now);
    eventDate.setHours(evH, evM, 0, 0);

    const diffMs = eventDate.getTime() - now.getTime();
    if (diffMs < 0) return null; 

    const diffMinsTotal = Math.floor(diffMs / 60000);
    const h = Math.floor(diffMinsTotal / 60);
    const m = diffMinsTotal % 60;

    if (h === 0) return `${m}m`;
    return `${h}h ${m}m`;
  };

  const nowIndicatorIndex = useMemo(() => {
    if (events.length === 0) return -1;
    const index = events.findIndex(e => e.time > currentTimeStr);
    return index === -1 ? events.length : index;
  }, [events, currentTimeStr]);

  const NowIndicator = () => (
    <div className="relative pl-6 py-4 -ml-4 flex items-center z-20">
      <div className="absolute left-0 right-0 h-1 bg-gradient-to-r from-orange-500 via-orange-400 to-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.8)] z-10"></div>
      <div className="z-20 bg-orange-600 text-white text-xs font-black px-3 py-1.5 rounded-full shadow-lg ml-4 uppercase tracking-wider flex items-center gap-2 border-2 border-slate-900 animate-pulse">
        <span className="w-2 h-2 bg-white rounded-full"></span>
        NOW {currentTimeStr}
      </div>
    </div>
  );

  return (
    <div className="p-4 max-w-xl mx-auto min-h-screen bg-slate-950 animate-fade-in">
      <button onClick={onBack} className="mb-6 flex items-center text-slate-300 font-bold bg-slate-900 px-4 py-2 rounded-xl shadow-sm border border-slate-800 active:scale-95 transition-all hover:bg-slate-800">
        ← {translations.back}
      </button>
      
      <div className="flex flex-col gap-1 mb-8">
        <h2 className="text-3xl font-black text-slate-100">
          {translations.dailyTimetable}
        </h2>
        <p className="text-slate-500 font-medium">Your schedule for today</p>
      </div>

      {events.length === 0 ? (
        <div className="text-center py-20 bg-slate-900 rounded-3xl border border-slate-800 shadow-sm px-8">
          <div className="text-6xl mb-6">🏜️</div>
          <p className="text-slate-400 font-bold text-xl leading-relaxed">
            {translations.noEvents}
          </p>
        </div>
      ) : (
        <div className="relative border-l-4 border-slate-800 ml-4 space-y-6 pb-20">
          {nowIndicatorIndex === 0 && <NowIndicator />}

          {events.map((event, index) => {
            const isPast = event.time < currentTimeStr;
            const relativeTime = getRelativeTimeString(event.time);
            const isSoon = relativeTime && (relativeTime.includes('0h') || !relativeTime.includes('h'));

            return (
              <React.Fragment key={`${event.time}-${index}`}>
                <div className="relative pl-8 group">
                  <div className={`absolute -left-[14px] top-4 w-6 h-6 rounded-full border-4 border-slate-950 shadow-md z-10 transition-all duration-500 ${
                    isPast ? 'bg-slate-700 scale-75' : (isSoon ? 'bg-orange-500 animate-pulse scale-110 shadow-[0_0_10px_rgba(249,115,22,0.5)]' : 'bg-orange-400')
                  }`}></div>
                  
                  <div className={`bg-slate-900 rounded-3xl shadow-sm border-2 transition-all duration-300 overflow-hidden ${
                    isPast ? 'border-slate-800/50 opacity-40 grayscale' : (isSoon ? 'border-orange-500/50 shadow-orange-950 ring-4 ring-orange-500/10' : 'border-slate-800')
                  }`}>
                    <div className="p-5">
                      <div className="flex justify-between items-center mb-4">
                        <div className="flex flex-col">
                           <span className={`text-3xl font-black font-mono tracking-tighter ${isPast ? 'text-slate-600' : 'text-slate-100'}`}>
                            {event.time}
                          </span>
                          {!isPast && relativeTime && (
                             <span className={`text-sm font-bold mt-0.5 ${isSoon ? 'text-orange-400' : 'text-slate-500'}`}>
                               IN {relativeTime}
                             </span>
                          )}
                        </div>
                        
                        <div className={`px-3 py-1.5 rounded-xl font-black text-[10px] uppercase tracking-widest ${
                          isPast 
                            ? 'bg-slate-800 text-slate-500' 
                            : (event.type === 'medication' ? 'bg-blue-700 text-white' : 'bg-green-700 text-white')
                        }`}>
                          {event.type === 'medication' ? translations.medications : 'Task'}
                        </div>
                      </div>
                      
                      <h3 className={`text-2xl font-black mb-3 leading-tight ${
                        isPast ? 'text-slate-600' : 'text-slate-200'
                      }`}>
                        {event.title}
                      </h3>
                      
                      {event.dosage && (
                        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl font-black text-lg mb-4 border-2 ${
                          isPast 
                            ? 'bg-slate-950/50 border-slate-900 text-slate-600' 
                            : 'bg-orange-950/30 text-orange-400 border-orange-900/30'
                        }`}>
                          <span className="text-xl">💊</span> {event.dosage}
                        </div>
                      )}
                      
                      <p className={`font-bold text-base leading-snug mb-4 ${isPast ? 'text-slate-700' : 'text-slate-400'}`}>
                        {event.subtitle}
                      </p>
                      
                      <div className={`pt-4 border-t flex items-center gap-3 ${isPast ? 'border-slate-800/50' : 'border-slate-800'}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${isPast ? 'bg-slate-800 text-slate-600' : 'bg-slate-800 text-slate-400'}`}>
                          👤
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black text-slate-600 uppercase tracking-tighter">{event.sourceLabel}</span>
                          <span className={`text-sm font-black ${isPast ? 'text-slate-600' : 'text-slate-300'}`}>{event.sourceName}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {nowIndicatorIndex === index + 1 && <NowIndicator />}
              </React.Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
};
