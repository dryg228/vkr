import { observer } from 'mobx-react-lite';
import { navigationStore } from '@/store';
import { PageId } from '@/types';
import styles from './Sidebar.module.scss';

const NavIcon = ({ icon }: { icon: string }) => {
  switch (icon) {
    case 'home': return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9,22 9,12 15,12 15,22" /></svg>;
    case 'car': return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 17a2 2 0 104 0 2 2 0 00-4 0zM15 17a2 2 0 104 0 2 2 0 00-4 0z"/><path d="M5 17H3v-6l2-4h9l4 4h3v6h-2M5 17h10"/></svg>;
    case 'calendar': return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
    case 'key': return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>;
    case 'settings': return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></svg>;
    default: return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/></svg>;
  }
};

export const Sidebar = observer(() => {
  const { navigationItems, currentPage, navigate, sidebarOpen, mobileMenuOpen, closeMobileMenu } = navigationStore;
  const handleNavClick = (pageId: PageId) => { navigate(pageId); closeMobileMenu(); };
  const sidebarClasses = [styles.sidebar, sidebarOpen ? styles.open : styles.collapsed, mobileMenuOpen ? styles.mobileOpen : ''].filter(Boolean).join(' ');

  return (
    <>
      {mobileMenuOpen && <div className={styles.overlay} onClick={closeMobileMenu} aria-hidden="true" />}
      <aside className={sidebarClasses}>
        <nav className={styles.nav}>
          <ul className={styles.navList}>
            {navigationItems.map(item => (
              <li key={item.id}><button className={`${styles.navItem} ${currentPage === item.id ? styles.active : ''}`} onClick={() => handleNavClick(item.id)} title={item.title}><span className={styles.icon}><NavIcon icon={item.icon} /></span><span className={styles.label}>{item.title}</span></button></li>
            ))}
          </ul>
        </nav>
        <div className={styles.footer}><p className={styles.copyright}>© 2026</p></div>
      </aside>
    </>
  );
});
