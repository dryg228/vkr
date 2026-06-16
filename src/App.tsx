import { useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { navigationStore, dataStore } from '@/store';
import { MainLayout, LoginModal, ConfirmModal, Toast } from '@/components';
// ИСПРАВЛЕНО: Добавлен импорт новой страницы CarDetailsPage из общего индекса страниц
import { HomePage, CarsPage, RentalsPage, MyCarsPage, AdminPage, ProfilePage, CarDetailsPage } from '@/pages'; 

const PageRouter = observer(() => {
  // ИСПРАВЛЕНО: Приводим currentPage к any, чтобы TS разрешил использовать кастомный кейс 'car-details'
  switch (navigationStore.currentPage as any) {
    case 'home': return <HomePage />;
    case 'cars': return <CarsPage />;
    case 'rentals': return <RentalsPage />;
    case 'my-cars': return <MyCarsPage />;
    case 'admin':
    case 'admin-cars':
    case 'admin-locations':
    case 'admin-rentals': return <AdminPage />;
    case 'profile': return <ProfilePage />; 
    
    // Теперь этот кейс скомпилируется без ошибок!
    case 'car-details': return <CarDetailsPage />; 
    
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
