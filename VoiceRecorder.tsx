
import React, { useState, useRef, useEffect } from 'react';
import { BigButton } from './BigButton';

interface VoiceRecorderProps {
  onSave: (base64Audio: string) => void;
  existingAudio?: string;
  transcription?: string;
  onPlayTranscript?: () => void;
  isPlayingTranscript?: boolean;
  isTranscriptLoading?: boolean;
  labels: {
    record: string;
    stop: string;
    play: string;
    saved: string;
    listening: string;
    playTranscript: string;
  };
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ 
  onSave, 
  existingAudio, 
  labels,
  transcription,
  onPlayTranscript,
  isPlayingTranscript = false,
  isTranscriptLoading = false
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioData, setAudioData] = useState<string | null>(existingAudio || null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    setAudioData(existingAudio || null);
  }, [existingAudio]);

  const startRecording = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Microphone access is not supported in this browser.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64 = reader.result as string;
          setAudioData(base64);
          onSave(base64);
        };
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err: any) {
      console.error("Error accessing microphone:", err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        alert("Microphone permission was denied. Please allow microphone access in your browser settings to record voice notes.");
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        alert("No microphone was found on your device.");
      } else {
        alert("Could not access microphone: " + (err.message || "Unknown error"));
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const playRecording = () => {
    if (audioData) {
      const audio = new Audio(audioData);
      audio.play().catch(e => {
        console.error("Playback failed", e);
        alert("Playback failed. Please try again.");
      });
    }
  };

  return (
    <div className="w-full mt-4 p-4 bg-orange-950/10 rounded-2xl border border-orange-900/30">
      {!isRecording && !audioData && (
        <BigButton 
          label={labels.record} 
          icon="🎙️" 
          onClick={startRecording} 
          className="bg-orange-900/20 text-orange-400 border-orange-900/30 hover:bg-orange-900/40" 
        />
      )}

      {isRecording && (
        <div className="animate-pulse">
           <BigButton 
            label={labels.stop} 
            subLabel={labels.listening}
            icon="⏹️" 
            onClick={stopRecording} 
            primary 
            className="bg-red-700 hover:bg-red-600 text-white border-red-800" 
          />
        </div>
      )}

      {!isRecording && audioData && (
        <div className="flex flex-col gap-3">
          <div className="text-center text-orange-400 font-bold text-lg mb-2">
            ✓ {labels.saved}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <BigButton 
              label={labels.play} 
              icon="▶️" 
              onClick={playRecording} 
              className="bg-orange-900/30 text-orange-200 border border-orange-800/50"
            />
             <BigButton 
              label={labels.record} 
              subLabel="(Redo)"
              icon="🔄" 
              onClick={startRecording} 
              className="bg-slate-800 text-slate-300 border-slate-700"
            />
          </div>
        </div>
      )}

      {transcription && (
        <div className="mt-6 pt-4 border-t border-orange-900/30 animate-fade-in">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Transcript</span>
            <div className="h-px bg-orange-900/30 flex-1"></div>
          </div>
          
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-900 mb-4 text-slate-300 text-sm leading-relaxed shadow-sm">
            {transcription}
          </div>

          <BigButton 
            label={labels.playTranscript} 
            icon={isPlayingTranscript ? "⏹️" : (isTranscriptLoading ? "⏳" : "🔈")} 
            onClick={onPlayTranscript || (() => {})} 
            disabled={isTranscriptLoading}
            className="bg-slate-900 border-slate-800 text-orange-400 hover:bg-slate-800"
            subLabel={isTranscriptLoading ? "Loading..." : undefined}
          />
        </div>
      )}
    </div>
  );
};
