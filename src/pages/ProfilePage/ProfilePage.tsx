import { useState, useEffect, useRef } from 'react';
import { observer } from 'mobx-react-lite';
import { authStore } from '@/store';
import { Card, Button, Input, Badge } from '@/components/UI';
import styles from './ProfilePage.module.scss';

export const ProfilePage = observer(() => {
  const { user, isAdmin, isAuthenticated, updateDriverLicense, isLoading } = authStore;

  const [licenseNumber, setLicenseNumber] = useState('');
  const [licenseDate, setLicenseDate] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
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
              {/* ИСПРАВЛЕНО: добавлено явное приведение (as any) ко всему выражению в скобках */}
              <strong>Статус:</strong> <Badge variant={(isAdmin ? 'danger' : 'primary') as any}>{isAdmin ? 'Администратор' : 'Водитель / Владелец'}</Badge>
            </p>
          </div>
        </Card>

        {/* Блок документов: доступен всем, кроме администратора */}
        {!isAdmin ? (
          <Card className={styles.licenseCard} style={{ background: '#fff', padding: '24px', borderRadius: '24px', border: '1px solid #f1f5f9' }}>
            <h3>Водительское удостоверение РФ</h3>
            <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '16px' }}>
              Для проката автомобилей необходимо указать данные водительских прав РФ и загрузить их фотографию.
            </p>

            <div style={{ marginBottom: '16px' }}>
              <strong>Статус проверки:</strong>{' '}
              {(user as any).licenseNumber ? (
                /* ИСПРАВЛЕНО: добавлено явное приведение (as any) */
                <Badge variant={((user as any).isVerified ? 'success' : 'warning') as any}>
                  {(user as any).isVerified ? 'Подтверждены' : 'На модерации'}
                </Badge>
              ) : (
                /* ИСПРАВЛЕНО: добавлено явное приведение (as any) */
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
        ) : (
          <Card style={{ background: '#f8fafc', padding: '24px', borderRadius: '24px', border: '1px solid #e2e8f0', textAlign: 'center', color: '#64748b' }}>
            🔧 Панель администратора. Для проверки присланных пользователями документов перейдите в общую админ-панель управления клиентами.
          </Card>
        )}
      </div>
    </div>
  );
});

export default ProfilePage;
