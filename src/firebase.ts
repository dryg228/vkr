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

// Полностью автономный сервис работы с корнем Firebase Realtime Database
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

  // ИСПРАВЛЕНО: Полностью удален неиспользуемый аргумент 'path' для успешной сборки build
    // ОПТИМИЗИРОВАНО: Сжатие изображений через Canvas перед отправкой по сети
  static async uploadFile(file: File): Promise<string | null> {
    try {
      return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
          const img = new Image();
          img.src = event.target?.result as string;
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Устанавливаем оптимальное разрешение для веба
            const MAX_WIDTH = 800;
            const MAX_HEIGHT = 600;
            let width = img.width;
            let height = img.height;

            if (width > height) {
              if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
            } else {
              if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
            }

            canvas.width = width;
            canvas.height = height;
            ctx?.drawImage(img, 0, 0, width, height);

            // Конвертируем в WebP (или JPEG) с качеством 70% для экстремального сжатия сетевого трафика
            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
            resolve(compressedBase64);
          };
        };
        reader.onerror = (error) => reject(error);
      });
    } catch (error) {
      console.error('Ошибка компрессии изображения:', error);
      return null;
    }
  }

}

export default FirebaseService;
