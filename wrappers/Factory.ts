import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';

export type LoyaltyLayerConfig = {};

export function loyaltyLayerConfigToCell(config: LoyaltyLayerConfig): Cell {
    return beginCell().endCell();
}

export class LoyaltyLayer implements Contract {
    constructor(
        readonly address: Address,
        readonly init?: { code: Cell; data: Cell }
    ) {}

    static createFromAddress(address: Address) {
        return new LoyaltyLayer(address);
    }

    static createFromConfig(config: LoyaltyLayerConfig, code: Cell, workchain = 0) {
        const data = loyaltyLayerConfigToCell(config);
        const init = { code, data };
        return new LoyaltyLayer(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }

    async sendDeployBusiness(
        provider: ContractProvider,
        via: Sender,
        value: bigint,
        businessOwner: Address,
        businessName: string
    ) {
        const businessNameCell = beginCell()
            .storeBuffer(Buffer.from(businessName))
            .endCell();

        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(1, 32) // op = 1
                .storeAddress(businessOwner)
                .storeRef(businessNameCell)
                .endCell(),
        });
    }

    async getBusinessContractCode(provider: ContractProvider): Promise<Cell> {
        const result = await provider.get('get_business_contract_code', []);
        return result.stack.readCell();
    }
}