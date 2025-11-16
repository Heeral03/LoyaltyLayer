// src/components/TelegramHeader.tsx
import { useEffect, useState } from 'react';

declare global {
  interface Window {
    Telegram: any;
  }
}

export default function TelegramHeader() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    if (window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.ready();
      setUser(tg.initDataUnsafe?.user);
    }
  }, []);

  return (
    <div style={{
      padding: '16px',
      background: 'var(--tg-theme-bg-color, #ffffff)',
      color: 'var(--tg-theme-text-color, #000000)',
      borderBottom: '1px solid var(--tg-theme-secondary-bg-color, #f0f0f0)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ 
          margin: 0, 
          fontSize: '18px',
          color: 'var(--tg-theme-text-color, #000000)'
        }}>
          🏢 LoyaltyLayer
        </h1>
        {user && (
          <div style={{ fontSize: '14px', opacity: 0.8 }}>
            👤 {user.first_name}
          </div>
        )}
      </div>
    </div>
  );
}