import { getHttpEndpoint } from '@orbs-network/ton-access';
import { TonClient } from '@ton/ton';
import { useEffect, useState } from 'react';
import { IS_TESTNET } from '../constants';

const FALLBACK_ENDPOINT = IS_TESTNET
    ? 'https://testnet.toncenter.com/api/v2/jsonRPC'
    : 'https://toncenter.com/api/v2/jsonRPC';

export function useTonClient() {
    const [client, setClient] = useState<TonClient | null>(null);

    useEffect(() => {
        (async () => {
            // Try Orbs endpoint with a quick health check
            try {
                const endpoint = await getHttpEndpoint({
                    network: IS_TESTNET ? 'testnet' : 'mainnet',
                });

                // Probe it — if it's down, fall through to fallback
                const probe = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: 1, jsonrpc: '2.0', method: 'getAddressInformation', params: {} }),
                    signal: AbortSignal.timeout(3000),
                });

                if (probe.ok || probe.status !== 502) {
                    setClient(new TonClient({ endpoint }));
                    return;
                }
            } catch {
                // timeout or network error — fall through
            }

            console.warn('[useTonClient] Orbs endpoint unhealthy, using toncenter fallback');
            setClient(new TonClient({ endpoint: FALLBACK_ENDPOINT }));
        })();
    }, []);

    return client;
}