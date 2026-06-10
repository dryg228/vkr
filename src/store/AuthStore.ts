import { makeAutoObservable } from 'mobx';
import { User, UserRole, ROLE_PERMISSIONS, RolePermissions } from '@/types';

const AUTH_STORAGE_KEY = 'car_rental_auth';
const SESSION_EXPIRY_KEY = 'car_rental_session_expiry';
const SESSION_DURATION = 24 * 60 * 60 * 1000;

const AUTH_CREDENTIALS: Record<Exclude<UserRole, 'guest'>, string> = {
  owner: 'owner2026-rental',
  admin: 'admin2026-rental',
};

interface StoredAuthState {
  role: UserRole;
  expiry: number;
}

export class AuthStore {
  private _user: User = { role: 'guest' };
  loginModalOpen = false;
  loginError: string | null = null;
  isLoading = false;

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
    this.loadAuthState();
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

  private loadAuthState = (): void => {
    try {
      const storedData = localStorage.getItem(AUTH_STORAGE_KEY);
      const expiryData = localStorage.getItem(SESSION_EXPIRY_KEY);
      if (storedData && expiryData) {
        const authState: StoredAuthState = JSON.parse(storedData);
        const expiry = parseInt(expiryData, 10);
        if (Date.now() < expiry && authState.role !== 'guest') {
          this._user = { role: authState.role };
        } else {
          this.clearAuthStorage();
        }
      }
    } catch (error) {
      console.error('Failed to load auth state:', error);
      this.clearAuthStorage();
    }
  };

  private saveAuthState = (): void => {
    try {
      if (this._user.role !== 'guest') {
        const authState: StoredAuthState = { role: this._user.role, expiry: Date.now() + SESSION_DURATION };
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authState));
        localStorage.setItem(SESSION_EXPIRY_KEY, String(authState.expiry));
      } else {
        this.clearAuthStorage();
      }
    } catch (error) {
      console.error('Failed to save auth state:', error);
    }
  };

  private clearAuthStorage = (): void => {
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      localStorage.removeItem(SESSION_EXPIRY_KEY);
    } catch (error) {
      console.error('Failed to clear auth storage:', error);
    }
  };

  openLoginModal = (): void => { this.loginModalOpen = true; this.loginError = null; };
  closeLoginModal = (): void => { this.loginModalOpen = false; this.loginError = null; this.isLoading = false; };

  login = async (role: Exclude<UserRole, 'guest'>, password: string): Promise<boolean> => {
    this.isLoading = true;
    this.loginError = null;
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      if (AUTH_CREDENTIALS[role] === password) {
        this._user = { role };
        this.saveAuthState();
        this.closeLoginModal();
        return true;
      } else {
        this.loginError = 'Неверный пароль';
        return false;
      }
    } catch (error) {
      this.loginError = 'Ошибка авторизации';
      return false;
    } finally {
      this.isLoading = false;
    }
  };

  logout = (): void => { this._user = { role: 'guest' }; this.clearAuthStorage(); this.loginError = null; };
  clearError = (): void => { this.loginError = null; };
}

export const authStore = new AuthStore();
