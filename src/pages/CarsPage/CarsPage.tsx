import { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { dataStore, authStore, navigationStore } from '@/store';
import { Card, Button, Input, Select, Badge, Modal } from '@/components/UI';
import { LocationDropdown } from '@/components/UI/LocationDropdown';
import { LazyCarImage } from '@/components/LazyCarImage';
import { formatCarName } from '@/types';
import styles from './CarsPage.module.scss';

export const CarsPage = observer(() => {
  const { filteredCars, locations, carsLoading, setFilter, getLocationById } = dataStore;
  const { userId } = authStore;
  const [searchValue, setSearchValue] = useState('');
  const [selectedPreviewImage, setSelectedPreviewImage] = useState<string | null>(null);

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

  const displayCars = filteredCars.filter(car => {
    const isNotMine = (car as any).ownerId !== userId;
    const isCarVerified = (car as any).isVerified === true;
    return (car.isActive ?? true) && isNotMine && isCarVerified;
  });

  if (carsLoading) return <div className={styles.loading}>Загрузка каталога...</div>;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Каталог автомобилей</h1>
      </div>

      <div className={styles.filters}>
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Поиск автомобиля</label>
          <Input 
            placeholder="Поиск по марке/модели..." 
            value={searchValue} 
            onChange={(e) => setSearchValue(e.target.value)} 
            className={styles.searchInput} 
          />
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Выбор локации</label>
          <div className={styles.locationWrapper}>
            <LocationDropdown
              locations={locations}
              value={dataStore.filters.locationId || ''}
              onChange={(val) => setFilter('locationId', val === '' ? undefined : val)}
              placeholder="Все локации"
            />
          </div>
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Тип двигателя</label>
          <Select 
            options={fuelOptions} 
            value={dataStore.filters.fuelType || 'all'} 
            onChange={(e: any) => setFilter('fuelType', e.target?.value === 'all' ? undefined : (e.target?.value ?? e))} 
          />
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Коробка передач</label>
          <Select 
            options={transmissionOptions} 
            value={dataStore.filters.transmission || 'all'} 
            onChange={(e: any) => setFilter('transmission', e.target?.value === 'all' ? undefined : (e.target?.value ?? e))} 
          />
        </div>
      </div>

      {displayCars.length === 0 ? (
        <div className={styles.empty}>Автомобили не найдены</div>
      ) : (
        <div className={styles.grid}>
          {displayCars.map(car => (
            <Card key={car.id} className={styles.carCard}>
              <div
                className={styles.imageContainer}
                onClick={async () => {
                  const img = await dataStore.loadCarImage(car.id);
                  if (img) setSelectedPreviewImage(img);
                }}
              >
                <LazyCarImage carId={car.id} alt={formatCarName(car)} className={styles.carImage} />
              </div>

              <div className={styles.carHeader}>
                <h3 className={styles.carName}>{formatCarName(car)}</h3>
                <Badge variant={(car.status === 'available' ? 'success' : 'warning') as any}>
                  {car.status === 'available' ? 'Доступен' : 'Занят'}
                </Badge>
              </div>

              {(() => {
                const { rating, count } = dataStore.getCarRatingInfo(car.id);
                return (
                  <div className={styles.ratingBlock}>
                    <span className={styles.ratingStars}>{rating > 0 ? `★ ${rating}` : '★ Нет оценок'}</span>
                    {count > 0 && <span className={styles.ratingCount}>({count})</span>}
                  </div>
                );
              })()}

              <div className={styles.carDetails}>
                <span>{car.fuelType === 'petrol' ? 'Бензин' : car.fuelType === 'diesel' ? 'Дизель' : car.fuelType === 'electric' ? 'Электро' : 'Гибрид'}</span>
                <span>{car.transmission === 'manual' ? 'Механика' : 'Автомат'}</span>
                <span>{car.seats} мест</span>
              </div>

              {(() => {
                const bookedDates = dataStore.getCarBookedDates(car.id);
                if (bookedDates.length === 0) return null;
                return (
                  <div className={styles.bookedDatesBlock}>
                    <strong className={styles.bookedDatesTitle}>Занятые даты:</strong>
                    {bookedDates.map((p, idx) => (
                      <div 
                        key={idx} 
                        className={p.status === 'active' ? styles.dateActiveTrip : styles.dateBooked}
                      >
                        {p.status === 'active' ? '● В поездке: ' : '○ Бронь: '} {p.start} — {p.end}
                      </div>
                    ))}
                  </div>
                );
              })()}

              <p className={styles.location}>📍 {getLocationById(car.locationId)?.name || 'Не указано'}</p>

              <p className={styles.owner}>
                <strong>Владелец:</strong> {(car as any).ownerName || (car as any).ownerId || 'Администратор'}
              </p>

              <div className={styles.carPrice}>{car.pricePerDay} ₽/день</div>

              <div className={styles.carActions}>
                <Button
                  variant="primary"
                  size="sm"
                  className={styles.actionBtn}
                  onClick={() => {
                    (dataStore as any).selectedCarId = car.id;
                    navigationStore.navigate('car-details' as any);
                  }}
                >
                  Подробнее
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal isOpen={!!selectedPreviewImage} onClose={() => setSelectedPreviewImage(null)} title="Просмотр автомобиля">
        <div className={styles.modalContent}>
          {selectedPreviewImage && <img src={selectedPreviewImage} alt="Авто" className={styles.modalImage} />}
          <div className={styles.modalActions}>
            <Button variant="secondary" onClick={() => setSelectedPreviewImage(null)}>Закрыть</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
});

export default CarsPage;
