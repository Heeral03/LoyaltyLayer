import {
    Address,
    beginCell,
    Cell,
    type Contract,
    contractAddress,
    type ContractProvider,
    type Sender,
    toNano,
} from '@ton/core';

// ─── Op codes (must match factory.tolk) ───────────────────────────────────────
export const FACTORY_OPS = {
    DEPLOY_BUSINESS: 1,
} as const;

// ─── Types ────────────────────────────────────────────────────────────────────
export type FactoryConfig = {
    nextId:       bigint;
    totalCount:   bigint;
    businessCode: Cell;
};
export function calculateBusinessAddress(
    businessCode: Cell,
    ownerAddress: Address,
    businessName: string,
    businessId: bigint,
): Address {
    // Normalize to ensure consistent serialization
    const normalizedOwner = Address.parseRaw(ownerAddress.toRawString());
    
    const nameCell = beginCell()
        .storeStringTail(businessName)
        .endCell();

    const businessData = beginCell()
        .storeAddress(normalizedOwner)
        .storeRef(nameCell)
        .storeUint(businessId, 64)
        .storeUint(0, 64)
        .storeUint(0, 64)
        .storeDict(null)
        .endCell();

    const stateInit = { code: businessCode, data: businessData };
    return contractAddress(0, stateInit);
}




export type DeployBusinessParams = {
    ownerAddress:  Address;
    businessName:  string;
    value?:        bigint;   // TON to attach (default 0.1)
};

// ─── Storage builder (must match factory.tolk struct Storage layout) ──────────
export function factoryConfigToCell(config: FactoryConfig): Cell {
    return beginCell()
        .storeUint(config.nextId,     64)
        .storeUint(config.totalCount, 64)
        .storeRef(config.businessCode)
        .endCell();
}

// ─── Wrapper class ────────────────────────────────────────────────────────────
export class Factory implements Contract {
address: Address;
init?: { code: Cell; data: Cell };

constructor(address: Address, init?: { code: Cell; data: Cell }) {
    this.address = address;
    this.init = init;
}

    // Create a brand-new Factory instance (for deployment)
    static createForDeploy(code: Cell, businessCode: Cell): Factory {
        const data = factoryConfigToCell({
            nextId:       1n,
            totalCount:   0n,
            businessCode,
        });
        const init = { code, data };
        return new Factory(contractAddress(0, init), init);
    }

    // Attach to an already-deployed Factory by address
    static open(address: Address): Factory {
        return new Factory(address);
    }

    // ── Transactions ──────────────────────────────────────────────────────────

   async sendDeployBusiness(
    provider: ContractProvider,
    via: Sender,
    params: DeployBusinessParams,
) {
    const nameCell = beginCell()
        .storeStringTail(params.businessName)
        .endCell();

    // op (32 bits) is read by onInternalMessage first,
    // then the remaining slice is passed to handleDeployBusiness
    // which calls DeployBusinessMsg.fromSlice() — so ownerAddr + nameRef only
    const body = beginCell()
        .storeUint(FACTORY_OPS.DEPLOY_BUSINESS, 32)  // op read by onInternalMessage
        .storeAddress(params.ownerAddress)             // } DeployBusinessMsg body
        .storeRef(nameCell)                            // }
        .endCell();

    await provider.internal(via, {
        value:  params.value ?? toNano('0.1'),
        bounce: false,
        body,
    });
}
    // ── Getters ───────────────────────────────────────────────────────────────
async getTotalBusinesses(provider: ContractProvider): Promise<bigint> {
    const result = await provider.get('getTotalBusinesses', []);
    return result.stack.readBigNumber();
}

async getNextId(provider: ContractProvider): Promise<bigint> {
    const result = await provider.get('getNextId', []);
    return result.stack.readBigNumber();
}

    // ── Deploy ────────────────────────────────────────────────────────────────

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            bounce: false,
            body:   beginCell().endCell(),
        });
    }
}