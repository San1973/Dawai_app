
# DawAI - Apka Neeji Svastha Sahayak 💊

**DawAI** (Medicine AI) is an accessible, AI-powered medical assistant designed specifically for **elderly users**. It bridges the gap between complex medical prescriptions and patient understanding by using Generative AI to read, simplify, and translate medical notes into **25+ languages**.

![Tech](https://img.shields.io/badge/Built%20With-React%20%7C%20Gemini%20%7C%20TypeScript-orange)
![PWA](https://img.shields.io/badge/PWA-Ready-green)

## 🌟 Key Features

*   **📸 Handwritten & Typed Support:** Advanced OCR to read messy handwritten doctor notes and prescriptions.
*   **🗣️ Multilingual & Transliteration:** Full UI and medical translation for **20 Indian languages** plus African and Arabic languages.
*   **⏰ Smart Daily Schedule:** A visual timeline that shows exactly when to take medicines.
    *   **Now Indicator:** Pulsing line showing the current time.
    *   **Relative Countdown:** Shows "In 2 hours" or "In 15 minutes" for better planning.
    *   **Urgency Alerts:** High-priority highlighting for medicines due within the hour.
*   **🧠 "Villager-Style" Explanations:** Converts complex jargon into simple analogies for users with low literacy.
*   **🎙️ Smart Voice Notes:** Records doctor's instructions, transcribes them, and **extracts reminders** automatically.
*   **🔊 Text-to-Speech (TTS):** Reads summaries aloud in the user's selected language using natural voices.
*   **🖼️ Localized Visual Anatomy:** Generates diagrams of affected body parts with localized text labels.
*   **🔍 Visual Medicine Search:** One-click Google Image search for every medication.
*   **🗑️ Easy Management:** Full history view with search and a **"Clear All"** one-tap delete feature.
*   **🔒 Privacy First:** All data is stored locally on the user's device (`localStorage`).

## 🤖 AI Model Strategy

| Feature | Model Used |
| :--- | :--- |
| **Vision Analysis (OCR)** | **`gemini-3-flash-preview`** |
| **Audio Intelligence** | **`gemini-3-flash-preview`** |
| **Translation Engine** | **`gemini-3-flash-preview`** |
| **Text-to-Speech (TTS)** | **`gemini-2.5-flash-preview-tts`** |
| **Anatomy Generation** | **`gemini-2.5-flash-image`** |

## 🚀 Getting Started

1.  **Clone the repository.**
2.  **Install dependencies:** `npm install`.
3.  **Configure Environment:** Add `API_KEY=your_key` to `.env`.
4.  **Run:** `npm run dev`.

## 🛠️ Tech Stack

*   **Frontend:** React 18, TypeScript, Vite.
*   **Styling:** Tailwind CSS.
*   **AI SDK:** Google GenAI SDK (`@google/genai`).
*   **Storage:** LocalStorage.
*   **Audio:** Web Audio API (PCM Decoding & Oscillators).
