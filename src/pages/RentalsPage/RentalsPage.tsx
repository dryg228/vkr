import { useState, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { dataStore, authStore } from '@/store';
import { Card, Button, Select, Badge, Modal, Input } from '@/components/UI';
import { Rental, RentalFormData, getRentalStatusLabel, getRentalStatusColor } from '@/types';
import styles from './RentalsPage.module.scss';

export const RentalsPage = observer(() => {
  const { rentals, activeCars, rentalsLoading, createRental, updateRentalStatus, getCarById } = dataStore;
  const { isAuthenticated, user, currentRole, userId, isAdmin } = authStore;
  
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [formData, setFormData] = useState<RentalFormData>({ carId: '', renterName: '', startDate: '', endDate: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Локальный стейт для динамического отображения цены в форме
  const [livePriceInfo, setLivePriceInfo] = useState<{ days: number; total: number } | null>(null);

  const availableCars = activeCars.filter(car => car.ownerId !== userId);
  const displayRentals = isAdmin ? rentals : rentals.filter(rental => rental.renterId === userId);

  const filteredRentals = statusFilter === 'active' 
    ? displayRentals.filter(r => r.status === 'pending' || r.status === 'confirmed' || r.status === 'active') 
    : statusFilter === 'all' ? displayRentals : displayRentals.filter(r => r.status === statusFilter);

  const statusOptions = [
    { value: 'active', label: 'Активные' }, { value: 'all', label: 'Все' }, 
    { value: 'pending', label: 'Ожидает' }, { value: 'confirmed', label: 'Подтверждённые' }, { value: 'completed', label: 'Завершённые' }
  ];

  // ЭФФЕКТ: Динамический расчет стоимости аренды прямо в форме
  useEffect(() => {
    if (!formData.carId || !formData.startDate || !formData.endDate) {
      setLivePriceInfo(null);
      return;
    }

    const car = getCarById(formData.carId);
    if (!car) return;

    const start = new Date(formData.startDate).getTime();
    const end = new Date(formData.endDate).getTime();

    if (end >= start) {
      const diffTime = Math.abs(end - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // Включая первый день
      setLivePriceInfo({
        days: diffDays,
        total: diffDays * car.pricePerDay
      });
    } else {
      setLivePriceInfo(null);
    }
  }, [formData.carId, formData.startDate, formData.endDate, getCarById]);

  const handleOpenModal = () => {
    if (!(user as any)?.isVerified) {
      alert('Вам необходимо дождаться подтверждения водительских прав администратором.');
      return;
    }
    const defaultName = (user as any)?.name || (user as any)?.displayName || currentRole || '';
    
    setFormData({ 
      carId: availableCars.length > 0 ? availableCars[0].id : '', 
      renterName: defaultName, 
      startDate: '', 
      endDate: '' 
    });
    setErrors({});
    setIsModalOpen(true);
  };

  const handleStatusChange = async (id: string, status: 'confirmed' | 'active' | 'completed' | 'cancelled') => { 
    await updateRentalStatus(id, status); 
  };

  const handleSubmit = async () => { 
    if (!(user as any)?.isVerified) {
      alert('Бронирование недоступно без верификации прав.');
      return;
    }

    const newErrors: Record<string, string> = {};
    if (!formData.carId) newErrors.carId = 'Выберите автомобиль.';
    if (!formData.renterName.trim()) newErrors.renterName = 'Укажите имя.';
    if (!formData.startDate) newErrors.startDate = 'Укажите дату начала.';
    if (!formData.endDate) newErrors.endDate = 'Укажите дату окончания.';

    const today = new Date(); today.setHours(0, 0, 0, 0);

    if (formData.startDate) {
      if (new Date(formData.startDate).getTime() < today.getTime()) newErrors.startDate = 'Дата не может быть в прошлом.';
    }

    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate).getTime();
      const end = new Date(formData.endDate).getTime();
      if (end < start) {
        newErrors.endDate = 'Дата окончания не может быть раньше начала.';
      } else if (Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24)) + 1 > 30) {
        newErrors.endDate = 'Максимальный срок аренды — 30 дней.';
      }
    }

    if (Object.keys(newErrors).length > 0) return setErrors(newErrors);

    await createRental(formData); 
    setIsModalOpen(false); 
  };

  if (rentalsLoading) return <div className={styles.loading}>Загрузка ваших аренд...</div>;

    return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>{isAdmin ? 'Управление всеми арендами (Админ)' : 'Мои Аренды'}</h1>
        
        {isAuthenticated && !isAdmin && (user as any)?.isVerified && (
          <Button variant="primary" onClick={handleOpenModal}>Новая аренда</Button>
        )}
        
        {isAuthenticated && !isAdmin && !(user as any)?.isVerified && (
          <div style={{ fontSize: '14px', color: '#ef4444', fontWeight: 600, background: '#fef2f2', padding: '8px 16px', borderRadius: '12px', border: '1px solid #fee2e2' }}>
            Аренда заблокирована: дождитесь проверки ВУ
          </div>
        )}
      </div>
      
      <div className={styles.filters}>
        <Select options={statusOptions} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={styles.statusSelect} />
      </div>

      {filteredRentals.length === 0 ? (
        <div className={styles.empty}>Арендованные автомобили не найдены</div>
      ) : (
        <div className={styles.grid || styles.cardGrid}>
          {filteredRentals.map((rental) => {
            const car = getCarById(rental.carId);
            const carImageUrl = (car as any)?.carImageUrl;

            return (
              <Card key={rental.id} style={{ background: '#fff', padding: '24px', borderRadius: '24px', marginBottom: '20px', border: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                  
                  {carImageUrl ? (
                    <img 
                      src={carImageUrl} 
                      alt={rental.carName} 
                      style={{ width: '130px', height: '90px', borderRadius: '14px', objectFit: 'cover', border: '1px solid #e2e8f0' }} 
                    />
                  ) : (
                    <div style={{ width: '130px', height: '90px', borderRadius: '14px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '12px' }}>
                      Нет фото
                    </div>
                  )}

                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>{rental.carName}</h3>
                      <Badge variant={getRentalStatusColor(rental.status) as any}>{getRentalStatusLabel(rental.status)}</Badge>
                    </div>
                    
                    <div style={{ color: '#475569', fontSize: '14px', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <p style={{ margin: 0 }}><strong>Период:</strong> {new Date(rental.startDate).toLocaleDateString('ru-RU')} — {new Date(rental.endDate).toLocaleDateString('ru-RU')}</p>
                      <p style={{ margin: 0 }}><strong>Количество дней:</strong> {rental.totalDays} дн.</p>
                      <p style={{ margin: 0 }}><strong>Имя в заказе:</strong> {rental.renterName}</p>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
                      <div style={{ fontSize: '20px', fontWeight: 800, color: '#2563eb' }}>{rental.totalPrice} ₽</div>
                      
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {rental.status === 'pending' && isAdmin && (
                          <>
                            <Button size="sm" variant="primary" onClick={() => handleStatusChange(rental.id, 'confirmed')}>Подтвердить</Button>
                            <Button size="sm" variant="danger" onClick={() => handleStatusChange(rental.id, 'cancelled')}>Отклонить</Button>
                          </>
                        )}
                        {rental.status === 'confirmed' && !isAdmin && (
                          <Button size="sm" variant="primary" onClick={() => handleStatusChange(rental.id, 'active')}>Начать поездку</Button>
                        )}
                        {rental.status === 'active' && (
                          <Button size="sm" variant="success" onClick={() => handleStatusChange(rental.id, 'completed')}>Завершить аренду</Button>
                        )}
                      </div>
                    </div>
                  </div>

                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Новая аренда">
        <div className={styles.form}>
          <div className={styles.inputWrapper}>
            <Select label="Автомобиль" options={availableCars.map(c => ({ value: c.id, label: `${c.brand} ${c.model}` }))} value={formData.carId} onChange={(e) => setFormData({ ...formData, carId: e.target.value })} required />
          </div>
          <div className={styles.inputWrapper}>
            <Input label="Имя арендатора" value={formData.renterName} onChange={(e) => setFormData({ ...formData, renterName: e.target.value })} required />
          </div>
          <div className={styles.inputWrapper}>
            <Input label="Дата начала" type="date" value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} required />
          </div>
          <div className={styles.inputWrapper}>
            <Input label="Дата окончания" type="date" value={formData.endDate} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} required />
          </div>

          {/* ДОБАВЛЕНО: Информационный блок с живым расчётом стоимости */}
          {livePriceInfo && (
            <div style={{ padding: '16px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px', margin: '12px 0', color: '#1e40af', fontSize: '15px' }}>
              <strong>Итоговый расчёт:</strong> {livePriceInfo.days} дн. — <span style={{ fontSize: '18px', fontWeight: 700 }}>{livePriceInfo.total} ₽</span>
            </div>
          )}

          <div className={styles.formActions}>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Отмена</Button>
            <Button variant="primary" onClick={handleSubmit}>Создать</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
});

export default RentalsPage;
