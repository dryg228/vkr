import { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { dataStore, authStore, navigationStore } from '@/store';
import { Card, Button, Badge } from '@/components/UI';
import { LazyCarImage } from '@/components/LazyCarImage';
import { formatCarName, getFuelTypeLabel, getTransmissionLabel } from '@/types';
import styles from './CarDetailsPage.module.scss';

export const CarDetailsPage = observer(() => {
  const carId = (dataStore as any).selectedCarId || ''; 
  const car = dataStore.getCarById(carId);
  const { isAuthenticated, userId, user, isAdmin } = authStore;

  const [carPhoto, setCarPhoto] = useState<string | null>(null);

  useEffect(() => {
    if (carId) {
      dataStore.loadCarImage(carId).then((img) => {
        if (img) setCarPhoto(img);
      });
    }
  }, [carId]);

  if (!car) {
    return (
      <div className={styles.errorPage}>
        <h2>Автомобиль не найден</h2>
        <Button variant="secondary" onClick={() => navigationStore.navigate('cars')}>
          Вернуться в каталог
        </Button>
      </div>
    );
  }

  const { rating, count } = dataStore.getCarRatingInfo(car.id);
  const carReviews = dataStore.getReviewsForCar(car.id);
  
  const carOwnerId = (car as any).ownerId || '';
  const ownerData = (dataStore as any).usersList?.[carOwnerId];
  const ownerName = ownerData?.name || ownerData?.displayName || 'Частное лицо';
  const bookedDates = dataStore.getCarBookedDates(car.id);

  return (
    <div className={styles.page}>
      <div className={styles.backButtonWrapper}>
        <Button variant="secondary" size="sm" onClick={() => navigationStore.navigate('cars')}>
          ← Назад в каталог
        </Button>
      </div>

      <div className={styles.mainLayout}>
        
        {/* ЛЕВАЯ СЕКЦИЯ: Медиа и Социальный блок */}
        <div className={styles.leftColumn}>
          {/* 1. ФОТОГРАФИЯ АВТОМОБИЛЯ */}
          <div className={styles.imageCenterContainer}>
            <Card className={styles.imageCard}>
              <div className={styles.imageWrapper}>
                <LazyCarImage carId={car.id} alt={formatCarName(car)} className={styles.lazyImage} />
              </div>
            </Card>
          </div>

          {/* 4. ОТЗЫВЫ ВОДИТЕЛЕЙ (на десктопе идут под фото, на мобилках упадут в самый низ) */}
          <Card className={styles.reviewsCard}>
            <h3 className={styles.sectionTitle}>Отзывы водителей ({carReviews.length})</h3>

            {carReviews.length === 0 ? (
              <p className={styles.emptyReviews}>
                Об этой машине пока нет отзывов. Вы можете стать первым после завершения аренды!
              </p>
            ) : (
              <div className={styles.reviewsList}>
                {carReviews.map((review) => {
                  const rev = review as any;
                  return (
                    <div key={review.id} className={styles.reviewItem}>
                      <div className={styles.reviewHeader}>
                        <strong className={styles.reviewAuthor}>
                          {rev.userName || rev.renterName || rev.authorName || 'Анонимный водитель'}
                        </strong>
                        <span className={styles.reviewStars}>
                          {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                        </span>
                      </div>
                      <p className={styles.reviewText}>{review.comment}</p>
                      {review.createdAt && (
                        <span className={styles.reviewDate}>
                          {new Date(review.createdAt).toLocaleDateString('ru-RU')}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        {/* ПРАВАЯ СЕКЦИЯ: Коммерческий блок и Характеристики */}
        <div className={styles.rightColumn}>
          {/* 3. ОСНОВНАЯ КАРТОЧКА БРОНИРОВАНИЯ */}
          <Card className={styles.bookingCard}>
            <h1 className={styles.carTitle}>{formatCarName(car)}</h1>
            
            <div className={styles.ratingRow}>
              <span className={styles.stars}>{rating > 0 ? `★ ${rating}` : '★ Нет оценок'}</span>
              {count > 0 && <span className={styles.reviewsCount}>({count} отзывов)</span>}
            </div>

            <div className={styles.priceRow}>
              <span className={styles.priceAmount}>{car.pricePerDay} ₽</span>
              <span className={styles.pricePeriod}> / день</span>
            </div>

            <div className={styles.ownerBlock}>
              <span className={styles.ownerMeta}>Владелец машины</span>
              <strong className={styles.ownerName}>{ownerName}</strong>
            </div>

            {/* Календарь забронированных дат */}
            {bookedDates.length > 0 && (
              <div className={styles.bookedDatesCalendar}>
                <span className={styles.calendarTitle}>📅 Периоды бронирования:</span>
                <div className={styles.calendarList}>
                  {bookedDates.map((period, idx) => (
                    <div 
                      key={idx} 
                      className={period.status === 'active' ? styles.calendarActiveTrip : styles.calendarBooked}
                    >
                      <span>{period.status === 'active' ? '🔴 В поездке:' : '🟡 Подтверждено:'}</span>
                      <strong>{period.start} — {period.end}</strong>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className={styles.actionWrapper}>
              {isAdmin ? (
                <div className={styles.adminBadge}>🔧 Режим просмотра (Администратор)</div>
              ) : car.ownerId === userId ? (
                <div className={styles.myCarBadge}>Это ваш автомобиль</div>
              ) : car.status !== 'available' ? (
                <Button variant="primary" className={styles.submitBtn} disabled>Автомобиль занят</Button>
              ) : isAuthenticated && !(user as any)?.isVerified ? (
                <div className={styles.verificationWarningBlock}>
                  <div className={styles.warningMessage}>
                    Для аренды автомобиля необходимо дождаться подтверждения водительского удостоверения администратором.
                  </div>
                  <Button 
                    variant="secondary" 
                    className={styles.submitBtn}
                    onClick={() => navigationStore.navigate('profile' as any)}
                  >
                    Проверить статус в профиле
                  </Button>
                </div>
              ) : (
                <Button 
                  variant="primary" 
                  className={styles.submitBtn}
                  onClick={() => {
                    if (!isAuthenticated) {
                      authStore.openLoginModal();
                    } else {
                      dataStore.setSelectedCarForRental(car.id);
                      navigationStore.navigate('rentals' as any);
                    }
                  }}
                >
                  Арендовать автомобиль
                </Button>
              )}
            </div>
          </Card>

          {/* 2. ТЕХНИЧЕСКИЕ ХАРАКТЕРИСТИКИ */}
          <Card className={styles.infoCard}>
            <h3 className={styles.sectionTitle}>Технические характеристики</h3>
            <div className={styles.specsGrid}>
              <div className={styles.specItem}>
                <span className={styles.specLabel}>Тип топлива:</span>
                <span className={styles.specValue}>{getFuelTypeLabel(car.fuelType)}</span>
              </div>
              <div className={styles.specItem}>
                <span className={styles.specLabel}>Коробка передач:</span>
                <span className={styles.specValue}>{getTransmissionLabel(car.transmission)}</span>
              </div>
              <div className={styles.specItem}>
                <span className={styles.specLabel}>Количество мест:</span>
                <span className={styles.specValue}>{car.seats} мест</span>
              </div>
              <div className={styles.specItem}>
                <span className={styles.specLabel}>Год выпуска:</span>
                <span className={styles.specValue}>{car.year} г.</span>
              </div>
              <div className={styles.specItem}>
                <span className={styles.specLabel}>Госномер:</span>
                <span className={styles.specValue}>{car.licensePlate}</span>
              </div>
              <div className={styles.specItem}>
                <span className={styles.specLabel}>Статус:</span>
                <Badge variant={car.status === 'available' ? 'success' : ('warning' as any)}>
                  {car.status === 'available' ? 'Доступен' : 'Занят'}
                </Badge>
              </div>
            </div>
          </Card>
        </div>

      </div>
    </div>
  );
});

export default CarDetailsPage;
