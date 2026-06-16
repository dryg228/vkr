import { useState, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { dataStore, navigationStore, authStore } from '@/store';
import { Card, Button, Input, Modal, Table, Select, Badge } from '@/components/UI';
import { LazyCarImage } from '@/components/LazyCarImage';
import { Location as LocationType, LocationFormData, Car, Rental } from '@/types';
import FirebaseService from '@/firebase'; 
import { runInAction } from 'mobx';
import styles from './AdminPage.module.scss';

type AdminTab = 'cars' | 'locations' | 'rentals' | 'users';

export const AdminPage = observer(() => {
  const { currentPage } = navigationStore;
  const { 
    cars, rentals, locations, updateLocation, 
    deleteLocation, deleteCar, deleteRental, getLocationById, updateRentalStatus  
  } = dataStore;

  const storeAny = dataStore as any;
  const usersList = storeAny.usersList || storeAny.users || {};
  const loadUsers = storeAny.loadUsers || storeAny.loadUsersList || (() => {});
  
  const getInitialTab = (): AdminTab => {
    if (currentPage === 'admin-cars') return 'cars';
    if (currentPage === 'admin-locations') return 'locations';
    if (currentPage === 'admin-rentals') return 'rentals';
    return 'cars';
  };

  const [activeTab, setActiveTab] = useState<AdminTab>(getInitialTab());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<LocationType | null>(null);
  const [selectedPreviewImage, setSelectedPreviewImage] = useState<string | null>(null);

  const [formData, setFormData] = useState<LocationFormData & { description?: string }>({ name: '', address: '', city: '', description: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [rentalStatusFilter, setRentalStatusFilter] = useState<string>('pending');
  const [selectedRental, setSelectedRental] = useState<Rental | null>(null);
  const [isConflictModalOpen, setIsConflictModalOpen] = useState(false);

  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  const monthNames = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
  ];

  useEffect(() => {
    if (activeTab === 'users' && typeof loadUsers === 'function') {
      loadUsers();
    }
  }, [activeTab, loadUsers]);
  const getConflictsCountForDate = (carId: string, date: Date, currentRentalId: string) => {
    const check = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    check.setHours(0, 0, 0, 0);

    return rentals.filter(r => {
      if (r.carId !== carId || r.id === currentRentalId || r.status === 'cancelled' || r.status === 'completed') return false;
      const start = new Date(r.startDate);
      const end = new Date(r.endDate);
      start.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);
      return check >= start && check <= end;
    }).length;
  };

  const generateCalendarDays = () => {
    const startOfMonth = new Date(currentYear, currentMonth, 1);
    const endOfMonth = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = endOfMonth.getDate();
    let startDayOfWeek = startOfMonth.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    const daysArray: (Date | null)[] = [];
    for (let i = 0; i < startDayOfWeek; i++) { daysArray.push(null); }
    for (let day = 1; day <= daysInMonth; day++) { daysArray.push(new Date(currentYear, currentMonth, day)); }
    return daysArray;
  };

  const calendarDays = generateCalendarDays();

  const changeMonth = (direction: number) => {
    if (direction === -1) {
      if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(currentYear - 1); } 
      else { setCurrentMonth(currentMonth - 1); }
    } else {
      if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(currentYear + 1); } 
      else { setCurrentMonth(currentMonth + 1); }
    }
  };

  const handleAdminStatusChange = async (id: string, status: 'confirmed' | 'cancelled' | 'completed') => {
    await updateRentalStatus(id, status);
    setIsConflictModalOpen(false);
    setSelectedRental(null);
  };

  const handleOpenModal = (location?: LocationType) => {
    if (location) { 
      setEditingLocation(location); 
      setFormData({ name: location.name, address: location.address, city: location.city, description: location.description || '' }); 
      setIsModalOpen(true);
    }
    setErrors({}); 
  };

  const handleSubmit = async () => { 
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = 'Укажите название локации.';
    if (!formData.city.trim()) newErrors.city = 'Укажите город.';
    if (!formData.address.trim()) newErrors.address = 'Укажите адрес локации.';

    if (Object.keys(newErrors).length > 0) return setErrors(newErrors);

    if (editingLocation) {
      await updateLocation(editingLocation.id, formData); 
    }
    setIsModalOpen(false); 
  };

  // Автоматическое удаление локации при удалении автомобиля
  const handleDeleteCar = async (id: string) => { 
    const carToDelete = cars.find(c => c.id === id);
    if (confirm('Удалить автомобиль? Вместе с ним будет автоматически удалена привязанная локация.')) {
      const associatedLocationId = carToDelete?.locationId;
      
      await deleteCar(id); 
      
      if (associatedLocationId) {
        try {
          await deleteLocation(associatedLocationId);
        } catch (e) {
          console.error('Ошибка автоматического удаления локации:', e);
        }
      }
    }
  };

  const handleDeleteRental = async (id: string) => { if (confirm('Удалить заявку на аренду?')) await deleteRental(id); };

  const handleRentalStatusChange = async (id: string, status: any) => {
    try { await updateRentalStatus(id, status); } catch (e) { console.error('Ошибка изменения статуса аренды:', e); }
  };
  const handleApproveCarVerification = async (carId: string) => {
    try { await dataStore.updateCar(carId, { isVerified: true }); } catch (e) { console.error('Ошибка верификации автомобиля:', e); }
  };

  const handleRejectCarVerification = async (carId: string) => {
    if (!confirm('Вы уверены, что хотите отклонить этот автомобиль? Владельцу придётся заполнить данные заново.')) return;
    try { 
      await dataStore.updateCar(carId, { 
        isVerified: false, 
        carImageUrl: '', 
        licensePlate: '' 
      }); 
    } catch (e) { 
      console.error('Ошибка отклонения автомобиля:', e); 
    }
  };

  const handleApproveUserVerification = async (uid: string) => {
    try {
      const userToUpdate = usersList[uid];
      if (!userToUpdate) return;
      const updatedUser = { ...userToUpdate, isVerified: true };
      await FirebaseService.setData(`users/${uid}`, updatedUser);
      runInAction(() => { 
        if (storeAny.usersList) storeAny.usersList[uid] = updatedUser;
        else if (storeAny.users) storeAny.users[uid] = updatedUser;
      });
    } catch (e) { console.error('Ошибка верификации пользователя:', e); }
  };

  const handleRejectUserVerification = async (uid: string) => {
    if (!confirm('Вы уверены, что хотите отклонить эти документы?')) return;
    try {
      const userToUpdate = usersList[uid];
      if (!userToUpdate) return;
      const updatedUser = { ...userToUpdate, licenseNumber: '', licenseDate: '', licenseImageUrl: '', isVerified: false };
      await FirebaseService.setData(`users/${uid}`, updatedUser);
      runInAction(() => { 
        if (storeAny.usersList) storeAny.usersList[uid] = updatedUser;
        else if (storeAny.users) storeAny.users[uid] = updatedUser;
      });
    } catch (e) { console.error('Ошибка отклонения документов пользователя:', e); }
  };

  const adminStatusOptions = [
    { value: 'all', label: 'Все заявки платформы' },
    { value: 'pending', label: 'Ожидают проверки (Pending)' },
    { value: 'confirmed', label: 'Подтверждённые (Confirmed)' },
    { value: 'active', label: 'В поездке (Active)' },
    { value: 'completed', label: 'Завершенные (Completed)' },
    { value: 'cancelled', label: 'Отмененные (Cancelled)' }
  ];

  const rentalStatusOptions = [
    { value: 'pending', label: 'Ожидает' }, 
    { value: 'confirmed', label: 'Подтверждена' }, 
    { value: 'completed', label: 'Завершена' }
  ];

  const carColumns = [
    { 
      key: 'carImageUrl', 
      title: 'Фото авто', 
      render: (c: Car) => {
        const url = (c as any).carImageUrl || (c as any).imageUrl;
        return url ? (
          <img src={url} alt="Миниатюра" onClick={() => setSelectedPreviewImage(url)} style={{ width: '50px', height: '35px', borderRadius: '6px', objectFit: 'cover', cursor: 'pointer', border: '1px solid #e2e8f0' }} />
        ) : <span style={{ color: '#94a3b8' }}>Нет фото</span>;
      }
    },
    { key: 'brand', title: 'Марка' }, { key: 'model', title: 'Модель' }, { key: 'year', title: 'Год' }, 
    { 
      key: 'licensePlate', 
      title: 'Госномер', 
      render: (c: Car) => c.licensePlate || <span style={{ color: '#ef4444', fontWeight: 600 }}>Отклонен / Пусто</span> 
    },
    { key: 'pricePerDay', title: 'Цена/день', render: (c: Car) => `${c.pricePerDay} ₽` },
    { key: 'locationId', title: 'Локация', render: (c: Car) => getLocationById(c.locationId)?.name || '-' },
    { 
      key: 'isVerified', 
      title: 'Модерация', 
      render: (c: Car) => {
        if ((c as any).isVerified) {
          return (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <Badge variant={'success' as any}>Одобрено</Badge>
              <Button size="sm" variant={'danger' as any} onClick={() => handleRejectCarVerification(c.id)}>Отозвать</Button>
            </div>
          );
        }
        return (
          <div style={{ display: 'flex', gap: '6px' }}>
            <Button 
              size="sm" 
              variant={'success' as any} 
              onClick={() => handleApproveCarVerification(c.id)}
              disabled={!c.licensePlate} 
            >
              Одобрить
            </Button>
            <Button size="sm" variant={'danger' as any} onClick={() => handleRejectCarVerification(c.id)}>Отклонить</Button>
          </div>
        );
      }
    },
    { key: 'actions', title: '', render: (c: Car) => <Button size="sm" variant="danger" onClick={() => handleDeleteCar(c.id)}>Удалить</Button> }
  ];

  const locationColumns = [
    { key: 'name', title: 'Название локации' }, 
    { key: 'city', title: 'Город' }, 
    { key: 'address', title: 'Адрес' },
    { key: 'status', title: 'Статус базы', render: () => <Badge variant={'success' as any}>Активна</Badge> },
    { key: 'actions', title: 'Действия', render: (l: LocationType) => (
      <div style={{ display: 'flex', gap: '8px' }}>
        <Button size="sm" variant="secondary" onClick={() => handleOpenModal(l)}>Редактировать</Button>
      </div>
    )}
  ];

  const userColumns = [
    { key: 'name', title: 'Имя водителя' },
    { key: 'email', title: 'Email' },
    { key: 'licenseNumber', title: 'Серия / Номер ВУ', render: (u: any) => u.licenseNumber || <span style={{ color: '#94a3b8' }}>Не указаны</span> },
    { key: 'licenseDate', title: 'Дата выдачи', render: (u: any) => u.licenseDate ? new Date(u.licenseDate).toLocaleDateString('ru-RU') : '-' },
    { 
      key: 'licenseImageUrl', 
      title: 'Фото прав', 
      render: (u: any) => {
        if (!u.licenseImageUrl) return <span style={{ color: '#94a3b8' }}>Нет фото</span>;
        return <img src={u.licenseImageUrl} alt="ВУ" onClick={() => setSelectedPreviewImage(u.licenseImageUrl)} style={{ width: '50px', height: '35px', borderRadius: '4px', border: '1px solid #e2e8f0', objectFit: 'cover', cursor: 'pointer' }} />;
      }
    },
    { 
      key: 'isVerified', 
      title: 'Статус / Действия', 
      render: (u: any) => {
        if (!u.licenseNumber) return <Badge variant={'danger' as any}>Нет документов</Badge>;
        if (u.isVerified) {
          return (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <Badge variant={'success' as any}>Одобрено</Badge>
              <Button size="sm" variant={'danger' as any} onClick={() => handleRejectUserVerification(u.uid)}>Отозвать права</Button>
            </div>
          );
        }
        return (
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button size="sm" variant={'success' as any} onClick={() => handleApproveUserVerification(u.uid)}>Одобрить</Button>
            <Button size="sm" variant={'danger' as any} onClick={() => handleRejectUserVerification(u.uid)}>Отклонить</Button>
          </div>
        );
      } 
    }
  ];
  const activeCarsForTable = cars.filter(c => c.isActive);
  const allUsersArr = Object.entries(usersList || {})
    .map(([key, uData]: [string, any]) => ({ uid: uData.uid || key, ...uData }))
    .filter(u => u.role !== 'admin');

  const sortedRentals = [...rentals].sort((a, b) => {
    if (a.status === 'pending' && b.status !== 'pending') return -1;
    if (a.status !== 'pending' && b.status === 'pending') return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const filteredRentals = rentalStatusFilter === 'all' 
    ? sortedRentals 
    : sortedRentals.filter(r => r.status === rentalStatusFilter);

  const getAdminRentalBadgeVariant = (status: string) => {
    if (status === 'confirmed' || status === 'active' || status === 'completed') return 'success';
    if (status === 'pending') return 'warning';
    return 'danger';
  };

  const getAdminRentalStatusLabel = (status: string) => {
    if (status === 'pending') return 'Ожидает';
    if (status === 'confirmed') return 'Подтверждена';
    if (status === 'active') return 'В поездке';
    if (status === 'completed') return 'Завершена';
    return 'Отменена';
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}><h1 className={styles.title}>Администрирование</h1></div>
      
      <div className={styles.tabsRow} style={{ display: 'flex', gap: '12px', borderBottom: '2px solid #e2e8f0', paddingBottom: '12px', marginBottom: '20px' }}>
        <button type="button" className={`${styles.tabBtn} ${activeTab === 'cars' ? styles.tabActive : ''}`} onClick={() => setActiveTab('cars')}>Автомобили ({activeCarsForTable.length})</button>
        <button type="button" className={`${styles.tabBtn} ${activeTab === 'locations' ? styles.tabActive : ''}`} onClick={() => setActiveTab('locations')}>Локации ({locations.length})</button>
        <button type="button" className={`${styles.tabBtn} ${activeTab === 'rentals' ? styles.tabActive : ''}`} onClick={() => setActiveTab('rentals')}>Аренды ({rentals.length})</button>
        <button type="button" className={`${styles.tabBtn} ${activeTab === 'users' ? styles.tabActive : ''}`} onClick={() => setActiveTab('users')}>Модерация прав ({allUsersArr.length})</button>
      </div>
      
      {activeTab === 'cars' && <Card className={styles.tableCard}><Table columns={carColumns} data={activeCarsForTable} keyField="id" /></Card>}
      
      {activeTab === 'locations' && <Card className={styles.tableCard}><Table columns={locationColumns} data={locations} keyField="id" /></Card>}

      {activeTab === 'rentals' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
          <div style={{ display: 'flex', gap: '16px', width: '100%' }}>
            <Select options={adminStatusOptions} value={rentalStatusFilter} onChange={(e) => setRentalStatusFilter(e.target.value)} style={{ width: '280px' }} />
          </div>

          {filteredRentals.length === 0 ? (
            <div className={styles.empty}>Заявки в данном статусе отсутствуют</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
              {filteredRentals.map((rental) => (
                <Card key={rental.id} style={{ background: '#ffffff', padding: '24px', borderRadius: '24px', border: '1px solid #f1f5f9' }}>
                  <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                    <LazyCarImage carId={rental.carId} alt={rental.carName} style={{ width: '120px', height: '80px', borderRadius: '12px', objectFit: 'cover' }} />

                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>{rental.carName}</h3>
                        <Badge variant={getAdminRentalBadgeVariant(rental.status) as any}>
                          {getAdminRentalStatusLabel(rental.status)}
                        </Badge>
                      </div>

                      <div style={{ fontSize: '14px', color: '#475569', marginBottom: '12px' }}>
                        <p style={{ margin: '0 0 4px 0' }}><strong>Арендатор:</strong> {rental.renterName || 'Не указан'} (ID: {rental.renterId})</p>
                        <p style={{ margin: '0 0 4px 0' }}><strong>Период:</strong> {new Date(rental.startDate).toLocaleDateString('ru-RU')} — {new Date(rental.endDate).toLocaleDateString('ru-RU')} ({rental.totalDays} дн.)</p>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                        <div style={{ fontSize: '18px', fontWeight: 800, color: '#2563eb' }}>{rental.totalPrice} ₽</div>
                        
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                          {rental.status !== 'pending' && rental.status !== 'active' && (
                            <div style={{ width: '160px' }}>
                              <Select 
                                options={rentalStatusOptions} 
                                value={rental.status} 
                                onChange={(e: any) => handleRentalStatusChange(rental.id, e.target?.value ?? e)} 
                              />
                            </div>
                          )}

                          {rental.status === 'pending' && (
                            <>
                              <Button size="sm" variant="primary" onClick={() => { setSelectedRental(rental); setIsConflictModalOpen(true); }}>🔎 Проверить наложения</Button>
                              <Button size="sm" variant="danger" onClick={() => window.confirm('Отклонить эту заявку?') && handleAdminStatusChange(rental.id, 'cancelled')}>Отклонить</Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
      {activeTab === 'users' && <Card className={styles.tableCard}><Table columns={userColumns} data={allUsersArr} keyField="uid" /></Card>}
      
      {/* МОДАЛЬНОЕ ОКНО РЕДАКТИРОВАНИЯ ЛОКАЦИЙ */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="📄 Редактировать локацию">
        <div className={styles.form} style={{ padding: '4px 0' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className={styles.inputWrapper}>
              <Input label="Город" placeholder="Например: Москва" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} required />
              {errors.city && <span className={styles.errorText}>{errors.city}</span>}
            </div>
            <div className={styles.inputWrapper}>
              <Input label="Название пункта" placeholder="Например: Аэропорт Домодедово" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
              {errors.name && <span className={styles.errorText}>{errors.name}</span>}
            </div>
          </div>

          <div className={styles.inputWrapper} style={{ marginTop: '4px' }}>
            <Input label="Точный адрес" placeholder="Улица, дом, ориентир парковки каршеринга" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} required />
            {errors.address && <span className={styles.errorText}>{errors.address}</span>}
          </div>

          <div className={styles.inputWrapper} style={{ marginTop: '4px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Дополнительное описание (необязательно)</label>
            <textarea 
              placeholder="Как добраться, номер терминала, часы работы пункта выдачи..." 
              value={formData.description || ''} 
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              style={{ width: '100%', minHeight: '80px', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '15px', fontFamily: 'inherit', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
            />
          </div>

          <div className={styles.formActions} style={{ marginTop: '16px', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Отмена</Button>
            <Button variant="primary" onClick={handleSubmit}>Сохранить изменения</Button>
          </div>
        </div>
      </Modal>

      {/* МОДАЛЬНОЕ ОКНО ГРАФИЧЕСКОГО КАЛЕНДАРЯ НАЛОЖЕНИЙ ДЛЯ АДМИНИСТРАТОРА */}
      <Modal isOpen={isConflictModalOpen} onClose={() => { setIsConflictModalOpen(false); setSelectedRental(null); }} title="Проверка конфликтов бронирования">
        {selectedRental && (
          <div className={styles.form}>
            <div style={{ padding: '14px', background: '#eff6ff', borderRadius: '12px', border: '1px solid #bfdbfe', fontSize: '14px', color: '#1e40af', lineHeight: '1.5' }}>
              <strong>Автомобиль:</strong> {selectedRental.carName}<br />
              <strong>Запрашиваемый период:</strong> {new Date(selectedRental.startDate).toLocaleDateString('ru-RU')} — {new Date(selectedRental.endDate).toLocaleDateString('ru-RU')}
            </div>

            <div className={styles.calendarContainer}>
              <div className={styles.calendarControls}>
                <button type="button" onClick={() => changeMonth(-1)}>←</button>
                <span>{monthNames[currentMonth]} {currentYear}</span>
                <button type="button" onClick={() => changeMonth(1)}>→</button>
              </div>

              <div className={styles.weekDays}><span>Пн</span><span>Вт</span><span>Ср</span><span>Чт</span><span>Пт</span><span>Сб</span><span>Вс</span></div>

              <div className={styles.daysGrid}>
                {calendarDays.map((date, index) => {
                  if (!date) return <div key={`empty-${index}`} className={styles.emptyCell} />;
                  
                  const dYear = date.getFullYear();
                  const dMonth = String(date.getMonth() + 1).padStart(2, '0');
                  const dDay = String(date.getDate()).padStart(2, '0');
                  const dateStr = `${dYear}-${dMonth}-${dDay}`;
                  
                  const isStart = selectedRental.startDate === dateStr;
                  const isEnd = selectedRental.endDate === dateStr;
                  const isBetween = selectedRental.startDate && selectedRental.endDate && dateStr > selectedRental.startDate && dateStr < selectedRental.endDate;

                  const conflictsCount = getConflictsCountForDate(selectedRental.carId, date, selectedRental.id);

                  let dayClass = styles.dayCell;
                  if (isStart) dayClass += ` ${styles.daySelectedStart}`;
                  else if (isEnd) dayClass += ` ${styles.daySelectedEnd}`;
                  else if (isBetween) dayClass += ` ${styles.dayBetween}`;
                  
                  if (conflictsCount > 0) dayClass += ` ${styles.dayConflict}`;

                  return (
                    <div key={dateStr} className={dayClass} title={conflictsCount > 0 ? `Найдено наложений: ${conflictsCount}` : ''}>
                      {date.getDate()}
                      {conflictsCount > 0 && <span className={styles.conflictDot}>!</span>}
                    </div>
                  );
                })}
              </div>
            </div>

            <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0', lineHeight: '1.4' }}>
              ⚠️ Дни, подсвеченные красным или отмеченные «!», сигнализируют о том, что на этот автомобиль уже есть другая активная или подтвержденная бронь в системе.
            </p>

            <div className={styles.formActions}>
              <Button variant="secondary" onClick={() => { setIsConflictModalOpen(false); setSelectedRental(null); }}>Отмена</Button>
              <Button variant="primary" onClick={() => handleAdminStatusChange(selectedRental.id, 'confirmed')}>Одобрить бронь</Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={!!selectedPreviewImage} onClose={() => setSelectedPreviewImage(null)} title="Просмотр изображения">
        <div style={{ textAlign: 'center', padding: '10px' }}>
          {selectedPreviewImage && <img src={selectedPreviewImage} alt="Полноразмерное фото" style={{ maxWidth: '100%', maxHeight: '70vh', borderRadius: '12px', border: '1px solid #e2e8f0', objectFit: 'contain' }} />}
          <div style={{ marginTop: '20px' }}><Button variant="secondary" onClick={() => setSelectedPreviewImage(null)}>Закрыть</Button></div>
        </div>
      </Modal>
    </div>
  );
});

export default AdminPage;
