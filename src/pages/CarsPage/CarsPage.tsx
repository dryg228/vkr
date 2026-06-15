import { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { dataStore, authStore, navigationStore } from '@/store';
import { Card, Button, Input, Select, Badge } from '@/components/UI';
import { formatCarName } from '@/types';
import styles from './CarsPage.module.scss';

export const CarsPage = observer(() => {
  const { filteredCars, activeLocations, carsLoading, setFilter, getLocationById } = dataStore;
  const { isAuthenticated, currentRole } = authStore; 
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

  // Фильтрация: Показываем только активные, доступные автомобили, 
  // у которых ownerId НЕ совпадает с идентификатором текущего пользователя
  const displayCars = filteredCars.filter(car => {
    const isAvailable = (car.isActive ?? true) && car.status === 'available';
    const isNotMine = (car as any).ownerId !== (currentRole || '');
    return isAvailable && isNotMine;
  });

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
        <Select options={locationOptions} value={dataStore.filters.locationId || 'all'} onChange={(e: any) => setFilter('locationId', e.target?.value === 'all' ? undefined : (e.target?.value ?? e))} />
        <Select options={fuelOptions} value={dataStore.filters.fuelType || 'all'} onChange={(e: any) => setFilter('fuelType', e.target?.value === 'all' ? undefined : (e.target?.value ?? e))} />
        <Select options={transmissionOptions} value={dataStore.filters.transmission || 'all'} onChange={(e: any) => setFilter('transmission', e.target?.value === 'all' ? undefined : (e.target?.value ?? e))} />
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
              <p className={styles.location}><strong>Локация:</strong> {getLocationById(car.locationId)?.name || 'Не указано'}</p>
              
              {/* Строка с выводом владельца автомобиля */}
              <p className={styles.owner} style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 12px 0' }}>
                <strong>Владелец:</strong> {(car as any).ownerName || (car as any).ownerId || 'Администратор'}
              </p>

              <div className={styles.carPrice}>{car.pricePerDay} ₽/день</div>

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
                  Арендовать
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
});

export default CarsPage;
