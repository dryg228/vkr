import { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { authStore } from '@/store';
import { Modal, Input, Button } from '@/components/UI';
import styles from './LoginModal.module.scss';

export const LoginModal = observer(() => {
  const { loginModalOpen, closeLoginModal, login, register, loginError, isLoading } = authStore;
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isRegisterMode) {
      await register(email, password);
    } else {
      await login(email, password);
    }
  };

  const handleClose = () => {
    closeLoginModal();
    setEmail('');
    setPassword('');
    setIsRegisterMode(false);
  };

  return (
    <Modal isOpen={loginModalOpen} onClose={handleClose} title={isRegisterMode ? "Регистрация в системе" : "Вход в систему"}>
      <form onSubmit={handleSubmit} className={styles.form}>
        <Input 
          type="email" 
          label="Email" 
          value={email} 
          onChange={(e) => setEmail(e.target.value)} 
          placeholder="example@test.ru" 
          disabled={isLoading} 
          required 
          autoFocus 
        />
        <Input 
          type="password" 
          label="Пароль" 
          value={password} 
          onChange={(e) => setPassword(e.target.value)} 
          placeholder="Введите пароль" 
          error={loginError || undefined} 
          disabled={isLoading} 
          required 
        />
        <div className={styles.modeToggle}>
          <button 
            type="button" 
            className={styles.toggleLink} 
            onClick={() => { setIsRegisterMode(!isRegisterMode); authStore.clearError(); }}
          >
            {isRegisterMode ? "Уже есть аккаунт? Войти" : "Нет аккаунта? Зарегистрироваться"}
          </button>
        </div>
        <div className={styles.actions}>
          <Button type="button" variant="secondary" onClick={handleClose} disabled={isLoading}>Отмена</Button>
          <Button type="submit" variant="primary" disabled={isLoading || !email || !password}>
            {isLoading ? 'Загрузка...' : (isRegisterMode ? 'Зарегистрироваться' : 'Войти')}
          </Button>
        </div>
      </form>
    </Modal>
  );
});
