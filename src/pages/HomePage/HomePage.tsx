import { useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { dataStore, authStore, navigationStore } from '@/store';
import { Card, Button, Badge } from '@/components/UI';
import styles from './HomePage.module.scss';

// Компонент карточки метрики (StatCard) очищен от инлайн-стилей
const StatCard = ({ title, value, icon, color }: { title: string; value: number | string; icon: React.ReactNode; color: 'primary' | 'success' | 'warning' | 'info' }) => (
  <Card className={`${styles.statCard} ${styles[color]}`}>
    <div className={styles.statIcon}>{icon}</div>
    <div className={styles.statValue}>{value}</div>
    <div className={styles.statTitle}>{title}</div>
  </Card>
);

export const HomePage = observer(() => {
  const { cars, rentals, locations, loadAllData, carsLoading } = dataStore;
  const { isOwner, isAdmin } = authStore;
  const { navigate } = navigationStore;

  useEffect(() => { loadAllData(); }, [loadAllData]);

  // СИНХРОНИЗИРОВАНО: Объявляем activeCars и другие метрики без флага isActive
  const activeCars = cars;
  const availableCars = cars.filter(c => c.status === 'available');
  const activeRentals = rentals.filter(r => r.status !== 'cancelled' && r.status !== 'completed');
  const activeLocations = locations.filter(l => l.isActive);

  return (
    <div className={styles.page}>
      {/* Приветственный баннер */}
      <section className={styles.welcome}>
        <div className={styles.welcomeContent}>
          <h1 className={styles.welcomeTitle}>P2P Аренда автомобилей</h1>
          <p className={styles.welcomeText}>
            Платформа для аренды автомобилей между частными лицами. Найдите идеальный автомобиль или сдайте свой в аренду.
            {!isOwner && ' Войдите как владелец для управления автомобилями.'}
          </p>
          {!authStore.isAuthenticated && (
            <Button variant="primary" size="lg" onClick={() => authStore.openLoginModal()}>Войти в систему</Button>
          )}
        </div>
        <div className={styles.welcomeDecor}>
          <svg viewBox="0 0 200 200" fill="none">
            <circle cx="100" cy="100" r="80" stroke="currentColor" strokeWidth="2" opacity="0.2" />
            <circle cx="100" cy="100" r="60" stroke="currentColor" strokeWidth="2" opacity="0.3" />
          </svg>
        </div>
      </section>
      {/* Секция со сводными метриками платформы */}
      <section className={styles.stats}>
        <StatCard 
          title="Автомобилей" 
          value={carsLoading ? '...' : activeCars.length} 
          color="primary" 
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 17a2 2 0 104 0 2 2 0 00-4 0zM15 17a2 2 0 104 0 2 2 0 00-4 0z" /><path d="M5 17H3v-6l2-4h9l4 4h3v6h-2M5 17h10" /></svg>} 
        />
        <StatCard 
          title="Доступно" 
          value={availableCars.length} 
          color="success" 
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22,4 12,14.01 9,11.01" /></svg>} 
        />
        <StatCard 
          title="Активных аренд" 
          value={activeRentals.length} 
          color="warning" 
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>} 
        />
        <StatCard 
          title="Локаций" 
          value={activeLocations.length} 
          color="info" 
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></svg>} 
        />
      </section>

      {/* Секция быстрых действий, адаптированная под роли пользователей */}
      <section className={styles.quickActions}>
        <h2 className={styles.sectionTitle}>Быстрые действия</h2>
        <div className={styles.actionCards}>
          
          <Card className={styles.actionCard} hoverable onClick={() => navigate('cars')}>
            <div className={styles.actionIcon}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 17a2 2 0 104 0 2 2 0 00-4 0zM15 17a2 2 0 104 0 2 2 0 00-4 0z" /><path d="M5 17H3v-6l2-4h9l4 4h3v6h-2M5 17h10" /></svg>
            </div>
            <h3>Каталог авто</h3>
            <p>Найти автомобиль для аренды</p>
            <Badge variant="success">{availableCars.length} доступно</Badge>
          </Card>

          <Card className={styles.actionCard} hoverable onClick={() => navigate('rentals')}>
            <div className={styles.actionIcon}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /></svg>
            </div>
            <h3>Аренды</h3>
            <p>Просмотр бронирований</p>
            {activeRentals.length > 0 && <Badge variant="warning">{activeRentals.length} active</Badge>}
          </Card>

          {isOwner && (
            <Card className={styles.actionCard} hoverable onClick={() => navigate('my-cars')}>
              <div className={styles.actionIcon}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" /></svg>
              </div>
              <h3>Мои машины</h3>
              <p>Управление вашими авто</p>
            </Card>
          )}

          {isAdmin && (
            <Card className={styles.actionCard} hoverable onClick={() => navigate('admin')}>
              <div className={styles.actionIcon}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" /></svg>
              </div>
              <h3>Администрирование</h3>
              <p>Управление платформой</p>
            </Card>
          )}

        </div>
      </section>
    </div>
  );
});

export default HomePage;
