// src/App.tsx
import React, { useState, useEffect } from 'react';
import { TonConnectUIProvider } from '@tonconnect/ui-react';
import { WalletConnect } from './components/WalletConnect';
import BusinessRegistration from './components/BusinessRegistration';
import CustomerApp from './components/customerApp';


class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.log('Error caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20, textAlign: 'center' }}>
          <h2>Something went wrong.</h2>
          <button onClick={() => this.setState({ hasError: false })}>
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
function App() {
  const [activeTab, setActiveTab] = useState<'business' | 'customer'>('business');
  const [isTelegram, setIsTelegram] = useState(false);

  useEffect(() => {
    // Simple Telegram detection
    const urlParams = new URLSearchParams(window.location.search);
    const tgWebAppData = urlParams.get('tgWebAppData');
    
    if (window.Telegram?.WebApp || tgWebAppData) {
      console.log('📱 Telegram Mini App detected!');
      if (window.Telegram?.WebApp) {
        window.Telegram.WebApp.ready();
        window.Telegram.WebApp.expand();
      }
      setIsTelegram(true);
    }
  }, []);

  // Telegram Mini App Mode
  if (isTelegram) {
    return (
      <TonConnectUIProvider
        manifestUrl="https://raw.githubusercontent.com/Heeral03/loyalty-layer-manifest/refs/heads/main/tonconnect-manifest.json"
      >
        <div style={{ 
          minHeight: '100vh', 
          background: '#ffffff',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        }}>
          <CustomerApp />
        </div>
      </TonConnectUIProvider>
    );
  }

  // Regular Web App Mode
  return (
    <TonConnectUIProvider
      manifestUrl="https://raw.githubusercontent.com/Heeral03/loyalty-layer-manifest/refs/heads/main/tonconnect-manifest.json"
    >
      <div style={{ 
        minHeight: '100vh', 
        backgroundColor: '#f3f4f6'
      }}>
        {/* Header with Navigation */}
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          padding: '1rem',
          color: 'white',
          textAlign: 'center'
        }}>
          <h1 style={{ margin: '0 0 1rem 0', fontSize: '24px', fontWeight: 'bold' }}>
            🏢 LoyaltyLayer
          </h1>
          <p style={{ margin: '0 0 1rem 0', opacity: 0.9 }}>
            Complete On-Chain Loyalty Infrastructure
          </p>
          
          {/* Navigation Tabs */}
          <div style={{
            display: 'flex',
            background: 'rgba(255, 255, 255, 0.2)',
            borderRadius: '12px',
            padding: '4px',
            maxWidth: '400px',
            margin: '0 auto'
          }}>
            <button 
              onClick={() => setActiveTab('business')}
              style={{
                flex: 1,
                padding: '10px 16px',
                border: 'none',
                borderRadius: '8px',
                background: activeTab === 'business' ? 'white' : 'transparent',
                color: activeTab === 'business' ? '#667eea' : 'white',
                cursor: 'pointer',
                fontWeight: '500',
                fontSize: '14px',
                transition: 'all 0.3s ease'
              }}
            >
              🏢 Business Portal
            </button>
            <button 
              onClick={() => setActiveTab('customer')}
              style={{
                flex: 1,
                padding: '10px 16px',
                border: 'none',
                borderRadius: '8px',
                background: activeTab === 'customer' ? 'white' : 'transparent',
                color: activeTab === 'customer' ? '#667eea' : 'white',
                cursor: 'pointer',
                fontWeight: '500',
                fontSize: '14px',
                transition: 'all 0.3s ease'
              }}
            >
              📱 Customer App
            </button>
          </div>
        </div>

        {/* Wallet Connection */}
        <div style={{ padding: '1rem' }}>
          <WalletConnect />
        </div>

        {/* Main Content */}
        <div style={{ padding: '0 1rem 2rem 1rem' }}>
          {activeTab === 'business' ? (
            <BusinessRegistration />
          ) : (
            <CustomerApp />
          )}
        </div>

        {/* Footer */}
        <div style={{
          background: 'white',
          padding: '1rem',
          textAlign: 'center',
          borderTop: '1px solid #e5e7eb',
          color: '#6b7280',
          fontSize: '12px'
        }}>
          <p style={{ margin: 0 }}>
            Built on TON Blockchain • LoyaltyLayer v1.0
          </p>
        </div>
      </div>
    </TonConnectUIProvider>
  );
}

export default App;