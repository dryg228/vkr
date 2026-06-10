// ============================================
// Rental Types
// ============================================

export type RentalStatus = 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled';

export interface Rental {
  id: string;
  carId: string;
  carName: string;
  renterId: string;
  renterName: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  totalPrice: number;
  status: RentalStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RentalFormData {
  carId: string;
  renterName: string;
  startDate: string;
  endDate: string;
  notes?: string;
}

export const getRentalStatusLabel = (status: RentalStatus): string => {
  const labels: Record<RentalStatus, string> = {
    pending: 'Ожидает',
    confirmed: 'Подтверждена',
    active: 'Активна',
    completed: 'Завершена',
    cancelled: 'Отменена',
  };
  return labels[status];
};

export const getRentalStatusColor = (status: RentalStatus): string => {
  const colors: Record<RentalStatus, string> = {
    pending: 'warning',
    confirmed: 'info',
    active: 'success',
    completed: 'primary',
    cancelled: 'error',
  };
  return colors[status];
};

export const calculateRentalDays = (startDate: string, endDate: string): number => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diff = end.getTime() - start.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
};
