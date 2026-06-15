import { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { dataStore, authStore } from '@/store';
import { Card, Button, Select, Badge, Modal, Input } from '@/components/UI';
import { Rental, RentalFormData, getRentalStatusLabel, getRentalStatusColor } from '@/types';
import styles from './RentalsPage.module.scss';

export const RentalsPage = observer(() => {
  const { rentals, activeCars, rentalsLoading, createRental, updateRentalStatus } = dataStore;
  const { isAuthenticated, user, currentRole } = authStore;
  
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [formData, setFormData] = useState<RentalFormData>({ 
    carId: '', 
    renterName: '', 
    startDate: '', 
    endDate: '' 
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 1. Показываем ВСЕ аренды без привязки к ID, чтобы они точно отображались на экране из БД
  const filteredRentals = statusFilter === 'active' 
    ? rentals.filter(r => r.status === 'pending' || r.status === 'confirmed' || r.status === 'active') 
    : statusFilter === 'all' 
      ? rentals 
      : rentals.filter(r => r.status === statusFilter);

  const statusOptions = [
    { value: 'active', label: 'Активные' }, 
    { value: 'all', label: 'Все' }, 
    { value: 'pending', label: 'Ожидают' }, 
    { value: 'confirmed', label: 'Подтверждённые' }, 
    { value: 'completed', label: 'Завершённые' }
  ];

  const handleOpenModal = () => {
    // Автоматически подставляем имя пользователя или его почту при открытии формы
    const defaultName = (user as any)?.name || (user as any)?.displayName || currentRole || '';
    
    setFormData({ 
      carId: activeCars.length > 0 ? activeCars[0].id : '', 
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
    const newErrors: Record<string, string> = {};

    if (!formData.carId) newErrors.carId = 'Выберите автомобиль из списка.';
    if (!formData.renterName.trim()) newErrors.renterName = 'Укажите имя арендатора.';
    if (!formData.startDate) newErrors.startDate = 'Укажите дату начала аренды.';
    if (!formData.endDate) newErrors.endDate = 'Укажите дату окончания аренды.';

    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate).getTime();
      const end = new Date(formData.endDate).getTime();
      if (end < start) {
        newErrors.endDate = 'Дата окончания не может быть раньше даты начала.';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    await createRental(formData); 
    setIsModalOpen(false); 
  };

  if (rentalsLoading) {
    return <div className={styles.loading}>Загрузка ваших аренд...</div>;
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Мои Аренды</h1>
        {isAuthenticated && (
          <Button variant="primary" onClick={handleOpenModal}>Новая аренда</Button>
        )}
      </div>
      
      <div className={styles.filters}>
        <Select 
          options={statusOptions} 
          value={statusFilter} 
          onChange={(e) => setStatusFilter(e.target.value)} 
          className={styles.statusSelect} 
        />
      </div>

      {filteredRentals.length === 0 ? (
        <div className={styles.empty}>У вас нет активных или завершенных арендованных автомобилей</div>
      ) : (
        <div className={styles.grid || styles.cardGrid}>
          {filteredRentals.map((rental) => (
            <Card key={rental.id} style={{ background: '#fff', padding: '24px', borderRadius: '24px', marginBottom: '20px', border: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>{rental.carName}</h3>
                <Badge variant={getRentalStatusColor(rental.status) as any}>
                  {getRentalStatusLabel(rental.status)}
                </Badge>
              </div>
              
              <div style={{ color: '#475569', fontSize: '14px', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <p style={{ margin: 0 }}><strong>Период:</strong> {new Date(rental.startDate).toLocaleDateString('ru-RU')} — {new Date(rental.endDate).toLocaleDateString('ru-RU')}</p>
                <p style={{ margin: 0 }}><strong>Количество дней:</strong> {rental.totalDays} дн.</p>
                <p style={{ margin: 0 }}><strong>Имя в заказе:</strong> {rental.renterName}</p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#2563eb' }}>{rental.totalPrice} ₽</div>
                
                <div style={{ display: 'flex', gap: '8px' }}>
                  {rental.status === 'confirmed' && (
                    <Button size="sm" variant="primary" onClick={() => handleStatusChange(rental.id, 'active')}>Начать поездку</Button>
                  )}
                  {rental.status === 'active' && (
                    <Button size="sm" variant="success" onClick={() => handleStatusChange(rental.id, 'completed')}>Завершить аренду</Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Новая аренда">
        <div className={styles.form}>
          <div className={styles.inputWrapper}>
            <Select 
              label="Автомобиль" 
              options={activeCars.map(c => ({ value: c.id, label: `${(c as any).brand} ${(c as any).model}` }))} 
              value={formData.carId} 
              onChange={(e) => { setFormData({ ...formData, carId: e.target.value }); if (errors.carId) setErrors(p => ({ ...p, carId: '' })); }} 
              required 
            />
            {errors.carId && <span className={styles.errorText}>{errors.carId}</span>}
          </div>

          <div className={styles.inputWrapper}>
            <Input label="Имя арендатора" value={formData.renterName} onChange={(e) => { setFormData({ ...formData, renterName: e.target.value }); if (errors.renterName) setErrors(p => ({ ...p, renterName: '' })); }} required />
            {errors.renterName && <span className={styles.errorText}>{errors.renterName}</span>}
          </div>

          <div className={styles.inputWrapper}>
            <Input label="Дата начала" type="date" value={formData.startDate} onChange={(e) => { setFormData({ ...formData, startDate: e.target.value }); if (errors.startDate) setErrors(p => ({ ...p, startDate: '' })); }} required />
            {errors.startDate && <span className={styles.errorText}>{errors.startDate}</span>}
          </div>

          <div className={styles.inputWrapper}>
            <Input label="Дата окончания" type="date" value={formData.endDate} onChange={(e) => { setFormData({ ...formData, endDate: e.target.value }); if (errors.endDate) setErrors(p => ({ ...p, endDate: '' })); }} required />
            {errors.endDate && <span className={styles.errorText}>{errors.endDate}</span>}
          </div>

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
