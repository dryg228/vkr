import { useState, useRef, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { Location } from '@/types';

interface LocationDropdownProps {
  locations: Location[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
}

export const LocationDropdown = observer(({ locations, value, onChange, placeholder = 'Выберите город или адрес...', label }: LocationDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Закрытие выпадающего списка при клике вне компонента
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Находим текущую выбранную локацию для отображения в инпуте
  const selectedLocation = locations.find(l => l.id === value);
  const displayValue = selectedLocation ? `${selectedLocation.city}, ${selectedLocation.name}` : '';

  // 1. Группируем локации по городам и фильтруем через живой поиск
  const groupedLocations: Record<string, Location[]> = {};
  
  locations.forEach(loc => {
    const matchesSearch = 
      loc.name.toLowerCase().includes(search.toLowerCase()) ||
      loc.city.toLowerCase().includes(search.toLowerCase()) ||
      (loc.address && loc.address.toLowerCase().includes(search.toLowerCase()));

    if (matchesSearch) {
      if (!groupedLocations[loc.city]) {
        groupedLocations[loc.city] = [];
      }
      groupedLocations[loc.city].push(loc);
    }
  });

  return (
    <div ref={dropdownRef} style={{ position: 'relative', width: '100%', marginBottom: '16px', fontFamily: "'Inter', sans-serif" }}>
      {label && (
        <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
          {label}
        </label>
      )}
      
      {/* Главное поле выбора (Триггер) */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          height: '48px',
          padding: '0 16px',
          borderRadius: '12px',
          border: isOpen ? '2px solid #2563eb' : '1px solid #e2e8f0',
          background: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          boxShadow: isOpen ? '0 0 0 4px rgba(37, 99, 235, 0.1)' : 'none',
          transition: 'all 0.2s ease',
          boxSizing: 'border-box'
        }}
      >
        <span style={{ color: displayValue ? '#0f172a' : '#94a3b8', fontSize: '15px', fontWeight: displayValue ? 500 : 400 }}>
          {displayValue || placeholder}
        </span>
        <span style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease', color: '#64748b', fontSize: '12px' }}>
          ▼
        </span>
      </div>

      {/* Выпадающее меню с группировкой и живым поиском */}
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '102%',
          left: 0,
          right: 0,
          background: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 12px 32px rgba(15, 23, 42, 0.12)',
          border: '1px solid #f1f5f9',
          zIndex: 999,
          maxHeight: '320px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          {/* Инпут живого поиска внутри селекта */}
          <div style={{ padding: '12px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
            <input 
              type="text"
              placeholder="Поиск города или адреса..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClick={(e) => e.stopPropagation()} // Защита от закрытия при клике на инпут
              style={{
                width: '100%',
                height: '38px',
                padding: '0 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Скролл-список элементов */}
          <div style={{ overflowY: 'auto', flex: 1, padding: '6px 0' }}>
            {Object.keys(groupedLocations).length === 0 ? (
              <div style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' }}>Ничего не найдено</div>
            ) : (
              Object.entries(groupedLocations).map(([city, items]) => (
                <div key={city}>
                  {/* Заголовок группы (Город) */}
                  <div style={{ padding: '8px 16px', fontSize: '12px', fontWeight: 700, color: '#2563eb', background: '#f1f5f9', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {city}
                  </div>
                  
                  {/* Дочерние элементы (Конкретные пункты выдачи авто) */}
                  {items.map(loc => (
                    <div 
                      key={loc.id}
                      onClick={() => {
                        onChange(loc.id);
                        setIsOpen(false);
                        setSearch('');
                      }}
                      style={{
                        padding: '12px 16px',
                        fontSize: '14px',
                        color: value === loc.id ? '#2563eb' : '#334155',
                        background: value === loc.id ? '#eff6ff' : 'transparent',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px',
                        transition: 'background 0.15s ease'
                      }}
                      onMouseEnter={(e) => value !== loc.id && (e.currentTarget.style.background = '#f8fafc')}
                      onMouseLeave={(e) => value !== loc.id && (e.currentTarget.style.background = 'transparent')}
                    >
                      <span style={{ fontWeight: 600 }}>📍 {loc.name}</span>
                      {loc.address && <span style={{ fontSize: '12px', color: '#64748b', paddingLeft: '18px' }}>{loc.address}</span>}
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
});
