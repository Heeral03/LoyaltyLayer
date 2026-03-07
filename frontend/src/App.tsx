import { useState, useEffect } from 'react';
import { TonConnectUIProvider } from '@tonconnect/ui-react';
import { TON_CONNECT_MANIFEST_URL } from './constants';
import LandingScreen  from './components/LandingScreen';
import MerchantScreen from './components/MerchantScreen';
import CustomerScreen from './components/CustomerScreen';
import OwnerScreen    from './components/OwnerScreen';

export type Screen = 'landing' | 'merchant' | 'customer' | 'owner';

// Read Telegram start param once at module load time (before React renders)
const tg = window.Telegram?.WebApp;
const startParam = tg?.initDataUnsafe?.start_param;
const initialScreen: Screen = startParam?.startsWith('EQ') ? 'customer' : 'landing';
const initialBizAddress: string | null = startParam?.startsWith('EQ') ? startParam : null;

export default function App() {
    const [screen, setScreen]         = useState<Screen>(initialScreen);
    const [bizAddress, setBizAddress] = useState<string | null>(initialBizAddress);

    // Init Telegram (no setState here)
    useEffect(() => {
        if (!tg) return;
        tg.ready();
        tg.expand();
    }, []);

    // Wire back button
    useEffect(() => {
        if (!tg) return;
        if (screen === 'landing') {
            tg.BackButton.hide();
        } else {
            tg.BackButton.show();
            const handler = () => {
                setBizAddress(null);
                setScreen('landing');
            };
            tg.BackButton.onClick(handler);
            return () => tg.BackButton.offClick(handler);
        }
    }, [screen]);

    const goHome = () => {
        setBizAddress(null);
        setScreen('landing');
    };

    return (
        <TonConnectUIProvider manifestUrl={TON_CONNECT_MANIFEST_URL}>
            <div style={{
                maxWidth: 480,
                margin: '0 auto',
                minHeight: '100vh',
                background: '#0f0f1a',
                color: '#fff',
                fontFamily: 'sans-serif',
            }}>
                {screen === 'landing' && <LandingScreen onNavigate={setScreen} />}
                {screen === 'merchant' && <MerchantScreen onBack={goHome} />}
                {screen === 'customer' && (
                    <CustomerScreen businessAddress={bizAddress} onBack={goHome} />
                )}
                {screen === 'owner' && <OwnerScreen onBack={goHome} />}
            </div>
        </TonConnectUIProvider>
    );
}