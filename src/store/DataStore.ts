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

  carsLoading = false;
  rentalsLoading = false;
  locationsLoading = false;
  
  // Шаблоны конфигураций марок машин из Firebase
  brandTemplates: Record<string, { fuelType: 'petrol' | 'diesel' | 'electric' | 'hybrid'; transmission: 'manual' | 'automatic'; pricePerDay: number; seats: number }> = {};
  templatesLoading = false;

  error: string | null = null;
  filters: FilterParams = {};
  selectedLocationId: string | null = null;

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  get filteredCars(): Car[] {
    let result = this.cars.filter(c => c.isActive);
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

  get activeCars(): Car[] { return this.cars.filter(c => c.isActive && c.status === 'available'); }
  get activeLocations(): Location[] { return this.locations.filter(l => l.isActive).sort((a, b) => a.name.localeCompare(b.name, 'ru')); }
  get activeRentals(): Rental[] { return this.rentals.filter(r => r.status !== 'cancelled' && r.status !== 'completed'); }

  getCarById(id: string): Car | undefined { return this.cars.find(c => c.id === id); }
  getLocationById(id: string): Location | undefined { return this.locations.find(l => l.id === id); }
  getRentalById(id: string): Rental | undefined { return this.rentals.find(r => r.id === id); }
  getReviewsForCar(carId: string): Review[] { return this.reviews.filter(r => r.carId === carId); }

  setFilter(key: keyof FilterParams, value: any): void {
    this.filters[key] = value;
  }

  async loadAllData(): Promise<void> {
    await Promise.all([
      this.loadLocations(), 
      this.loadCars(), 
      this.loadRentals(), 
      this.loadReviews(), 
      this.loadBrandTemplates()
    ]);
  }

    async loadBrandTemplates(): Promise<void> {
  this.templatesLoading = true;
  try {
    // Передаем пустую строку для чтения корня базы
    const data = await FirebaseService.getData<Record<string, any>>('');
    
    runInAction(() => { 
      if (data) {
        const templates: Record<string, any> = {};
        Object.keys(data).forEach(key => {
          // Исключаем системные таблицы, оставляя только марки машин
          if (key !== 'cars' && key !== 'rentals' && key !== 'locations' && key !== 'reviews') {
            templates[key] = data[key];
          }
        });
        this.brandTemplates = templates;
      }
      this.templatesLoading = false; 
    });
  } catch (error) {
    runInAction(() => { 
      console.error('Ошибка загрузки шаблонов:', error);
      this.templatesLoading = false; 
    });
  }
}



  async loadCars(): Promise<void> {
    this.carsLoading = true;
    try {
      const data = await FirebaseService.getData<Record<string, Car>>('cars');
      runInAction(() => { this.cars = data ? Object.values(data) : []; this.carsLoading = false; });
    } catch (error) {
      runInAction(() => { this.error = 'Ошибка загрузки автомобилей'; this.carsLoading = false; });
    }
  }

      async loadRentals(): Promise<void> {
    this.rentalsLoading = true;
    try {
      const data = await FirebaseService.getData<Record<string, Rental>>('rentals');
      runInAction(() => { this.rentals = data ? Object.values(data) : []; this.rentalsLoading = false; });
    } catch (error) {
      runInAction(() => { this.error = 'Ошибка загрузки аренд'; this.rentalsLoading = false; });
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
        this.locationsLoading = false;
      });
    } catch (error) {
      runInAction(() => { this.error = 'Ошибка загрузки локаций'; this.locationsLoading = false; });
    }
  }

  async loadReviews(): Promise<void> {
    try {
      const data = await FirebaseService.getData<Record<string, Review>>('reviews');
      runInAction(() => { this.reviews = data ? Object.values(data) : []; });
    } catch (error) { console.error('Load reviews error:', error); }
  }

  async createCar(data: CarFormData): Promise<Car | null> {
    if (!authStore.canManageCars()) return null;
    const now = new Date().toISOString();
    const car: Car = { id: uuidv4(), ...data, ownerId: authStore.currentRole, status: 'available', isActive: true, createdAt: now, updatedAt: now };
    try {
      await FirebaseService.setData(`cars/${car.id}`, car);
      runInAction(() => { this.cars.push(car); });
      return car;
    } catch (error) { console.error('Create car error:', error); return null; }
  }

    async updateCar(id: string, data: Partial<CarFormData> & { status?: string }): Promise<boolean> {
    const index = this.cars.findIndex(c => c.id === id);
    if (index === -1) return false;
    
    const updated = { 
      ...this.cars[index], 
      ...data, 
      updatedAt: new Date().toISOString() 
    };

    try {
      await FirebaseService.setData(`cars/${id}`, updated);
      
      // Передаем измененный массив целиком или используем явное присвоение вне стрелочной мутации
      runInAction(() => { 
  this.cars.splice(index, 1, updated as Car); 
});


      return true;
    } catch (error) { 
      console.error('Update car error:', error); 
      return false; 
    }
  }

  async deleteCar(id: string): Promise<boolean> {
    if (!authStore.canManageCars()) return false;
    const index = this.cars.findIndex(c => c.id === id);
    if (index === -1) return false;
    
    try {
      await FirebaseService.updateData(`cars/${id}`, { isActive: false });
      runInAction(() => { 
        this.cars[index] = { ...this.cars[index], isActive: false };
      });
      return true;
    } catch (error) { 
      console.error('Delete car error:', error); 
      return false; 
    }
  }


  // ОПТИМИЗИРОВАННЫЙ МЕТОД: Закрепляет авто за юзером и блокирует его для остальных
  async createRental(data: RentalFormData): Promise<Rental | null> {
    if (!authStore.canCreateRentals()) return null;
    const car = this.getCarById(data.carId);
    if (!car || car.status !== 'available') return null; // Защита: нельзя арендовать уже занятую машину
    
    // Найдите эту строчку в методе createRental внутри DataStore.ts:
const totalDays = calculateRentalDays(data.startDate, data.endDate) || 1; // Если вернулся 0 или NaN, берем минимум 1 день

    const now = new Date().toISOString();
    
    const rental: Rental = {
      id: uuidv4(), 
      carId: data.carId, 
      carName: formatCarName(car), 
      renterId: authStore.currentRole, 
      renterName: data.renterName, // Привязка к имени/id арендатора
      startDate: data.startDate, 
      endDate: data.endDate, 
      totalDays, 
      totalPrice: totalDays * car.pricePerDay,
      status: 'confirmed', // Сразу подтверждаем
      notes: data.notes || '', 
      createdAt: now, 
      updatedAt: now
    };
    
    try {
      // 1. Сохраняем заявку на аренду в Firebase
      await FirebaseService.setData(`rentals/${rental.id}`, rental);
      
      // 2. Меняем статус машины на 'rented', чтобы убрать из общего каталога
      await this.updateCar(data.carId, { status: 'rented' });
      
      runInAction(() => { 
        this.rentals.push(rental); 
      });
      return rental;
    } catch (error) { 
      console.error('Create rental error:', error); 
      return null; 
    }
  }

  async updateRentalStatus(id: string, status: Rental['status']): Promise<boolean> {
    const index = this.rentals.findIndex(r => r.id === id);
    if (index === -1) return false;
    const rental = this.rentals[index];
    const updated = { ...rental, status, updatedAt: new Date().toISOString() };
    try {
      await FirebaseService.setData(`rentals/${id}`, updated);
      runInAction(() => { this.rentals[index] = updated; });
      
      // Если аренда завершена или отменена — освобождаем машину обратно в каталог
      if (status === 'completed' || status === 'cancelled') {
        await this.updateCar(rental.carId, { status: 'available' });
      }
      return true;
    } catch (error) { console.error('Update rental error:', error); return false; }
  }

  async deleteRental(id: string): Promise<boolean> {
    if (!authStore.canManageRentals()) return false;
    const index = this.rentals.findIndex(r => r.id === id);
    if (index === -1) return false;
    const rental = this.rentals[index];
    try {
      await FirebaseService.setData(`rentals/${id}`, null);
      // Освобождаем авто при удалении записи аренды
      await this.updateCar(rental.carId, { status: 'available' });
      runInAction(() => { this.rentals.splice(index, 1); });
      return true;
    } catch (error) { console.error('Delete rental error:', error); return false; }
  }

  async createLocation(data: LocationFormData): Promise<Location | null> {
    if (!authStore.canManageLocations()) return null;
    const now = new Date().toISOString();
    const location: Location = { id: uuidv4(), ...data, isActive: true, createdAt: now, updatedAt: now };
    try {
      await FirebaseService.setData(`locations/${location.id}`, location);
      runInAction(() => { this.locations.push(location); });
      return location;
    } catch (error) { console.error('Create location error:', error); return null; }
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
    } catch (error) { console.error('Update location error:', error); return false; }
  }

  async deleteLocation(id: string): Promise<boolean> {
    if (!authStore.canManageLocations()) return false;
    const index = this.locations.findIndex(l => l.id === id);
    if (index === -1) return false;
    try {
      await FirebaseService.updateData(`locations/${id}`, { isActive: false });
      runInAction(() => { this.locations[index].isActive = false; });
      return true;
    } catch (error) { console.error('Delete location error:', error); return false; }
  }
}

export const dataStore = new DataStore();
