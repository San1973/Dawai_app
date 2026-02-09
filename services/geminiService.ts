
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { MedicalDocumentAnalysis, SupportedLanguage, HistoryItem, Instruction } from '../types';

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const SYSTEM_INSTRUCTION = `
You are a compassionate village doctor assistant and an expert in Optical Character Recognition (OCR).
Your users are elderly and may have low literacy.

Your specific skills:
1. DECIPHERING HANDWRITING: You are excellent at reading messy, cursive, or faint doctor's handwriting.
2. SIMPLIFICATION FOR ACCESSIBILITY: You explain complex medical conditions and medication purposes using simple analogies and common-man terms (e.g., "Pipes" for veins, "Pump" for heart, "To cool down fever" instead of "Antipyretic").
3. CLINICAL PRECISION: While explanations are simplified, the actual DOCTOR'S ADVICE, MEDICATIONS, DOSAGES, and CLINICAL INSTRUCTIONS must be extracted VERBATIM. Do not deviate, generalize, or infer any clinical instructions that are not explicitly written in the prescription.

CRITICAL LANGUAGE RULE: 
Every single piece of text returned in the JSON (except for the original 'name' of the medicine) MUST be written in the script and vocabulary of the user's selected language. If the user selects Hindi, do not provide advice in English text. Everything must be translated fully and accurately into the target language while maintaining the exact meaning of the original clinical notes.
`;

/**
 * Compresses a base64 image to prevent LocalStorage quota issues.
 */
export const compressImage = async (base64Str: string, maxWidth = 800, quality = 0.7): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject("Canvas context error");
      
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = reject;
  });
};

const getParts = (base64Str: string) => {
  const match = base64Str.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
  if (match) return { mimeType: match[1], data: match[2] };
  const cleaned = base64Str.replace(/^data:image\/[a-zA-Z]+;base64,/, "");
  return { mimeType: 'image/jpeg', data: cleaned };
};

// --- Error Handling & Retry Logic ---

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function withRetry<T>(operation: () => Promise<T>, retries = 3, initialDelay = 2000): Promise<T> {
  try {
    return await operation();
  } catch (error: any) {
    const status = error?.status;
    const msg = (error?.message || "").toLowerCase();
    
    const shouldRetry = 
      status === 429 || 
      status === 500 ||
      status === 'RESOURCE_EXHAUSTED' ||
      status === 'INTERNAL' ||
      msg.includes('429') || 
      msg.includes('quota') || 
      msg.includes('500') ||
      msg.includes('internal error');

    if (shouldRetry && retries > 0) {
      const jitter = Math.random() * 1000;
      const totalDelay = initialDelay + jitter;
      
      console.warn(`Gemini Error (${status}). Retrying in ${Math.round(totalDelay)}ms... (${retries} attempts left)`);
      await wait(totalDelay);
      return withRetry(operation, retries - 1, initialDelay * 2);
    }

    handleGeminiError(error);
    throw error;
  }
}

const handleGeminiError = (error: any) => {
  console.error("Gemini API Error details:", error);
  const status = error?.status;
  const msg = (error?.message || "").toLowerCase();
  
  if (status === 429 || status === 'RESOURCE_EXHAUSTED' || msg.includes('429') || msg.includes('quota')) {
    throw new Error("System is very busy. Please wait a moment and try again.");
  }

  if (status === 500 || msg.includes('500') || msg.includes('internal error')) {
    throw new Error("The AI service is currently having trouble. Please try again in a minute.");
  }
  
  if (msg.includes('safety') || msg.includes('harmful')) {
      throw new Error("The content was blocked for safety reasons. Please try a clearer image.");
  }

  throw error;
};

// --- Audio Helper Functions ---

let sharedAudioContext: AudioContext | null = null;
let autoResumeSetup = false;

const getSharedAudioContext = () => {
    if (!sharedAudioContext) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        sharedAudioContext = new AudioContextClass({sampleRate: 24000});
    }
    return sharedAudioContext;
}

export const initializeAudio = async () => {
    const ctx = getSharedAudioContext();
    if (ctx.state === 'suspended') {
        try {
            await ctx.resume();
            const buffer = ctx.createBuffer(1, 1, 24000);
            const source = ctx.createBufferSource();
            source.buffer = buffer;
            source.connect(ctx.destination);
            source.start(0);
        } catch (e) {
            console.warn("Audio init failed", e);
        }
    }
}

export const setupAudioAutoResume = () => {
    if (autoResumeSetup) return;
    autoResumeSetup = true;

    const resumeWrapper = () => {
        initializeAudio();
    };

    window.addEventListener('click', resumeWrapper, { passive: true });
    window.addEventListener('touchstart', resumeWrapper, { passive: true });
    window.addEventListener('keydown', resumeWrapper, { passive: true });
};

function decode(base64: string) {
  const clean = base64.replace(/^data:audio\/[a-z]+;base64,/, "").trim();
  const binaryString = atob(clean);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export const playRawAudio = async (base64String: string, onEnded: () => void): Promise<() => void> => {
  const audioContext = getSharedAudioContext();
  
  const byteArrays = decode(base64String);
  const dataInt16 = new Int16Array(byteArrays.buffer);
  const frameCount = dataInt16.length;
  
  const audioBuffer = audioContext.createBuffer(1, frameCount, 24000);
  const channelData = audioBuffer.getChannelData(0);
  for (let i = 0; i < frameCount; i++) {
    channelData[i] = dataInt16[i] / 32768.0;
  }

  const source = audioContext.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(audioContext.destination);
  source.onended = onEnded;
  
  if (audioContext.state === 'suspended') {
      try {
          await audioContext.resume();
      } catch (e) {
          console.warn("Autoplay blocked.", e);
      }
  }

  source.start();

  return () => {
    try {
        source.stop();
        source.disconnect();
    } catch(e) {}
  };
};

export const playSystemAlarmSound = (): (() => void) => {
    const ctx = getSharedAudioContext();
    if (ctx.state === 'suspended') ctx.resume().catch(e => console.warn(e));

    let stop = false;
    let nextNoteTime = ctx.currentTime;
    let timerId: any = null;

    const scheduleBeeps = () => {
        if (stop) return;
        
        while (nextNoteTime < ctx.currentTime + 1.5) {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            
            osc.connect(gain);
            gain.connect(ctx.destination);
            
            const start = nextNoteTime;
            const end = start + 0.3; 
            
            osc.frequency.setValueAtTime(880, start);
            osc.frequency.exponentialRampToValueAtTime(440, start + 0.2);
            
            gain.gain.setValueAtTime(0, start);
            gain.gain.linearRampToValueAtTime(0.5, start + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.01, end);
            
            osc.start(start);
            osc.stop(end);
            
            nextNoteTime += 1.0;
        }
        
        timerId = setTimeout(scheduleBeeps, 500);
    };

    scheduleBeeps();

    return () => {
        stop = true;
        if (timerId) clearTimeout(timerId);
    };
};

// --- Main Service Functions ---

export const analyzeMedicalDocument = async (
  imageInput: string | string[],
  targetLanguage: SupportedLanguage
): Promise<MedicalDocumentAnalysis> => {
  
  const images = Array.isArray(imageInput) ? imageInput : [imageInput];
  const imageParts = images.map(img => {
    const { mimeType, data } = getParts(img);
    return { inlineData: { mimeType, data } };
  });

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      doctorName: { type: Type.STRING, description: `Name of doctor, transliterated into '${targetLanguage}' script.` },
      patientName: { type: Type.STRING, description: `Name of patient, transliterated into '${targetLanguage}' script.` },
      doctorPhone: { type: Type.STRING },
      visitDate: { type: Type.STRING, description: "Date of visit. Format: 'YYYY-MM-DD'." },
      type: { type: Type.STRING, enum: ["Prescription", "Report", "Medical Note", "Other"] },
      condition: { type: Type.STRING, description: `The diagnosis. MUST be in '${targetLanguage}'.` },
      explanation: { type: Type.STRING, description: `Simple explanation analogy in '${targetLanguage}' for literacy-challenged users.` },
      anatomy: { type: Type.STRING, description: `Affected body part description in '${targetLanguage}'.` },
      visualPrompt: { type: Type.STRING, description: `English prompt for professional medical body silhouette illustration showing the problem. The diagram must show the FULL HUMAN BODY from a front or side perspective with the affected area clearly highlighted.` },
      medications: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING, description: "Exact medicine brand name verbatim from the prescription." },
            nameNative: { type: Type.STRING, description: `Medicine name transliterated into '${targetLanguage}' script.` },
            dosage: { type: Type.STRING, description: `Dosage instructions EXACTLY as written by the doctor, FULLY TRANSLATED to '${targetLanguage}'. No English words should remain.` },
            timing: { type: Type.STRING, description: `Timing instructions EXACTLY as written by the doctor, FULLY TRANSLATED to '${targetLanguage}'. No English words should remain.` },
            purpose: { type: Type.STRING, description: `Medicine purpose in very simple '${targetLanguage}' (e.g., 'to cool fever').` }
          },
          required: ["name", "nameNative", "dosage", "timing", "purpose"]
        },
      },
      instructions: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            description: { type: Type.STRING, description: `Clinical advice or lifestyle instruction from the doctor. Extract this EXACTLY as written (VERBATIM), FULLY TRANSLATED to '${targetLanguage}'. Do not deviate or simplify this specific field.` }
          },
          required: ["description"]
        }
      },
      detectedLanguage: { type: Type.STRING }
    },
    required: ["doctorName", "type", "condition", "explanation", "anatomy", "visualPrompt", "medications", "instructions", "visitDate"]
  };

  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{
        parts: [
          ...imageParts,
          {
            text: `Analyze this medical image. DECIPHER HANDWRITING. 
            MANDATORY: Translate every single field of the advice, dosage, and instructions into '${targetLanguage}'. 
            No English should appear in the 'dosage', 'timing', 'explanation', or 'instructions' fields if they were written in English originally.
            CRITICAL: Extract all clinical advice, medicine names, dosages, and doctor's instructions EXACTLY as written on the prescription without any deviation. Only simplify the 'explanation' and 'purpose' fields.`
          }
        ]
      }],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: responseSchema
      }
    });

    if (!response.text) throw new Error("No response from AI");
    
    const result = JSON.parse(response.text) as MedicalDocumentAnalysis;
    result.analysisLanguage = targetLanguage;
    return result;
  });
};

export const generateMedicalTTS = async (text: string, language: SupportedLanguage): Promise<string> => {
  if (!text || text.trim().length === 0) throw new Error("TTS text is empty");
  const sanitizedText = text.substring(0, 500).replace(/[*_#]/g, '');

  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-preview-tts',
      contents: [{ parts: [{ text: `Speak clearly in the selected language: ${sanitizedText}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
        }
      }
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw new Error("No audio generated");
    return base64Audio;
  });
};

export const generateAnatomyImage = async (prompt: string): Promise<string> => {
  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        imageConfig: { 
          aspectRatio: "1:1"
        }
      }
    });
    
    const part = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
    if (part?.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    throw new Error("No image generated");
  });
};

export const transcribeAudio = async (base64Audio: string, language: SupportedLanguage): Promise<{ text: string, instructions: Instruction[] }> => {
    return withRetry(async () => {
        const cleanBase64 = base64Audio.split(',')[1] || base64Audio;
        
        const responseSchema = {
            type: Type.OBJECT,
            properties: {
                transcription: { type: Type.STRING },
                extractedInstructions: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            description: { type: Type.STRING },
                            reminders: { type: Type.ARRAY, items: { type: Type.STRING } }
                        },
                        required: ["description"]
                    }
                }
            },
            required: ["transcription", "extractedInstructions"]
        };

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: [{
                parts: [
                    { inlineData: { mimeType: 'audio/webm', data: cleanBase64 } },
                    { text: `Transcribe and translate strictly to '${language}'. Extract tasks.` }
                ]
            }],
            config: {
                responseMimeType: "application/json",
                responseSchema: responseSchema
            }
        });

        const json = JSON.parse(response.text || "{}");
        return {
            text: json.transcription || "No transcription.",
            instructions: json.extractedInstructions || []
        };
    });
};

export const translateHistoryItem = async (
  item: HistoryItem,
  targetLanguage: SupportedLanguage
): Promise<HistoryItem> => {
  if (item.analysisLanguage === targetLanguage) return item;
  
  return withRetry(async () => {
    const schema = {
      type: Type.OBJECT,
      properties: {
        condition: { type: Type.STRING },
        explanation: { type: Type.STRING },
        anatomy: { type: Type.STRING },
        visualPrompt: { type: Type.STRING },
        medications: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
               name: { type: Type.STRING },
               nameNative: { type: Type.STRING },
               dosage: { type: Type.STRING },
               timing: { type: Type.STRING },
               purpose: { type: Type.STRING }
            }
          }
        },
        instructions: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: { description: { type: Type.STRING } }
          }
        },
        doctorName: { type: Type.STRING },
        patientName: { type: Type.STRING },
        voiceNoteTranscription: { type: Type.STRING }
      }
    };

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{
        parts: [
            { text: `Completely translate all patient advice, doctor notes, and medical instructions in this JSON to '${targetLanguage}'. Transliterate names to the script of '${targetLanguage}'. Ensure NO text from the previous language remains in the advice fields. CRITICAL: Clinical instructions must be translated word-for-word without deviation in meaning. JSON: ${JSON.stringify(item)}` }
        ]
      }],
      config: { responseMimeType: "application/json", responseSchema: schema }
    });
    
    const translated = JSON.parse(response.text || "{}");
    
    const mergedMeds = (translated.medications || []).map((m: any, i: number) => ({
        ...m,
        reminders: item.medications?.[i]?.reminders || []
    }));
    const mergedInst = (translated.instructions || []).map((i: any, idx: number) => ({
        ...i,
        reminders: item.instructions?.[idx]?.reminders || []
    }));

    return {
      ...item,
      ...translated,
      medications: mergedMeds,
      instructions: mergedInst,
      analysisLanguage: targetLanguage,
      voiceNoteBase64: item.voiceNoteBase64 
    };
  });
};
