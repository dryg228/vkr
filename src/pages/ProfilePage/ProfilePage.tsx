import { useState, useEffect, useRef } from 'react';
import { observer } from 'mobx-react-lite';
// ИСПРАВЛЕНО: Добавили dataStore в импорт для работы с отзывами и историей
import { authStore, dataStore } from '@/store';
import { Card, Button, Input, Badge, Modal } from '@/components/UI';
import styles from './ProfilePage.module.scss';

export const ProfilePage = observer(() => {
  const { user, isAdmin, isAuthenticated, updateDriverLicense, isLoading } = authStore;

  const [licenseNumber, setLicenseNumber] = useState('');
  const [licenseDate, setLicenseDate] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  // ИНТЕГРИРОВАНО: Стейты для отправки отзыва из истории поездок
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewCarId, setReviewCarId] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewError, setReviewError] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      setLicenseNumber((user as any).licenseNumber || '');
      setLicenseDate((user as any).licenseDate || '');
      setFilePreview((user as any).licenseImageUrl || null);
    }
  }, [user]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Размер файла не должен превышать 5 МБ.');
        return;
      }
      setSelectedFile(file);
      setError('');
      setFilePreview(URL.createObjectURL(file));
    }
  };

  const handleSaveLicense = async () => {
    setError('');
    setSuccessMessage('');

    const cleanNumber = licenseNumber.replace(/\s/g, '');
    const licenseRegex = /^\d{10}$/;

    if (!licenseRegex.test(cleanNumber)) {
      setError('Серия и номер прав должны состоять ровно из 10 цифр без букв.');
      return;
    }

    if (!licenseDate) {
      setError('Укажите дату выдачи удостоверения.');
      return;
    }

    if (!selectedFile && !(user as any).licenseImageUrl) {
      setError('Пожалуйста, прикрепите фото или скан водительского удостоверения.');
      return;
    }

    const isSaved = await updateDriverLicense(cleanNumber, licenseDate, selectedFile || undefined);
    if (isSaved) {
      setSuccessMessage('Данные и фото успешно отправлены на модерацию администратору!');
      setSelectedFile(null);
    } else {
      setError('Не удалось сохранить данные. Попробуйте позже.');
    }
  };

  // ИНТЕГРИРОВАНО: Логика открытия и публикации отзыва
  const handleOpenReviewModal = (carId: string) => {
    setReviewCarId(carId);
    setReviewRating(5);
    setReviewComment('');
    setReviewError('');
    setIsReviewModalOpen(true);
  };

  const handleSubmitReview = async () => {
    if (!reviewComment.trim()) {
      setReviewError('Пожалуйста, напишите текст отзыва.');
      return;
    }
    const uName = (user as any)?.name || 'Анонимный водитель';
    const isSuccess = await dataStore.createReview({ carId: reviewCarId, rating: reviewRating, comment: reviewComment, userName: uName });
    if (isSuccess) {
      setIsReviewModalOpen(false);
      alert('Отзыв успешно опубликован!');
    } else {
      setReviewError('Не удалось отправить отзыв.');
    }
  };

  if (!isAuthenticated) {
    return <div className={styles.notAuth}>Войдите в аккаунт, чтобы просмотреть профиль.</div>;
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Мой профиль</h1>

      <div className={styles.container}>
        {/* Карточка личных данных */}
        <Card className={styles.profileCard} style={{ background: '#fff', padding: '24px', borderRadius: '24px', border: '1px solid #f1f5f9', marginBottom: '24px' }}>
          <h3>Личные данные</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
            <p style={{ margin: 0 }}><strong>Имя:</strong> {(user as any)?.name || 'Не указано'}</p>
            <p style={{ margin: 0 }}><strong>Email:</strong> {(user as any)?.email || 'Не указано'}</p>
            <p style={{ margin: 0, marginTop: '4px' }}>
              <strong>Статус:</strong> <Badge variant={(isAdmin ? 'danger' : 'primary') as any}>{isAdmin ? 'Администратор' : 'Водитель / Владелец'}</Badge>
            </p>
          </div>
        </Card>
        {/* Блок документов: доступен всем, кроме администратора */}
        {!isAdmin ? (
          <>
            <Card className={styles.licenseCard} style={{ background: '#fff', padding: '24px', borderRadius: '24px', border: '1px solid #f1f5f9' }}>
              <h3>Водительское удостоверение РФ</h3>
              <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '16px' }}>
                Для проката автомобилей необходимо указать данные водительских прав РФ и загрузить их фотографию.
              </p>

              <div style={{ marginBottom: '16px' }}>
                <strong>Статус проверки:</strong>{' '}
                {(user as any).licenseNumber ? (
                  <Badge variant={((user as any).isVerified ? 'success' : 'warning') as any}>
                    {(user as any).isVerified ? 'Подтверждены' : 'На модерации'}
                  </Badge>
                ) : (
                  <Badge variant={'danger' as any}>Не заполнено</Badge>
                )}
              </div>

              <div className={styles.form}>
                <div className={styles.inputWrapper} style={{ marginBottom: '12px' }}>
                  <Input 
                    label="Серия и номер ВУ (10 цифр)" 
                    placeholder="Например: 7712345678" 
                    value={licenseNumber}
                    onChange={(e) => setLicenseNumber(e.target.value)}
                    disabled={(user as any).isVerified}
                  />
                </div>

                <div className={styles.inputWrapper} style={{ marginBottom: '16px' }}>
                  <Input 
                    label="Дата выдачи" 
                    type="date" 
                    value={licenseDate}
                    onChange={(e) => setLicenseDate(e.target.value)}
                    disabled={(user as any).isVerified}
                  />
                </div>

                <div className={styles.inputWrapper} style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Скан / Фото водительского удостоверения
                  </label>
                  
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    style={{ display: 'none' }}
                    disabled={(user as any).isVerified}
                  />

                  <div 
                    onClick={() => !(user as any).isVerified && fileInputRef.current?.click()}
                    style={{ 
                      padding: '24px', 
                      border: '2px dashed #cbd5e1', 
                      borderRadius: '12px', 
                      textAlign: 'center', 
                      background: '#f8fafc', 
                      color: '#64748b', 
                      fontSize: '13px',
                      cursor: (user as any).isVerified ? 'default' : 'pointer'
                    }}
                  >
                    {selectedFile ? `Выбран файл: ${selectedFile.name}` : (user as any).licenseImageUrl ? '📄 Изменить прикрепленное фото прав' : '📁 Нажмите, чтобы выбрать или загрузить фото прав'}
                  </div>

                  {filePreview && (
                    <div style={{ marginTop: '12px', textAlign: 'center' }}>
                      <img 
                        src={filePreview} 
                        alt="Превью ВУ" 
                        style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '12px', border: '1px solid #e2e8f0', objectFit: 'contain' }} 
                      />
                    </div>
                  )}
                </div>
                {error && <div style={{ color: '#ef4444', fontSize: '14px', marginBottom: '12px' }}>{error}</div>}
                {successMessage && <div style={{ color: '#22c55e', fontSize: '14px', marginBottom: '12px' }}>{successMessage}</div>}

                {!(user as any).isVerified && (
                  <Button variant="primary" onClick={handleSaveLicense} disabled={isLoading}>
                    {isLoading ? 'Загрузка и отправка...' : 'Отправить на проверку'}
                  </Button>
                )}
              </div>
            </Card>

            {/* ИНТЕГРИРОВАНО: Секция «История поездок» с возможностью отправки отзывов */}
            <div style={{ marginTop: '32px', borderTop: '2px solid #f1f5f9', paddingTop: '24px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1e293b', marginBottom: '16px' }}>
                История моих поездок (Архив)
              </h2>
              
              {dataStore.getUserRentalHistory(authStore.userId || '').length === 0 ? (
                <div style={{ color: '#64748b', fontSize: '14px', fontStyle: 'italic', padding: '16px', background: '#f8fafc', borderRadius: '12px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
                  У вас пока нет завершённых или отменённых поездок.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {dataStore.getUserRentalHistory(authStore.userId || '').map((rental: any) => (
                    <div key={rental.id} style={{ background: '#fff', padding: '20px', borderRadius: '18px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                          <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>{rental.carName || 'Автомобиль'}</h4>
                          <Badge variant={rental.status === 'completed' ? 'success' : 'danger' as any}>
                            {rental.status === 'completed' ? 'Завершена' : 'Отменена'}
                          </Badge>
                        </div>
                        <p style={{ margin: '0 0 4px 0', fontSize: '13px', color: '#475569' }}>
                          <strong>Период:</strong> {new Date(rental.startDate).toLocaleDateString('ru-RU')} — {new Date(rental.endDate).toLocaleDateString('ru-RU')}
                        </p>
                        <p style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#2563eb' }}>
                          Стоимость: {rental.totalPrice} ₽
                        </p>
                      </div>
                      
                      {/* Доступ к отзыву открыт только для завершённых поездок */}
                      {rental.status === 'completed' && (
                        <Button size="sm" variant="secondary" onClick={() => handleOpenReviewModal(rental.carId)}>
                          ★ Оставить отзыв
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            {/* ИНТЕГРИРОВАНО: Блок отзывов от арендаторов о машинах текущего пользователя */}
            <div style={{ marginTop: '32px', borderTop: '2px solid #f1f5f9', paddingTop: '24px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1e293b', marginBottom: '16px' }}>
                Отзывы от арендаторов
              </h2>
              
              {dataStore.getReviewsForOwner(authStore.userId || '').length === 0 ? (
                <div style={{ color: '#64748b', fontSize: '14px', fontStyle: 'italic', padding: '16px', background: '#f8fafc', borderRadius: '12px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
                  Арендаторы пока не оставляли отзывы о ваших автомобилях.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {dataStore.getReviewsForOwner(authStore.userId || '').map((review) => {
                    const car = dataStore.getCarById(review.carId);
                    const rev = review as any;
                    
                    return (
                      <div key={review.id} style={{ background: '#fff', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <strong style={{ color: '#334155', fontSize: '15px' }}>
                            {rev.userName || rev.renterName || rev.authorName || 'Анонимный водитель'}
                          </strong>
                          <span style={{ color: '#eab308', letterSpacing: '2px' }}>
                            {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                          </span>
                        </div>
                        <p style={{ margin: '0 0 8px 0', color: '#475569', fontSize: '14px', lineHeight: '1.5' }}>
                          {review.comment}
                        </p>
                        {car && (
                          <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Машина: {car.brand} {car.model} [{car.licensePlate}]
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        ) : (
          <Card style={{ background: '#f8fafc', padding: '24px', borderRadius: '24px', border: '1px solid #e2e8f0', textAlign: 'center', color: '#64748b' }}>
            🔧 Панель администратора. Для проверки присланных пользователями документов перейдите в общую админ-панель управления клиентами.
          </Card>
        )}
      </div>

      {/* ИНТЕГРИРОВАНО: Модальное окно публикации отзыва из истории поездок */}
      <Modal isOpen={isReviewModalOpen} onClose={() => setIsReviewModalOpen(false)} title="Оцените автомобиль">
        <div className={styles.form} style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '8px 0' }}>
          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Ваша оценка</label>
            <div style={{ display: 'flex', gap: '6px', fontSize: '28px', cursor: 'pointer' }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <span key={star} onClick={() => setReviewRating(star)} style={{ color: star <= reviewRating ? '#eab308' : '#cbd5e1', transition: 'color 0.2s' }}>★</span>
              ))}
            </div>
          </div>
          <div className={styles.inputWrapper}>
            <Input label="Комментарий к отзыву" placeholder="Расскажите о впечатлениях от машины..." value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} required />
          </div>
          {reviewError && <span className={styles.errorText} style={{ color: '#ef4444', fontSize: '13px' }}>{reviewError}</span>}
          <div className={styles.formActions} style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
            <Button variant="secondary" onClick={() => setIsReviewModalOpen(false)}>Отмена</Button>
            <Button variant="primary" onClick={handleSubmitReview}>Опубликовать</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
});

export default ProfilePage;
