
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";

export async function processLessonAudio(base64Audio: string) {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `
    You are an expert polyglot educational tutor.
    1. Detect the language(s) spoken in the audio (likely Arabic, English, or French).
    2. Provide a transcript in the original language(s) spoken.
    3. Provide a structured summary. If the lecture is in Arabic or French, provide the summary in that same language.
    4. Generate a 5-question multiple-choice quiz in the primary language of the lecture.
    5. Generate 6-8 flashcards (Question/Answer) in the primary language of the lecture.
    
    CRITICAL: Return the response strictly as a clean JSON object.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'audio/webm',
              data: base64Audio,
            },
          },
          { text: prompt },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            transcript: { type: Type.STRING },
            summary: { type: Type.STRING },
            quizzes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  question: { type: Type.STRING },
                  options: { type: Type.ARRAY, items: { type: Type.STRING } },
                  correctAnswer: { type: Type.INTEGER }
                },
                required: ["question", "options", "correctAnswer"]
              }
            },
            flashcards: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  front: { type: Type.STRING },
                  back: { type: Type.STRING }
                },
                required: ["front", "back"]
              }
            }
          },
          required: ["transcript", "summary", "quizzes", "flashcards"],
        },
      },
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Gemini Processing Error:", error);
    throw error;
  }
}

export async function chatWithBuddyStream(
  message: string, 
  history: { role: 'user' | 'buddy', text: string }[], 
  context: { summary: string, transcript: string },
  onChunk: (text: string) => void
) {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const systemInstruction = `
    Your name is Study Buddy. You are a helpful, encouraging, and highly intelligent AI tutor.
    You have access to a specific lesson's summary and transcript. 
    Use this information to answer the student's questions accurately.
    Be concise but thorough. 
    If the lesson is in Arabic or French, respond primarily in that language.
    
    CONTEXT:
    SUMMARY: ${context.summary}
    TRANSCRIPT: ${context.transcript}
  `;

  const contents = history.map(msg => ({
    role: msg.role === 'buddy' ? 'model' : 'user',
    parts: [{ text: msg.text }]
  }));

  contents.push({
    role: 'user',
    parts: [{ text: message }]
  });

  try {
    const result = await ai.models.generateContentStream({
      model: 'gemini-3-flash-preview',
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
      },
    });

    let fullText = "";
    for await (const chunk of result) {
      const text = chunk.text || "";
      fullText += text;
      onChunk(fullText);
    }
    return fullText;
  } catch (error) {
    console.error("Study Buddy Streaming Error:", error);
    throw error;
  }
}
