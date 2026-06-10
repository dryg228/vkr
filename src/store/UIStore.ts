import { makeAutoObservable } from 'mobx';
import { v4 as uuidv4 } from 'uuid';
import { Toast, ToastType, ModalState } from '@/types';

const DEFAULT_TOAST_DURATION = 4000;

export class UIStore {
  // Toast notifications
  toasts: Toast[] = [];

  // Modal states
  confirmModalState: ModalState & { 
    title?: string; 
    message?: string; 
    onConfirm?: () => void;
    onCancel?: () => void;
  } = {
    isOpen: false,
    mode: 'view',
  };

  // Theme
  isDarkMode = false;

  // Loading overlay
  globalLoading = false;
  loadingMessage = '';

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
    this.loadThemePreference();
  }

  // ============================================
  // Toast notifications
  // ============================================

  showToast = (type: ToastType, message: string, duration?: number): string => {
    const id = uuidv4();
    const toast: Toast = {
      id,
      type,
      message,
      duration: duration || DEFAULT_TOAST_DURATION,
    };

    this.toasts.push(toast);

    // Auto-remove toast after duration
    if (toast.duration && toast.duration > 0) {
      setTimeout(() => {
        this.removeToast(id);
      }, toast.duration);
    }

    return id;
  };

  showSuccess = (message: string): string => {
    return this.showToast('success', message);
  };

  showError = (message: string): string => {
    return this.showToast('error', message);
  };

  showWarning = (message: string): string => {
    return this.showToast('warning', message);
  };

  showInfo = (message: string): string => {
    return this.showToast('info', message);
  };

  removeToast = (id: string): void => {
    this.toasts = this.toasts.filter(t => t.id !== id);
  };

  clearAllToasts = (): void => {
    this.toasts = [];
  };

  // ============================================
  // Confirm modal
  // ============================================

  showConfirm = (
    title: string,
    message: string,
    onConfirm: () => void,
    onCancel?: () => void
  ): void => {
    this.confirmModalState = {
      isOpen: true,
      mode: 'delete',
      title,
      message,
      onConfirm,
      onCancel,
    };
  };

  confirmAction = (): void => {
    if (this.confirmModalState.onConfirm) {
      this.confirmModalState.onConfirm();
    }
    this.closeConfirm();
  };

  cancelAction = (): void => {
    if (this.confirmModalState.onCancel) {
      this.confirmModalState.onCancel();
    }
    this.closeConfirm();
  };

  closeConfirm = (): void => {
    this.confirmModalState = {
      isOpen: false,
      mode: 'view',
    };
  };

  // ============================================
  // Global loading
  // ============================================

  showLoading = (message = 'Загрузка...'): void => {
    this.globalLoading = true;
    this.loadingMessage = message;
  };

  hideLoading = (): void => {
    this.globalLoading = false;
    this.loadingMessage = '';
  };

  // ============================================
  // Theme
  // ============================================

  toggleTheme = (): void => {
    this.isDarkMode = !this.isDarkMode;
    this.saveThemePreference();
    this.applyTheme();
  };

  setDarkMode = (value: boolean): void => {
    this.isDarkMode = value;
    this.saveThemePreference();
    this.applyTheme();
  };

  private loadThemePreference = (): void => {
    try {
      const saved = localStorage.getItem('theme_dark_mode');
      if (saved !== null) {
        this.isDarkMode = saved === 'true';
      } else {
        // Check system preference
        this.isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
      }
      this.applyTheme();
    } catch (error) {
      console.error('Failed to load theme preference:', error);
    }
  };

  private saveThemePreference = (): void => {
    try {
      localStorage.setItem('theme_dark_mode', String(this.isDarkMode));
    } catch (error) {
      console.error('Failed to save theme preference:', error);
    }
  };

  private applyTheme = (): void => {
    if (this.isDarkMode) {
      document.documentElement.classList.add('dark-theme');
    } else {
      document.documentElement.classList.remove('dark-theme');
    }
  };
}

// Singleton instance
export const uiStore = new UIStore();
