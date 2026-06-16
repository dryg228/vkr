import { useState, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { dataStore, authStore, navigationStore } from '@/store';
import { Card, Button, Select, Badge, Modal, Input } from '@/components/UI';
import { LazyCarImage } from '@/components/LazyCarImage';
import { Rental, RentalFormData, getRentalStatusLabel, getRentalStatusColor } from '@/types';
import styles from './RentalsPage.module.scss';

export const RentalsPage = observer(() => {
  const { rentals, activeCars, rentalsLoading, createRental, updateRentalStatus, getCarById, createReview } = dataStore;
  const { isAuthenticated, user, currentRole, userId, isAdmin } = authStore;
  
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [formData, setFormData] = useState<RentalFormData>({ carId: '', renterName: '', startDate: '', endDate: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [livePriceInfo, setLivePriceInfo] = useState<{ days: number; total: number } | null>(null);
  const [checkedInspections, setCheckedInspections] = useState<Record<string, boolean>>({});

  // Стейты для работы с интерактивным календарем
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  const monthNames = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
  ];

  // Стейты для модального окна отзывов
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewCarId, setReviewCarId] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewError, setReviewError] = useState('');

  const availableCars = activeCars.filter(car => car.ownerId !== userId);
  const displayRentals = isAdmin ? rentals : rentals.filter(rental => rental.renterId === userId);

  const filteredRentals = statusFilter === 'active' 
    ? displayRentals.filter(r => r.status === 'pending' || r.status === 'confirmed' || r.status === 'active') 
    : statusFilter === 'all' ? displayRentals : displayRentals.filter(r => r.status === statusFilter);

  const statusOptions = [
    { value: 'active', label: 'Активные' }, { value: 'all', label: 'Все' }, 
    { value: 'pending', label: 'Ожидает' }, { value: 'confirmed', label: 'Подтверждённые' }, { value: 'completed', label: 'Завершённые' }
  ];

  const getTodayString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const changeMonth = (direction: number) => {
    if (direction === -1) {
      if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(currentYear - 1); } 
      else { setCurrentMonth(currentMonth - 1); }
    } else {
      if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(currentYear + 1); } 
      else { setCurrentMonth(currentMonth + 1); }
    }
  };

  const isDateBooked = (date: Date) => {
    if (!formData.carId) return false;
    
    const carBookedPeriods = rentals.filter(r => 
      r.carId === formData.carId && 
      (r.status === 'pending' || r.status === 'confirmed' || r.status === 'active')
    );
    
    return carBookedPeriods.some(period => {
      const start = new Date(period.startDate);
      const end = new Date(period.endDate);
      const check = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      
      start.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);
      check.setHours(0, 0, 0, 0);
      
      return check >= start && check <= end;
    });
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

  const formatDateToLocalString = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const handleDateClick = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const checkDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    if (checkDate < today || isDateBooked(checkDate)) return;

    const dateStr = formatDateToLocalString(checkDate);

    if (!formData.startDate || (formData.startDate && formData.endDate)) {
      setFormData(prev => ({ ...prev, startDate: dateStr, endDate: '' }));
      setErrors(p => ({ ...p, dates: '' }));
    } else {
      const partsStart = formData.startDate.split('-');
      const start = new Date(parseInt(partsStart[0]), parseInt(partsStart[1]) - 1, parseInt(partsStart[2]));
      
      if (checkDate < start) {
        setFormData(prev => ({ ...prev, startDate: dateStr, endDate: '' }));
      } else {
        let hasBookedInside = false;
        const current = new Date(start);
        while (current <= checkDate) {
          if (isDateBooked(new Date(current))) {
            hasBookedInside = true;
            break;
          }
          current.setDate(current.getDate() + 1);
        }

        if (hasBookedInside) {
          setErrors(p => ({ ...p, dates: 'Внутри выбранного периода есть занятые или ожидающие подтверждения дни!' }));
        } else {
          setFormData(prev => ({ ...prev, endDate: dateStr }));
          setErrors(p => ({ ...p, dates: '' }));
        }
      }
    }
  };

  const handleResetDates = () => {
    setFormData(prev => ({ ...prev, startDate: '', endDate: '' }));
    setErrors(p => ({ ...p, dates: '' }));
    setLivePriceInfo(null);
  };

  useEffect(() => {
    if (!formData.carId || !formData.startDate || !formData.endDate) {
      setLivePriceInfo(null);
      return;
    }
    const car = getCarById(formData.carId);
    if (!car) return;

    const partsStart = formData.startDate.split('-');
    const partsEnd = formData.endDate.split('-');
    const start = new Date(parseInt(partsStart[0]), parseInt(partsStart[1]) - 1, parseInt(partsStart[2])).getTime();
    const end = new Date(parseInt(partsEnd[0]), parseInt(partsEnd[1]) - 1, parseInt(partsEnd[2])).getTime();

    if (end >= start) {
      const diffTime = Math.abs(end - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      setLivePriceInfo({ days: diffDays, total: diffDays * car.pricePerDay });
    } else {
      setLivePriceInfo(null);
    }
  }, [formData.carId, formData.startDate, formData.endDate, getCarById]);

  useEffect(() => {
    if (dataStore.selectedCarForRental) {
      handleOpenModal();
      setTimeout(() => { dataStore.setSelectedCarForRental(null); }, 100);
    }
  }, [dataStore.selectedCarForRental]);

  const handleOpenModal = () => {
    if (!(user as any)?.isVerified) {
      alert('Вам необходимо дождаться подтверждения водительских прав администратором.');
      return;
    }
    const defaultName = (user as any)?.name || (user as any)?.displayName || currentRole || '';
    const initialCarId = dataStore.selectedCarForRental || (availableCars.length > 0 ? availableCars[0].id : '');

    setFormData({ carId: initialCarId, renterName: defaultName, startDate: '', endDate: '' });
    setErrors({});
    setIsModalOpen(true);
  };

  const handleOpenReviewModal = (carId: string) => {
    setReviewCarId(carId); setReviewRating(5); setReviewComment(''); setReviewError(''); setIsReviewModalOpen(true);
  };

  const handleStatusChange = async (id: string, status: 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled') => { 
    await updateRentalStatus(id, status); 
  };

  const toggleInspection = (id: string) => { setCheckedInspections(prev => ({ ...prev, [id]: !prev[id] })); };

  const isRentalDateStarted = (startDateStr: string) => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const rentStart = new Date(startDateStr); rentStart.setHours(0, 0, 0, 0);
    return today.getTime() >= rentStart.getTime();
  };

  const handleSubmitReview = async () => {
    if (!reviewComment.trim()) { setReviewError('Пожалуйста, напишите текст отзыва.'); return; }
    const uName = (user as any)?.name || 'Анонимный водитель';
    const isSuccess = await createReview({ carId: reviewCarId, rating: reviewRating, comment: reviewComment, userName: uName });
    if (isSuccess) { setIsReviewModalOpen(false); alert('Отзыв успешно опубликован!'); } else { setReviewError('Не удалось отправить отзыв.'); }
  };

  const handleSubmit = async () => { 
    const newErrors: Record<string, string> = {};
    if (!formData.carId) newErrors.carId = 'Выберите автомобиль.';
    if (!formData.renterName.trim()) newErrors.renterName = 'Укажите имя.';
    if (!formData.startDate) newErrors.startDate = 'Укажите дату начала.';
    if (!formData.endDate) newErrors.endDate = 'Укажите дату окончания.';

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
      </div>
      
      <div className={styles.filters}>
        <Select options={statusOptions} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={styles.statusSelect} />
      </div>

      {filteredRentals.length === 0 ? (
        <div className={styles.empty}>Арендованные автомобили не найдены</div>
      ) : (
        <div className={styles.grid}>
          {filteredRentals.map((rental) => {
            const isStarted = isRentalDateStarted(rental.startDate);
            const isInspected = !!checkedInspections[rental.id];
            
            return (
              <Card key={rental.id} className={styles.rentalCard}>
                <div className={styles.rentalContent}>
                  <LazyCarImage carId={rental.carId} alt={rental.carName} className={styles.rentalImage} />

                  <div className={styles.rentalInfo}>
                    <div className={styles.rentalHeader}>
                      <h3 className={styles.carName}>{rental.carName}</h3>
                      <Badge variant={getRentalStatusColor(rental.status) as any}>{getRentalStatusLabel(rental.status)}</Badge>
                    </div>
                    
                    <div className={styles.rentalDetails}>
                      <p><strong>Период:</strong> {new Date(rental.startDate).toLocaleDateString('ru-RU')} — {new Date(rental.endDate).toLocaleDateString('ru-RU')}</p>
                      <p><strong>Количество дней:</strong> {rental.totalDays} дн.</p>
                    </div>

                    {rental.status === 'confirmed' && !isAdmin && (
                      <div className={styles.inspectionCheckboxBlock} style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '8px 0 16px 0', background: '#f8fafc', padding: '10px 14px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                        <input 
                          type="checkbox" 
                          id={`inspect-${rental.id}`}
                          checked={isInspected}
                          onChange={() => toggleInspection(rental.id)}
                          style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                        />
                        <label htmlFor={`inspect-${rental.id}`} style={{ fontSize: '13px', fontWeight: 600, color: '#475569', cursor: 'pointer', userSelect: 'none' }}>
                          Я лично встретился с владельцем, осмотрел кузов и проверил салон автомобиля
                        </label>
                      </div>
                    )}

                    {rental.status === 'confirmed' && !isAdmin && !isStarted && (
                      <div style={{ fontSize: '12px', fontWeight: 500, color: '#64748b', marginBottom: '12px', fontStyle: 'italic' }}>
                        ⏳ Кнопка начала поездки станет активна в день начала бронирования ({new Date(rental.startDate).toLocaleDateString('ru-RU')}).
                      </div>
                    )}
                    
                    <div className={styles.rentalFooter}>
                      <div className={styles.totalPrice}>{rental.totalPrice} ₽</div>
                      
                      <div className={styles.rentalActions}>
                        {rental.status === 'pending' && isAdmin && (
                          <>
                            <Button size="sm" variant="primary" onClick={() => handleStatusChange(rental.id, 'confirmed')}>Подтвердить</Button>
                            <Button size="sm" variant="danger" onClick={() => handleStatusChange(rental.id, 'cancelled')}>Отклонить</Button>
                          </>
                        )}
                        
                        {rental.status === 'confirmed' && !isAdmin && (
                          <Button 
                            size="sm" 
                            variant="primary" 
                            onClick={() => handleStatusChange(rental.id, 'active')}
                            disabled={!isStarted || !isInspected}
                          >
                            {!isStarted ? 'Дата поездки не наступила' : !isInspected ? 'Подтвердите осмотр авто' : 'Начать поездку'}
                          </Button>
                        )}

                        {rental.status === 'active' && (
                          <Button size="sm" variant="success" onClick={() => handleStatusChange(rental.id, 'completed')}>Завершить аренду</Button>
                        )}

                        {rental.status === 'completed' && !isAdmin && (
                          <Button size="sm" variant="secondary" onClick={() => handleOpenReviewModal(rental.carId)}>★ Оставить отзыв</Button>
                        )}

                        {((rental.status === 'pending' || rental.status === 'confirmed') && !isAdmin) && (
                          <Button 
                            size="sm" 
                            variant="danger" 
                            onClick={() => window.confirm('Вы уверены, что хотите отменить эту аренду?') && handleStatusChange(rental.id, 'cancelled')}
                          >
                            Отменить аренду
                          </Button>
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
      {/* Модальное окно оформления новой аренды с интерактивным календарем */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Новая ареннда">
        <div className={styles.form}>
          <Select 
            label="Автомобиль" 
            options={availableCars.map(c => ({ value: c.id, label: `${c.brand} ${c.model}` }))} 
            value={formData.carId} 
            onChange={(e) => setFormData({ ...formData, carId: e.target.value, startDate: '', endDate: '' })} 
            required={true}
          />
          
          <div className={styles.inputWrapper}>
            <Input label="Имя арендатора" value={formData.renterName} onChange={(e) => setFormData({ ...formData, renterName: e.target.value })} required />
            {errors.renterName && <span className={styles.errorText}>{errors.renterName}</span>}
          </div>

          {/* Интерактивная календарная сетка выбора дат */}
          {formData.carId && (
            <div className={styles.calendarContainer}>
              <div className={styles.calendarControls}>
                <button type="button" onClick={() => changeMonth(-1)}>←</button>
                <span>{monthNames[currentMonth]} {currentYear}</span>
                <button type="button" onClick={() => changeMonth(1)}>→</button>
              </div>

              <div className={styles.weekDays}>
                <span>Пн</span><span>Вт</span><span>Ср</span><span>Чт</span><span>Пт</span><span>Сб</span><span>Вс</span>
              </div>

              <div className={styles.daysGrid}>
                {calendarDays.map((date, index) => {
                  if (!date) return <div key={`empty-${index}`} className={styles.emptyCell} />;
                  
                  const dateStr = formatDateToLocalString(date);
                  const today = new Date(); today.setHours(0,0,0,0);
                  
                  const checkDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
                  const isPast = checkDate < today;
                  const isBooked = isDateBooked(checkDate);
                  
                  const isStart = formData.startDate === dateStr;
                  const isEnd = formData.endDate === dateStr;
                  const isBetween = formData.startDate && formData.endDate && 
                                    dateStr > formData.startDate && dateStr < formData.endDate;

                  let dayClass = styles.dayCell;
                  if (isPast) dayClass += ` ${styles.dayPast}`;
                  else if (isBooked) dayClass += ` ${styles.dayBooked}`;
                  else if (isStart) dayClass += ` ${styles.daySelectedStart}`;
                  else if (isEnd) dayClass += ` ${styles.daySelectedEnd}`;
                  else if (isBetween) dayClass += ` ${styles.dayBetween}`;

                  return (
                    <div 
                      key={dateStr} 
                      className={dayClass}
                      onClick={() => handleDateClick(date)}
                    >
                      {date.getDate()}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Панель подтверждения выбранных дат с кнопкой мгновенного сброса */}
          <div className={styles.selectedDatesInfo} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ margin: '0 0 4px 0' }}><strong>Начало поездки:</strong> {formData.startDate ? new Date(formData.startDate).toLocaleDateString('ru-RU') : 'Не выбрано'}</p>
              <p style={{ margin: 0 }}><strong>Завершение поездки:</strong> {formData.endDate ? new Date(formData.endDate).toLocaleDateString('ru-RU') : 'Не выбрано'}</p>
            </div>
            {(formData.startDate || formData.endDate) && (
              <Button size="sm" variant="secondary" onClick={handleResetDates} style={{ height: '36px', padding: '0 12px' }}>
                Сбросить даты
              </Button>
            )}
          </div>

          {errors.dates && (
            <div className={styles.errorText} style={{ background: '#fff5f5', padding: '12px', borderRadius: '12px', border: '1px solid #ffe4e6', display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', boxSizing: 'border-box' }}>
              <span style={{ fontWeight: 600 }}>⚠️ {errors.dates}</span>
              <Button size="sm" variant="danger" onClick={handleResetDates} style={{ height: '32px', padding: '0 10px', fontSize: '12px' }}>
                Очистить
              </Button>
            </div>
          )}
          
          {errors.startDate && <span className={styles.errorText}>{errors.startDate}</span>}
          {errors.endDate && <span className={styles.errorText}>{errors.endDate}</span>}

          {livePriceInfo && !errors.dates && (
            <div className={styles.priceBadge}>
              Итого: {livePriceInfo.days} дн. — {livePriceInfo.total} ₽
            </div>
          )}

          <div className={styles.formActions}>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Отмена</Button>
            <Button variant="primary" onClick={handleSubmit} disabled={!formData.startDate || !formData.endDate || !!errors.dates}>Создать</Button>
          </div>
        </div>
      </Modal>

      {/* Модальное окно публикации отзыва */}
      <Modal isOpen={isReviewModalOpen} onClose={() => setIsReviewModalOpen(false)} title="Оцените автомобиль">
        <div className={styles.form}>
          <div className={styles.starsWrapper}>
            {[1, 2, 3, 4, 5].map((star) => (
              <span 
                key={star} 
                onClick={() => setReviewRating(star)} 
                className={star <= reviewRating ? styles.starActive : styles.starInactive}
              >
                ★
              </span>
            ))}
          </div>
          <div className={styles.inputWrapper}>
            <Input label="Комментарий к отзыву" value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} required />
            {reviewError && <span className={styles.errorText}>{reviewError}</span>}
          </div>
          <div className={styles.formActions}>
            <Button variant="secondary" onClick={() => setIsReviewModalOpen(false)}>Отмена</Button>
            <Button variant="primary" onClick={handleSubmitReview}>Опубликовать</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
});

export default RentalsPage;
