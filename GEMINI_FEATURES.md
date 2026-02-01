
# Gemini AI Features in DawAI

DawAI utilizes the multimodal power of the **Google GenAI SDK** across five distinct intelligence categories:

## 1. Multimodal Prescription OCR
*   **Model:** `gemini-3-flash-preview`
*   **Role:** Core Document Analysis.
*   **Mechanism:** Processes high-resolution images of handwritten or typed medical notes.
*   **Value:** It doesn't just "read" text; it deciphers messy handwriting and interprets medical intent, converting it into a structured JSON schema.

## 2. Audio Intent Extraction
*   **Model:** `gemini-3-flash-preview`
*   **Role:** Voice Note Intelligence.
*   **Mechanism:** Processes user-recorded audio notes.
*   **Value:** Performs reasoning to find specific instructions and normalizes spoken time phrases (e.g., "after dinner") into machine-readable `HH:MM` format for the alarm system.

## 3. Contextual Translation & Transliteration
*   **Model:** `gemini-3-flash-preview`
*   **Role:** Multilingual Support.
*   **Mechanism:** JSON-to-JSON translation.
*   **Value:** When a user changes language, it re-translates the entire medical history. Unlike standard translators, it **transliterates** proper nouns (names) into the target script so they are phonetic, while **translating** clinical advice into local dialects.

## 4. High-Fidelity Medical TTS
*   **Model:** `gemini-2.5-flash-preview-tts`
*   **Role:** Patient Accessibility.
*   **Mechanism:** Text-to-Audio modality (`Modality.AUDIO`).
*   **Value:** Generates natural-sounding speech for summaries. Uses the `Kore` voice profile to read medical advice in the user's native tongue.

## 5. Anatomy Visualization
*   **Model:** `gemini-2.5-flash-image`
*   **Role:** Visual Grounding.
*   **Mechanism:** Text-to-Image generation.
*   **Value:** Uses localized prompts (derived from the diagnosis) to generate educational diagrams that show affected body parts with labels in the target script.

## 6. Real-Time Alarm Voice Generation
*   **Model:** `gemini-2.5-flash-preview-tts`
*   **Role:** Medication Adherence.
*   **Mechanism:** Dynamic Just-in-Time TTS.
*   **Value:** When a reminder triggers, the app generates a custom voice message (e.g., "Time to take your sugar medicine, Dolo 650") to ensure the user knows exactly why the alarm is ringing.
