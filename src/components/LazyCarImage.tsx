import { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { dataStore } from '@/store';

interface LazyCarImageProps {
  carId: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
}

export const LazyCarImage = observer(({ carId, alt, className, style }: LazyCarImageProps) => {
  const [imgSrc, setImgSrc] = useState<string | null>(dataStore.carImagesCache[carId] || null);
  const [loading, setLoading] = useState(!imgSrc);

  useEffect(() => {
    if (imgSrc) return;
    let isMounted = true;
    
    dataStore.loadCarImage(carId).then((src) => {
      if (isMounted && src) {
        setImgSrc(src);
        setLoading(false);
      }
    });
    return () => { isMounted = false; };
  }, [carId, imgSrc]);

  if (loading) {
    return (
      <div className={className} style={{ ...style, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', color: '#94a3b8', fontSize: '12px' }}>
        ⏳ Загрузка фото...
      </div>
    );
  }

  return <img src={imgSrc || ''} alt={alt} className={className} style={style} loading="lazy" />;
});
