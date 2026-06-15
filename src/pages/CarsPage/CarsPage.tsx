import { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { dataStore, authStore, navigationStore } from '@/store';
import { Card, Button, Input, Select, Badge } from '@/components/UI';
import { formatCarName } from '@/types';
import styles from './CarsPage.module.scss';

export const CarsPage = observer(() => {
  const { filteredCars, activeLocations, carsLoading, setFilter, getLocationById } = dataStore;
  const { isAuthenticated } = authStore;
  const [searchValue, setSearchValue] = useState('');

  // Эффект задержки (Debounce) для поисковой строки
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilter('search', searchValue || undefined);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchValue]);

  const fuelOptions = [
    { value: 'all', label: 'Все типы' }, { value: 'petrol', label: 'Бензин' }, 
    { value: 'diesel', label: 'Дизель' }, { value: 'electric', label: 'Электро' }, { value: 'hybrid', label: 'Гибрид' }
  ];
  
  const transmissionOptions = [
    { value: 'all', label: 'Любая КПП' }, { value: 'manual', label: 'Механика' }, { value: 'automatic', label: 'Автомат' }
  ];
  
  const locationOptions = [
    { value: 'all', label: 'Все локации' }, ...activeLocations.map(l => ({ value: l.id, label: l.name }))
  ];

const displayCars = filteredCars.filter(car => (car.isActive ?? true) && car.status === 'available');


  if (carsLoading) {
    return <div className={styles.loading}>Загрузка каталога...</div>;
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Каталог автомобилей</h1>
      </div>

      <div className={styles.filters}>
        <Input placeholder="Поиск по марке/модели..." value={searchValue} onChange={(e) => setSearchValue(e.target.value)} className={styles.searchInput} />
        <Select options={locationOptions} value={dataStore.filters.locationId || 'all'} onChange={(e) => setFilter('locationId', e.target.value === 'all' ? undefined : e.target.value)} />
        <Select options={fuelOptions} value={dataStore.filters.fuelType || 'all'} onChange={(e) => setFilter('fuelType', e.target.value === 'all' ? undefined : e.target.value)} />
        <Select options={transmissionOptions} value={dataStore.filters.transmission || 'all'} onChange={(e) => setFilter('transmission', e.target.value === 'all' ? undefined : e.target.value)} />
      </div>

      {displayCars.length === 0 ? (
        <div className={styles.empty}>Автомобили не найдены</div>
      ) : (
        <div className={styles.grid}>
          {displayCars.map(car => (
            <Card key={car.id} className={styles.carCard}>
              <div className={styles.carHeader}>
                <h3 className={styles.carName}>{formatCarName(car)}</h3>
                <Badge variant={car.status === 'available' ? 'success' : 'warning'}>
                  {car.status === 'available' ? 'Доступен' : 'Занят'}
                </Badge>
              </div>
              <div className={styles.carDetails}>
                <span>{car.fuelType === 'petrol' ? 'Бензин' : car.fuelType === 'diesel' ? 'Дизель' : car.fuelType === 'electric' ? 'Электро' : 'Гибрид'}</span>
                <span>{car.transmission === 'manual' ? 'Механика' : 'Автомат'}</span>
                <span>{car.seats} мест</span>
              </div>
              <p className={styles.location}>{getLocationById(car.locationId)?.name || 'Не указано'}</p>
              <div className={styles.carPrice}>{car.pricePerDay} ₽/день</div>

              {/* Кнопка с умной проверкой авторизации */}
              <div className={styles.carActions} style={{ marginTop: '16px' }}>
                <Button 
                  variant="primary" 
                  size="sm" 
                  style={{ width: '100%' }}
                  onClick={() => {
                    if (!isAuthenticated) {
                      authStore.openLoginModal();
                    } else {
                      navigationStore.navigate('rentals');
                    }
                  }}
                >
                  Аrenдовать
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
});
