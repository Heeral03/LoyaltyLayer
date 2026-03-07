import { useState, useRef } from 'react';
import { TonConnectButton } from '@tonconnect/ui-react';
import { useTonConnect } from '../hooks/useTonConnect';
import { useFactory } from '../hooks/useFactory';
import { useTonClient } from '../hooks/useTonClient';
import { Business } from '../../../blockchain/wrappers/Business';
import { Address, toNano } from '@ton/core';
import React from 'react';
import QRCode from 'react-qr-code';

export default function OwnerScreen({ onBack }: { onBack: () => void }) {
    const [searchName, setSearchName] = useState('');
    const [businessId, setBusinessId] = useState('1');
    const [resolvedAddr, setResolvedAddr] = useState<string | null>(null);
    const [bizInfo, setBizInfo]     = useState<any>(null);
    const [custAddr, setCustAddr]   = useState('');
    const [pts, setPts]             = useState('');
    const [status, setStatus]       = useState<'idle'|'loading'|'done'|'error'>('idle');
    const [action, setAction]       = useState<'withdraw'|'issue'|null>(null);
    const [error, setError]         = useState('');

    const { connected, sender }     = useTonConnect();
    const { getAddressByName }      = useFactory();
    const client                    = useTonClient();

    // Direct contract call with address — avoids stale state issue
    const getInfoFor = async (addr: string) => {
        if (!client) return null;
        const contract = client.open(Business.open(Address.parse(addr)));
        return await contract.getBusinessInfo();
    };

   // In OwnerScreen.tsx — handleSearch becomes:
const handleSearch = async () => {
    if (!searchName.trim() || !connected) return;
    setError(''); setBizInfo(null); setStatus('loading');
    try {
        const addr = await getAddressByName(searchName.trim()); // now async
        setResolvedAddr(addr);
        const info = await getInfoFor(addr);
        setBizInfo(info);
        setStatus('idle');
    } catch (e: any) {
        setError(e.message ?? 'Business not found');
        setStatus('error');
    }
};

    const handleWithdraw = async () => {
        if (!resolvedAddr || !client) return;
        setAction('withdraw'); setError('');
        try {
            const contract = client.open(Business.open(Address.parse(resolvedAddr)));
            await contract.sendWithdraw(sender, { amount: 0n, value: toNano('0.05') });
            setStatus('done');
            const info = await getInfoFor(resolvedAddr);
            setBizInfo(info);
        } catch (e: any) { setError(e.message ?? 'Failed'); }
        finally { setAction(null); }
    };

    const handleIssuePoints = async () => {
        if (!custAddr || !pts || !resolvedAddr || !client) return;
        setAction('issue'); setError('');
        try {
            const contract = client.open(Business.open(Address.parse(resolvedAddr)));
            await contract.sendIssuePoints(sender, {
                customer: Address.parse(custAddr),
                points: BigInt(pts),
            });
            setStatus('done');
            setCustAddr(''); setPts('');
            setTimeout(() => setStatus('idle'), 2000);
        } catch (e: any) { setError(e.message ?? 'Failed'); }
        finally { setAction(null); }
    };

    const tonsFromNano = (n?: bigint) =>
        n !== undefined ? (Number(n) / 1e9).toFixed(4) : '0';

    return (
        <div style={{ padding: 24 }}>
            <button onClick={onBack} style={backBtn}>← Back</button>
            <h2 style={{ marginTop: 16 }}>💰 Owner Dashboard</h2>
            <TonConnectButton />

            <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <label style={{ color: '#aaa', fontSize: 13 }}>Your Business Name</label>
                <div style={{ display: 'flex', gap: 8 }}>
                    <input
                        value={searchName}
                        onChange={e => setSearchName(e.target.value)}
                        placeholder="e.g. DevCafe"
                        style={{ ...inputStyle, flex: 1 }}
                        onKeyDown={e => e.key === 'Enter' && handleSearch()}
                    />
                    <input
                        value={businessId}
                        onChange={e => setBusinessId(e.target.value)}
                        placeholder="ID"
                        type="number"
                        style={{ ...inputStyle, width: 70 }}
                    />
                    <button
                        onClick={handleSearch}
                        disabled={!searchName.trim() || !connected || status === 'loading'}
                        style={secondaryBtn}
                    >
                        {status === 'loading' ? '⏳' : '🔍'}
                    </button>
                </div>

                {resolvedAddr && (
                    <p style={{ color: '#555', fontSize: 11, wordBreak: 'break-all', margin: 0 }}>
                        📍 {resolvedAddr}
                    </p>
                )}

                {bizInfo && (
                    <>
                        <div style={{ textAlign: 'center', padding: '8px 0' }}>
                            <h3 style={{ margin: 0, color: '#3ecfcf' }}>🏪 {bizInfo.name}</h3>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            {[
                                { label: 'Customers', value: bizInfo.customers?.toString() ?? '0', icon: '👥' },
                                { label: 'Total Tips', value: `${tonsFromNano(bizInfo.tips)} TON`, icon: '💎' },
                            ].map(s => (
                                <div key={s.label} style={{ background: '#1a1a2e', borderRadius: 12, padding: 16, textAlign: 'center' }}>
                                    <div style={{ fontSize: 24 }}>{s.icon}</div>
                                    <div style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>{s.value}</div>
                                    <div style={{ fontSize: 12, color: '#aaa' }}>{s.label}</div>
                                </div>
                            ))}
                        </div>

                        <div style={{ background: '#1a1a2e', borderRadius: 12, padding: 16 }}>
                            <h4 style={{ margin: '0 0 12px', color: '#f59e0b' }}>💸 Withdraw Tips</h4>
                            <p style={{ color: '#aaa', fontSize: 13, margin: '0 0 12px' }}>
                                Available: {tonsFromNano(bizInfo.tips)} TON
                            </p>
                            <button
                                onClick={handleWithdraw}
                                disabled={action === 'withdraw' || !connected || !bizInfo.tips}
                                style={{ ...primaryBtn, background: 'linear-gradient(135deg, #f59e0b, #ef4444)' }}
                            >
                                {action === 'withdraw' ? '⏳ Withdrawing...' : '💸 Withdraw All TON'}
                            </button>
                        </div>

                        <div style={{ background: '#1a1a2e', borderRadius: 12, padding: 16 }}>
                            <h4 style={{ margin: '0 0 12px', color: '#6c63ff' }}>⭐ Issue Points</h4>
                            <input value={custAddr} onChange={e => setCustAddr(e.target.value)}
                                placeholder="Customer wallet address EQ..."
                                style={{ ...inputStyle, marginBottom: 8 }} />
                            <input value={pts} onChange={e => setPts(e.target.value)}
                                placeholder="Points to issue (e.g. 100)" type="number"
                                style={{ ...inputStyle, marginBottom: 8 }} />
                            <button onClick={handleIssuePoints}
                                disabled={action === 'issue' || !connected || !custAddr || !pts}
                                style={primaryBtn}>
                                {action === 'issue' ? '⏳ Issuing...' : '⭐ Issue Points'}
                            </button>
                        </div>

                        <div style={{ background: '#1a1a2e', borderRadius: 12, padding: 16, textAlign: 'center' }}>
                            <h4 style={{ margin: '0 0 12px', color: '#3ecfcf' }}>📱 Customer QR Code</h4>
                            <div style={{ background: '#fff', padding: 12, borderRadius: 8, display: 'inline-block' }}>
                                <QRCode value={resolvedAddr!} size={180} />
                                                            <div style={{ marginTop: 16, textAlign: "left" }}>
                            <p style={{ color: "#666", fontSize: 12, marginBottom: 6 }}>🔑 Shop Code — share with customers</p>
                            <div style={{ display: "flex", gap: 8 }}>
                                <code style={{
                                flex: 1,
                                padding: "10px 12px",
                                background: "#0f0f1a",
                                border: "1px solid #333",
                                borderRadius: 8,
                                color: "#3ecfcf",
                                fontSize: 13,
                                wordBreak: "break-all",
                                }}>
                                {resolvedAddr}
                                </code>
                                <button onClick={() => navigator.clipboard.writeText(resolvedAddr!)} style={secondaryBtn}>
                                📋
                                </button>
                            </div>
                            </div>
                                                        </div>
                            <p style={{ color: '#555', fontSize: 11, marginTop: 8, wordBreak: 'break-all' }}>
                                {resolvedAddr}
                            </p>
                        </div>
                    </>
                )}

                {status === 'done' && (
                    <div style={{ background: '#1a3a1a', border: '1px solid #4caf50', borderRadius: 8, padding: 12, color: '#4caf50' }}>
                        ✅ Done!
                    </div>
                )}
                {error && (
                    <div style={{ background: '#3a1a1a', border: '1px solid #f44336', borderRadius: 8, padding: 12, color: '#f44336' }}>
                        ❌ {error}
                    </div>
                )}
            </div>
        </div>
    );
}

const backBtn: React.CSSProperties = { background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: 14, padding: 0 };
const inputStyle: React.CSSProperties = { padding: '12px 16px', borderRadius: 8, border: '1px solid #333', background: '#0f0f1a', color: '#fff', fontSize: 15, outline: 'none', width: '100%', boxSizing: 'border-box' };
const primaryBtn: React.CSSProperties = { padding: '14px 24px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #6c63ff, #3ecfcf)', color: '#fff', fontSize: 15, cursor: 'pointer', fontWeight: 600, width: '100%' };
const secondaryBtn: React.CSSProperties = { padding: '12px 20px', borderRadius: 12, border: '1px solid #6c63ff', background: '#6c63ff22', color: '#fff', fontSize: 15, cursor: 'pointer' };