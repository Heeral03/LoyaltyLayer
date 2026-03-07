import { useTonClient } from './useTonClient';
import { useTonConnect } from './useTonConnect';
import { Business } from '../../../blockchain/wrappers/Business';
import { Address, toNano } from '@ton/core';

export function useBusiness(businessAddress: string | null) {
    const client = useTonClient();
    const { sender, connected } = useTonConnect();

    const getContract = () => {
        if (!client || !businessAddress) return null;
        return client.open(Business.open(Address.parse(businessAddress)));
    };

    const getCustomerPoints = async (customerAddress: string): Promise<bigint> => {
        const contract = getContract();
        if (!contract) return 0n;
        return await contract.getCustomerPoints(Address.parse(customerAddress));
    };

    const getBusinessInfo = async () => {
        const contract = getContract();
        if (!contract) return null;
        return await contract.getBusinessInfo();
    };

    const sendTip = async (amount: string) => {
        const contract = getContract();
        if (!contract || !connected) throw new Error('Not connected');
        await contract.sendTip(sender, { value: toNano(amount) });
    };

    // OP 4: Pay for a product in TON — auto-earns points at 1pt per 0.01 TON
    const buyProduct = async (priceInTon: string) => {
        const contract = getContract();
        if (!contract || !connected) throw new Error('Not connected');
        await contract.sendBuyProduct(sender, { value: toNano(priceInTon) });
    };

    // OP 5: Redeem loyalty points — deducted on-chain, reward given off-chain by owner
    const redeemPoints = async (points: bigint) => {
        const contract = getContract();
        if (!contract || !connected) throw new Error('Not connected');
        await contract.sendRedeemPoints(sender, { points });
    };

    const issuePoints = async (customerAddress: string, points: bigint) => {
        const contract = getContract();
        if (!contract || !connected) throw new Error('Not connected');
        await contract.sendIssuePoints(sender, {
            customer: Address.parse(customerAddress),
            points,
        });
    };

    const withdraw = async () => {
        const contract = getContract();
        if (!contract || !connected) throw new Error('Not connected');
        await contract.sendWithdraw(sender, { amount: 0n, value: toNano('0.05') });
    };

    return {
        getCustomerPoints,
        getBusinessInfo,
        sendTip,
        buyProduct,
        redeemPoints,
        issuePoints,
        withdraw,
        connected,
    };
}