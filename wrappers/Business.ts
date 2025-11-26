import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';

export type BusinessConfig = {};

export function businessConfigToCell(config: BusinessConfig): Cell {
    return beginCell().endCell();
}

export class Business implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new Business(address);
    }

    static createFromConfig(config: BusinessConfig, code: Cell, workchain = 0) {
        const data = businessConfigToCell(config);
        const init = { code, data };
        return new Business(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }
}
