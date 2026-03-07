import {
    Address,
    beginCell,
    Cell,
    Contract,
    contractAddress,
    ContractProvider,
    Sender,
    toNano,
} from '@ton/core';

// ─── Op codes (must match business.tolk) ──────────────────────────────────────
export const BUSINESS_OPS = {
    ISSUE_POINTS:  1,
    TIP:           2,
    WITHDRAW:      3,
    BUY_PRODUCT:   4,
    REDEEM_POINTS: 5,
} as const;

// ─── Types ────────────────────────────────────────────────────────────────────

export type BusinessConfig = {
    owner:          Address;
    businessName:   string;
    businessId:     bigint;
    totalCustomers: bigint;
    totalTips:      bigint;
};

export type BusinessInfo = {
    owner:     Address;
    name:      string;
    id:        bigint;
    customers: bigint;
    tips:      bigint;
};

export type IssuePointsParams = {
    customer: Address;
    points:   bigint;
    value?:   bigint;   // gas, default 0.05 TON
};

export type TipParams = {
    value: bigint;      // TON amount to tip (determines points earned too)
};

export type WithdrawParams = {
    amount: bigint;     // nanotons; 0n = withdraw all
    value?: bigint;     // gas, default 0.05 TON
};

export type BuyProductParams = {
    value: bigint;      // TON payment (determines points earned too)
};

export type RedeemPointsParams = {
    points: bigint;
    value?: bigint;     // gas, default 0.05 TON
};

// ─── Storage builder ──────────────────────────────────────────────────────────
// Must match BusinessStorage struct field order in business.tolk:
//   owner, businessName (ref), businessId, totalCustomers, totalTips, customerPoints (dict)

export function businessConfigToCell(config: BusinessConfig): Cell {
    const nameCell = beginCell()
        .storeStringTail(config.businessName)
        .endCell();

    return beginCell()
        .storeAddress(config.owner)
        .storeRef(nameCell)
        .storeUint(config.businessId,     64)
        .storeUint(config.totalCustomers, 64)
        .storeUint(config.totalTips,      64)
        .storeDict(null)   // empty customerPoints map<address, uint64>
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

    /**
     * OP 1 — Owner manually issues loyalty points to a specific customer.
     * Use for cash purchases or after scanning the customer's wallet QR.
     */
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

    /**
     * OP 2 — Customer sends a TON tip.
     * Contract auto-awards points at 1 pt per 0.01 TON.
     * Full `value` is kept in the contract (owner withdraws via sendWithdraw).
     */
    async sendTip(
        provider: ContractProvider,
        via: Sender,
        params: TipParams,
    ) {
        const body = beginCell()
            .storeUint(BUSINESS_OPS.TIP, 32)
            .endCell();

        await provider.internal(via, {
            value:  params.value,
            bounce: false,
            body,
        });
    }

    /**
     * OP 3 — Owner withdraws accumulated TON from the contract.
     * amount = 0n withdraws everything.
     */
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

    /**
     * OP 4 — Customer pays for a product in TON.
     * Auto-awards points at 1 pt per 0.01 TON. Payment goes into the tips pool.
     */
    async sendBuyProduct(
        provider: ContractProvider,
        via: Sender,
        params: BuyProductParams,
    ) {
        const body = beginCell()
            .storeUint(BUSINESS_OPS.BUY_PRODUCT, 32)
            .endCell();

        await provider.internal(via, {
            value:  params.value,
            bounce: false,
            body,
        });
    }

    /**
     * OP 5 — Customer redeems loyalty points.
     * Deducts on-chain. Physical reward is handled off-chain by the owner.
     */
    async sendRedeemPoints(
        provider: ContractProvider,
        via: Sender,
        params: RedeemPointsParams,
    ) {
        const body = beginCell()
            .storeUint(BUSINESS_OPS.REDEEM_POINTS, 32)
            .storeUint(params.points, 64)
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
            { type: 'slice', cell: beginCell().storeAddress(customer).endCell() },
        ]);
        return result.stack.readBigNumber();
    }

    async getBusinessInfo(provider: ContractProvider): Promise<BusinessInfo> {
        const result = await provider.get('getBusinessInfo', []);
        const stack    = result.stack;
        const owner    = stack.readAddress();
        const nameCell = stack.readCell();
        const name     = nameCell.beginParse().loadStringTail();
        return {
            owner,
            name,
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