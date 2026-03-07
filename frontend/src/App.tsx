import { useState, useEffect } from 'react';
import { TonConnectUIProvider } from '@tonconnect/ui-react';
import { SDKProvider, useLaunchParams, useBackButton, useMiniApp } from '@telegram-apps/sdk-react';
import { TON_CONNECT_MANIFEST_URL } from './constants';
import LandingScreen  from './components/LandingScreen';
import MerchantScreen from './components/MerchantScreen';
import CustomerScreen from './components/CustomerScreen';
import OwnerScreen    from './components/OwnerScreen';

export type Screen = 'landing' | 'merchant' | 'customer' | 'owner';

// ─── Inner app — needs to be inside SDKProvider to use SDK hooks ──────────────
function AppInner() {
    const [screen, setScreen]         = useState<Screen>('landing');
    const [bizAddress, setBizAddress] = useState<string | null>(null);

    // Telegram SDK hooks
    const miniApp    = useMiniApp();
    const backButton = useBackButton();
    const lp         = useLaunchParams();

    // 1. Tell Telegram the app is ready (removes loading spinner)
    // 2. Expand to full screen
    useEffect(() => {
        miniApp.ready();
        miniApp.expand();
    }, []);

    // Handle QR deep link: ?startapp=EQ_CONTRACT_ADDRESS
    // Customer scans shop QR → Telegram opens app → lands on that shop's dashboard
    useEffect(() => {
        const startParam = lp.startParam;
        if (startParam && startParam.startsWith('EQ')) {
            setBizAddress(startParam);
            setScreen('customer');
        }
    }, []);

    // Wire Telegram's native back button to screen state
    useEffect(() => {
        if (screen === 'landing') {
            backButton.hide();
        } else {
            backButton.show();
            const handler = () => {
                setBizAddress(null);
                setScreen('landing');
            };
            backButton.on('click', handler);
            return () => backButton.off('click', handler);
        }
    }, [screen]);

    const goHome = () => {
        setBizAddress(null);
        setScreen('landing');
    };

    return (
        <div style={{
            maxWidth: 480,
            margin: '0 auto',
            minHeight: '100vh',
            background: '#0f0f1a',
            color: '#fff',
            fontFamily: 'sans-serif',
        }}>
            {screen === 'landing' && (
                <LandingScreen onNavigate={setScreen} />
            )}
            {screen === 'merchant' && (
                <MerchantScreen onBack={goHome} />
            )}
            {screen === 'customer' && (
                <CustomerScreen
                    businessAddress={bizAddress}
                    onBack={goHome}
                />
            )}
            {screen === 'owner' && (
                <OwnerScreen onBack={goHome} />
            )}
        </div>
    );
}

// ─── Root — SDKProvider must wrap everything that uses SDK hooks ──────────────
export default function App() {
    return (
        <SDKProvider acceptCustomStyles debug>
            <TonConnectUIProvider manifestUrl={TON_CONNECT_MANIFEST_URL}>
                <AppInner />
            </TonConnectUIProvider>
        </SDKProvider>
    );
}