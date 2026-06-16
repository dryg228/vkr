import { useEffect, useState, useRef } from 'react';
import { observer } from 'mobx-react-lite';
import { dataStore, authStore } from '@/store';
import { Card, Button, Badge, Modal, Input, Select } from '@/components/UI';
import { LocationDropdown } from '@/components/UI/LocationDropdown';
import { LazyCarImage } from '@/components/LazyCarImage';
import { Car, CarFormData, getCarStatusLabel, getFuelTypeLabel, getTransmissionLabel, formatCarName } from '@/types';
import styles from './MyCarsPage.module.scss';

export const MyCarsPage = observer(() => {
  const { cars, locations, createCar, updateCar, deleteCar, getLocationById, brandTemplates, loadBrandTemplates, templatesLoading } = dataStore;
  const { isAdmin, isAuthenticated, userId } = authStore;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCar, setEditingCar] = useState<Car | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState<CarFormData & { carImageUrl?: string; isVerified?: boolean; locationName?: string; city?: string }>({ 
    brand: '', model: '', year: 2026, licensePlate: '', fuelType: 'petrol', 
    transmission: 'automatic', seats: 5, pricePerDay: 2000, locationId: '', carImageUrl: '', isVerified: false, locationName: '', city: ''
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadBrandTemplates(); }, []);

  const brandKeys = Object.keys(brandTemplates || {});
  const finalBrandsList = brandKeys.length > 0 ? brandKeys : ['ВАЗ', 'Lada', 'Audi', 'BMW', 'Mercedes-Benz', 'Toyota', 'Kia', 'Hyundai', 'Tesla'];
  
  const allBrands = finalBrandsList
    .map(b => ({ value: b, id: b, label: b === 'ВАЗ' ? 'ВАЗ (Lada)' : b }))
    .sort((a, b) => a.label.localeCompare(b.label));

  useEffect(() => {
    if (allBrands.length > 0 && !formData.brand && !editingCar) {
      const defBrand = allBrands[0]?.value || '';
      const t = brandTemplates[defBrand];
      setFormData(p => ({ 
        ...p, brand: defBrand, fuelType: t?.fuelType || 'petrol', transmission: t?.transmission || 'automatic', 
        seats: t?.seats || 5, pricePerDay: t?.pricePerDay || 2000, locationId: '', carImageUrl: '', isVerified: false, locationName: '', city: ''
      }));
    }
  }, [brandTemplates, editingCar, allBrands]);

  const handleBrandChange = (brand: string) => {
    const t = brandTemplates[brand];
    setErrors(p => ({ ...p, brand: '' }));
    setFormData(p => t ? { ...p, brand, fuelType: t.fuelType, transmission: t.transmission, pricePerDay: t.pricePerDay, seats: t.seats } : { ...p, brand });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Размер файла не должен превышать 5 МБ.');
        return;
      }
      setSelectedFile(file);
      setFilePreview(URL.createObjectURL(file));
    }
  };

  const myCars = cars.filter(c => isAdmin || c.ownerId === userId);

  const handleOpenModal = (car?: Car) => {
    if (!isAuthenticated) return;
    setEditingCar(car || null);
    
    const defBrand = allBrands[0]?.value || '';
    const t = brandTemplates[car?.brand || defBrand];
    const currentLoc = car ? getLocationById(car.locationId) : null;
    
    setFormData({
      brand: car?.brand || defBrand, 
      model: car?.model || '', 
      year: car?.year || new Date().getFullYear(), 
      licensePlate: car?.licensePlate || '',
      fuelType: (car?.fuelType || t?.fuelType || 'petrol') as any, 
      transmission: (car?.transmission || t?.transmission || 'automatic') as any,
      seats: car?.seats || t?.seats || 5, 
      pricePerDay: car?.pricePerDay || t?.pricePerDay || 2000, 
      locationId: car?.locationId || '',
      carImageUrl: '',
      isVerified: (car as any)?.isVerified ?? false,
      locationName: currentLoc ? currentLoc.name : '',
      city: currentLoc ? currentLoc.city : ''
    });

    setFilePreview(null);
    setSelectedFile(null);
    setErrors({});
    setIsModalOpen(true);
  };

  const upd = (key: string, val: any) => {
    setFormData(p => ({ ...p, [key]: val }));
    if (errors[key]) setErrors(p => ({ ...p, [key]: '' }));
  };

  const handleSubmit = async () => {
    const errs: Record<string, string> = {};
    const curYear = new Date().getFullYear();

    if (!formData.brand) errs.brand = 'Выберите марку.';
    if (!formData.model.trim()) errs.model = 'Укажите модель.';
    if (!formData.licensePlate.trim()) errs.licensePlate = 'Введите госномер.';
    
    if (!(formData as any).locationName?.trim()) errs.locationId = 'Укажите адрес стоянки автомобиля.';
    if (!(formData as any).city?.trim()) errs.city = 'Укажите город.';
    
    if (!formData.year || formData.year < 1900 || formData.year > curYear) errs.year = `Год: 1900-${curYear}.`;
    if (!formData.pricePerDay || formData.pricePerDay <= 0) errs.pricePerDay = 'Цена должна быть > 0 ₽.';
    if (!selectedFile && !formData.carImageUrl) errs.carImageUrl = 'Загрузите фотографию автомобиля.';

    if (Object.keys(errs).length > 0) return setErrors(errs);

    let finalData = { ...formData };

    if (selectedFile) {
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(selectedFile);
        reader.onload = () => resolve(reader.result as string);
      });
      finalData.carImageUrl = base64;
    }

    if (editingCar) {
      const updatePayload = {
        ...finalData,
        isVerified: isAdmin ? (editingCar as any).isVerified : false
      };
      await updateCar(editingCar.id, updatePayload as any);
    } else {
      await createCar({ ...finalData, ownerId: userId, renterId: userId } as any);
    }
    setIsModalOpen(false);
  };

  if (templatesLoading) return <div className={styles.loading}>Загрузка конфигураций...</div>;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>{isAdmin ? 'Управление автомобилями (Админ)' : 'Мои автомобили'}</h1>
        {isAuthenticated && !isAdmin && <Button variant="primary" onClick={() => handleOpenModal()}>Добавить авто</Button>}
      </div>
      {myCars.length === 0 ? (
        <div className={styles.empty}>У вас пока нет автомобилей</div>
      ) : (
        <div className={styles.grid}>
          {myCars.map(car => (
            <Card key={car.id} className={styles.carCard}>
              <div className={styles.carContent}>
                <LazyCarImage carId={car.id} alt="Авто" className={styles.carImage} />
                
                {/* ИСПРАВЛЕНО: Флекс-обертка текстовой информации для защиты от сжатия */}
                <div className={styles.carInfoWrapper}>
                  
                  <div className={styles.carOriginalHeader}>
                    <h3>{formatCarName(car)}</h3>
                    
                    <div className={styles.statusBadgesRow}>
                      {/* Если машина не проверена администратором — показываем только "На модерации" */}
                      {!(car as any).isVerified ? (
                        <Badge variant="warning">На модерации</Badge>
                      ) : (
                        /* Если модерация успешно пройдена — показываем штатный статус доступности */
                        <Badge variant={(car.status === 'available' ? 'success' : 'warning') as any}>
                          {getCarStatusLabel(car.status)}
                        </Badge>
                      )}
                    </div>
                  </div>



                  <div className={styles.carDetails}>
                    <span>{getFuelTypeLabel(car.fuelType)}</span>
                    <span>{getTransmissionLabel(car.transmission)}</span>
                    <span>{car.seats} мест</span>
                  </div>
                  
                  <p className={styles.location}>📍 {getLocationById(car.locationId)?.name || 'Не указана'}</p>
                  <div className={styles.carPrice}>{car.pricePerDay} ₽/день</div>
                </div>

              </div>

              <div className={styles.carActions}>
                <Button size="sm" variant="secondary" onClick={() => handleOpenModal(car)}>Редактировать</Button>
                <Button size="sm" variant="danger" onClick={() => window.confirm('Удалить автомобиль?') && deleteCar(car.id)}>Удалить</Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Модальное окно создания и редактирования ТС */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingCar ? 'Редактировать авто' : 'Добавить авто'}>
        <div className={styles.form}>
          <div className={styles.inputWrapper}>
            <Select label="Марка" options={allBrands} value={formData.brand} onChange={(e) => handleBrandChange(e.target.value)} required />
            {errors.brand && <span className={styles.errorText}>{errors.brand}</span>}
          </div>

          {[
            { k: 'model', l: 'Модель', t: 'text' },
            { k: 'year', l: 'Год', t: 'number' },
            { k: 'licensePlate', l: 'Госномер', t: 'text' },
            { k: 'pricePerDay', l: 'Цена за день (₽)', t: 'number' }
          ].map(({ k, l, t }) => (
            <div key={k} className={styles.inputWrapper}>
              <Input label={l} type={t} value={formData[k as keyof CarFormData]} onChange={(e) => upd(k, t === 'number' ? parseInt(e.target.value) || 0 : e.target.value)} required />
              {errors[k] && <span className={styles.errorText}>{errors[k]}</span>}
            </div>
          ))}

          <Select label="Тип топлива" options={[{ value: 'petrol', label: 'Бензин' }, { value: 'diesel', label: 'Дизель' }, { value: 'electric', label: 'Электро' }, { value: 'hybrid', label: 'Гибрид' }]} value={formData.fuelType} onChange={(e) => upd('fuelType', e.target.value)} />
          <Select label="Коробка передач" options={[{ value: 'manual', label: 'Механика' }, { value: 'automatic', label: 'Автомат' }]} value={formData.transmission} onChange={(e) => upd('transmission', e.target.value)} />
          <Input label="Количество мест" type="number" value={formData.seats} onChange={(e) => upd('seats', parseInt(e.target.value) || 0)} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
            <div className={styles.inputWrapper}>
              <Input label="Город" placeholder="Сочи" value={(formData as any).city || ''} onChange={(e) => upd('city', e.target.value)} required />
              {errors.city && <span className={styles.errorText}>{errors.city}</span>}
            </div>
            <div className={styles.inputWrapper}>
              <Input label="Адрес стоянки авто" placeholder="ул. Ленина, д. 10" value={(formData as any).locationName || ''} onChange={(e) => upd('locationName', e.target.value)} required />
              {errors.locationId && <span className={styles.errorText}>{errors.locationId}</span>}
            </div>
          </div>

          <div className={styles.inputWrapper}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Фотография автомобиля</label>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" style={{ display: 'none' }} />
            <div onClick={() => fileInputRef.current?.click()} style={{ padding: '16px', border: '2px dashed #cbd5e1', borderRadius: '12px', textAlign: 'center', background: '#f8fafc', color: '#64748b', cursor: 'pointer' }}>
              {selectedFile ? `Выбран файл: ${selectedFile.name}` : formData.carImageUrl ? '📄 Изменить фото автомобиля' : '📁 Нажмите для выбора фотографии авто'}
            </div>
            {errors.carImageUrl && <span className={styles.errorText} style={{ display: 'block', marginTop: '4px' }}>{errors.carImageUrl}</span>}
            {filePreview && (
              <div style={{ marginTop: '12px', textAlign: 'center' }}>
                <img src={filePreview} alt="Превью авто" style={{ maxWidth: '100%', maxHeight: '150px', borderRadius: '12px', border: '1px solid #e2e8f0', objectFit: 'contain' }} />
              </div>
            )}
          </div>

          <div className={styles.formActions}>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Отмена</Button>
            <Button variant="primary" onClick={handleSubmit}>Добавить</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
});

export default MyCarsPage;
