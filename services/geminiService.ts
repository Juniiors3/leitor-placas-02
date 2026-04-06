import { GoogleGenAI, Type } from "@google/genai";
import { DetectionResult } from "../types";

// Helper to get API Key compatible with AI Studio (process.env) and Vite (import.meta.env)
const getApiKey = (): string => {
  // Check for process.env (AI Studio / Node / Webpack)
  if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
    return process.env.API_KEY;
  }
  // Check for import.meta.env (Vite standard)
  // Using 'any' casting to avoid TS errors in environments where import.meta is not defined in tsconfig
  try {
    const meta = (import.meta as any);
    if (meta && meta.env && meta.env.VITE_API_KEY) {
      return meta.env.VITE_API_KEY;
    }
  } catch (e) {
    // Ignore error if import.meta is not available
  }
  
  console.error("API KEY not found. Please set process.env.API_KEY or VITE_API_KEY");
  return "";
};

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: getApiKey() });

const SYSTEM_INSTRUCTION = `
You are an advanced Automatic Number Plate Recognition (ANPR) system specialized in Brazilian License Plates.
Your task is to analyze the provided image and extract the vehicle license plate text.

Supported Formats:
1. National (Grey): 3 Letters, 4 Numbers (e.g., ABC-1234, ABC1234)
2. Mercosur: 3 Letters, 1 Number, 1 Letter, 2 Numbers (e.g., ABC1D23)

Rules:
- Ignore bumper stickers, phone numbers, or street signs.
- Focus only on the vehicle license plate.
- If multiple plates are visible, pick the most prominent/central one.
- Return null if no valid Brazilian/Mercosur plate is clearly legible.
- Confidence should be a number between 0 and 1.
`;

export const analyzeFrame = async (base64Image: string): Promise<DetectionResult> => {
  try {
    // Remove data URL prefix if present for clean base64
    const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg);base64,/, "");

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash", // Excellent for vision, fast
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: cleanBase64
            }
          },
          {
            text: "Extract the license plate from this image."
          }
        ]
      },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            plate: {
              type: Type.STRING,
              description: "The license plate characters (uppercase, no hyphens).",
              nullable: true
            },
            confidence: {
              type: Type.NUMBER,
              description: "Confidence score between 0 and 1."
            },
            isBrazilianOrMercosur: {
              type: Type.BOOLEAN,
              description: "True if the format matches Brazilian standards."
            }
          }
        }
      }
    });

    if (response.text) {
      const result = JSON.parse(response.text) as DetectionResult;
      
      // Post-processing to ensure format
      if (result.plate) {
        result.plate = result.plate.toUpperCase().replace(/[^A-Z0-9]/g, '');
      }

      return result;
    }
    
    throw new Error("Empty response from AI");

  } catch (error) {
    console.error("Gemini Analysis Failed:", error);
    return {
      plate: null,
      confidence: 0,
      isBrazilianOrMercosur: false
    };
  }
};