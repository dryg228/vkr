import { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { authStore } from '@/store';
import { UserRole } from '@/types';
import { Modal, Input, Button } from '@/components/UI';
import styles from './LoginModal.module.scss';

export const LoginModal = observer(() => {
  const { loginModalOpen, closeLoginModal, login, loginError, isLoading } = authStore;
  const [selectedRole, setSelectedRole] = useState<Exclude<UserRole, 'guest'>>('owner');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => { e.preventDefault(); await login(selectedRole, password); };
  const handleClose = () => { closeLoginModal(); setPassword(''); setSelectedRole('owner'); };

  return (
    <Modal isOpen={loginModalOpen} onClose={handleClose} title="Вход в систему">
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.roleSelector}>
          <button type="button" className={`${styles.roleButton} ${selectedRole === 'owner' ? styles.active : ''}`} onClick={() => setSelectedRole('owner')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.6-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 2.8C1.4 11.4 1 12.2 1 13v3c0 .6.4 1 1 1h2" /><circle cx="7" cy="17" r="2" /><circle cx="17" cy="17" r="2" /></svg>
            <span>Владелец авто</span>
          </button>
          <button type="button" className={`${styles.roleButton} ${selectedRole === 'admin' ? styles.active : ''}`} onClick={() => setSelectedRole('admin')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" /></svg>
            <span>Администратор</span>
          </button>
        </div>
        <Input type="password" label="Пароль" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Введите пароль" error={loginError || undefined} disabled={isLoading} autoFocus />
        <div className={styles.actions}>
          <Button type="button" variant="secondary" onClick={handleClose} disabled={isLoading}>Отмена</Button>
          <Button type="submit" variant="primary" disabled={isLoading || !password}>{isLoading ? 'Вход...' : 'Войти'}</Button>
        </div>
      </form>
    </Modal>
  );
});
