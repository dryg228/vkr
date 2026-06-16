import { useState, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { dataStore, navigationStore, authStore } from '@/store';
import { Card, Button, Input, Modal, Table, Select, Badge } from '@/components/UI';
import { Location, LocationFormData, Car, Rental } from '@/types';
import FirebaseService from '@/firebase'; 
import { runInAction } from 'mobx';
import styles from './AdminPage.module.scss';

type AdminTab = 'cars' | 'locations' | 'rentals' | 'users';

export const AdminPage = observer(() => {
  const { currentPage } = navigationStore;
  const { 
    cars, rentals, activeLocations, createLocation, updateLocation, 
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
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [selectedPreviewImage, setSelectedPreviewImage] = useState<string | null>(null);

  const [formData, setFormData] = useState<LocationFormData & { description?: string }>({ name: '', address: '', city: '', description: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (activeTab === 'users' && typeof loadUsers === 'function') {
      loadUsers();
    }
  }, [activeTab, loadUsers]);

  const handleOpenModal = (location?: Location) => {
    if (location) { 
      setEditingLocation(location); 
      setFormData({ name: location.name, address: location.address, city: location.city, description: location.description || '' }); 
    } else { 
      setEditingLocation(null); 
      setFormData({ name: '', address: '', city: '', description: '' }); 
    }
    setErrors({}); 
    setIsModalOpen(true);
  };

  const handleSubmit = async () => { 
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = 'Укажите название локации.';
    if (!formData.city.trim()) newErrors.city = 'Укажите город.';
    if (!formData.address.trim()) newErrors.address = 'Укажите адрес локации.';

    if (Object.keys(newErrors).length > 0) return setErrors(newErrors);

    if (editingLocation) await updateLocation(editingLocation.id, formData); 
    else await createLocation(formData); 
    
    setIsModalOpen(false); 
  };
  
  const handleDeleteLocation = async (id: string) => { if (confirm('Удалить локацию?')) await deleteLocation(id); };
  const handleDeleteCar = async (id: string) => { if (confirm('Удалить автомобиль?')) await deleteCar(id); };
  const handleDeleteRental = async (id: string) => { if (confirm('Удалить заявку на аренду?')) await deleteRental(id); };

  const handleRentalStatusChange = async (id: string, status: any) => {
    try { await updateRentalStatus(id, status); } catch (e) { console.error('Ошибка изменения статуса аренды:', e); }
  };

  const handleLocationToggleActive = async (id: string, currentActive: boolean) => {
    try { await updateLocation(id, { isActive: !currentActive } as any); } catch (e) { console.error('Ошибка изменения активности локации:', e); }
  };

  // Метод ОДОБРЕНИЯ автомобиля администратором
  const handleApproveCarVerification = async (carId: string) => {
    try {
      await dataStore.updateCar(carId, { isVerified: true });
    } catch (e) {
      console.error('Ошибка верификации автомобиля:', e);
    }
  };

  // НОВЫЙ МЕТОД: ОТКЛОНЕНИЕ автомобиля администратором со сбросом фото на модерацию
  const handleRejectCarVerification = async (carId: string) => {
    if (!confirm('Вы уверены, что хотите отклонить этот автомобиль? Владельцу придётся загрузить данные и фото заново.')) return;
    try {
      await dataStore.updateCar(carId, { 
        isVerified: false,
        carImageUrl: '', // Сбрасываем старую фотографию авто
        licensePlate: '' // Очищаем некорректный госномер
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

  const rentalStatusOptions = [
    { value: 'pending', label: 'Ожидает' }, { value: 'confirmed', label: 'Подтверждена' }, { value: 'completed', label: 'Завершена' }
  ];

  // ОБНОВЛЕНО: Раздельные кнопки «Одобрить» и «Отклонить» внутри структуры колонок автомобилей
  const carColumns = [
    { 
      key: 'carImageUrl', 
      title: 'Фото авто', 
      render: (c: Car) => (c as any).carImageUrl ? (
        <img src={(c as any).carImageUrl} alt="Миниатюра" onClick={() => setSelectedPreviewImage((c as any).carImageUrl)} style={{ width: '50px', height: '35px', borderRadius: '6px', objectFit: 'cover', cursor: 'pointer', border: '1px solid #e2e8f0' }} />
      ) : <span style={{ color: '#94a3b8' }}>Нет фото</span>
    },
    { key: 'brand', title: 'Марка' }, { key: 'model', title: 'Модель' }, { key: 'year', title: 'Год' }, { key: 'licensePlate', title: 'Госномер', render: (c: Car) => c.licensePlate || <span style={{ color: '#ef4444', fontWeight: 600 }}>Отклонен / Пусто</span> },
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
            <Button size="sm" variant={'success' as any} onClick={() => handleApproveCarVerification(c.id)}>Одобрить</Button>
            <Button size="sm" variant={'danger' as any} onClick={() => handleRejectCarVerification(c.id)}>Отклонить</Button>
          </div>
        );
      }
    },
    { key: 'actions', title: '', render: (c: Car) => <Button size="sm" variant="danger" onClick={() => handleDeleteCar(c.id)}>Удалить</Button> }
  ];

  const locationColumns = [
    { key: 'name', title: 'Название' }, { key: 'city', title: 'Город' }, { key: 'address', title: 'Адрес' },
    { key: 'isActive', title: 'Активна', render: (l: Location) => <Button size="sm" variant={l.isActive ? 'success' : 'secondary'} onClick={() => handleLocationToggleActive(l.id, l.isActive)}>{l.isActive ? 'Да (Активна)' : 'Нет (Выкл)'}</Button> },
    { key: 'actions', title: '', render: (l: Location) => (
      <div style={{ display: 'flex', gap: '8px' }}>
        <Button size="sm" variant="secondary" onClick={() => handleOpenModal(l)}>Редактировать</Button>
        <Button size="sm" variant="danger" onClick={() => handleDeleteLocation(l.id)}>Удалить</Button>
      </div>
    )}
  ];

    const rentalColumns = [
    { key: 'carName', title: 'Авто' }, { key: 'renterName', title: 'Арендатор' },
    { key: 'startDate', title: 'Начало', render: (r: Rental) => new Date(r.startDate).toLocaleDateString('ru-RU') },
    { key: 'endDate', title: 'Конец', render: (r: Rental) => new Date(r.endDate).toLocaleDateString('ru-RU') },
    { key: 'totalPrice', title: 'Сумма', render: (r: Rental) => `${r.totalPrice} ₽` },
    { 
      key: 'status', 
      title: 'Статус', 
      render: (r: Rental) => {
        if (r.status === 'confirmed' || r.status === 'completed') {
          const currentOption = rentalStatusOptions.find(opt => opt.value === r.status);
          return <span style={{ fontWeight: 600, color: r.status === 'confirmed' ? '#16a34a' : '#475569', padding: '4px 8px' }}>{currentOption ? currentOption.label : r.status}</span>;
        }
        return <Select options={rentalStatusOptions} value={r.status} onChange={(e: any) => handleRentalStatusChange(r.id, e.target?.value ?? e)} style={{ width: '170px', padding: '4px' }} />;
      } 
    },
    { key: 'actions', title: '', render: (r: Rental) => <Button size="sm" variant="danger" onClick={() => handleDeleteRental(r.id)}>Удалить</Button> }
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

  return (
    <div className={styles.page}>
      <div className={styles.header}><h1 className={styles.title}>Администрирование</h1></div>
      <div className={styles.tabs}>
        <button className={`${styles.tab} ${activeTab === 'cars' ? styles.active : ''}`} onClick={() => setActiveTab('cars')}>Автомобили ({activeCarsForTable.length})</button>
        <button className={`${styles.tab} ${activeTab === 'locations' ? styles.active : ''}`} onClick={() => setActiveTab('locations')}>Локации ({activeLocations.length})</button>
        <button className={`${styles.tab} ${activeTab === 'rentals' ? styles.active : ''}`} onClick={() => setActiveTab('rentals')}>Аренды ({rentals.length})</button>
        <button className={`${styles.tab} ${activeTab === 'users' ? styles.active : ''}`} onClick={() => setActiveTab('users')}>Модерация прав ({allUsersArr.length})</button>
      </div>
      
      {activeTab === 'cars' && <Card className={styles.tableCard}><Table columns={carColumns} data={activeCarsForTable} keyField="id" /></Card>}
      {activeTab === 'locations' && (
        <>
          <div className={styles.actions}><Button variant="primary" onClick={() => handleOpenModal()}>Добавить локацию</Button></div>
          <Card className={styles.tableCard}><Table columns={locationColumns} data={activeLocations} keyField="id" /></Card>
        </>
      )}
      {activeTab === 'rentals' && <Card className={styles.tableCard}><Table columns={rentalColumns} data={rentals} keyField="id" /></Card>}
      {activeTab === 'users' && <Card className={styles.tableCard}><Table columns={userColumns} data={allUsersArr} keyField="uid" /></Card>}
      
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingLocation ? 'Редактировать локацию' : 'Добавить локацию'}>
        <div className={styles.form}>
          <div className={styles.inputWrapper}>
            <Input label="Название" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
            {errors.name && <span className={styles.errorText}>{errors.name}</span>}
          </div>
          <div className={styles.inputWrapper}>
            <Input label="Город" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} required />
            {errors.city && <span className={styles.errorText}>{errors.city}</span>}
          </div>
          <div className={styles.inputWrapper}>
            <Input label="Адрес" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} required />
            {errors.address && <span className={styles.errorText}>{errors.address}</span>}
          </div>
          <div className={styles.formActions}>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Отмена</Button>
            <Button variant="primary" onClick={handleSubmit}>{editingLocation ? 'Сохранить' : 'Добавить'}</Button>
          </div>
        </div>
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
