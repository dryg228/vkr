import { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { dataStore, navigationStore } from '@/store';
import { Card, Button, Input, Modal, Table } from '@/components/UI';
import { Location, LocationFormData, Car, Rental } from '@/types';
import styles from './AdminPage.module.scss';

type AdminTab = 'cars' | 'locations' | 'rentals';

export const AdminPage = observer(() => {
  const { currentPage } = navigationStore;
  const { cars, locations, rentals, activeLocations, createLocation, updateLocation, deleteLocation, deleteCar, getLocationById } = dataStore;
  
  const getInitialTab = (): AdminTab => {
    if (currentPage === 'admin-cars') return 'cars';
    if (currentPage === 'admin-locations') return 'locations';
    if (currentPage === 'admin-rentals') return 'rentals';
    return 'cars';
  };

  const [activeTab, setActiveTab] = useState<AdminTab>(getInitialTab());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [formData, setFormData] = useState<LocationFormData>({ name: '', address: '', city: '' });

  const handleOpenModal = (location?: Location) => {
    if (location) { setEditingLocation(location); setFormData({ name: location.name, address: location.address, city: location.city, description: location.description }); }
    else { setEditingLocation(null); setFormData({ name: '', address: '', city: '' }); }
    setIsModalOpen(true);
  };

  const handleSubmit = async () => { if (editingLocation) await updateLocation(editingLocation.id, formData); else await createLocation(formData); setIsModalOpen(false); };
  const handleDeleteLocation = async (id: string) => { if (confirm('Удалить локацию?')) await deleteLocation(id); };
  const handleDeleteCar = async (id: string) => { if (confirm('Удалить автомобиль?')) await deleteCar(id); };

  const carColumns = [
    { key: 'brand', title: 'Марка' },
    { key: 'model', title: 'Модель' },
    { key: 'year', title: 'Год' },
    { key: 'licensePlate', title: 'Госномер' },
    { key: 'pricePerDay', title: 'Цена/день', render: (c: Car) => `${c.pricePerDay} ₽` },
    { key: 'locationId', title: 'Локация', render: (c: Car) => getLocationById(c.locationId)?.name || '-' },
    { key: 'status', title: 'Статус' },
    { key: 'actions', title: '', render: (c: Car) => <Button size="sm" variant="danger" onClick={() => handleDeleteCar(c.id)}>Удалить</Button> }
  ];

  const locationColumns = [
    { key: 'name', title: 'Название' },
    { key: 'city', title: 'Город' },
    { key: 'address', title: 'Адрес' },
    { key: 'isActive', title: 'Активна', render: (l: Location) => l.isActive ? 'Да' : 'Нет' },
    { key: 'actions', title: '', render: (l: Location) => (
      <div style={{ display: 'flex', gap: '8px' }}>
        <Button size="sm" variant="secondary" onClick={() => handleOpenModal(l)}>Редактировать</Button>
        <Button size="sm" variant="danger" onClick={() => handleDeleteLocation(l.id)}>Удалить</Button>
      </div>
    )}
  ];

  const rentalColumns = [
    { key: 'carName', title: 'Авто' },
    { key: 'renterName', title: 'Арендатор' },
    { key: 'startDate', title: 'Начало', render: (r: Rental) => new Date(r.startDate).toLocaleDateString('ru-RU') },
    { key: 'endDate', title: 'Конец', render: (r: Rental) => new Date(r.endDate).toLocaleDateString('ru-RU') },
    { key: 'totalPrice', title: 'Сумма', render: (r: Rental) => `${r.totalPrice} ₽` },
    { key: 'status', title: 'Статус' }
  ];

  return (
    <div className={styles.page}>
      <div className={styles.header}><h1 className={styles.title}>Администрирование</h1></div>
      <div className={styles.tabs}>
        <button className={`${styles.tab} ${activeTab === 'cars' ? styles.active : ''}`} onClick={() => setActiveTab('cars')}>Автомобили ({cars.filter(c => c.isActive).length})</button>
        <button className={`${styles.tab} ${activeTab === 'locations' ? styles.active : ''}`} onClick={() => setActiveTab('locations')}>Локации ({activeLocations.length})</button>
        <button className={`${styles.tab} ${activeTab === 'rentals' ? styles.active : ''}`} onClick={() => setActiveTab('rentals')}>Аренды ({rentals.length})</button>
      </div>
      {activeTab === 'cars' && <Card className={styles.tableCard}><Table columns={carColumns} data={cars} keyField="id" /></Card>}
      {activeTab === 'locations' && (
        <>
          <div className={styles.actions}><Button variant="primary" onClick={() => handleOpenModal()}>Добавить локацию</Button></div>
          <Card className={styles.tableCard}><Table columns={locationColumns} data={locations} keyField="id" /></Card>
        </>
      )}
      {activeTab === 'rentals' && <Card className={styles.tableCard}><Table columns={rentalColumns} data={rentals} keyField="id" /></Card>}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingLocation ? 'Редактировать локацию' : 'Добавить локацию'}>
        <div className={styles.form}>
          <Input label="Название" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
          <Input label="Город" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} required />
          <Input label="Адрес" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} required />
          <div className={styles.formActions}><Button variant="secondary" onClick={() => setIsModalOpen(false)}>Отмена</Button><Button variant="primary" onClick={handleSubmit}>{editingLocation ? 'Сохранить' : 'Добавить'}</Button></div>
        </div>
      </Modal>
    </div>
  );
});
