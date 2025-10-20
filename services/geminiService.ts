import { GoogleGenAI } from "@google/genai";

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = (error) => reject(error);
  });
};

export const generatePhotoDescription = async (file: File): Promise<string> => {
  // Fix: Per coding guidelines, assume API_KEY is always available.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const base64Data = await fileToBase64(file);
    const imagePart = {
      inlineData: {
        mimeType: file.type,
        data: base64Data,
      },
    };

    const textPart = {
      text: "Describe this image in a creative and engaging way. Focus on the mood, atmosphere, and any interesting details. Be descriptive but concise.",
    };

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: [imagePart, textPart] },
    });

    return response.text;
  } catch (error) {
    console.error("Error generating photo description:", error);
    return "Could not generate a description for this image.";
  }
};

export const generateProjectDescription = async (files: File[]): Promise<string> => {
  // Fix: Per coding guidelines, assume API_KEY is always available.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const imageParts = await Promise.all(
      files.map(async (file) => {
        const base64Data = await fileToBase64(file);
        return {
          inlineData: {
            mimeType: file.type,
            data: base64Data,
          },
        };
      })
    );

    const textPart = {
      text: `Analyze these images and generate a single, cohesive description for the entire collection. What is the common theme, story, or mood? Be creative and evocative.`,
    };

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: [...imageParts, textPart] },
    });

    return response.text;
  } catch (error) {
    console.error("Error generating project description:", error);
    return "Could not generate a description for this project.";
  }
};
