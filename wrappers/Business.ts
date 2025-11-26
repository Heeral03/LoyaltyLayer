import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';

export type BusinessContractConfig = {
    owner: Address;
    businessName: string;
    businessId: bigint;
};

export function businessContractConfigToCell(config: BusinessContractConfig): Cell {
    const businessNameCell = beginCell()
        .storeBuffer(Buffer.from(config.businessName))
        .endCell();

    return beginCell()
        .storeAddress(config.owner)
        .storeRef(businessNameCell)
        .storeUint(config.businessId, 64)
        .storeUint(0, 64) // total_customers
        .storeUint(0, 64) // total_volume
        .endCell();
}

export class BusinessContract implements Contract {
    constructor(
        readonly address: Address,
        readonly init?: { code: Cell; data: Cell }
    ) {}

    static createFromAddress(address: Address) {
        return new BusinessContract(address);
    }

    static createFromConfig(config: BusinessContractConfig, code: Cell, workchain = 0) {
        const data = businessContractConfigToCell(config);
        const init = { code, data };
        return new BusinessContract(contractAddress(workchain, init), init);
    }

    async getBusinessData(provider: ContractProvider) {
        const result = await provider.get('get_business_data', []);
        
        return {
            owner: result.stack.readAddress(),
            businessName: result.stack.readString(),
            businessId: result.stack.readBigNumber(),
            totalCustomers: result.stack.readBigNumber(),
            totalVolume: result.stack.readBigNumber(),
        };
    }
}