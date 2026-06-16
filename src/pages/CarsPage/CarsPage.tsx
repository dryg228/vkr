import { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { dataStore, authStore, navigationStore } from '@/store';
import { Card, Button, Input, Select, Badge } from '@/components/UI';
import { formatCarName } from '@/types';
import styles from './CarsPage.module.scss';

export const CarsPage = observer(() => {
  const { filteredCars, activeLocations, carsLoading, setFilter, getLocationById } = dataStore;
  const { isAuthenticated, userId, isAdmin, user } = authStore; 
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

  // Фильтрация: Показываем только активные, доступные И ПОДТВЕРЖДЕННЫЕ автомобили, кроме собственных
  const displayCars = filteredCars.filter(car => {
    const isAvailable = (car.isActive ?? true) && car.status === 'available';
    const isNotMine = (car as any).ownerId !== userId;
    const isCarVerified = (car as any).isVerified === true; 
    
    return isAvailable && isNotMine && isCarVerified;
  });

  if (carsLoading) return <div className={styles.loading}>Загрузка каталога...</div>;

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
              {/* ДОБАВЛЕНО: Блок вывода полноценной фотографии автомобиля сверху карточки */}
              <div style={{ width: '100%', height: '180px', borderRadius: '16px', overflow: 'hidden', background: '#f8fafc', marginBottom: '16px', border: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {(car as any).carImageUrl ? (
                  <img 
                    src={(car as any).carImageUrl} 
                    alt={formatCarName(car)} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                  />
                ) : (
                  <span style={{ color: '#94a3b8', fontSize: '14px' }}>Фото отсутствует</span>
                )}
              </div>

              <div className={styles.carHeader}>
                <h3 className={styles.carName}>{formatCarName(car)}</h3>
                <Badge variant={(car.status === 'available' ? 'success' : 'warning') as any}>
                  {car.status === 'available' ? 'Доступен' : 'Занят'}
                </Badge>
              </div>

              <div className={styles.carDetails}>
                <span>{car.fuelType === 'petrol' ? 'Бензин' : car.fuelType === 'diesel' ? 'Дизель' : car.fuelType === 'electric' ? 'Электро' : 'Гибрид'}</span> | 
                <span> {car.transmission === 'manual' ? 'Механика' : 'Автомат'}</span> | 
                <span> {car.seats} мест</span>
              </div>
              
              <p className={styles.location} style={{ margin: '8px 0 4px 0' }}><strong>Локация:</strong> {getLocationById(car.locationId)?.name || 'Не указано'}</p>
              
              <p className={styles.owner} style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 12px 0' }}>
                <strong>Владелец:</strong> {(car as any).ownerName || (car as any).ownerId || 'Администратор'}
              </p>

              <div className={styles.carPrice}>{car.pricePerDay} ₽/день</div>

              <div className={styles.carActions} style={{ marginTop: '16px' }}>
                {isAdmin ? (
                  <div style={{ textTransform: 'uppercase', fontSize: '12px', fontWeight: 700, color: '#64748b', textAlign: 'center', padding: '10px', background: '#f1f5f9', borderRadius: '12px' }}>
                    Режим просмотра (Админ)
                  </div>
                ) : isAuthenticated && !(user as any)?.isVerified ? (
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#ef4444', textAlign: 'center', padding: '10px', background: '#fef2f2', borderRadius: '12px', border: '1px solid #fee2e2' }}>
                    Подтвердите профиль (права) в личном кабинете
                  </div>
                ) : (
                  <Button 
                    variant="primary" 
                    size="sm" 
                    style={{ width: '100%' }}
                    onClick={() => {
                      if (!isAuthenticated) {
                        authStore.openLoginModal();
                      } else {
                        dataStore.setSelectedCarForRental(car.id);
                        navigationStore.navigate('rentals');
                      }
                    }}
                  >
                    Арендовать
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
});

export default CarsPage;
