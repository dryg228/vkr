import { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { dataStore, navigationStore } from '@/store';
import { Card, Button, Input, Modal, Table, Select } from '@/components/UI';
import { Location, LocationFormData, Car, Rental } from '@/types';
import styles from './AdminPage.module.scss';

type AdminTab = 'cars' | 'locations' | 'rentals';

export const AdminPage = observer(() => {
  const { currentPage } = navigationStore;
  const { 
    cars, 
    rentals, 
    activeLocations, 
    createLocation, 
    updateLocation, 
    deleteLocation, 
    deleteCar, 
    deleteRental, 
    getLocationById,
    updateRentalStatus  
  } = dataStore;
  
  const getInitialTab = (): AdminTab => {
    if (currentPage === 'admin-cars') return 'cars';
    if (currentPage === 'admin-locations') return 'locations';
    if (currentPage === 'admin-rentals') return 'rentals';
    return 'cars';
  };

  const [activeTab, setActiveTab] = useState<AdminTab>(getInitialTab());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  
  const [formData, setFormData] = useState<LocationFormData & { description?: string }>({ name: '', address: '', city: '', description: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleOpenModal = (location?: Location) => {
    if (location) { 
      setEditingLocation(location); 
      setFormData({ 
        name: location.name, 
        address: location.address, 
        city: location.city, 
        description: location.description || '' 
      }); 
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

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    if (editingLocation) await updateLocation(editingLocation.id, formData); 
    else await createLocation(formData); 
    
    setIsModalOpen(false); 
  };
  
  const handleDeleteLocation = async (id: string) => { if (confirm('Удалить локацию?')) await deleteLocation(id); };
  const handleDeleteCar = async (id: string) => { if (confirm('Удалить автомобиль?')) await deleteCar(id); };
  const handleDeleteRental = async (id: string) => { if (confirm('Удалить заявку на аренду?')) await deleteRental(id); };

  const handleRentalStatusChange = async (id: string, status: any) => {
    try {
      await updateRentalStatus(id, status);
    } catch (e) {
      console.error('Ошибка изменения статуса аренды:', e);
    }
  };

  const handleLocationToggleActive = async (id: string, currentActive: boolean) => {
    try {
      await updateLocation(id, { isActive: !currentActive } as any);
    } catch (e) {
      console.error('Ошибка изменения активности локации:', e);
    }
  };

  const rentalStatusOptions = [
    { value: 'pending', label: 'Ожидает' },
    { value: 'confirmed', label: 'Подтверждена' },
    { value: 'completed', label: 'Завершена' }
  ];

  const carColumns = [
    { key: 'brand', title: 'Марка' },
    { key: 'model', title: 'Модель' },
    { key: 'year', title: 'Год' },
    { key: 'licensePlate', title: 'Госномер' },
    { key: 'pricePerDay', title: 'Цена/день', render: (c: Car) => `${c.pricePerDay} ₽` },
    { key: 'locationId', title: 'Локация', render: (c: Car) => getLocationById(c.locationId)?.name || '-' },
    { key: 'status', title: 'Статус' }, // Статус автомобиля снова возвращен в виде обычного текстового поля
    { key: 'actions', title: '', render: (c: Car) => <Button size="sm" variant="danger" onClick={() => handleDeleteCar(c.id)}>Удалить</Button> }
  ];

  const locationColumns = [
    { key: 'name', title: 'Название' },
    { key: 'city', title: 'Город' },
    { key: 'address', title: 'Адрес' },
    { 
      key: 'isActive', 
      title: 'Активна', 
      render: (l: Location) => (
        <Button 
          size="sm" 
          variant={l.isActive ? 'success' : 'secondary'} 
          onClick={() => handleLocationToggleActive(l.id, l.isActive)}
        >
          {l.isActive ? 'Да (Активна)' : 'Нет (Выкл)'}
        </Button>
      ) 
    },
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
    { 
      key: 'status', 
      title: 'Статус', 
      render: (r: Rental) => {
        // Если статус подтвержден или завершен — блокируем изменение и выводим обычный текст
        if (r.status === 'confirmed' || r.status === 'completed') {
          const currentOption = rentalStatusOptions.find(opt => opt.value === r.status);
          return (
            <span style={{ 
              fontWeight: 600, 
              color: r.status === 'confirmed' ? '#16a34a' : '#475569', // Зеленый для подтвержденных, серый для завершенных
              padding: '4px 8px'
            }}>
              {currentOption ? currentOption.label : r.status}
            </span>
          );
        }

        // Если статус "Ожидает" (pending), админ все еще может выбрать другой статус
        return (
          <Select 
            options={rentalStatusOptions} 
            value={r.status} 
            onChange={(e: any) => handleRentalStatusChange(r.id, e.target?.value ?? e)} 
            style={{ width: '170px', padding: '4px' }}
          />
        );
      } 
    },
    { key: 'actions', title: '', render: (r: Rental) => <Button size="sm" variant="danger" onClick={() => handleDeleteRental(r.id)}>Удалить</Button> }
  ];


  const activeCarsForTable = cars.filter(c => c.isActive);

  return (
    <div className={styles.page}>
      <div className={styles.header}><h1 className={styles.title}>Администрирование</h1></div>
      <div className={styles.tabs}>
        <button className={`${styles.tab} ${activeTab === 'cars' ? styles.active : ''}`} onClick={() => setActiveTab('cars')}>Автомобили ({activeCarsForTable.length})</button>
        <button className={`${styles.tab} ${activeTab === 'locations' ? styles.active : ''}`} onClick={() => setActiveTab('locations')}>Локации ({activeLocations.length})</button>
        <button className={`${styles.tab} ${activeTab === 'rentals' ? styles.active : ''}`} onClick={() => setActiveTab('rentals')}>Аренды ({rentals.length})</button>
      </div>
      
      {activeTab === 'cars' && <Card className={styles.tableCard}><Table columns={carColumns} data={activeCarsForTable} keyField="id" /></Card>}
      
      {activeTab === 'locations' && (
        <>
          <div className={styles.actions}><Button variant="primary" onClick={() => handleOpenModal()}>Добавить локацию</Button></div>
          <Card className={styles.tableCard}><Table columns={locationColumns} data={activeLocations} keyField="id" /></Card>
        </>
      )}
      {activeTab === 'rentals' && <Card className={styles.tableCard}><Table columns={rentalColumns} data={rentals} keyField="id" /></Card>}
      
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingLocation ? 'Редактировать локацию' : 'Добавить локацию'}>
        <div className={styles.form}>
          <div className={styles.inputWrapper}>
            <Input 
              label="Название" 
              value={formData.name} 
              onChange={(e) => { setFormData({ ...formData, name: e.target.value }); if (errors.name) setErrors(p => ({ ...p, name: '' })); }} 
              required 
            />
            {errors.name && <span className={styles.errorText}>{errors.name}</span>}
          </div>

          <div className={styles.inputWrapper}>
            <Input 
              label="Город" 
              value={formData.city} 
              onChange={(e) => { setFormData({ ...formData, city: e.target.value }); if (errors.city) setErrors(p => ({ ...p, city: '' })); }} 
              required 
            />
            {errors.city && <span className={styles.errorText}>{errors.city}</span>}
          </div>

          <div className={styles.inputWrapper}>
            <Input 
              label="Адрес" 
              value={formData.address} 
              onChange={(e) => { setFormData({ ...formData, address: e.target.value }); if (errors.address) setErrors(p => ({ ...p, address: '' })); }} 
              required 
            />
            {errors.address && <span className={styles.errorText}>{errors.address}</span>}
          </div>
          
          <div className={styles.formActions}>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Отмена</Button>
            <Button variant="primary" onClick={handleSubmit}>{editingLocation ? 'Сохранить' : 'Добавить'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
});
