import { makeAutoObservable, runInAction } from 'mobx';
import { v4 as uuidv4 } from 'uuid';
import { Car, CarFormData, Rental, RentalFormData, Location, LocationFormData, Review, FilterParams, calculateRentalDays, formatCarName } from '@/types';
import FirebaseService from '@/firebase';
import { authStore } from './AuthStore';

export class DataStore {
  cars: Car[] = [];
  rentals: Rental[] = [];
  locations: Location[] = [];
  reviews: Review[] = [];

  carsLoading = false;
  rentalsLoading = false;
  locationsLoading = false;
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

  getCarById = (id: string): Car | undefined => this.cars.find(c => c.id === id);
  getLocationById = (id: string): Location | undefined => this.locations.find(l => l.id === id);
  getRentalById = (id: string): Rental | undefined => this.rentals.find(r => r.id === id);
  getReviewsForCar = (carId: string): Review[] => this.reviews.filter(r => r.carId === carId);

  loadAllData = async (): Promise<void> => {
    await Promise.all([this.loadLocations(), this.loadCars(), this.loadRentals(), this.loadReviews()]);
  };

  loadCars = async (): Promise<void> => {
    this.carsLoading = true;
    try {
      const data = await FirebaseService.getData<Record<string, Car>>('cars');
      runInAction(() => { this.cars = data ? Object.values(data) : []; this.carsLoading = false; });
    } catch (error) {
      runInAction(() => { this.error = 'Ошибка загрузки автомобилей'; this.carsLoading = false; });
    }
  };

  loadRentals = async (): Promise<void> => {
    this.rentalsLoading = true;
    try {
      const data = await FirebaseService.getData<Record<string, Rental>>('rentals');
      runInAction(() => { this.rentals = data ? Object.values(data) : []; this.rentalsLoading = false; });
    } catch (error) {
      runInAction(() => { this.error = 'Ошибка загрузки аренд'; this.rentalsLoading = false; });
    }
  };

  loadLocations = async (): Promise<void> => {
    this.locationsLoading = true;
    try {
      const data = await FirebaseService.getData<Record<string, Location>>('locations');
      runInAction(() => {
        this.locations = data
          ? Object.entries(data).map(([key, loc]) => ({ ...loc, id: key }))
          : [];
        this.locationsLoading = false;
      });
    } catch (error) {
      runInAction(() => { this.error = 'Ошибка загрузки локаций'; this.locationsLoading = false; });
    }
  };

  loadReviews = async (): Promise<void> => {
    try {
      const data = await FirebaseService.getData<Record<string, Review>>('reviews');
      runInAction(() => { this.reviews = data ? Object.values(data) : []; });
    } catch (error) { console.error('Load reviews error:', error); }
  };

  createCar = async (data: CarFormData): Promise<Car | null> => {
    if (!authStore.canManageCars()) return null;
    const now = new Date().toISOString();
    const car: Car = { id: uuidv4(), ...data, ownerId: authStore.currentRole, status: 'available', isActive: true, createdAt: now, updatedAt: now };
    try {
      await FirebaseService.setData(`cars/${car.id}`, car);
      runInAction(() => { this.cars.push(car); });
      return car;
    } catch (error) { console.error('Create car error:', error); return null; }
  };

  updateCar = async (id: string, data: Partial<CarFormData>): Promise<boolean> => {
    if (!authStore.canManageCars()) return false;
    const index = this.cars.findIndex(c => c.id === id);
    if (index === -1) return false;
    const updated = { ...this.cars[index], ...data, updatedAt: new Date().toISOString() };
    try {
      await FirebaseService.setData(`cars/${id}`, updated);
      runInAction(() => { this.cars[index] = updated; });
      return true;
    } catch (error) { console.error('Update car error:', error); return false; }
  };

  deleteCar = async (id: string): Promise<boolean> => {
    if (!authStore.canManageCars()) return false;
    const index = this.cars.findIndex(c => c.id === id);
    if (index === -1) return false;
    try {
      await FirebaseService.updateData(`cars/${id}`, { isActive: false });
      runInAction(() => { this.cars[index].isActive = false; });
      return true;
    } catch (error) { console.error('Delete car error:', error); return false; }
  };

  createRental = async (data: RentalFormData): Promise<Rental | null> => {
    if (!authStore.canCreateRentals()) return null;
    const car = this.getCarById(data.carId);
    if (!car) return null;
    const totalDays = calculateRentalDays(data.startDate, data.endDate);
    const now = new Date().toISOString();
    const rental: Rental = {
      id: uuidv4(), carId: data.carId, carName: formatCarName(car), renterId: authStore.currentRole, renterName: data.renterName,
      startDate: data.startDate, endDate: data.endDate, totalDays, totalPrice: totalDays * car.pricePerDay,
      status: 'pending', notes: data.notes || '', createdAt: now, updatedAt: now
    };
    try {
      await FirebaseService.setData(`rentals/${rental.id}`, rental);
      runInAction(() => { this.rentals.push(rental); });
      await this.updateCar(data.carId, {} as Partial<CarFormData>);
      return rental;
    } catch (error) { console.error('Create rental error:', error); return null; }
  };

  updateRentalStatus = async (id: string, status: Rental['status']): Promise<boolean> => {
    if (!authStore.canManageRentals()) return false;
    const index = this.rentals.findIndex(r => r.id === id);
    if (index === -1) return false;
    const updated = { ...this.rentals[index], status, updatedAt: new Date().toISOString() };
    try {
      await FirebaseService.setData(`rentals/${id}`, updated);
      runInAction(() => { this.rentals[index] = updated; });
      return true;
    } catch (error) { console.error('Update rental error:', error); return false; }
  };

  createLocation = async (data: LocationFormData): Promise<Location | null> => {
    if (!authStore.canManageLocations()) return null;
    const now = new Date().toISOString();
    const location: Location = { id: uuidv4(), ...data, isActive: true, createdAt: now, updatedAt: now };
    try {
      await FirebaseService.setData(`locations/${location.id}`, location);
      runInAction(() => { this.locations.push(location); });
      return location;
    } catch (error) { console.error('Create location error:', error); return null; }
  };

  updateLocation = async (id: string, data: Partial<LocationFormData>): Promise<boolean> => {
    if (!authStore.canManageLocations()) return false;
    const index = this.locations.findIndex(l => l.id === id);
    if (index === -1) return false;
    const definedPatch = Object.fromEntries(
      Object.entries(data).filter(([, v]) => v !== undefined)
    ) as Partial<LocationFormData>;
    const updated = { ...this.locations[index], ...definedPatch, id, updatedAt: new Date().toISOString() };
    try {
      await FirebaseService.setData(`locations/${id}`, updated);
      runInAction(() => { this.locations[index] = updated; });
      return true;
    } catch (error) { console.error('Update location error:', error); return false; }
  };

  deleteLocation = async (id: string): Promise<boolean> => {
    if (!authStore.canManageLocations()) return false;
    const index = this.locations.findIndex(l => l.id === id);
    if (index === -1) return false;
    try {
      await FirebaseService.updateData(`locations/${id}`, { isActive: false });
      runInAction(() => { this.locations[index].isActive = false; });
      return true;
    } catch (error) { console.error('Delete location error:', error); return false; }
  };

  setFilter = (key: keyof FilterParams, value: string | undefined): void => { this.filters = { ...this.filters, [key]: value }; };
  clearFilters = (): void => { this.filters = {}; };
  setSelectedLocation = (locationId: string | null): void => { this.selectedLocationId = locationId; this.filters.locationId = locationId || undefined; };
  clearError = (): void => { this.error = null; };
}

export const dataStore = new DataStore();
