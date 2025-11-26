import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';

export type CustomerLoyaltyConfig = {};

export function customerLoyaltyConfigToCell(config: CustomerLoyaltyConfig): Cell {
    return beginCell().endCell();
}

export class CustomerLoyalty implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new CustomerLoyalty(address);
    }

    static createFromConfig(config: CustomerLoyaltyConfig, code: Cell, workchain = 0) {
        const data = customerLoyaltyConfigToCell(config);
        const init = { code, data };
        return new CustomerLoyalty(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }
}
