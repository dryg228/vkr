import { observer } from 'mobx-react-lite';
import { authStore, dataStore } from '@/store';
import { Card, Badge } from '@/components/UI';
import { getRentalStatusLabel, getRentalStatusColor } from '@/types';
import styles from './ProfilePage.module.scss';

export const ProfilePage = observer(() => {
  const { rentals } = dataStore;
  const { isAdmin, user } = authStore;

  // Безопасно считываем имя и почту из обновленного объекта user нашего стора
  const userAny = user as any;
  const displayUserName = userAny.name || 'Пользователь';
  const displayUserEmail = userAny.email || (isAdmin ? 'admin@autorent.ru' : 'user@autorent.ru');
  
  const initialLetter = displayUserName.charAt(0).toUpperCase();
  const displayRole = isAdmin ? 'Администратор' : 'Клиент';

  // Фильтруем историю аренд конкретного пользователя
  const myRentalsHistory = rentals.filter(rental => {
    const rentalAny = rental as any;
    const rawRenterName = rentalAny.renterName || rentalAny.renter?.name || '';
    
    if (isAdmin) {
      return String(rawRenterName).trim().toLowerCase() === 'админ';
    } else {
      return String(rawRenterName).trim().toLowerCase() !== 'админ';
    }
  });

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Личный кабинет</h1>
      </div>

      <div className={styles.profileGrid}>
        {/* Левая колонка: Информация об авторизованном аккаунте */}
        <div className={styles.infoCard}>
          <div className={styles.avatar}>{initialLetter}</div>
          <h2 className={styles.userName}>{displayUserName}</h2>
          <p className={styles.userEmail}>{displayUserEmail}</p>
          
          <div className={styles.badgeWrapper}>
            <Badge variant={isAdmin ? 'error' : 'success'}>
              {displayRole}
            </Badge>
          </div>
        </div>

        {/* Правая колонка: История бронирований */}
        <div className={styles.historyCard}>
          <h3 className={styles.sectionTitle}>История поездок</h3>
          
          {myRentalsHistory.length === 0 ? (
            <div className={styles.emptyHistory}>Вы еще не бронировали автомобили</div>
          ) : (
            <div className={styles.tableWrapper}>
              <table>
                <thead>
                  <tr>
                    <th>Автомобиль</th>
                    <th>Начало аренды</th>
                    <th>Конец аренды</th>
                    <th>Сумма</th>
                    <th>Статус</th>
                  </tr>
                </thead>
                <tbody>
                  {myRentalsHistory.map(rental => (
                    <tr key={rental.id}>
                      <td style={{ fontWeight: 600 }}>{rental.carName}</td>
                      <td>{new Date(rental.startDate).toLocaleDateString('ru-RU')}</td>
                      <td>{new Date(rental.endDate).toLocaleDateString('ru-RU')}</td>
                      <td style={{ fontWeight: 600, color: '#2563eb' }}>{rental.totalPrice} ₽</td>
                      <td>
                        <Badge variant={getRentalStatusColor(rental.status) as any}>
                          {getRentalStatusLabel(rental.status)}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export default ProfilePage;
