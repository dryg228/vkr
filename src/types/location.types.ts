// ============================================
// Location Types
// ============================================

export interface Location {
  id: string;
  name: string;
  address: string;
  city: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LocationFormData {
  name: string;
  address: string;
  city: string;
  description?: string;
}

export const formatLocationName = (location: Location): string => {
  return `${location.name}, ${location.city}`;
};
