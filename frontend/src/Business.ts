import {
    Address,
    beginCell,
    Cell,
    Contract,
    contractAddress,
    ContractProvider,
    Sender,
    SendMode,
    toNano,
} from '@ton/core';

// ─── Op codes (must match business.tolk) ──────────────────────────────────────
export const BUSINESS_OPS = {
    ISSUE_POINTS: 1,
    TIP:          2,
    WITHDRAW:     3,
} as const;

// ─── Types ────────────────────────────────────────────────────────────────────
export type BusinessConfig = {
    owner:          Address;
    businessName:   string;
    businessId:     bigint;
    totalCustomers: bigint;
    totalTips:      bigint;
};

export type IssuePointsParams = {
    customer: Address;
    points:   bigint;
    value?:   bigint;
};

export type TipParams = {
    value:     bigint;        // TON amount to tip
    employee?: Address;       // optional
    message?:  Cell;          // optional
};

export type WithdrawParams = {
    amount: bigint;   // 0 = withdraw all
    value?: bigint;   // gas
};

// ─── Storage builder (must match BusinessStorage layout in business.tolk) ─────
export function businessConfigToCell(config: BusinessConfig): Cell {
    const nameCell = beginCell()
        .storeStringTail(config.businessName)
        .endCell();

    // Serialization order matches BusinessStorage struct fields:
    // owner, businessName (ref), businessId, totalCustomers, totalTips, customerPoints (map = empty cell ref)
    return beginCell()
        .storeAddress(config.owner)
        .storeRef(nameCell)
        .storeUint(config.businessId,     64)
        .storeUint(config.totalCustomers, 64)
        .storeUint(config.totalTips,      64)
        .storeDict(null)   // empty customerPoints map
        .endCell();
}

// ─── Wrapper class ────────────────────────────────────────────────────────────
export class Business implements Contract {
    constructor(
        readonly address: Address,
        readonly init?: { code: Cell; data: Cell },
    ) {}

    static createForDeploy(code: Cell, config: BusinessConfig): Business {
        const data = businessConfigToCell(config);
        const init = { code, data };
        return new Business(contractAddress(0, init), init);
    }

    static open(address: Address): Business {
        return new Business(address);
    }

    // ── Transactions ──────────────────────────────────────────────────────────

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            bounce: false,
            body:   beginCell().endCell(),
        });
    }

    async sendIssuePoints(
        provider: ContractProvider,
        via: Sender,
        params: IssuePointsParams,
    ) {
        const body = beginCell()
            .storeUint(BUSINESS_OPS.ISSUE_POINTS, 32)
            .storeAddress(params.customer)
            .storeUint(params.points, 64)
            .endCell();

        await provider.internal(via, {
            value:  params.value ?? toNano('0.05'),
            bounce: false,
            body,
        });
    }

    async sendTip(
        provider: ContractProvider,
        via: Sender,
        params: TipParams,
    ) {
        // employee and message are optional fields
        // Store a flag bit before each optional: 1 = present, 0 = absent
        const bodyBuilder = beginCell()
            .storeUint(BUSINESS_OPS.TIP, 32);

        if (params.employee) {
            bodyBuilder.storeBit(1).storeAddress(params.employee);
        } else {
            bodyBuilder.storeBit(0);
        }

        if (params.message) {
            bodyBuilder.storeBit(1).storeRef(params.message);
        } else {
            bodyBuilder.storeBit(0);
        }

        await provider.internal(via, {
            value:  params.value,
            bounce: false,
            body:   bodyBuilder.endCell(),
        });
    }

    async sendWithdraw(
        provider: ContractProvider,
        via: Sender,
        params: WithdrawParams,
    ) {
        const body = beginCell()
            .storeUint(BUSINESS_OPS.WITHDRAW, 32)
            .storeUint(params.amount, 64)
            .endCell();

        await provider.internal(via, {
            value:  params.value ?? toNano('0.05'),
            bounce: false,
            body,
        });
    }

    // ── Getters ───────────────────────────────────────────────────────────────

    async getCustomerPoints(
        provider: ContractProvider,
        customer: Address,
    ): Promise<bigint> {
        const result = await provider.get('getCustomerPoints', [
            { type: 'slice', cell: beginCell().storeAddress(customer).endCell() }
        ]);
        return result.stack.readBigNumber();
    }

    async getBusinessInfo(
        provider: ContractProvider,
    ): Promise<{ owner: Address; name: Cell; id: bigint; customers: bigint; tips: bigint }> {
        const result = await provider.get('getBusinessInfo', []);
        const stack  = result.stack;
        return {
            owner:     stack.readAddress(),
            name:      stack.readCell(),
            id:        stack.readBigNumber(),
            customers: stack.readBigNumber(),
            tips:      stack.readBigNumber(),
        };
    }

    async getOwner(provider: ContractProvider): Promise<Address> {
        const result = await provider.get('getOwner', []);
        return result.stack.readAddress();
    }
}