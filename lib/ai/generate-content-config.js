import systemPrompt from "./system-prompt.js";
const generateContentConfig = {
  temperature: 0.8,
  topP: 0.95,
  maxOutputTokens: 36000,
  responseModalities: ["TEXT"],
  safetySettings: [
    { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "OFF" },
    { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "OFF" },
    { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "OFF" },
    { category: "HARM_CATEGORY_HARASSMENT", threshold: "OFF" },
  ],
  responseMimeType: "application/json",
  thinkingConfig: {
    thinkingBudget: 2000,
  },
  systemInstruction: systemPrompt,
};
export default generateContentConfig;
