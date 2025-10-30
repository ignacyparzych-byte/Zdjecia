import { initializeApp } from 'firebase/app';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject, FirebaseStorage } from 'firebase/storage';
import { firebaseConfig } from '../firebaseConfig';
import { v4 as uuidv4 } from 'uuid';

let storage: FirebaseStorage | null = null;

// Sprawdź, czy konfiguracja Firebase została uzupełniona
const isConfigured = firebaseConfig && firebaseConfig.apiKey && firebaseConfig.apiKey !== "YOUR_API_KEY";

if (isConfigured) {
  try {
    const app = initializeApp(firebaseConfig);
    storage = getStorage(app);
    console.log("Firebase initialized successfully.");
  } catch (error) {
    console.error("Firebase initialization error:", error);
    alert("Wystąpił błąd podczas inicjalizacji Firebase. Sprawdź, czy dane w pliku firebaseConfig.ts są poprawne.");
  }
} else {
    console.warn("Firebase nie jest skonfigurowany. Proszę uzupełnić dane w pliku firebaseConfig.ts. Funkcje związane z chmurą będą wyłączone.");
}

/**
 * Przesyła plik zdjęcia do Firebase Storage.
 * @param file Plik do przesłania.
 * @returns Obiekt zawierający ścieżkę w Storage oraz publiczny URL do pobrania.
 */
export const uploadPhoto = async (file: File): Promise<{ storagePath: string; downloadURL: string }> => {
  if (!storage) {
    throw new Error("Firebase nie jest skonfigurowany lub wystąpił błąd inicjalizacji.");
  }
  
  const fileExtension = file.name.split('.').pop() || 'jpg';
  const fileName = `${uuidv4()}.${fileExtension}`;
  const storagePath = `photos/${fileName}`;
  const storageRef = ref(storage, storagePath);

  const snapshot = await uploadBytes(storageRef, file);
  const downloadURL = await getDownloadURL(snapshot.ref);
  return { storagePath, downloadURL };
};

/**
 * Usuwa zdjęcie z Firebase Storage na podstawie jego ścieżki.
 * @param storagePath Ścieżka do pliku w Firebase Storage.
 */
export const deletePhotoFromStorage = async (storagePath: string): Promise<void> => {
  if (!storage) {
    console.warn("Firebase nie jest skonfigurowany, pomijanie usuwania ze Storage.");
    return;
  }
  if (!storagePath) {
    console.warn("Próba usunięcia zdjęcia bez ścieżki w Storage.");
    return;
  }
  const storageRef = ref(storage, storagePath);
  try {
    await deleteObject(storageRef);
  } catch (error: any) {
    // Firebase rzuca 'storage/object-not-found', jeśli plik już nie istnieje. To dla nas nie jest błąd krytyczny.
    if (error.code !== 'storage/object-not-found') {
        console.error("Błąd podczas usuwania pliku z Firebase Storage:", error);
        throw error; // Rzucamy dalej tylko nieoczekiwane błędy
    }
  }
};