import { makeAutoObservable, runInAction } from 'mobx';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/firebase';
import { User, UserRole, ROLE_PERMISSIONS, RolePermissions } from '@/types';

export class AuthStore {
  private _user: User = { role: 'guest' };
  loginModalOpen = false;
  loginError: string | null = null;
  isLoading = false;

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
    this.initAuthListener();
  }

  get user(): User { return this._user; }
  get isAuthenticated(): boolean { return this._user.role !== 'guest'; }
  get isOwner(): boolean { return this._user.role === 'owner' || this._user.role === 'admin'; }
  get isAdmin(): boolean { return this._user.role === 'admin'; }
  get permissions(): RolePermissions { return ROLE_PERMISSIONS[this._user.role]; }
  get currentRole(): UserRole { return this._user.role; }

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
    onAuthStateChanged(auth, (firebaseUser) => {
      runInAction(() => {
        if (firebaseUser) {
          const role: UserRole = firebaseUser.email?.startsWith('admin') ? 'admin' : 'owner';
          
          // Извлекаем имя из почты (все символы до знака '@'), если displayName не задан
          const fallbackName = firebaseUser.email ? firebaseUser.email.split('@')[0] : 'Пользователь';
          const name = firebaseUser.displayName || fallbackName;

          // Сохраняем все данные в состояние стора
          this._user = {
            role,
            email: firebaseUser.email || '',
            name: name
          } as any; // Приведение к any временно защитит от строгих ограничений типов
        } else {
          this._user = { role: 'guest' };
        }
      });
    });
  };


  openLoginModal = (): void => { this.loginModalOpen = true; this.loginError = null; };
  closeLoginModal = (): void => { this.loginModalOpen = false; this.loginError = null; this.isLoading = false; };

  register = async (email: string, password: string): Promise<boolean> => {
    this.isLoading = true;
    this.loginError = null;
    try {
      await createUserWithEmailAndPassword(auth, email, password);
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

  logout = async (): Promise<void> => {
    try {
      await signOut(auth);
      runInAction(() => { this._user = { role: 'guest' }; this.loginError = null; });
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  clearError = (): void => { this.loginError = null; };
}

export const authStore = new AuthStore();
