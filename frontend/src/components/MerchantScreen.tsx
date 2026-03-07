import { useState } from 'react';
import { TonConnectButton } from '@tonconnect/ui-react';
import { useFactory } from '../hooks/useFactory';
import { useTonConnect } from '../hooks/useTonConnect';
import QRCode from 'react-qr-code';

export default function MerchantScreen({
    onBack,
}: {
    onBack: () => void;
}) {
    const [name, setName]             = useState('');
    const [deployedAddr, setDeployedAddr] = useState<string | null>(null);
    const [status, setStatus]         = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
    const [error, setError]           = useState('');

    const { deployBusiness }          = useFactory();
    const { connected }               = useTonConnect();

    const handleDeploy = async () => {
        if (!name.trim() || !connected) return;
        setStatus('loading');
        setError('');
        try {
            const addr = await deployBusiness(name.trim());
            setDeployedAddr(addr);
            setStatus('done');
        } catch (e: any) {
            setError(e.message ?? 'Deploy failed');
            setStatus('error');
        }
    };

    return (
        <div style={{ padding: 24 }}>
            <button onClick={onBack} style={backBtn}>← Back</button>
            <h2 style={{ marginTop: 16 }}>🏪 Create Loyalty Program</h2>
            <p style={{ color: '#aaa' }}>Deploy your own on-chain loyalty contract</p>

            <TonConnectButton />

            <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <label style={{ color: '#aaa', fontSize: 13 }}>Business Name</label>
                <input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. Heeral's Coffee Shop"
                    style={inputStyle}
                    disabled={status === 'done'}
                />

                {status !== 'done' && (
                    <button
                        onClick={handleDeploy}
                        disabled={status === 'loading' || !name.trim() || !connected}
                        style={primaryBtn}
                    >
                        {status === 'loading' ? '⏳ Deploying...' : '🚀 Deploy Loyalty Contract'}
                    </button>
                )}

                {/* Success — show everything inline */}
                {status === 'done' && deployedAddr && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div style={{ background: '#1a3a1a', border: '1px solid #4caf50',
                                      borderRadius: 8, padding: 16, color: '#4caf50' }}>
                            ✅ <strong>{name}</strong> is live on TON!
                        </div>

                        {/* Contract address */}
                        <div style={card}>
                            <p style={{ color: '#aaa', fontSize: 12, margin: '0 0 6px' }}>
                                📍 Contract Address
                            </p>
                            <p style={{ color: '#fff', fontSize: 12,
                                        wordBreak: 'break-all', margin: 0 }}>
                                {deployedAddr}
                            </p>
                        </div>

                        {/* QR Code */}
                        <div style={{ ...card, textAlign: 'center' }}>
                            <h4 style={{ margin: '0 0 8px', color: '#3ecfcf' }}>
                                📱 Customer QR Code
                            </h4>
                            <p style={{ color: '#aaa', fontSize: 12, margin: '0 0 16px' }}>
                                Share this with customers to let them check points & tip you
                            </p>
                            <div style={{ background: '#fff', padding: 12,
                                          borderRadius: 8, display: 'inline-block' }}>
                                <QRCode value={deployedAddr} size={180} />
                            </div>
                        </div>

                        <button onClick={onBack} style={primaryBtn}>
                            🏠 Go to Dashboard
                        </button>
                    </div>
                )}

                {error && (
                    <div style={{ background: '#3a1a1a', border: '1px solid #f44336',
                                  borderRadius: 8, padding: 16, color: '#f44336' }}>
                        ❌ {error}
                    </div>
                )}
            </div>

            {status === 'idle' && (
                <div style={{ marginTop: 32, background: '#1a1a2e', borderRadius: 12, padding: 16 }}>
                    <h4 style={{ margin: '0 0 8px', color: '#6c63ff' }}>How it works</h4>
                    <p style={{ color: '#aaa', fontSize: 13, margin: 0, lineHeight: 1.8 }}>
                        1. Connect your TON wallet<br />
                        2. Enter your business name<br />
                        3. Pay ~0.1 TON to deploy<br />
                        4. Share your QR code with customers<br />
                        5. Issue points and receive tips!
                    </p>
                </div>
            )}
        </div>
    );
}

const backBtn: React.CSSProperties = {
    background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: 14, padding: 0
};
const inputStyle: React.CSSProperties = {
    padding: '12px 16px', borderRadius: 8, border: '1px solid #333',
    background: '#1a1a2e', color: '#fff', fontSize: 15, outline: 'none',
    width: '100%', boxSizing: 'border-box'
};
const primaryBtn: React.CSSProperties = {
    padding: '14px 24px', borderRadius: 12, border: 'none',
    background: 'linear-gradient(135deg, #6c63ff, #3ecfcf)',
    color: '#fff', fontSize: 15, cursor: 'pointer', fontWeight: 600
};
const card: React.CSSProperties = {
    background: '#1a1a2e', borderRadius: 12, padding: 16
};