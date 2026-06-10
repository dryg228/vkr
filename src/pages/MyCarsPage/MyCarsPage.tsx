import { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { dataStore, authStore } from '@/store';
import { Card, Button, Badge, Modal, Input, Select } from '@/components/UI';
import { Car, CarFormData, getCarStatusLabel, getFuelTypeLabel, getTransmissionLabel, formatCarName } from '@/types';
import styles from './MyCarsPage.module.scss';


const brandTemplates: Record<string, { fuelType: 'petrol' | 'diesel' | 'electric' | 'hybrid'; transmission: 'manual' | 'automatic'; pricePerDay: number; seats: number }> = {
  'ВАЗ': { fuelType: 'petrol', transmission: 'manual', pricePerDay: 1500, seats: 5 },
  'Lada': { fuelType: 'petrol', transmission: 'manual', pricePerDay: 2000, seats: 5 },
  'ГАЗ': { fuelType: 'petrol', transmission: 'manual', pricePerDay: 2500, seats: 5 },
  'УАЗ': { fuelType: 'petrol', transmission: 'manual', pricePerDay: 3000, seats: 5 },
  'Москвич': { fuelType: 'petrol', transmission: 'automatic', pricePerDay: 2500, seats: 5 },

  'Audi': { fuelType: 'petrol', transmission: 'automatic', pricePerDay: 5500, seats: 5 },
  'BMW': { fuelType: 'petrol', transmission: 'automatic', pricePerDay: 6000, seats: 5 },
  'Mercedes-Benz': { fuelType: 'petrol', transmission: 'automatic', pricePerDay: 7000, seats: 5 },
  'Opel': { fuelType: 'petrol', transmission: 'manual', pricePerDay: 2500, seats: 5 },
  'Porsche': { fuelType: 'petrol', transmission: 'automatic', pricePerDay: 12000, seats: 4 },
  'Volkswagen': { fuelType: 'petrol', transmission: 'automatic', pricePerDay: 3500, seats: 5 },

  'Honda': { fuelType: 'hybrid', transmission: 'automatic', pricePerDay: 3500, seats: 5 },
  'Infiniti': { fuelType: 'petrol', transmission: 'automatic', pricePerDay: 5000, seats: 5 },
  'Lexus': { fuelType: 'hybrid', transmission: 'automatic', pricePerDay: 6500, seats: 5 },
  'Mazda': { fuelType: 'petrol', transmission: 'automatic', pricePerDay: 4000, seats: 5 },
  'Mitsubishi': { fuelType: 'petrol', transmission: 'automatic', pricePerDay: 3500, seats: 5 },
  'Nissan': { fuelType: 'petrol', transmission: 'automatic', pricePerDay: 3500, seats: 5 },
  'Subaru': { fuelType: 'petrol', transmission: 'automatic', pricePerDay: 4500, seats: 5 },
  'Suzuki': { fuelType: 'petrol', transmission: 'manual', pricePerDay: 3000, seats: 5 },
  'Toyota': { fuelType: 'petrol', transmission: 'automatic', pricePerDay: 4500, seats: 5 },

  'Daewoo': { fuelType: 'petrol', transmission: 'manual', pricePerDay: 1500, seats: 5 },
  'Genesis': { fuelType: 'petrol', transmission: 'automatic', pricePerDay: 6500, seats: 5 },
  'Hyundai': { fuelType: 'petrol', transmission: 'automatic', pricePerDay: 3500, seats: 5 },
  'Kia': { fuelType: 'petrol', transmission: 'automatic', pricePerDay: 3500, seats: 5 },

  'Byd': { fuelType: 'electric', transmission: 'automatic', pricePerDay: 5500, seats: 5 },
  'Changan': { fuelType: 'petrol', transmission: 'automatic', pricePerDay: 4000, seats: 5 },
  'Chery': { fuelType: 'petrol', transmission: 'automatic', pricePerDay: 3500, seats: 5 },
  'Exeed': { fuelType: 'petrol', transmission: 'automatic', pricePerDay: 5000, seats: 5 },
  'Geely': { fuelType: 'petrol', transmission: 'automatic', pricePerDay: 4000, seats: 5 },
  'Haval': { fuelType: 'petrol', transmission: 'automatic', pricePerDay: 3800, seats: 5 },
  'LiAuto': { fuelType: 'hybrid', transmission: 'automatic', pricePerDay: 8500, seats: 6 },
  'Zeekr': { fuelType: 'electric', transmission: 'automatic', pricePerDay: 9000, seats: 5 },

  'Tesla': { fuelType: 'electric', transmission: 'automatic', pricePerDay: 8000, seats: 5 },
  'Ford': { fuelType: 'petrol', transmission: 'automatic', pricePerDay: 4000, seats: 5 },
  'Skoda': { fuelType: 'petrol', transmission: 'automatic', pricePerDay: 3500, seats: 5 },
  'Volvo': { fuelType: 'diesel', transmission: 'automatic', pricePerDay: 5500, seats: 5 }
};

export const MyCarsPage = observer(() => {
  const { cars, activeLocations, createCar, updateCar, deleteCar, getLocationById } = dataStore;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCar, setEditingCar] = useState<Car | null>(null);
  const [formData, setFormData] = useState<CarFormData>({ brand: '', model: '', year: 2026, licensePlate: '', fuelType: 'petrol', transmission: 'automatic', seats: 5, pricePerDay: 2000, locationId: '' });


  const [errors, setErrors] = useState<Record<string, string>>({});

  const authAny = authStore as any;

  const allBrands = [
    { value: 'ВАЗ', label: 'ВАЗ (Lada)' }, { value: 'ГАЗ', label: 'ГАЗ' }, { value: 'УАЗ', label: 'УАЗ' }, { value: 'Москвич', label: 'Москвич' },
    { value: 'Audi', label: 'Audi' }, { value: 'BMW', label: 'BMW' }, { value: 'Mercedes-Benz', label: 'Mercedes-Benz' }, { value: 'Opel', label: 'Opel' }, { value: 'Porsche', label: 'Porsche' }, { value: 'Volkswagen', label: 'Volkswagen' },
    { value: 'Honda', label: 'Honda' }, { value: 'Infiniti', label: 'Infiniti' }, { value: 'Lexus', label: 'Lexus' }, { value: 'Mazda', label: 'Mazda' }, { value: 'Mitsubishi', label: 'Mitsubishi' }, { value: 'Nissan', label: 'Nissan' }, { value: 'Subaru', label: 'Subaru' }, { value: 'Suzuki', label: 'Suzuki' }, { value: 'Toyota', label: 'Toyota' },
    { value: 'Daewoo', label: 'Daewoo' }, { value: 'Genesis', label: 'Genesis' }, { value: 'Hyundai', label: 'Hyundai' }, { value: 'Kia', label: 'Kia' },
    { value: 'Byd', label: 'BYD' }, { value: 'Changan', label: 'Changan' }, { value: 'Chery', label: 'Chery' }, { value: 'Exeed', label: 'Exeed' }, { value: 'Geely', label: 'Geely' }, { value: 'Haval', label: 'Haval' }, { value: 'LiAuto', label: 'LiXiang (Li)' }, { value: 'Zeekr', label: 'Zeekr' },
    { value: 'Tesla', label: 'Tesla' }, { value: 'Ford', label: 'Ford' }, { value: 'Skoda', label: 'Skoda' }, { value: 'Volvo', label: 'Volvo' }
  ];

  allBrands.sort((a, b) => a.label.localeCompare(b.label));

  const handleBrandChange = (brandValue: string) => {
    const template = brandTemplates[brandValue];
    if (errors.brand) setErrors(prev => ({ ...prev, brand: '' }));

    if (template) {
      setFormData({
        ...formData,
        brand: brandValue,
        fuelType: template.fuelType,
        transmission: template.transmission,
        pricePerDay: template.pricePerDay,
        seats: template.seats
      });
      setErrors(prev => ({ ...prev, fuelType: '', transmission: '', pricePerDay: '', seats: '' }));
    } else {
      setFormData({ ...formData, brand: brandValue });
    }
  };

  const myCars = cars.filter(car => {
    if (!car.isActive) return false;
    const carAny = car as any;
    const rawOwnerName = carAny.ownerName || carAny.renterName || '';
    const carOwner = String(rawOwnerName).toLowerCase().trim();

    if (authAny.isAdmin) {
      return carOwner.includes('админ') || carOwner === '';
    } else {
      return !carOwner.includes('админ') && carOwner !== '';
    }
  });

  const handleOpenModal = (car?: Car) => {
    if (car) {
      setEditingCar(car);
      setFormData({ brand: car.brand, model: car.model, year: car.year, licensePlate: car.licensePlate, fuelType: car.fuelType, transmission: car.transmission, seats: car.seats, pricePerDay: car.pricePerDay, locationId: car.locationId });
    } else {
      setEditingCar(null);
      const defaultBrand = allBrands[0]?.value || '';
      const template = brandTemplates[defaultBrand];

      setFormData({
        brand: defaultBrand,
        model: '',
        year: 2026,
        licensePlate: '',
        fuelType: template?.fuelType || 'petrol',
        transmission: template?.transmission || 'automatic',
        seats: template?.seats || 5,
        pricePerDay: template?.pricePerDay || 2000,
        locationId: activeLocations && activeLocations.length > 0 ? activeLocations[0].id : ''
      });
    }
    setErrors({});
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    const newErrors: Record<string, string> = {};

    if (!formData.brand) {
      newErrors.brand = 'Выберите марку автомобиля.';
    }
    if (!formData.model.trim()) {
      newErrors.model = 'Укажите модель автомобиля.';
    }
    if (!formData.licensePlate.trim()) {
      newErrors.licensePlate = 'Введите госномер.';
    }

    const currentYear = new Date().getFullYear();
    if (!formData.year || formData.year < 1900 || formData.year > currentYear) {
      newErrors.year = `Укажите год выпуска от 1900 до ${currentYear}.`;
    }

    if (!formData.pricePerDay || formData.pricePerDay <= 0) {
      newErrors.pricePerDay = 'Цена за день должна быть больше 0 ₽.';
    }

    if (!formData.locationId) {
      newErrors.locationId = 'Выберите локацию автомобиля.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    if (editingCar) {
      await updateCar(editingCar.id, formData);
    } else {
      const enrichedData = {
        ...formData,
        ownerName: authAny.isAdmin ? 'Админ' : 'Пользователь',
        renterName: authAny.isAdmin ? 'Админ' : 'Пользователь'
      };
      await createCar(enrichedData as any);
    }
    setIsModalOpen(false);
  };

  const handleDelete = async (id: string) => { if (confirm('Удалить автомобиль?')) await deleteCar(id); };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Мои автомобили</h1>
        <Button variant="primary" onClick={() => handleOpenModal()}>Добавить авто</Button>
      </div>

      {myCars.length === 0 ? (
        <div className={styles.empty}>У вас пока нет автомобилей</div>
      ) : (
        <div className={styles.grid}>
          {myCars.map(car => (
            <Card key={car.id} className={styles.carCard}>
              <div className={styles.carHeader}>
                <h3>{formatCarName(car)}</h3>
                <Badge variant={car.status === 'available' ? 'success' : 'warning'}>
                  {getCarStatusLabel(car.status)}
                </Badge>
              </div>
              <div className={styles.carDetails}>
                <span>{getFuelTypeLabel(car.fuelType)}</span>
                <span>{getTransmissionLabel(car.transmission)}</span>
                <span>{car.seats} мест</span>
              </div>
              <p className={styles.location}>{getLocationById(car.locationId)?.name}</p>
              <div className={styles.carPrice}>{car.pricePerDay} ₽/день</div>
              <div className={styles.carActions}>
                <Button size="sm" variant="secondary" onClick={() => handleOpenModal(car)}>Редактировать</Button>
                <Button size="sm" variant="danger" onClick={() => handleDelete(car.id)}>Удалить</Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingCar ? 'Редактировать авто' : 'Добавить авто'}>
        <div className={styles.form}>

          <div className={styles.inputWrapper}>
            <Select label="Марка" options={allBrands} value={formData.brand} onChange={(e) => handleBrandChange(e.target.value)} required />
            {errors.brand && <span className={styles.errorText}>{errors.brand}</span>}
          </div>

          <div className={styles.inputWrapper}>
            <Input label="Модель" value={formData.model} onChange={(e) => { setFormData({ ...formData, model: e.target.value }); if (errors.model) setErrors(p => ({ ...p, model: '' })); }} required />
            {errors.model && <span className={styles.errorText}>{errors.model}</span>}
          </div>

          <div className={styles.inputWrapper}>
            <Input label="Год" type="number" value={formData.year} onChange={(e) => { setFormData({ ...formData, year: parseInt(e.target.value) || 0 }); if (errors.year) setErrors(p => ({ ...p, year: '' })); }} required />
            {errors.year && <span className={styles.errorText}>{errors.year}</span>}
          </div>

          <div className={styles.inputWrapper}>
            <Input label="Госномер" value={formData.licensePlate} onChange={(e) => { setFormData({ ...formData, licensePlate: e.target.value }); if (errors.licensePlate) setErrors(p => ({ ...p, licensePlate: '' })); }} required />
            {errors.licensePlate && <span className={styles.errorText}>{errors.licensePlate}</span>}
          </div>

          <div className={styles.inputWrapper}>
            <Input label="Цена за день (₽)" type="number" value={formData.pricePerDay} onChange={(e) => { setFormData({ ...formData, pricePerDay: parseFloat(e.target.value) || 0 }); if (errors.pricePerDay) setErrors(p => ({ ...p, pricePerDay: '' })); }} required />
            {errors.pricePerDay && <span className={styles.errorText}>{errors.pricePerDay}</span>}
          </div>

          <Select label="Тип топлива" options={[{ value: 'petrol', label: 'Бензин' }, { value: 'diesel', label: 'Дизель' }, { value: 'electric', label: 'Электро' }, { value: 'hybrid', label: 'Гибрид' }]} value={formData.fuelType} onChange={(e) => setFormData({ ...formData, fuelType: e.target.value as any })} />
          <Select label="Коробка передач" options={[{ value: 'manual', label: 'Механика' }, { value: 'automatic', label: 'Автомат' }]} value={formData.transmission} onChange={(e) => setFormData({ ...formData, transmission: e.target.value as any })} />
          <Input label="Количество мест" type="number" value={formData.seats} onChange={(e) => setFormData({ ...formData, seats: parseInt(e.target.value) || 0 })} />

          <div className={styles.inputWrapper}>
            <Select label="Локация" options={activeLocations.map(l => ({ value: l.id, label: l.name }))} value={formData.locationId} onChange={(e) => { setFormData({ ...formData, locationId: e.target.value }); if (errors.locationId) setErrors(p => ({ ...p, locationId: '' })); }} required />
            {errors.locationId && <span className={styles.errorText}>{errors.locationId}</span>}
          </div>

          <div className={styles.formActions}>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Отмена</Button>
            <Button variant="primary" onClick={handleSubmit}>{editingCar ? 'Сохранить' : 'Добавить'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
});
