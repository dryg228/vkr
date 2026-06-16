import { useMemo } from 'react';
import { observer } from 'mobx-react-lite';
import { Table, Button, Select, Badge } from '@/components/UI';
import { Car, Location, Rental, User } from '@/types';

const rentalStatusOptions = [
  { value: 'pending', label: 'Ожидает' }, 
  { value: 'confirmed', label: 'Подтверждена' }, 
  { value: 'completed', label: 'Завершена' },
  { value: 'canceled', label: 'Отменена' }
];

// Таблица Автомобилей
interface CarsTableProps {
  cars: Car[];
  getLocationById: (id: string) => any;
  onPreviewImage: (url: string) => void;
  onToggleVerify: (id: string, status: boolean) => void;
  onDelete: (id: string) => void;
}
export const CarsTable = observer(({ cars, getLocationById, onPreviewImage, onToggleVerify, onDelete }: CarsTableProps) => {
  const carColumns = useMemo(() => [
    { 
      key: 'carImageUrl', 
      title: 'Фото авто', 
      render: (c: Car) => c.carImageUrl ? (
        <img src={c.carImageUrl} alt="Миниатюра" onClick={() => onPreviewImage(c.carImageUrl || '')} style={{ width: '50px', height: '35px', borderRadius: '6px', objectFit: 'cover', cursor: 'pointer', border: '1px solid #e2e8f0' }} />
      ) : <span style={{ color: '#94a3b8' }}>Нет фото</span>
    },
    { key: 'brand', title: 'Марка' }, 
    { key: 'model', title: 'Модель' }, 
    { key: 'licensePlate', title: 'Госномер' },
    { key: 'pricePerDay', title: 'Цена/день', render: (c: Car) => `${c.pricePerDay} ₽` },
    { key: 'locationId', title: 'Локация', render: (c: Car) => getLocationById(c.locationId)?.name || '-' },
    { 
      key: 'isVerified', 
      title: 'Модерация', 
      render: (c: Car) => (
        <Button size="sm" variant={c.isVerified ? 'success' : 'warning'} onClick={() => onToggleVerify(c.id, !!c.isVerified)}>
          {c.isVerified ? 'Одобрено (Да)' : 'Подтвердить (Нет)'}
        </Button>
      )
    },
    { key: 'actions', title: '', render: (c: Car) => <Button size="sm" variant="danger" onClick={() => onDelete(c.id)}>Удалить</Button> }
  ], [getLocationById, onToggleVerify, onDelete, onPreviewImage]);

  return <Table columns={carColumns} data={cars} keyField="id" />;
});

// Таблица Локаций
interface LocationsTableProps {
  locations: Location[];
  onOpenModal: (l?: Location) => void;
  onToggleActive: (id: string, active: boolean) => void;
  onDelete: (id: string) => void;
}
export const LocationsTable = observer(({ locations, onOpenModal, onToggleActive, onDelete }: LocationsTableProps) => {
  const locationColumns = useMemo(() => [
    { key: 'name', title: 'Название' }, 
    { key: 'city', title: 'Город' }, 
    { key: 'address', title: 'Адрес' },
    { key: 'isActive', title: 'Активна', render: (l: Location) => <Button size="sm" variant={l.isActive ? 'success' : 'secondary'} onClick={() => onToggleActive(l.id, l.isActive)}>{l.isActive ? 'Да (Активна)' : 'Нет (Выкл)'}</Button> },
    { key: 'actions', title: '', render: (l: Location) => (
      <div style={{ display: 'flex', gap: '8px' }}>
        <Button size="sm" variant="secondary" onClick={() => onOpenModal(l)}>Редактировать</Button>
        <Button size="sm" variant="danger" onClick={() => onDelete(l.id)}>Удалить</Button>
      </div>
    )}
  ], [onToggleActive, onOpenModal, onDelete]);

  return <Table columns={locationColumns} data={locations} keyField="id" />;
});

// Таблица Аренд
interface RentalsTableProps {
  rentals: Rental[];
  onStatusChange: (id: string, status: string) => void;
  onDelete: (id: string) => void;
}
export const RentalsTable = observer(({ rentals, onStatusChange, onDelete }: RentalsTableProps) => {
  const rentalColumns = useMemo(() => [
    { key: 'carName', title: 'Авто' }, 
    { key: 'renterName', title: 'Арендатор' },
    { key: 'startDate', title: 'Начало', render: (r: Rental) => new Date(r.startDate).toLocaleDateString('ru-RU') },
    { key: 'endDate', title: 'Конец', render: (r: Rental) => new Date(r.endDate).toLocaleDateString('ru-RU') },
    { key: 'totalPrice', title: 'Сумма', render: (r: Rental) => `${r.totalPrice} ₽` },
    { 
      key: 'status', 
      title: 'Статус', 
      render: (r: Rental) => {
        if (r.status === 'confirmed') return <Badge variant="success">Подтверждена</Badge>;
        if (r.status === 'completed') return <Badge variant="secondary">Завершена</Badge>;
        if (r.status === 'canceled') return <Badge variant="danger">Отменена</Badge>;
        
        if (r.status === 'pending') {
          return (
            <div style={{ display: 'flex', gap: '6px' }}>
              <Button size="sm" variant="success" onClick={() => onStatusChange(r.id, 'confirmed')}>Подтвердить</Button>
              <Button size="sm" variant="danger" onClick={() => onStatusChange(r.id, 'canceled')}>Отклонить</Button>
            </div>
          );
        }
        return <Select options={rentalStatusOptions} value={r.status} onChange={(e: any) => onStatusChange(r.id, e.target?.value ?? e)} style={{ width: '170px', padding: '4px' }} />;
      } 
    },
    { key: 'actions', title: '', render: (r: Rental) => <Button size="sm" variant="danger" onClick={() => onDelete(r.id)}>Удалить</Button> }
  ], [onStatusChange, onDelete]);

  return <Table columns={rentalColumns} data={rentals} keyField="id" />;
});

// Таблица Пользователей / Модерации прав
interface UsersTableProps {
  users: Array<User & { uid: string }>;
  onPreviewImage: (url: string) => void;
  onApprove: (uid: string) => void;
  onReject: (uid: string) => void;
}
export const UsersTable = observer(({ users, onPreviewImage, onApprove, onReject }: UsersTableProps) => {
  const userColumns = useMemo(() => [
    { key: 'name', title: 'Имя водителя' },
    { key: 'email', title: 'Email' },
    { key: 'licenseNumber', title: 'Серия / Номер ВУ', render: (u: any) => u.licenseNumber || <span style={{ color: '#94a3b8' }}>Не указаны</span> },
    { key: 'licenseDate', title: 'Дата выдачи', render: (u: any) => u.licenseDate ? new Date(u.licenseDate).toLocaleDateString('ru-RU') : '-' },
    { 
      key: 'licenseImageUrl', 
      title: 'Фото прав', 
      render: (u: any) => {
        if (!u.licenseImageUrl) return <span style={{ color: '#94a3b8' }}>Нет фото</span>;
        return <img src={u.licenseImageUrl} alt="ВУ" onClick={() => onPreviewImage(u.licenseImageUrl)} style={{ width: '50px', height: '35px', borderRadius: '4px', border: '1px solid #e2e8f0', objectFit: 'cover', cursor: 'pointer' }} />;
      }
    },
    { 
      key: 'isVerified', 
      title: 'Статус / Действия', 
      render: (u: any) => {
        if (!u.licenseNumber) return <Badge variant="danger">Нет документов</Badge>;
        if (u.isVerified) {
          return (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <Badge variant="success">Одобрено</Badge>
              <Button size="sm" variant="danger" onClick={() => onReject(u.uid)}>Отозвать права</Button>
            </div>
          );
        }
        return (
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button size="sm" variant="success" onClick={() => onApprove(u.uid)}>Одобрить</Button>
            <Button size="sm" variant="danger" onClick={() => onReject(u.uid)}>Отклонить</Button>
          </div>
        );
      } 
    }
  ], [onPreviewImage, onApprove, onReject]);

  return <Table columns={userColumns} data={users} keyField="uid" />;
});
import { useEffect, useState } from 'react';
import { Modal, Input, Button } from '@/components/UI';
import { Location, LocationFormData } from '@/types';
import styles from '../AdminPage.module.scss';

interface LocationFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingLocation: Location | null;
  onSubmit: (formData: LocationFormData & { description?: string }) => Promise<void>;
}

export const LocationFormModal = ({ isOpen, onClose, editingLocation, onSubmit }: LocationFormModalProps) => {
  const [formData, setFormData] = useState<LocationFormData & { description?: string }>({ name: '', address: '', city: '', description: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (editingLocation) {
      setFormData({ name: editingLocation.name, address: editingLocation.address, city: editingLocation.city, description: editingLocation.description || '' });
    } else {
      setFormData({ name: '', address: '', city: '', description: '' });
    }
    setErrors({});
  }, [editingLocation, isOpen]);

  const handleFormSubmit = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = 'Укажите название локации.';
    if (!formData.city.trim()) newErrors.city = 'Укажите город.';
    if (!formData.address.trim()) newErrors.address = 'Укажите адрес локации.';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    onSubmit(formData);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editingLocation ? 'Редактировать локацию' : 'Добавить локацию'}>
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
          <Button variant="secondary" onClick={onClose}>Отмена</Button>
          <Button variant="primary" onClick={handleFormSubmit}>{editingLocation ? 'Сохранить' : 'Добавить'}</Button>
        </div>
      </div>
    </Modal>
  );
};
