import { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { dataStore, authStore } from '@/store';
import { Card, Button, Select, Badge, Modal, Input, Table } from '@/components/UI';
import { Rental, RentalFormData, getRentalStatusLabel, getRentalStatusColor, RentalStatus } from '@/types';
import styles from './RentalsPage.module.scss';

export const RentalsPage = observer(() => {
  const { rentals, activeRentals, activeCars, rentalsLoading, createRental, updateRentalStatus } = dataStore;
  const { isOwner, isAdmin, isAuthenticated } = authStore;
  
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<RentalFormData>({ carId: '', renterName: '', startDate: '', endDate: '' });

  // Состояние для хранения текстов ошибок под инпутами
  const [errors, setErrors] = useState<Record<string, string>>({});

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
    setFormData({ carId: '', renterName: '', startDate: '', endDate: '' });
    setErrors({}); // Сбрасываем ошибки при каждом открытии
    setIsModalOpen(true);
  };

  const handleStatusChange = async (id: string, status: RentalStatus) => { 
    await updateRentalStatus(id, status); 
  };

  const columns = [
    { key: 'carName', title: 'Автомобиль' },
    { key: 'renterName', title: 'Арендатор' },
    { key: 'startDate', title: 'Начало', render: (r: Rental) => new Date(r.startDate).toLocaleDateString('ru-RU') },
    { key: 'endDate', title: 'Конец', render: (r: Rental) => new Date(r.endDate).toLocaleDateString('ru-RU') },
    { 
      key: 'totalPrice', 
      title: 'Сумма', 
      render: (r: Rental) => {
        const price = Number(r.totalPrice);
        return price < 0 ? '0 ₽' : `${r.totalPrice} ₽`;
      } 
    },
    { key: 'status', title: 'Статус', render: (r: Rental) => <Badge variant={getRentalStatusColor(r.status) as 'success' | 'warning' | 'error' | 'info'}>{getRentalStatusLabel(r.status)}</Badge> },
  ];

  if (isAuthenticated) {
    columns.push({
      key: 'actions', 
      title: 'Действия',
      render: (r: Rental) => {
        if (r.status === 'pending' && isAdmin) {
          return <Button size="sm" onClick={() => handleStatusChange(r.id, 'confirmed')}>Подтвердить</Button>;
        }

        const rentalAny = r as any;
        const rawRenterName = rentalAny.renterName || rentalAny.renter?.name || '';
        const isAminRentingThis = String(rawRenterName).trim() === 'Админ';

        if (r.status === 'confirmed') {
          if (isAdmin && isAminRentingThis) {
            return <Button size="sm" onClick={() => handleStatusChange(r.id, 'active')}>Начать</Button>;
          }
          if (!isAdmin && !isAminRentingThis) {
            return <Button size="sm" onClick={() => handleStatusChange(r.id, 'active')}>Начать</Button>;
          }
        }
        
        if (r.status === 'active') {
          if (isAdmin && isAminRentingThis) {
            return <Button size="sm" onClick={() => handleStatusChange(r.id, 'completed')}>Завершить</Button>;
          }
          if (!isAdmin && !isAminRentingThis) {
            return <Button size="sm" onClick={() => handleStatusChange(r.id, 'completed')}>Завершить</Button>;
          }
        }
        
        return <></>;
      }
    });
  }

  const authAny = authStore as any;

  // Оставляем только чужие машины для аренды
  const selectableCars = activeCars.filter(car => {
    const carAny = car as any;
    const carBrand = String(carAny.brand).toLowerCase().trim();
    const isRussianCar = carBrand === 'ваз' || carBrand === 'lada' || carBrand === 'лада';

    if (authAny.isAdmin) {
      return !isRussianCar;
    } else {
      return isRussianCar;
    }
  });

  // ВАЛИДАЦИЯ ФОРМЫ АРЕНДЫ С ВЫВОДОМ ОШИБОК ПОД ПОЛЯМИ
  const handleSubmit = async () => { 
    const newErrors: Record<string, string> = {};

    if (!formData.carId) {
      newErrors.carId = 'Выберите автомобиль из списка.';
    }
    if (!formData.renterName.trim()) {
      newErrors.renterName = 'Укажите имя арендатора.';
    }
    if (!formData.startDate) {
      newErrors.startDate = 'Укажите дату начала аренды.';
    }
    if (!formData.endDate) {
      newErrors.endDate = 'Укажите дату окончания аренды.';
    }

    // Если указаны обе даты, проверяем их логическую корректность
    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate).getTime();
      const end = new Date(formData.endDate).getTime();
      if (end < start) {
        newErrors.endDate = 'Дата окончания не может быть раньше даты начала.';
      }
    }

    // Если есть ошибки — фиксируем их и отменяем отправку
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    await createRental(formData); 
    setIsModalOpen(false); 
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Аренды</h1>
        {isAuthenticated && <Button variant="primary" onClick={handleOpenModal}>Новая аренда</Button>}
      </div>
      <div className={styles.filters}><Select options={statusOptions} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={styles.statusSelect} /></div>
      {rentalsLoading ? <div className={styles.loading}>Загрузка...</div> : filteredRentals.length === 0 ? <div className={styles.empty}>Аренды не найдены</div> : <Card className={styles.tableCard}><Table columns={columns} data={filteredRentals} keyField="id" /></Card>}
      
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Новая аренда">
        <div className={styles.form}>
          
          <div className={styles.inputWrapper}>
            <Select 
              label="Автомобиль" 
              options={selectableCars.map(c => ({ value: c.id, label: `${c.brand} ${c.model}` }))} 
              value={formData.carId} 
              onChange={(e) => { setFormData({ ...formData, carId: e.target.value }); if(errors.carId) setErrors(p => ({...p, carId: ''})); }} 
              required 
            />
            {errors.carId && <span className={styles.errorText}>{errors.carId}</span>}
          </div>

          <div className={styles.inputWrapper}>
            <Input label="Имя арендатора" value={formData.renterName} onChange={(e) => { setFormData({ ...formData, renterName: e.target.value }); if(errors.renterName) setErrors(p => ({...p, renterName: ''})); }} required />
            {errors.renterName && <span className={styles.errorText}>{errors.renterName}</span>}
          </div>

          <div className={styles.inputWrapper}>
            <Input label="Дата начала" type="date" value={formData.startDate} onChange={(e) => { setFormData({ ...formData, startDate: e.target.value }); if(errors.startDate) setErrors(p => ({...p, startDate: ''})); }} required />
            {errors.startDate && <span className={styles.errorText}>{errors.startDate}</span>}
          </div>

          <div className={styles.inputWrapper}>
            <Input label="Дата окончания" type="date" value={formData.endDate} onChange={(e) => { setFormData({ ...formData, endDate: e.target.value }); if(errors.endDate) setErrors(p => ({...p, endDate: ''})); }} required />
            {errors.endDate && <span className={styles.errorText}>{errors.endDate}</span>}
          </div>

          <div className={styles.formActions}><Button variant="secondary" onClick={() => setIsModalOpen(false)}>Отмена</Button><Button variant="primary" onClick={handleSubmit}>Создать</Button></div>
        </div>
      </Modal>
    </div>
  );
});
