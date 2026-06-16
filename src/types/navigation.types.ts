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
  | 'admin-rentals'
  | 'profile'
  | 'car-details'; // ИНТЕГРИРОВАНО: Добавили ID новой страницы в тип

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
  // ИНТЕГРИРОВАНО: Конфигурация для отдельной страницы автомобиля
  'car-details': {
    id: 'car-details',
    title: 'Описание автомобиля',
    icon: 'info',
    requiresAuth: false, // Доступно гостям для просмотра характеристик и отзывов
    showInNav: false,    // Скрыто из главного меню (переход идет по кнопке "Подробнее")
  },
  rentals: {
    id: 'rentals',
    title: 'Аренды',
    icon: 'calendar',
    requiresAuth: true,
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
  profile: {
    id: 'profile',
    title: 'Личный кабинет',
    icon: 'user',
    requiresAuth: true,
    showInNav: true,
  },
};
