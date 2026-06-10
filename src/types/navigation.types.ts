// ============================================
// Navigation Types
// ============================================

export type PageId = 
  | 'home'
  | 'cars'
  | 'rentals'
  | 'my-cars'
  | 'admin'
  | 'admin-cars'
  | 'admin-locations'
  | 'admin-rentals';

export interface PageConfig {
  id: PageId;
  title: string;
  icon: string;
  requiresAuth: boolean;
  requiredRole?: 'owner' | 'admin';
  showInNav: boolean;
  parentId?: PageId;
}

export const PAGES_CONFIG: Record<PageId, PageConfig> = {
  home: {
    id: 'home',
    title: 'Главная',
    icon: 'home',
    requiresAuth: false,
    showInNav: true,
  },
  cars: {
    id: 'cars',
    title: 'Каталог авто',
    icon: 'car',
    requiresAuth: false,
    showInNav: true,
  },
  rentals: {
    id: 'rentals',
    title: 'Аренды',
    icon: 'calendar',
    requiresAuth: false,
    showInNav: true,
  },
  'my-cars': {
    id: 'my-cars',
    title: 'Мои машины',
    icon: 'key',
    requiresAuth: true,
    requiredRole: 'owner',
    showInNav: true,
  },
  admin: {
    id: 'admin',
    title: 'Администрирование',
    icon: 'settings',
    requiresAuth: true,
    requiredRole: 'admin',
    showInNav: true,
  },
  'admin-cars': {
    id: 'admin-cars',
    title: 'Управление авто',
    icon: 'car-settings',
    requiresAuth: true,
    requiredRole: 'admin',
    showInNav: false,
    parentId: 'admin',
  },
  'admin-locations': {
    id: 'admin-locations',
    title: 'Управление локациями',
    icon: 'map',
    requiresAuth: true,
    requiredRole: 'admin',
    showInNav: false,
    parentId: 'admin',
  },
  'admin-rentals': {
    id: 'admin-rentals',
    title: 'Управление арендами',
    icon: 'list',
    requiresAuth: true,
    requiredRole: 'admin',
    showInNav: false,
    parentId: 'admin',
  },
};
