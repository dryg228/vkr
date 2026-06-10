import { makeAutoObservable } from 'mobx';
import { PageId, PageConfig, PAGES_CONFIG } from '@/types';
import { authStore } from './AuthStore';

export class NavigationStore {
  currentPage: PageId = 'home';
  sidebarOpen = true;
  mobileMenuOpen = false;

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  get navigationItems(): PageConfig[] {
    return Object.values(PAGES_CONFIG).filter(page => {
      if (!page.showInNav) return false;
      if (page.requiresAuth && !authStore.isAuthenticated) return false;
      if (page.requiredRole === 'admin' && !authStore.isAdmin) return false;
      if (page.requiredRole === 'owner' && !authStore.isOwner) return false;
      return true;
    });
  }

  get currentPageConfig(): PageConfig { return PAGES_CONFIG[this.currentPage]; }
  get pageTitle(): string { return this.currentPageConfig.title; }

  navigate = (pageId: PageId): void => {
    const pageConfig = PAGES_CONFIG[pageId];
    if (!pageConfig) return;
    if (pageConfig.requiresAuth && !authStore.isAuthenticated) { authStore.openLoginModal(); return; }
    if (pageConfig.requiredRole === 'admin' && !authStore.isAdmin) return;
    if (pageConfig.requiredRole === 'owner' && !authStore.isOwner) return;
    this.currentPage = pageId;
    this.closeMobileMenu();
  };

  toggleSidebar = (): void => { this.sidebarOpen = !this.sidebarOpen; };
  openSidebar = (): void => { this.sidebarOpen = true; };
  closeSidebar = (): void => { this.sidebarOpen = false; };
  toggleMobileMenu = (): void => { this.mobileMenuOpen = !this.mobileMenuOpen; };
  openMobileMenu = (): void => { this.mobileMenuOpen = true; };
  closeMobileMenu = (): void => { this.mobileMenuOpen = false; };
}

export const navigationStore = new NavigationStore();
