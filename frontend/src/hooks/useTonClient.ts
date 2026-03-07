import { TonClient } from '@ton/ton';
import { IS_TESTNET } from '../constants';

const ENDPOINT = IS_TESTNET
    ? 'https://testnet.toncenter.com/api/v2/jsonRPC'
    : 'https://toncenter.com/api/v2/jsonRPC';

// Create once at module level — no useEffect needed
const client = new TonClient({ endpoint: ENDPOINT });

export function useTonClient() {
    return client;
}