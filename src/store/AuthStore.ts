import { makeAutoObservable, runInAction } from 'mobx';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updateProfile 
} from 'firebase/auth';
import { auth } from '@/firebase';
import FirebaseService from '@/firebase';
import { User, UserRole, ROLE_PERMISSIONS, RolePermissions } from '@/types';

export class AuthStore {
  private _user: User & { id?: string } = { id: '', role: 'guest' };
  loginModalOpen = false;
  loginError: string | null = null;
  isLoading = false;

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
    this.initAuthListener();
  }

  get user(): User & { id?: string } { return this._user; }
  get isAuthenticated(): boolean { return this._user.role !== 'guest'; }
  get isOwner(): boolean { return this._user.role === 'owner' || this._user.role === 'admin'; }
  get isAdmin(): boolean { return this._user.role === 'admin'; }
  get permissions(): RolePermissions { return ROLE_PERMISSIONS[this._user.role]; }
  get currentRole(): UserRole { return this._user.role; }
  get userId(): string { return this._user.id || ''; }

  canViewCars = (): boolean => this.permissions.canViewCars;
  canViewRentals = (): boolean => this.permissions.canViewRentals;
  canViewLocations = (): boolean => this.permissions.canViewLocations;
  canCreateRentals = (): boolean => this.permissions.canCreateRentals;
  canManageCars = (): boolean => this.permissions.canManageCars;
  canManageRentals = (): boolean => this.permissions.canManageRentals;
  canManageLocations = (): boolean => this.permissions.canManageLocations;
  canAccessAdmin = (): boolean => this.permissions.canAccessAdmin;

  hasRole = (requiredRole: UserRole): boolean => {
    const roleHierarchy: Record<UserRole, number> = { guest: 0, owner: 1, admin: 2 };
    return roleHierarchy[this._user.role] >= roleHierarchy[requiredRole];
  };

  private initAuthListener = (): void => {
    onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const savedData = await FirebaseService.getData<any>(`users/${firebaseUser.uid}`);
          
          runInAction(() => {
            const role: UserRole = firebaseUser.email === 'admin@gmail.com' ? 'admin' : 'owner';
            const fallbackName = firebaseUser.email ? firebaseUser.email.split('@')[0] : 'Пользователь';
            const name = savedData?.name || firebaseUser.displayName || fallbackName;

            this._user = {
              id: firebaseUser.uid,
              role: savedData?.role || role,
              email: firebaseUser.email || '',
              name: name,
              licenseNumber: savedData?.licenseNumber || '',
              licenseDate: savedData?.licenseDate || '',
              licenseImageUrl: savedData?.licenseImageUrl || '', 
              isVerified: savedData?.isVerified ?? false
            } as any; 
          });
        } catch (error) {
          console.error('Ошибка профиля:', error);
          runInAction(() => {
            this._user = {
              id: firebaseUser.uid,
              role: firebaseUser.email === 'admin@gmail.com' ? 'admin' : 'owner',
              email: firebaseUser.email || '',
              name: firebaseUser.displayName || 'Пользователь'
            } as any;
          });
        }
      } else {
        runInAction(() => {
          this._user = { id: '', role: 'guest' };
        });
      }
    });
  };

  openLoginModal = (): void => { this.loginModalOpen = true; this.loginError = null; };
  closeLoginModal = (): void => { this.loginModalOpen = false; this.loginError = null; this.isLoading = false; };

  register = async (email: string, password: string, name: string): Promise<boolean> => {
    this.isLoading = true;
    this.loginError = null;
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      if (firebaseUser) {
        await updateProfile(firebaseUser, { displayName: name.trim() });
        const role: UserRole = email.trim() === 'admin@gmail.com' ? 'admin' : 'owner';

        const userData = {
          uid: firebaseUser.uid,
          email: email,
          name: name.trim(),
          role: role,
          licenseNumber: '',
          licenseDate: '',
          licenseImageUrl: '', 
          isVerified: false,
          createdAt: new Date().toISOString()
        };

        await FirebaseService.setData(`users/${firebaseUser.uid}`, userData);
        
        runInAction(() => {
          this._user = {
            id: firebaseUser.uid,
            role: role,
            email: email,
            name: name.trim(),
            licenseNumber: '',
            licenseDate: '',
            licenseImageUrl: '',
            isVerified: false
          } as any;
        });
      }

      this.closeLoginModal();
      return true;
    } catch (error: any) {
      runInAction(() => { this.loginError = error.message || 'Ошибка регистрации'; });
      return false;
    } finally { 
      runInAction(() => { this.isLoading = false; });
    }
  };

  login = async (email: string, password: string): Promise<boolean> => {
    this.isLoading = true;
    this.loginError = null;
    try {
      await signInWithEmailAndPassword(auth, email, password);
      this.closeLoginModal();
      return true;
    } catch (error: any) {
      runInAction(() => { this.loginError = 'Неверный логин или пароль'; });
      return false;
    } finally {
      runInAction(() => { this.isLoading = false; });
    }
  };

  // Метод сохранения прав с конвертацией в текстовую Base64-строку для Realtime Database
  updateDriverLicense = async (licenseNumber: string, licenseDate: string, file?: File): Promise<boolean> => {
    if (!this.isAuthenticated || this.isAdmin) return false;
    this.isLoading = true;
    try {
      let imageUrl = (this._user as any).licenseImageUrl || '';

      if (file) {
        // Конвертируем изображение в текст без использования Firebase Storage бакета
        const base64Result = await FirebaseService.uploadFile('', file);
        if (base64Result) {
          imageUrl = base64Result;
        } else {
          throw new Error('Не удалось обработать изображение.');
        }
      }

      const updatedData = {
        ...this._user,
        licenseNumber: licenseNumber.trim(),
        licenseDate: licenseDate,
        licenseImageUrl: imageUrl, 
        isVerified: false
      };

      await FirebaseService.setData(`users/${this.userId}`, updatedData);
      
      runInAction(() => { this._user = updatedData as any; });
      return true;
    } catch (error: any) {
      console.error('Ошибка сохранения прав в AuthStore:', error);
      alert(error.message || 'Не удалось сохранить данные.');
      return false;
    } finally {
      runInAction(() => { this.isLoading = false; });
    }
  };

  logout = async (): Promise<void> => {
    try {
      await signOut(auth);
      runInAction(() => { this._user = { id: '', role: 'guest' }; this.loginError = null; });
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  clearError = (): void => { this.loginError = null; };
}

export const authStore = new AuthStore();
