import { ReactNode } from 'react';
import { observer } from 'mobx-react-lite';
import { navigationStore } from '@/store';
import { Header } from '../Header';
import { Sidebar } from '../Sidebar';
import styles from './MainLayout.module.scss';

interface MainLayoutProps {
  children: ReactNode;
}

export const MainLayout = observer(({ children }: MainLayoutProps) => {
  const { sidebarOpen } = navigationStore;

  const mainClasses = [
    styles.main,
    sidebarOpen ? styles.sidebarOpen : styles.sidebarCollapsed,
  ].filter(Boolean).join(' ');

  return (
    <div className={styles.layout}>
      <Header />
      <Sidebar />
      <main className={mainClasses}>
        <div className={styles.content}>
          {children}
        </div>
      </main>
    </div>
  );
});
