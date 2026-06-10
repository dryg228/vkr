// ============================================
// User & Role Types - Car Rental P2P
// ============================================

export type UserRole = 'guest' | 'owner' | 'admin';

export interface User {
  role: UserRole;
}

export interface RolePermissions {
  canViewCars: boolean;
  canViewRentals: boolean;
  canViewLocations: boolean;
  canCreateRentals: boolean;
  canManageCars: boolean;
  canManageRentals: boolean;
  canManageLocations: boolean;
  canAccessAdmin: boolean;
}

export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  guest: {
    canViewCars: true,
    canViewRentals: true,
    canViewLocations: true,
    canCreateRentals: false,
    canManageCars: false,
    canManageRentals: false,
    canManageLocations: false,
    canAccessAdmin: false,
  },
  owner: {
    canViewCars: true,
    canViewRentals: true,
    canViewLocations: true,
    canCreateRentals: true,
    canManageCars: true,
    canManageRentals: true,
    canManageLocations: false,
    canAccessAdmin: false,
  },
  admin: {
    canViewCars: true,
    canViewRentals: true,
    canViewLocations: true,
    canCreateRentals: true,
    canManageCars: true,
    canManageRentals: true,
    canManageLocations: true,
    canAccessAdmin: true,
  },
};
