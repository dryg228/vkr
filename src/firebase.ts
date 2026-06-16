import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, set, update, get } from 'firebase/database';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyCc5HIuK6Xog9kR_0_Ava-GQ6ZrMjuBbeg",
  authDomain: "://firebaseapp.com",
  projectId: "vkru-7edaa",
  storageBucket: "vkru-7edaa.firebasestorage.app",
  messagingSenderId: "364170559699",
  appId: "1:364170559699:web:df0b14811a8a7057305426"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const auth = getAuth(app);

export class FirebaseService {
  static async getData<T = unknown>(path: string): Promise<T | null> {
    const dataRef = path ? ref(db, path) : ref(db);
    return new Promise<T | null>((resolve) => {
      onValue(dataRef, (snapshot) => {
        resolve(snapshot.val() as T | null);
      }, { onlyOnce: true });
    });
  }

  static async setData<T = unknown>(path: string, data: T): Promise<void> {
    const dataRef = path ? ref(db, path) : ref(db);
    await set(dataRef, data);
  }

  static async updateData(path: string, updates: Record<string, unknown>): Promise<void> {
    const dataRef = path ? ref(db, path) : ref(db);
    await update(dataRef, updates);
  }

  static async getSnapshot<T = unknown>(path: string): Promise<T | null> {
    const dataRef = path ? ref(db, path) : ref(db);
    const snapshot = await get(dataRef);
    return snapshot.val() as T | null;
  }

  // ПОЛНОСТЬЮ БЕСПЛАТНЫЙ МЕТОД: Конвертирует фото в текст и возвращает его для сохранения в Realtime Database
  static async uploadFile(path: string, file: File): Promise<string | null> {
    try {
      return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file); // Читаем файл как DataURL (Base64 текстовая строка)
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
      });
    } catch (error) {
      console.error('Ошибка конвертации файла в текст:', error);
      return null;
    }
  }
}

export default FirebaseService;
