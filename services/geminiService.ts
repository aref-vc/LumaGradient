import { GoogleGenAI, Type } from "@google/genai";
import { GeminiAnalysisResult } from "../types.ts";

// Helper to convert file to base64
export const fileToGenerativePart = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Remove data url prefix (e.g. "data:image/jpeg;base64,")
      const base64Data = base64String.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const analyzeImageColors = async (file: File): Promise<GeminiAnalysisResult> => {
  try {
    const genAI = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const base64Data = await fileToGenerativePart(file);

    const response = await genAI.models.generateContent({
      model: "gemini-3-pro-preview", // Updated to Pro for better vision capabilities
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Data,
              mimeType: file.type,
            },
          },
          {
            text: "Analyze this image. I need a palette of the 5 most dominant and aesthetic hex colors to form a gradient. Also provide a short 2-3 word 'mood' description and a creative name for this gradient.",
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            colors: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Array of 5 hex color codes found in the image",
            },
            mood: {
              type: Type.STRING,
              description: "A short mood description (e.g., 'Sunset Calm', 'Cyber Neon')",
            },
            suggestedName: {
              type: Type.STRING,
              description: "A creative name for the gradient",
            },
          },
          required: ["colors", "mood", "suggestedName"],
        },
      },
    });

    if (response.text) {
      let jsonStr = response.text;
      // Cleanup markdown code blocks if present
      jsonStr = jsonStr.replace(/^```json\s*/, "").replace(/\s*```$/, "");
      return JSON.parse(jsonStr) as GeminiAnalysisResult;
    }
    
    throw new Error("No response text from Gemini");

  } catch (error) {
    console.error("Error analyzing image:", error);
    // Fallback in case of failure
    return {
      colors: ["#FF5A19", "#FFDBCA", "#111111", "#7B7B7B", "#EEEEEE"],
      mood: "Fallback Error",
      suggestedName: "System Default"
    };
  }
};