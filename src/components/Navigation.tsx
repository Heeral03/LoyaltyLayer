// src/components/Navigation.tsx
import React, { useEffect } from 'react';
import { useTonConnectUI } from '@tonconnect/ui-react';

interface NavigationProps {
  currentPage: string;
  userType: 'business' | 'customer' | null;
  onNavigate: (page: string) => void;
  onWalletStatusChange: (connected: boolean) => void;
}

const Navigation: React.FC<NavigationProps> = ({ 
  currentPage, 
  userType, 
  onNavigate,
  onWalletStatusChange 
}) => {
  const [tonConnectUI] = useTonConnectUI();

  useEffect(() => {
    // Check wallet connection status
    const checkConnection = () => {
      const connected = !!tonConnectUI.account;
      onWalletStatusChange(connected);
    };

    checkConnection();

    // Subscribe to connection changes
    const unsubscribe = tonConnectUI.onStatusChange((wallet) => {
      const connected = !!wallet;
      onWalletStatusChange(connected);
    });

    return () => unsubscribe();
  }, [tonConnectUI, onWalletStatusChange]);

  if (!userType) {
    return null;
  }

  return (
    <div style={{
      background: 'var(--tg-theme-bg-color, #ffffff)',
      borderBottom: '1px solid var(--tg-theme-hint-color, #e0e0e0)',
      padding: '12px 16px'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          {userType === 'business' ? (
            <>
              <button
                onClick={() => onNavigate('dashboard')}
                style={{
                  background: currentPage === 'dashboard' ? 'var(--tg-theme-button-color, #2481cc)' : 'transparent',
                  color: currentPage === 'dashboard' ? 'var(--tg-theme-button-text-color, #ffffff)' : 'var(--tg-theme-text-color, #000000)',
                  border: '1px solid var(--tg-theme-hint-color, #e0e0e0)',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                Dashboard
              </button>
              <button
                onClick={() => onNavigate('register')}
                style={{
                  background: currentPage === 'register' ? 'var(--tg-theme-button-color, #2481cc)' : 'transparent',
                  color: currentPage === 'register' ? 'var(--tg-theme-button-text-color, #ffffff)' : 'var(--tg-theme-text-color, #000000)',
                  border: '1px solid var(--tg-theme-hint-color, #e0e0e0)',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                Register
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => onNavigate('loyalty')}
                style={{
                  background: currentPage === 'loyalty' ? 'var(--tg-theme-button-color, #2481cc)' : 'transparent',
                  color: currentPage === 'loyalty' ? 'var(--tg-theme-button-text-color, #ffffff)' : 'var(--tg-theme-text-color, #000000)',
                  border: '1px solid var(--tg-theme-hint-color, #e0e0e0)',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                My Loyalty
              </button>
              <button
                onClick={() => onNavigate('scanner')}
                style={{
                  background: currentPage === 'scanner' ? 'var(--tg-theme-button-color, #2481cc)' : 'transparent',
                  color: currentPage === 'scanner' ? 'var(--tg-theme-button-text-color, #ffffff)' : 'var(--tg-theme-text-color, #000000)',
                  border: '1px solid var(--tg-theme-hint-color, #e0e0e0)',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                Scan QR
              </button>
            </>
          )}
        </div>
        
        {/* Wallet connection status */}
        <div style={{
          fontSize: '12px',
          color: tonConnectUI.account ? '#10b981' : '#ef4444',
          fontWeight: '500'
        }}>
          {tonConnectUI.account ? '🟢 Connected' : '🔴 Disconnected'}
        </div>
      </div>
    </div>
  );
};

export default Navigation;