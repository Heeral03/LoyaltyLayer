import { useState, useEffect } from 'react';
import { TonConnectButton } from '@tonconnect/ui-react';
import { useBusiness } from '../hooks/useBusiness';
import { useTonConnect } from '../hooks/useTonConnect';
import React from 'react';

// ─── Product catalogue (owner can later make this dynamic/on-chain) ────────────
// priceInTon is what gets sent to the contract → earns points at 1pt per 0.01 TON
const PRODUCTS = [
    { id: 1, emoji: '☕', name: 'Espresso',     priceInTon: '0.1',  pointsEarned: 10  },
    { id: 2, emoji: '🧋', name: 'Latte',        priceInTon: '0.15', pointsEarned: 15  },
    { id: 3, emoji: '🍰', name: 'Pastry',       priceInTon: '0.2',  pointsEarned: 20  },
    { id: 4, emoji: '🥪', name: 'Sandwich',     priceInTon: '0.3',  pointsEarned: 30  },
    { id: 5, emoji: '🎂', name: 'Birthday Cake',priceInTon: '0.5',  pointsEarned: 50  },
];

// ─── Redemption rewards ────────────────────────────────────────────────────────
const REWARDS = [
    { id: 1, emoji: '☕', name: 'Free Espresso',   pointsCost: 50  },
    { id: 2, emoji: '🧋', name: 'Free Latte',      pointsCost: 80  },
    { id: 3, emoji: '🍰', name: 'Free Pastry',     pointsCost: 100 },
    { id: 4, emoji: '💯', name: '10% Discount',    pointsCost: 150 },
    { id: 5, emoji: '🎁', name: 'Mystery Gift',    pointsCost: 300 },
];

export default function CustomerScreen({
    businessAddress,
    onBack,
}: {
    businessAddress: string | null;
    onBack: () => void;
}) {
    const [inputAddr, setInputAddr] = useState(businessAddress ?? '');
    const [points, setPoints]       = useState<bigint | null>(null);
    const [bizInfo, setBizInfo]     = useState<any>(null);
    const [tipAmount, setTipAmount] = useState('0.1');
    const [activeTab, setActiveTab] = useState<'shop' | 'tip' | 'redeem'>('shop');
    const [status, setStatus]       = useState<'idle' | 'loading' | 'busy' | 'done' | 'error'>('idle');
    const [toast, setToast]         = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

    const { connected, address }    = useTonConnect();
    const { getCustomerPoints, getBusinessInfo, sendTip, buyProduct, redeemPoints } =
        useBusiness(inputAddr || null);

    const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    const loadInfo = async () => {
        if (!inputAddr || !address) return;
        setStatus('loading');
        try {
            const [pts, info] = await Promise.all([
                getCustomerPoints(address),
                getBusinessInfo(),
            ]);
            setPoints(pts);
            setBizInfo(info);
            setStatus('idle');
        } catch (e: any) {
            showToast(e.message ?? 'Failed to load', 'error');
            setStatus('error');
        }
    };

    useEffect(() => {
        if (connected && inputAddr) loadInfo();
    }, [connected, address]);

    // ── Buy product ────────────────────────────────────────────────────────────
    const handleBuy = async (product: typeof PRODUCTS[0]) => {
        if (status === 'busy') return;
        setStatus('busy');
        try {
            await buyProduct(product.priceInTon);
            showToast(`✅ Bought ${product.name}! +${product.pointsEarned} points incoming`);
            // Refresh points after a short delay (tx needs to settle)
            setTimeout(() => loadInfo(), 4000);
        } catch (e: any) {
            showToast(e.message ?? 'Purchase failed', 'error');
        } finally {
            setStatus('idle');
        }
    };

    // ── Tip ────────────────────────────────────────────────────────────────────
    const handleTip = async () => {
        if (status === 'busy') return;
        setStatus('busy');
        try {
            await sendTip(tipAmount);
            showToast(`💸 Tipped ${tipAmount} TON! Points earned`);
            setTimeout(() => loadInfo(), 4000);
        } catch (e: any) {
            showToast(e.message ?? 'Tip failed', 'error');
        } finally {
            setStatus('idle');
        }
    };

    // ── Redeem ─────────────────────────────────────────────────────────────────
    const handleRedeem = async (reward: typeof REWARDS[0]) => {
        if (status === 'busy') return;
        if (points === null || points < BigInt(reward.pointsCost)) {
            showToast('Not enough points', 'error');
            return;
        }
        setStatus('busy');
        try {
            await redeemPoints(BigInt(reward.pointsCost));
            showToast(`🎉 Redeemed: ${reward.name}! Show this to staff.`);
            setTimeout(() => loadInfo(), 4000);
        } catch (e: any) {
            showToast(e.message ?? 'Redemption failed', 'error');
        } finally {
            setStatus('idle');
        }
    };

    const isBusy = status === 'busy' || status === 'loading';

    return (
        <div style={{ padding: 24, paddingBottom: 80 }}>
            <button onClick={onBack} style={s.backBtn}>← Back</button>
            <h2 style={{ marginTop: 16, marginBottom: 4, color: '#fff' }}>👤 Customer Dashboard</h2>

            <TonConnectButton />

            {/* Address input */}
            <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={{ color: '#aaa', fontSize: 13 }}>Business Contract Address</label>
                <div style={{ display: 'flex', gap: 8 }}>
                    <input
                        value={inputAddr}
                        onChange={e => setInputAddr(e.target.value)}
                        placeholder="EQ..."
                        style={{ ...s.input, flex: 1 }}
                    />
                    <button
                        onClick={loadInfo}
                        disabled={!connected || !inputAddr || isBusy}
                        style={s.iconBtn}
                    >
                        {status === 'loading' ? '⏳' : '🔍'}
                    </button>
                </div>
            </div>

            {/* Points card */}
            {points !== null && (
                <div style={s.pointsCard}>
                    {bizInfo && (
                        <p style={{ color: '#aaa', fontSize: 13, margin: '0 0 4px' }}>
                            🏪 {bizInfo.name ?? `Business #${bizInfo.id?.toString()}`}
                        </p>
                    )}
                    <div style={s.pointsNumber}>{points.toString()}</div>
                    <div style={{ color: '#aaa', fontSize: 13, marginBottom: 8 }}>loyalty points</div>
                    <div style={s.pointsBadge}>⭐ Active Member</div>
                </div>
            )}

            {/* Tabs */}
            <div style={s.tabRow}>
                {(['shop', 'tip', 'redeem'] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        style={{
                            ...s.tab,
                            background: activeTab === tab ? '#6c63ff22' : 'transparent',
                            borderBottom: `2px solid ${activeTab === tab ? '#6c63ff' : 'transparent'}`,
                            color: activeTab === tab ? '#a78bfa' : '#666',
                        }}
                    >
                        {tab === 'shop' ? '🛍️ Shop' : tab === 'tip' ? '💸 Tip' : '🎁 Redeem'}
                    </button>
                ))}
            </div>

            {/* ── Shop tab ── */}
            {activeTab === 'shop' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <p style={{ color: '#666', fontSize: 12, margin: '4px 0 8px' }}>
                        Pay in TON and earn loyalty points automatically
                    </p>
                    {PRODUCTS.map(p => (
                        <div key={p.id} style={s.productRow}>
                            <div style={s.productEmoji}>{p.emoji}</div>
                            <div style={{ flex: 1 }}>
                                <div style={{ color: '#fff', fontWeight: 600, fontSize: 14 }}>{p.name}</div>
                                <div style={{ color: '#3ecfcf', fontSize: 12 }}>+{p.pointsEarned} pts</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ color: '#aaa', fontSize: 12, marginBottom: 4 }}>
                                    {p.priceInTon} TON
                                </div>
                                <button
                                    onClick={() => handleBuy(p)}
                                    disabled={isBusy || !connected}
                                    style={isBusy || !connected ? s.disabledBtn : s.buyBtn}
                                >
                                    {isBusy ? '⏳' : 'Buy'}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ── Tip tab ── */}
            {activeTab === 'tip' && (
                <div style={s.card}>
                    <h4 style={s.cardTitle}>💸 Send a Tip</h4>
                    <p style={{ color: '#666', fontSize: 12, margin: '0 0 12px' }}>
                        Tips also earn loyalty points (1 pt per 0.01 TON)
                    </p>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const, marginBottom: 10 }}>
                        {['0.05', '0.1', '0.5', '1'].map(amt => (
                            <button
                                key={amt}
                                onClick={() => setTipAmount(amt)}
                                style={{
                                    ...s.chip,
                                    background: tipAmount === amt ? '#3ecfcf22' : '#ffffff0a',
                                    border: `1px solid ${tipAmount === amt ? '#3ecfcf' : '#333'}`,
                                    color: tipAmount === amt ? '#3ecfcf' : '#aaa',
                                }}
                            >
                                {amt} TON
                            </button>
                        ))}
                    </div>
                    <input
                        value={tipAmount}
                        onChange={e => setTipAmount(e.target.value)}
                        placeholder="Custom amount"
                        type="number"
                        style={{ ...s.input, marginBottom: 10 }}
                    />
                    <button
                        onClick={handleTip}
                        disabled={isBusy || !connected}
                        style={isBusy || !connected ? s.disabledBtn : s.primaryBtn}
                    >
                        {isBusy ? '⏳ Sending...' : `💸 Tip ${tipAmount} TON`}
                    </button>
                </div>
            )}

            {/* ── Redeem tab ── */}
            {activeTab === 'redeem' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <p style={{ color: '#666', fontSize: 12, margin: '4px 0 8px' }}>
                        Redeem your points for free items — show the confirmation to staff
                    </p>
                    {REWARDS.map(r => {
                        const canAfford = points !== null && points >= BigInt(r.pointsCost);
                        return (
                            <div key={r.id} style={{
                                ...s.productRow,
                                opacity: canAfford ? 1 : 0.45,
                            }}>
                                <div style={s.productEmoji}>{r.emoji}</div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ color: '#fff', fontWeight: 600, fontSize: 14 }}>{r.name}</div>
                                    <div style={{ color: '#a78bfa', fontSize: 12 }}>{r.pointsCost} pts</div>
                                </div>
                                <button
                                    onClick={() => handleRedeem(r)}
                                    disabled={isBusy || !connected || !canAfford}
                                    style={canAfford && !isBusy ? s.redeemBtn : s.disabledBtn}
                                >
                                    Redeem
                                </button>
                            </div>
                        );
                    })}
                    {points !== null && points === 0n && (
                        <p style={{ color: '#555', fontSize: 12, textAlign: 'center', marginTop: 8 }}>
                            Buy products or send tips to earn points first
                        </p>
                    )}
                </div>
            )}

            {/* Toast */}
            {toast && (
                <div style={{
                    ...s.toast,
                    background: toast.type === 'success' ? '#1a3a1a' : '#3a1a1a',
                    border: `1px solid ${toast.type === 'success' ? '#4caf50' : '#f44336'}`,
                    color: toast.type === 'success' ? '#4caf50' : '#f44336',
                }}>
                    {toast.msg}
                </div>
            )}
        </div>
    );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const s: Record<string, React.CSSProperties> = {
    backBtn: {
        background: 'none', border: 'none', color: '#aaa',
        cursor: 'pointer', fontSize: 14, padding: 0,
    },
    input: {
        padding: '12px 14px', borderRadius: 10,
        border: '1px solid #2a2a3e', background: '#0f0f1a',
        color: '#fff', fontSize: 14, outline: 'none',
        width: '100%', boxSizing: 'border-box',
    },
    iconBtn: {
        padding: '12px 16px', borderRadius: 10,
        border: '1px solid #6c63ff55', background: '#6c63ff11',
        color: '#a78bfa', fontSize: 16, cursor: 'pointer',
    },
    pointsCard: {
        margin: '16px 0',
        background: 'linear-gradient(135deg, #1a1a2e, #0f0f2a)',
        border: '1px solid #6c63ff33',
        borderRadius: 20, padding: 20, textAlign: 'center',
    },
    pointsNumber: {
        fontSize: 52, fontWeight: 900,
        background: 'linear-gradient(135deg, #a78bfa, #3ecfcf)',
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        lineHeight: 1.1,
    },
    pointsBadge: {
        display: 'inline-block',
        background: '#6c63ff22', border: '1px solid #6c63ff55',
        color: '#a78bfa', fontSize: 11,
        padding: '4px 10px', borderRadius: 20,
    },
    tabRow: {
        display: 'flex', margin: '16px 0 12px',
        borderBottom: '1px solid #1a1a2e',
    },
    tab: {
        flex: 1, padding: '10px 4px', border: 'none',
        cursor: 'pointer', fontSize: 13, fontWeight: 600,
        transition: 'all 0.15s',
    },
    card: {
        background: '#1a1a2e', borderRadius: 16, padding: 16,
    },
    cardTitle: {
        margin: '0 0 8px', fontSize: 14, fontWeight: 600, color: '#3ecfcf',
    },
    productRow: {
        display: 'flex', alignItems: 'center', gap: 12,
        background: '#1a1a2e', borderRadius: 14, padding: '12px 14px',
    },
    productEmoji: {
        fontSize: 28, width: 40, textAlign: 'center',
    },
    buyBtn: {
        padding: '7px 16px', borderRadius: 8, border: 'none',
        background: 'linear-gradient(135deg, #6c63ff, #3ecfcf)',
        color: '#fff', fontSize: 13, cursor: 'pointer', fontWeight: 600,
    },
    redeemBtn: {
        padding: '7px 14px', borderRadius: 8,
        border: '1px solid #a78bfa', background: '#6c63ff22',
        color: '#a78bfa', fontSize: 13, cursor: 'pointer', fontWeight: 600,
    },
    disabledBtn: {
        padding: '7px 16px', borderRadius: 8, border: 'none',
        background: '#2a2a3e', color: '#555',
        fontSize: 13, cursor: 'not-allowed', fontWeight: 600,
    },
    primaryBtn: {
        padding: '14px 24px', borderRadius: 12, border: 'none',
        background: 'linear-gradient(135deg, #6c63ff, #3ecfcf)',
        color: '#fff', fontSize: 15, cursor: 'pointer', fontWeight: 600, width: '100%',
    },
    chip: {
        padding: '7px 12px', borderRadius: 8,
        fontSize: 12, cursor: 'pointer', fontWeight: 500,
    },
    toast: {
        position: 'fixed', bottom: 24, left: '50%',
        transform: 'translateX(-50%)',
        borderRadius: 10, padding: '12px 20px',
        fontSize: 13, fontWeight: 600, zIndex: 1000,
        whiteSpace: 'nowrap', boxShadow: '0 4px 20px #00000088',
        maxWidth: '90vw', textAlign: 'center',
    },
};