import { useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';
import type { Sender, SenderArguments } from '@ton/core';
import { Address } from '@ton/core';

export function useTonConnect(): {
    sender: Sender;
    connected: boolean;
    address: string | null;
    wallet: string | null;
    disconnect: () => void;
} {
    const [tonConnectUI] = useTonConnectUI();
    const wallet = useTonWallet();

    const address = wallet?.account.address
        ? Address.parseRaw(wallet.account.address).toString({ bounceable: false })
        : null;

    return {
        sender: {
            send: async (args: SenderArguments) => {
                await tonConnectUI.sendTransaction({
                    messages: [
                        {
                            address: args.to.toString(),
                            amount:  args.value.toString(),
                            payload: args.body?.toBoc().toString('base64'),
                        },
                    ],
                    validUntil: Math.floor(Date.now() / 1000) + 5 * 60,
                });
            },
        },
        connected:  !!wallet,
        address,
        wallet:     address,
        disconnect: () => tonConnectUI.disconnect(),
    };
}