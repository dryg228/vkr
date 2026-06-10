// ============================================
// Car Types
// ============================================

export type CarStatus = 'available' | 'rented' | 'maintenance' | 'unavailable';
export type FuelType = 'petrol' | 'diesel' | 'electric' | 'hybrid';
export type TransmissionType = 'manual' | 'automatic';

export interface Car {
  id: string;
  brand: string;
  model: string;
  year: number;
  licensePlate: string;
  fuelType: FuelType;
  transmission: TransmissionType;
  seats: number;
  pricePerDay: number;
  locationId: string;
  ownerId: string;
  imageUrl?: string;
  description?: string;
  status: CarStatus;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CarFormData {
  brand: string;
  model: string;
  year: number;
  licensePlate: string;
  fuelType: FuelType;
  transmission: TransmissionType;
  seats: number;
  pricePerDay: number;
  locationId: string;
  imageUrl?: string;
  description?: string;
}

export const getCarStatusLabel = (status: CarStatus): string => {
  const labels: Record<CarStatus, string> = {
    available: 'Доступен',
    rented: 'В аренде',
    maintenance: 'На ТО',
    unavailable: 'Недоступен',
  };
  return labels[status];
};

export const getFuelTypeLabel = (fuel: FuelType): string => {
  const labels: Record<FuelType, string> = {
    petrol: 'Бензин',
    diesel: 'Дизель',
    electric: 'Электро',
    hybrid: 'Гибрид',
  };
  return labels[fuel];
};

export const getTransmissionLabel = (trans: TransmissionType): string => {
  return trans === 'manual' ? 'Механика' : 'Автомат';
};

export const formatCarName = (car: Car): string => {
  return `${car.brand} ${car.model} (${car.year})`;
};
