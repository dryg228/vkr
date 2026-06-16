import { makeAutoObservable, runInAction } from 'mobx';
import { v4 as uuidv4 } from 'uuid';
import { Car, CarFormData, Rental, RentalFormData, Location, LocationFormData, Review, FilterParams, calculateRentalDays, formatCarName } from '@/types';
import FirebaseService from '../firebase';
import { authStore } from './AuthStore';

export class DataStore {
  cars: Car[] = [];
  rentals: Rental[] = [];
  locations: Location[] = [];
  reviews: Review[] = [];
  usersList: Record<string, any> = {};

  carsLoading = false;
  rentalsLoading = false;
  locationsLoading = false;
  templatesLoading = false;
  
  brandTemplates: Record<string, { fuelType: 'petrol' | 'diesel' | 'electric' | 'hybrid'; transmission: 'manual' | 'automatic'; pricePerDay: number; seats: number }> = {};
  error: string | null = null;
  filters: FilterParams = {};
  selectedLocationId: string | null = null;
  selectedCarForRental: string | null = null;

  carImagesCache: Record<string, string> = {};

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  get filteredCars(): Car[] {
    let result = [...this.cars];
    if (this.filters.locationId) result = result.filter(c => c.locationId === this.filters.locationId);
    if (this.filters.status) result = result.filter(c => c.status === this.filters.status);
    if (this.filters.fuelType) result = result.filter(c => c.fuelType === this.filters.fuelType);
    if (this.filters.transmission) result = result.filter(c => c.transmission === this.filters.transmission);
    if (this.filters.search) {
      const searchLower = this.filters.search.toLowerCase();
      result = result.filter(c => `${c.brand} ${c.model}`.toLowerCase().includes(searchLower));
    }
    return result.sort((a, b) => a.brand.localeCompare(b.brand, 'ru'));
  }

  get activeCars(): Car[] { 
    return this.cars.filter(c => (c as any).isVerified === true); 
  }
  
  get activeLocations(): Location[] { return this.locations.filter(l => l.isActive).sort((a, b) => a.name.localeCompare(b.name, 'ru')); }
  get activeRentals(): Rental[] { return this.rentals.filter(r => r.status !== 'cancelled' && r.status !== 'completed'); }

  getCarById(id: string): Car | undefined { return this.cars.find(c => c.id === id); }
  getLocationById(id: string): Location | undefined { return this.locations.find(l => l.id === id); }
  getRentalById(id: string): Rental | undefined { return this.rentals.find(r => r.id === id); }
  getReviewsForCar(carId: string): Review[] { return this.reviews.filter(r => r.carId === carId); }

  getCarRatingInfo(carId: string): { rating: number; count: number } {
    const carReviews = this.reviews.filter(r => r.carId === carId);
    if (carReviews.length === 0) return { rating: 0, count: 0 };
    const sum = carReviews.reduce((acc, r) => acc + r.rating, 0);
    return {
      rating: parseFloat((sum / carReviews.length).toFixed(1)),
      count: carReviews.length
    };
  }

  getReviewsForOwner(ownerId: string): Review[] {
    return this.reviews.filter(review => {
      const car = this.getCarById(review.carId);
      return car && car.ownerId === ownerId && (review as any).userId !== ownerId;
    });
  }

  setFilter(key: keyof FilterParams, value: any): void { this.filters[key] = value; }
  setSelectedCarForRental(carId: string | null): void { this.selectedCarForRental = carId; }

  async loadAllData(): Promise<void> {
    try {
      await this.loadLocations(); 
      await this.loadCars(); 
      await this.loadBrandTemplates(); 
      await this.loadRentals(); 
      await this.loadReviews(); 
      await this.loadUsers();
    } catch (e) {
      console.error(e);
    }
  }

  async loadUsers(): Promise<void> {
    try {
      const data = await FirebaseService.getData<Record<string, any>>('users');
      runInAction(() => { this.usersList = data || {}; });
    } catch (error) {
      console.error(error);
    }
  }

  async loadBrandTemplates(): Promise<void> {
    this.templatesLoading = true;
    try {
      const rootData = await FirebaseService.getData<Record<string, any>>('');
      runInAction(() => { 
        if (rootData && typeof rootData === 'object') {
          const generatedTemplates: Record<string, any> = {};
          Object.keys(rootData).forEach(key => {
            if (key !== 'cars' && key !== 'rentals' && key !== 'locations' && key !== 'reviews' && key !== 'users' && key !== 'carImages') {
              const brandData = rootData[key];
              generatedTemplates[key] = {
                fuelType: brandData?.fuelType || 'petrol',
                transmission: brandData?.transmission || 'automatic',
                pricePerDay: brandData?.pricePerDay || 2500,
                seats: brandData?.seats || 5
              };
            }
          });
          this.brandTemplates = generatedTemplates;
        }
      });
    } catch (error) {
      console.error(error);
    } finally {
      runInAction(() => { this.templatesLoading = false; });
    }
  }

  async loadCars(): Promise<void> {
    this.carsLoading = true;
    try {
      const data = await FirebaseService.getData<Record<string, Car>>('cars');
      runInAction(() => { this.cars = data ? Object.values(data) : []; });
    } catch (error) {
      runInAction(() => { this.error = 'Ошибка загрузки автомобилей'; });
    } finally {
      runInAction(() => { this.carsLoading = false; });
    }
  }

  async loadCarImage(carId: string): Promise<string | null> {
    if (this.carImagesCache[carId]) return this.carImagesCache[carId];
    try {
      const base64 = await FirebaseService.getData<string>(`carImages/${carId}`);
      if (base64) {
        runInAction(() => { this.carImagesCache[carId] = base64; });
        return base64;
      }
    } catch (e) {
      console.error(e);
    }
    return null;
  }

  async loadRentals(): Promise<void> {
    this.rentalsLoading = true;
    try {
      const data = await FirebaseService.getData<Record<string, Rental>>('rentals');
      runInAction(() => { this.rentals = data ? Object.values(data) : []; });
    } catch (error) {
      runInAction(() => { this.error = 'Ошибка загрузки аренд'; });
    } finally {
      runInAction(() => { this.rentalsLoading = false; });
    }
  }

  async loadLocations(): Promise<void> {
    this.locationsLoading = true;
    try {
      const data = await FirebaseService.getData<Record<string, Location>>('locations');
      runInAction(() => {
        this.locations = data && typeof data === 'object'
          ? Object.entries(data).map(([key, loc]) => ({ ...(loc as Location), id: key }))
          : [];
      });
    } catch (error) {
      console.error(error);
    } finally {
      runInAction(() => { this.locationsLoading = false; });
    }
  }

  async loadReviews(): Promise<void> {
    try {
      const data = await FirebaseService.getData<Record<string, Review>>('reviews');
      runInAction(() => { this.reviews = data ? Object.values(data) : []; });
    } catch (error) { 
      console.error(error); 
    }
  }
  async createCar(data: CarFormData & { carImageUrl?: string; locationName?: string; city?: string }): Promise<Car | null> {
    if (!authStore.canManageCars()) return null;
    const now = new Date().toISOString();
    const carId = uuidv4();
    const { carImageUrl, locationName, city, ...textData } = data;
    let targetLocationId = (data as any).locationId || '';

    if (locationName && locationName.trim()) {
      const newLocId = uuidv4();
      const newLocation: Location = {
        id: newLocId,
        name: locationName.trim(),
        city: (city && city.trim()) ? city.trim() : 'Москва',
        address: locationName.trim(),
        isActive: true,
        createdAt: now,
        updatedAt: now
      };
      try {
        await FirebaseService.setData(`locations/${newLocId}`, newLocation);
        runInAction(() => { this.locations.push(newLocation); });
        targetLocationId = newLocId;
      } catch (e) {
        console.error('Ошибка создания локации:', e);
      }
    }
    
    const car = { 
      id: carId, 
      ...textData,
      locationId: targetLocationId,
      ownerId: authStore.userId, 
      status: 'available', 
      isActive: true, 
      isVerified: false,
      createdAt: now, 
      updatedAt: now 
    };
    
    try {
      await FirebaseService.setData(`cars/${carId}`, car);
      if (carImageUrl) {
        await FirebaseService.setData(`carImages/${carId}`, carImageUrl);
        runInAction(() => { this.carImagesCache[carId] = carImageUrl; });
      }
      runInAction(() => { this.cars.push(car as any); });
      return car as any;
    } catch (error) { 
      console.error(error); 
      return null; 
    }
  }

  async updateCar(id: string, data: Partial<CarFormData> & { status?: string; carImageUrl?: string; isVerified?: boolean; locationName?: string; city?: string }): Promise<boolean> {
    const index = this.cars.findIndex(c => c.id === id);
    if (index === -1) return false;
    
    const { carImageUrl, locationName, city, ...textData } = data;
    let targetLocationId = (data as any).locationId || this.cars[index].locationId;

    if (locationName && locationName.trim()) {
      const newLocId = uuidv4();
      const newLocation: Location = {
        id: newLocId,
        name: locationName.trim(),
        city: (city && city.trim()) ? city.trim() : 'Москва',
        address: locationName.trim(),
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      try {
        await FirebaseService.setData(`locations/${newLocId}`, newLocation);
        runInAction(() => { this.locations.push(newLocation); });
        targetLocationId = newLocId;
      } catch (e) {
        console.error(e);
      }
    }
    
    const updated = { 
      ...this.cars[index], 
      ...textData, 
      locationId: targetLocationId,
      updatedAt: new Date().toISOString() 
    };
    
    try {
      await FirebaseService.setData(`cars/${id}`, updated);
      if (carImageUrl) {
        await FirebaseService.setData(`carImages/${id}`, carImageUrl);
        runInAction(() => { this.carImagesCache[id] = carImageUrl; });
      }
      runInAction(() => { this.cars.splice(index, 1, updated as Car); });
      return true;
    } catch (error) { 
      return false; 
    }
  }

  async deleteCar(id: string): Promise<boolean> {
    if (!authStore.canManageCars()) return false;
    const index = this.cars.findIndex(c => c.id === id);
    if (index === -1) return false;
    
    try {
      await FirebaseService.setData(`cars/${id}`, null);
      await FirebaseService.setData(`carImages/${id}`, null);
      runInAction(() => {
        this.cars.splice(index, 1);
        if (this.carImagesCache && this.carImagesCache[id]) {
          delete this.carImagesCache[id];
        }
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  async createRental(data: Omit<RentalFormData, 'id' | 'userId' | 'status' | 'createdAt' | 'updatedAt' | 'totalPrice'>): Promise<Rental | null> {
    const car = this.getCarById(data.carId);
    if (!car) return null;

    const now = new Date().toISOString();
    const rentalId = uuidv4();
    const days = calculateRentalDays(data.startDate, data.endDate);
    const totalPrice = days * car.pricePerDay;

    const rental = {
      id: rentalId,
      carId: data.carId,
      renterId: (authStore.userId || 'anonymous') as string,
      startDate: data.startDate,
      endDate: data.endDate,
      totalPrice,
      totalDays: days,
      carName: formatCarName(car),
      status: 'pending',
      createdAt: now,
      updatedAt: now
    } as any as Rental;

    try {
      await FirebaseService.setData(`rentals/${rentalId}`, rental);
      runInAction(() => { this.rentals.push(rental); });
      return rental;
    } catch (error) {
      return null;
    }
  }

  async updateRentalStatus(id: string, status: 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled'): Promise<boolean> {
    const index = this.rentals.findIndex(r => r.id === id);
    if (index === -1) return false;
    
    const updated = { 
      ...this.rentals[index], 
      status, 
      updatedAt: new Date().toISOString() 
    };
    
    try {
      await FirebaseService.setData(`rentals/${id}`, updated);
      runInAction(() => { 
        this.rentals[index] = updated; 
        // ИСПРАВЛЕНО: Автоматически меняем статус машины в реальном времени
                // ИСПРАВЛЕНО: Применяем явное приведение типов as any, чтобы убрать ошибку литеральных статусов
        const carIndex = this.cars.findIndex(c => c.id === updated.carId);
        if (carIndex !== -1) {
          (this.cars[carIndex] as any).status = status === 'active' ? 'booked' : 'available';
        }

      });
      return true;
    } catch (error) { 
      return false; 
    }
  }

  async deleteRental(id: string): Promise<boolean> {
    const index = this.rentals.findIndex(r => r.id === id);
    if (index === -1) return false;
    try {
      await FirebaseService.setData(`rentals/${id}`, null);
      runInAction(() => { this.rentals.splice(index, 1); });
      return true;
    } catch (error) { 
      return false; 
    }
  }

  async createLocation(data: LocationFormData): Promise<Location | null> {
    if (!authStore.canManageLocations()) return null;
    const now = new Date().toISOString();
    const location: Location = { id: uuidv4(), ...data, isActive: true, createdAt: now, updatedAt: now };
    try {
      await FirebaseService.setData(`locations/${location.id}`, location);
      runInAction(() => { this.locations.push(location); });
      return location;
    } catch (error) { 
      return null; 
    }
  }

  async updateLocation(id: string, data: Partial<LocationFormData>): Promise<boolean> {
    if (!authStore.canManageLocations()) return false;
    const index = this.locations.findIndex(l => l.id === id);
    if (index === -1) return false;
    const updated = { ...this.locations[index], ...data, updatedAt: new Date().toISOString() };
    try {
      await FirebaseService.setData(`locations/${id}`, updated);
      runInAction(() => { this.locations[index] = updated; });
      return true;
    } catch (error) { 
      return false; 
    }
  }

  async deleteLocation(id: string): Promise<boolean> {
    if (!authStore.canManageLocations()) return false;
    const index = this.locations.findIndex(l => l.id === id);
    if (index === -1) return false;
    try {
      await FirebaseService.setData(`locations/${id}`, null);
      runInAction(() => { this.locations.splice(index, 1); });
      return true;
    } catch (error) { 
      return false; 
    }
  }

  async createReview(data: { carId: string; rating: number; comment: string; userName: string }): Promise<boolean> {
    const now = new Date().toISOString();
    const review = {
      id: uuidv4(),
      carId: data.carId,
      userId: authStore.userId,
      userName: data.userName,
      rating: data.rating,
      comment: data.comment,
      createdAt: now
    };
    try {
      await FirebaseService.setData(`reviews/${review.id}`, review);
      runInAction(() => { this.reviews.push(review as any); });
      return true;
    } catch (error) {
      return false;
    }
  }

  getUserRentalHistory(userId: string): Rental[] {
    return this.rentals.filter(r => 
      r.renterId === userId && 
      (r.status === 'completed' || r.status === 'cancelled')
    ).sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime());
  }

  // ИНТЕГРИРОВАНО: Сбор занятых периодов дат из Realtime Database для конкретного автомобиля
  getCarBookedDates(carId: string): { start: string; end: string; status: string }[] {
    return this.rentals
      .filter(r => r.carId === carId && (r.status === 'confirmed' || r.status === 'active'))
      .map(r => ({
        start: new Date(r.startDate).toLocaleDateString('ru-RU'),
        end: new Date(r.endDate).toLocaleDateString('ru-RU'),
        status: r.status
      }));
  }
}

export const dataStore = new DataStore();
