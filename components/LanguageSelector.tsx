
import React, { useState } from 'react';
import { LANGUAGES, LOGO_URL } from '../constants';
import { SupportedLanguage } from '../types';
import { initializeAudio } from '../services/geminiService';

interface Props {
  onSelect: (lang: SupportedLanguage) => void;
}

export const LanguageSelector: React.FC<Props> = ({ onSelect }) => {
  const [logoError, setLogoError] = useState(false);

  const handleLogoError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setLogoError(true);
  };

  const handleLanguageSelect = (code: SupportedLanguage) => {
    initializeAudio();
    onSelect(code);
  };

  return (
    <div className="min-h-screen bg-slate-950 p-4 flex flex-col items-center justify-center relative overflow-hidden">
      {/* Decorative gradient blur */}
      <div className="absolute top-0 -left-20 w-80 h-80 bg-orange-600/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-0 -right-20 w-80 h-80 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-4xl relative z-10 flex flex-col items-center">
        <div className="text-center mb-10">
          <div className="inline-block rounded-full shadow-2xl mb-4 relative animate-fade-in overflow-hidden bg-slate-900 border-4 border-slate-800 p-1">
             {!logoError ? (
               <img 
                 src={LOGO_URL} 
                 alt="Logo" 
                 className="w-48 h-48 sm:w-60 sm:h-60 object-cover block rounded-full" 
                 onError={handleLogoError}
               />
             ) : (
               <div className="flex flex-col items-center justify-center w-48 h-48 sm:w-60 sm:h-60 bg-slate-900 rounded-full">
                 <span className="text-8xl" role="img" aria-label="pill">💊</span>
               </div>
             )}
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-12 w-full px-2 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleLanguageSelect(lang.code)}
              className="flex items-center justify-center p-8 bg-slate-900 rounded-2xl shadow-lg border-2 border-slate-800 hover:border-orange-500 hover:bg-slate-800 active:scale-95 transition-all w-full group"
            >
              <span className="text-3xl font-bold text-slate-100 group-hover:text-orange-400">{lang.nativeLabel}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
