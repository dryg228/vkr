import { observer } from 'mobx-react-lite';
import { authStore, navigationStore } from '@/store';
import { Button } from '@/components/UI';
import styles from './Header.module.scss';

export const Header = observer(() => {
  const { isAuthenticated, currentRole, logout, openLoginModal } = authStore;
  const { pageTitle, toggleMobileMenu, mobileMenuOpen, navigate } = navigationStore;

  const getRoleName = (role: string): string => {
    switch (role) {
      case 'admin': return 'Администратор';
      case 'teacher': return 'Преподаватель';
      default: return 'Гость';
    }
  };

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <div className={styles.topBar}>
          <div className={styles.left}>
            <button 
              className={styles.menuButton}
              onClick={toggleMobileMenu}
              aria-label={mobileMenuOpen ? 'Закрыть меню' : 'Открыть меню'}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                {mobileMenuOpen ? (
                  <path d="M18 6L6 18M6 6l12 12" />
                ) : (
                  <>
                    <path d="M3 12h18M3 6h18M3 18h18" />
                  </>
                )}
              </svg>
            </button>
            <div
              className={styles.logo}
              onClick={() => navigate('home')}
              aria-label="Перейти на главную страницу"
            >
              <svg className={styles.logoIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.6-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 2.8C1.4 11.4 1 12.2 1 13v3c0 .6.4 1 1 1h2" />
                <circle cx="7" cy="17" r="2" />
                <circle cx="17" cy="17" r="2" />
              </svg>
              <span className={styles.logoText}>Аренда авто P2P</span>
            </div>
          </div>

          <div className={styles.right}>
            {isAuthenticated ? (
              <div className={styles.userInfo}>
                <span className={styles.role}>{getRoleName(currentRole)}</span>
                <Button variant="ghost" size="sm" onClick={logout} className={styles.headerButton}>
                  Выйти
                </Button>
              </div>
            ) : (
              <Button variant="secondary" size="sm" onClick={openLoginModal} className={styles.headerButton}>
                Войти
              </Button>
            )}
          </div>
        </div>
        <div className={styles.bottomBar}>
          <h1 className={styles.title}>{pageTitle}</h1>
        </div>
      </div>
    </header>
  );
});
