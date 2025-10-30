import { Photo, Project } from '../types';

const DB_NAME = 'AGComplexPhotoDB';
const DB_VERSION = 1;
const PHOTO_STORE = 'photos';
const PROJECT_STORE = 'projects';

let db: IDBDatabase;

export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (db) {
      return resolve(db);
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const dbInstance = (event.target as IDBOpenDBRequest).result;
      if (!dbInstance.objectStoreNames.contains(PHOTO_STORE)) {
        dbInstance.createObjectStore(PHOTO_STORE, { keyPath: 'id' });
      }
      if (!dbInstance.objectStoreNames.contains(PROJECT_STORE)) {
        dbInstance.createObjectStore(PROJECT_STORE, { keyPath: 'id' });
      }
    };

    request.onsuccess = (event) => {
      db = (event.target as IDBOpenDBRequest).result;
      resolve(db);
    };

    request.onerror = (event) => {
      console.error('Database error:', (event.target as IDBOpenDBRequest).error);
      reject('Error opening database');
    };
  });
};

const transactionPromise = (tx: IDBTransaction): Promise<void> => {
    return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

// Photo CRUD
export const addPhoto = async (photo: Photo): Promise<void> => {
  const db = await initDB();
  const tx = db.transaction(PHOTO_STORE, 'readwrite');
  const store = tx.objectStore(PHOTO_STORE);
  // Destructure to remove the 'file' property, which shouldn't be persisted.
  const { file, ...photoToStore } = photo;
  store.add(photoToStore);
  return transactionPromise(tx);
};

export const getPhotos = async (): Promise<Photo[]> => {
    const db = await initDB();
    const tx = db.transaction(PHOTO_STORE, 'readonly');
    const store = tx.objectStore(PHOTO_STORE);
    const request = store.getAll();

    return new Promise((resolve, reject) => {
        request.onsuccess = () => {
            // Returns photos without the 'file' property.
            resolve(request.result);
        };
        request.onerror = () => reject(request.error);
    });
};

export const updatePhoto = async (photo: Photo): Promise<void> => {
    const db = await initDB();
    const tx = db.transaction(PHOTO_STORE, 'readwrite');
    const store = tx.objectStore(PHOTO_STORE);
    // Destructure to remove the 'file' property, which shouldn't be persisted.
    const { file, ...photoToStore } = photo;
    store.put(photoToStore);
    return transactionPromise(tx);
};

export const deletePhoto = async (photoId: string): Promise<void> => {
    const db = await initDB();
    const tx = db.transaction(PHOTO_STORE, 'readwrite');
    const store = tx.objectStore(PHOTO_STORE);
    store.delete(photoId);
    return transactionPromise(tx);
};


// Project CRUD
export const addProject = async (project: Project): Promise<void> => {
  const db = await initDB();
  const tx = db.transaction(PROJECT_STORE, 'readwrite');
  const store = tx.objectStore(PROJECT_STORE);
  store.add(project);
  return transactionPromise(tx);
};

export const getProjects = async (): Promise<Project[]> => {
    const db = await initDB();
    const tx = db.transaction(PROJECT_STORE, 'readonly');
    const store = tx.objectStore(PROJECT_STORE);
    const request = store.getAll();

    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

export const updateProject = async (project: Project): Promise<void> => {
    const db = await initDB();
    const tx = db.transaction(PROJECT_STORE, 'readwrite');
    const store = tx.objectStore(PROJECT_STORE);
    store.put(project);
    return transactionPromise(tx);
};