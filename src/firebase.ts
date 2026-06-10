import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, set, update, get } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyAxsxafS6H0YNR632AJIF13XVdXETHMKo0",
  authDomain: "college-diplomas.firebaseapp.com",
  databaseURL: "https://college-diplomas-default-rtdb.firebaseio.com",
  projectId: "college-diplomas",
  storageBucket: "college-diplomas.firebasestorage.app",
  messagingSenderId: "181367907290",
  appId: "1:181367907290:web:7cf85370be4c3194d9d6e3"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);

// Путь до БД конкретного проекта конкретного студента в рамках реализации единной Firebase БД
const BASE_PATH = import.meta.env.VITE_PROJECT_PATH;

export class FirebaseService {
  static async getData<T = unknown>(path: string): Promise<T | null> {
    const dataRef = ref(db, `${BASE_PATH}/${path}`);
    return new Promise<T | null>((resolve) => {
      onValue(dataRef, (snapshot) => {
        resolve(snapshot.val() as T | null);
      }, { onlyOnce: true });
    });
  }

  static async setData<T = unknown>(path: string, data: T): Promise<void> {
    const dataRef = ref(db, `${BASE_PATH}/${path}`);
    await set(dataRef, data);
  }

  static async updateData(path: string, updates: Record<string, unknown>): Promise<void> {
    const dataRef = ref(db, `${BASE_PATH}/${path}`);
    await update(dataRef, updates);
  }

  static async getSnapshot<T = unknown>(path: string): Promise<T | null> {
    const dataRef = ref(db, `${BASE_PATH}/${path}`);
    const snapshot = await get(dataRef);
    return snapshot.val() as T | null;
  }
}

export default FirebaseService;
