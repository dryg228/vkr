// ============================================
// Review Types
// ============================================

export interface Review {
  id: string;
  carId: string;
  rentalId: string;
  reviewerName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface ReviewFormData {
  carId: string;
  rentalId: string;
  reviewerName: string;
  rating: number;
  comment: string;
}

export const formatRating = (rating: number): string => {
  return '★'.repeat(rating) + '☆'.repeat(5 - rating);
};
