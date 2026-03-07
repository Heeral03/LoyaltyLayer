import { useTonClient } from './useTonClient';
import { useTonConnect } from './useTonConnect';
import { Factory, calculateBusinessAddress } from '../Factory';
import { Address, Cell, toNano } from '@ton/core';
import { FACTORY_ADDRESS, BUSINESS_CODE_HEX } from '../constants';

const STORAGE_PREFIX = 'loyalty_layer:biz';

function cacheKey(wallet: string, businessName: string) {
    return `${STORAGE_PREFIX}:${wallet}:${businessName.toLowerCase().trim()}`;
}

export function useFactory() {
    const client = useTonClient();
    const { sender, connected, wallet } = useTonConnect();

    const deployBusiness = async (businessName: string) => {
        if (!client || !connected || !wallet) throw new Error('Not connected');

        const factory = client.open(Factory.open(Address.parse(FACTORY_ADDRESS)));

        // Fetch nextId BEFORE sending so we know which ID the contract will use
        const nextId = await factory.getNextId();

        await factory.sendDeployBusiness(sender, {
            ownerAddress: Address.parse(wallet),
            businessName,
            value: toNano('0.1'),
        });

        const businessCode = Cell.fromBoc(Buffer.from(BUSINESS_CODE_HEX, 'hex'))[0];
        const address = calculateBusinessAddress(
            businessCode,
            Address.parse(wallet),
            businessName,
            nextId,
        );

        const addrStr = address.toString({ urlSafe: true, bounceable: true });

        // Store address so owner can look it up later by name
        localStorage.setItem(cacheKey(wallet, businessName), addrStr);

        return addrStr;
    };

    // Sync lookup — works after deployBusiness has been called at least once.
    // Falls back to recalculating with businessId=1 for businesses deployed
    // before caching was added (single-business owners).
    const getAddressByName = (businessName: string, fallbackId: bigint = 1n): string => {
        if (!wallet) throw new Error('Wallet not connected');

        // 1. Check cache first
        const cached = localStorage.getItem(cacheKey(wallet, businessName));
        if (cached) return cached;

        // 2. Recalculate with fallback ID (works for first-ever deploy)
        const businessCode = Cell.fromBoc(Buffer.from(BUSINESS_CODE_HEX, 'hex'))[0];
        const address = calculateBusinessAddress(
            businessCode,
            Address.parse(wallet),
            businessName,
            fallbackId,
        );

        return address.toString({ urlSafe: true, bounceable: true });
    };

    const getTotalBusinesses = async (): Promise<bigint> => {
        if (!client) return 0n;
        const factory = client.open(Factory.open(Address.parse(FACTORY_ADDRESS)));
        return await factory.getTotalBusinesses();
    };

    return { deployBusiness, getAddressByName, getTotalBusinesses, connected };
}