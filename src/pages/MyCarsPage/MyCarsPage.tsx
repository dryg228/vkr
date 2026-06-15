import { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { dataStore, authStore } from '@/store';
import { Card, Button, Badge, Modal, Input, Select } from '@/components/UI';
import { Car, CarFormData, getCarStatusLabel, getFuelTypeLabel, getTransmissionLabel, formatCarName } from '@/types';
import styles from './MyCarsPage.module.scss';

export const MyCarsPage = observer(() => {
  const { 
    cars, 
    activeLocations, 
    createCar, 
    updateCar, 
    deleteCar, 
    getLocationById,
    brandTemplates,       // Получаем шаблоны марок из Firebase
    loadBrandTemplates,   // Метод загрузки шаблонов из БД
    templatesLoading      // Индикатор загрузки данных
  } = dataStore;

  const { isAdmin, isAuthenticated } = authStore;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCar, setEditingCar] = useState<Car | null>(null);
  const [formData, setFormData] = useState<CarFormData>({ 
    brand: '', 
    model: '', 
    year: 2026, 
    licensePlate: '', 
    fuelType: 'petrol', 
    transmission: 'automatic', 
    seats: 5, 
    pricePerDay: 2000, 
    locationId: '' 
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const authAny = authStore as any;

  // 1. Загружаем шаблоны марок из Firebase при монтировании страницы
  useEffect(() => {
    loadBrandTemplates();
  }, []);

  // 2. Формируем список брендов динамически из ключей базы данных
   // 1. Извлекаем ключи из базы данных
  const brandKeys = Object.keys(brandTemplates || {});

  // 2. Если вдруг БД пустая или ещё грузится, создаем временный запасной список, чтобы интерфейс не ломался
  const fallbackBrands = ['ВАЗ', 'Lada', 'Audi', 'BMW', 'Mercedes-Benz', 'Toyota', 'Kia', 'Hyundai', 'Tesla'];
  const finalBrandsList = brandKeys.length > 0 ? brandKeys : fallbackBrands;

  // 3. Формируем массив для селекта. Передаем и структуру объектов, и плоский список, чтобы точно сработало
  const allBrands = finalBrandsList.map(brandName => ({
    value: brandName,
    id: brandName,       // На случай, если ваш селект ищет id вместо value
    label: brandName === 'ВАЗ' ? 'ВАЗ (Lada)' : brandName
  }));

  allBrands.sort((a, b) => a.label.localeCompare(b.label));


  allBrands.sort((a, b) => a.label.localeCompare(b.label));

  // 3. Автоматически заполняем начальные значения, когда шаблоны загрузились из Firebase
  useEffect(() => {
    if (allBrands.length > 0 && !formData.brand && !editingCar) {
      const defaultBrand = allBrands[0]?.value || '';
      const template = brandTemplates[defaultBrand];
      setFormData(prev => ({
        ...prev,
        brand: defaultBrand,
        fuelType: template?.fuelType || 'petrol',
        transmission: template?.transmission || 'automatic',
        seats: template?.seats || 5,
        pricePerDay: template?.pricePerDay || 2000,
        locationId: activeLocations && activeLocations.length > 0 ? activeLocations[0].id : ''
      }));
    }
  }, [brandTemplates, activeLocations, editingCar]);

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
    if (!isAuthenticated) return; // Проверяем просто авторизацию, а не только админа
    
    if (car) {
      setEditingCar(car);
      setFormData({ 
        brand: car.brand, 
        model: car.model, 
        year: car.year, 
        licensePlate: car.licensePlate, 
        fuelType: car.fuelType, 
        transmission: car.transmission, 
        seats: car.seats, 
        pricePerDay: car.pricePerDay, 
        locationId: car.locationId 
      });
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

    if (!formData.brand) newErrors.brand = 'Выберите марку автомобиля.';
    if (!formData.model.trim()) newErrors.model = 'Укажите модель автомобиля.';
    if (!formData.licensePlate.trim()) newErrors.licensePlate = 'Введите госномер.';

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
      // Автоматически обогащаем данными о владельце при создании пользователем
      const enrichedData = {
        ...formData,
        ownerName: authAny.isAdmin ? 'Админ' : 'Пользователь',
        renterName: authAny.isAdmin ? 'Админ' : 'Пользователь'
      };
      await createCar(enrichedData as any);
    }
    setIsModalOpen(false);
  };

  const handleDelete = async (id: string) => { 
    if (confirm('Удалить автомобиль?')) await deleteCar(id); 
  };

  if (templatesLoading) {
    return <div className={styles.loading}>Загрузка конфигураций...</div>;
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Мои автомобили</h1>
        {/* Кнопка теперь доступна всем вошедшим пользователям */}
        {isAuthenticated && (
          <Button variant="primary" onClick={() => handleOpenModal()}>Добавить авто</Button>
        )}
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
              <p className={styles.location}>{getLocationById(car.locationId)?.name || 'Не указана'}</p>
              <div className={styles.carPrice}>{car.pricePerDay} ₽/день</div>
              
              {/* Управление своими машинами разрешено всем авторизованным пользователям */}
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
