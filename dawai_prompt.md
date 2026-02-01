# Prompt to Generate "DawAI" (Latest Version)

You are a world-class Frontend Engineer and AI Specialist. I want you to build "DawAI", a React-based Progressive Web App (PWA) designed for **elderly users**.

## 1. Design & UX
*   **Theme:** "Saffron & Warmth" (`orange-600`).
*   **Minimalist Onboarding:** Landing page must ONLY show the brand logo and a grid of large language buttons. No sub-text or extra clutter.
*   **Linear Flow:** Language Select -> Home -> Camera Scan -> Results -> History.
*   **Accessibility:** Use massive buttons (BigButton component) with icons and text. High contrast text throughout.

## 2. Multimodal AI Features
Use the Google GenAI SDK (`@google/genai`) with these specific capabilities:
*   **OCR & Translation (`gemini-3-flash-preview`):** Read handwritten/typed prescriptions. Output a strict JSON schema. Transliterate all names (Doctor/Patient) to the local script. Provide a "village analogy" summary.
*   **Audio Reasoning (`gemini-3-flash-preview`):** Accept recorded WebM audio. Transcribe and extract actionable tasks with 24-hour HH:MM reminders.
*   **TTS (`gemini-2.5-flash-preview-tts`):** Generate high-quality speech for the simplified medical summaries.
*   **Image Gen (`gemini-2.5-flash-image`):** Create schematic anatomy diagrams based on the diagnosis.

## 3. Daily Schedule & Timetable
*   Create a `DailyTimetable` view that aggregates all medication and instruction reminders.
*   **Now Indicator:** Implement a pulsing horizontal line indicating the current system time.
*   **Countdown Logic:** Display relative time labels for all upcoming events (e.g., "In 1h 20m").
*   **Urgency Visuals:** Events within 60 minutes must have pulsing orange borders and high-contrast badges.
*   **Timeline Logic:** Gray out and dim all events that have already passed based on the current time.

## 4. History & Management
*   **Search:** Filter history by doctor name, patient name, or condition.
*   **Clear All:** Add a "Clear All" button to the history view with a confirmation modal to wipe all local storage data.
*   **Persistence:** Use `localStorage` exclusively.

## 5. Notifications & Alarms
*   **Background:** Use the browser `Notification` API.
*   **Foreground:** When a reminder triggers, overlay a high-contrast red screen and play an oscillator-based "chirp" sound while the AI voice generates in the background.

## 6. Execution
Produce the full code for this app, ensuring the Gemini client is initialized using `process.env.API_KEY` and all audio decoding follows PCM 16-bit standards for the TTS model.