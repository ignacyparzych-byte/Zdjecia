import { GoogleGenAI } from "@google/genai";

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = (error) => reject(error);
  });
};

export const urlToTreatedFile = async (url: string, filename: string): Promise<File> => {
    const response = await fetch(url);
    const blob = await response.blob();
    return new File([blob], filename, { type: blob.type });
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
      text: "Opisz to zdjęcie w kreatywny i angażujący sposób. Skup się na nastroju, atmosferze i wszelkich interesujących detalach. Bądź opisowy, ale zwięzły.",
    };

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: [imagePart, textPart] },
    });

    return response.text;
  } catch (error) {
    console.error("Error generating photo description:", error);
    return "Nie udało się wygenerować opisu dla tego zdjęcia.";
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
      text: `Przeanalizuj te zdjęcia i wygeneruj jeden, spójny opis dla całej kolekcji. Jaki jest wspólny motyw, historia lub nastrój? Bądź kreatywny i sugestywny.`,
    };

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: [...imageParts, textPart] },
    });

    return response.text;
  } catch (error) {
    console.error("Error generating project description:", error);
    return "Nie udało się wygenerować opisu dla tego projektu.";
  }
};