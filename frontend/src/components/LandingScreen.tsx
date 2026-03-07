import { TonConnectButton } from '@tonconnect/ui-react';
import type { Screen } from "../types";

export default function LandingScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
    return (
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column',
                      alignItems: 'center', gap: 24, paddingTop: 60 }}>
            <div style={{ fontSize: 48 }}>🏪</div>
            <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700,
                         background: 'linear-gradient(135deg, #6c63ff, #3ecfcf)',
                         WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Loyalty Layer
            </h1>
            <p style={{ color: '#aaa', textAlign: 'center', margin: 0 }}>
                Decentralized loyalty programs on TON
            </p>

            <TonConnectButton />

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', marginTop: 16 }}>
                <button onClick={() => onNavigate('merchant')} style={btnStyle('#6c63ff')}>
                    🏪 I'm a Merchant — Create Loyalty Program
                </button>
                <button onClick={() => onNavigate('customer')} style={btnStyle('#3ecfcf')}>
                    👤 I'm a Customer — View My Points
                </button>
                <button onClick={() => onNavigate('owner')} style={btnStyle('#f59e0b')}>
                    💰 Owner Dashboard — Manage & Withdraw
                </button>
            </div>
        </div>
    );
}

const btnStyle = (color: string): React.CSSProperties => ({
    padding: '16px 24px',
    borderRadius: 12,
    border: `1px solid ${color}`,
    background: `${color}22`,
    color: '#fff',
    fontSize: 15,
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'background 0.2s',
});