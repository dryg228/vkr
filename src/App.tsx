import { useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { navigationStore, dataStore } from '@/store';
import { MainLayout, LoginModal, ConfirmModal, Toast } from '@/components';
import { HomePage, CarsPage, RentalsPage, MyCarsPage, AdminPage } from '@/pages';

const PageRouter = observer(() => {
  const { currentPage } = navigationStore;
  switch (currentPage) {
    case 'home': return <HomePage />;
    case 'cars': return <CarsPage />;
    case 'rentals': return <RentalsPage />;
    case 'my-cars': return <MyCarsPage />;
    case 'admin':
    case 'admin-cars':
    case 'admin-locations':
    case 'admin-rentals': return <AdminPage />;
    default: return <HomePage />;
  }
});

const App = observer(() => {
  useEffect(() => { dataStore.loadAllData(); }, []);
  return (
    <>
      <MainLayout><PageRouter /></MainLayout>
      <LoginModal />
      <ConfirmModal />
      <Toast />
    </>
  );
});

export default App;
