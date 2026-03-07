import { Blockchain, SandboxContract } from '@ton/sandbox';
import { Cell, toNano } from '@ton/core';
import { Factory } from '../wrappers/Factory';
import { compile } from '@ton/blueprint';
import '@ton/test-utils';

describe('Factory', () => {
    let factoryCode:  Cell;
    let businessCode: Cell;
    let blockchain:   Blockchain;
    let deployer:     SandboxContract<any>;
    let factory:      SandboxContract<Factory>;

    beforeAll(async () => {
        factoryCode  = await compile('Factory');
        businessCode = await compile('Business');
    });

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        deployer   = await blockchain.treasury('deployer');

        factory = blockchain.openContract(
            Factory.createForDeploy(factoryCode, businessCode)
        );

        const deployResult = await factory.sendDeploy(
            deployer.getSender(),
            toNano('0.5')
        );

        expect(deployResult.transactions).toHaveTransaction({
            from:    deployer.address,
            to:      factory.address,
            deploy:  true,
            success: true,
        });
    });

    it('deploys with correct initial state', async () => {
        const total  = await factory.getTotalBusinesses();
        const nextId = await factory.getNextId();

        expect(total).toBe(0n);
        expect(nextId).toBe(1n);
    });

    it('deploys a business contract', async () => {
        const owner = await blockchain.treasury('shopowner');

        const result = await factory.sendDeployBusiness(
            owner.getSender(),
            {
                ownerAddress: owner.address,
                businessName: 'My Coffee Shop',
                value:        toNano('0.1'),
            }
        );

        expect(result.transactions).toHaveTransaction({
            from:    owner.address,
            to:      factory.address,
            success: true,
        });

        const total  = await factory.getTotalBusinesses();
        const nextId = await factory.getNextId();

        expect(total).toBe(1n);
        expect(nextId).toBe(2n);
    });

    it('increments ID on each deployment', async () => {
        const owner = await blockchain.treasury('shopowner');

        for (const name of ['Shop A', 'Shop B']) {
            await factory.sendDeployBusiness(
                owner.getSender(),
                { ownerAddress: owner.address, businessName: name, value: toNano('0.1') }
            );
        }

        const total  = await factory.getTotalBusinesses();
        const nextId = await factory.getNextId();

        expect(total).toBe(2n);
        expect(nextId).toBe(3n);
    });
});