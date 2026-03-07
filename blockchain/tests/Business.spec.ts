import { Blockchain, SandboxContract } from '@ton/sandbox';
import { toNano } from '@ton/core';
import { Business } from '../wrappers/Business';
import { compile } from '@ton/blueprint';
import '@ton/test-utils';

describe('Business', () => {
    let blockchain: Blockchain;
    let owner:      SandboxContract<any>;
    let customer:   SandboxContract<any>;
    let business:   SandboxContract<Business>;

    beforeAll(async () => {
        const code = await compile('Business');
        blockchain = await Blockchain.create();
        owner      = await blockchain.treasury('owner');
        customer   = await blockchain.treasury('customer');

        business = blockchain.openContract(
            Business.createForDeploy(code, {
                owner:          owner.address,
                businessName:   'Test Coffee Shop',
                businessId:     1n,
                totalCustomers: 0n,
                totalTips:      0n,
            })
        );

        const deployResult = await business.sendDeploy(
            owner.getSender(),
            toNano('0.5')
        );

        expect(deployResult.transactions).toHaveTransaction({
            from:    owner.address,
            to:      business.address,
            deploy:  true,
            success: true,
        });
    });

    it('deploys with correct owner', async () => {
        const fetchedOwner = await business.getOwner();
        expect(fetchedOwner.toString()).toBe(owner.address.toString());
    });

    it('deploys with correct business info', async () => {
        const info = await business.getBusinessInfo();
        expect(info.owner.toString()).toBe(owner.address.toString());
        expect(info.id).toBe(1n);
        expect(info.customers).toBe(0n);
        expect(info.tips).toBe(0n);
    });

    it('owner can issue points to customer', async () => {
        const result = await business.sendIssuePoints(
            owner.getSender(),
            { customer: customer.address, points: 100n }
        );

        expect(result.transactions).toHaveTransaction({
            from:    owner.address,
            to:      business.address,
            success: true,
        });

        const points = await business.getCustomerPoints(customer.address);
        expect(points).toBe(100n);
    });

    it('issuing more points accumulates correctly', async () => {
        await business.sendIssuePoints(
            owner.getSender(),
            { customer: customer.address, points: 50n }
        );

        const points = await business.getCustomerPoints(customer.address);
        expect(points).toBe(150n);  // 100 from previous test + 50
    });

    it('non-owner cannot issue points', async () => {
        const result = await business.sendIssuePoints(
            customer.getSender(),
            { customer: customer.address, points: 999n }
        );

        expect(result.transactions).toHaveTransaction({
            from:    customer.address,
            to:      business.address,
            success: false,
            exitCode: 101,  // ERROR_UNAUTHORIZED
        });
    });

    it('customer can send a tip', async () => {
    const result = await business.sendTip(
        customer.getSender(),
        { value: toNano('0.2') }
    );

    expect(result.transactions).toHaveTransaction({
        from:    customer.address,
        to:      business.address,
        success: true,
    });

    const info = await business.getBusinessInfo();
    expect(info.tips).toBeGreaterThan(0n);
});

it('owner can withdraw tips', async () => {
    // First tip so there's balance to withdraw
    await business.sendTip(
        customer.getSender(),
        { value: toNano('0.5') }
    );

    const result = await business.sendWithdraw(
        owner.getSender(),
        { amount: 0n, value: toNano('0.05') }
    );

    expect(result.transactions).toHaveTransaction({
        from:    owner.address,
        to:      business.address,
        success: true,
    });
});


    it('non-owner cannot withdraw', async () => {
        const result = await business.sendWithdraw(
            customer.getSender(),
            { amount: 0n }
        );

        expect(result.transactions).toHaveTransaction({
            from:    customer.address,
            to:      business.address,
            success: false,
            exitCode: 101,  // ERROR_UNAUTHORIZED
        });
    });
});