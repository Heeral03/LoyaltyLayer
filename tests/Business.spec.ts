import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Cell, toNano } from '@ton/core';
import { Business } from '../wrappers/Business';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';

describe('Business', () => {
    let code: Cell;

    beforeAll(async () => {
        code = await compile('Business');
    });

    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let business: SandboxContract<Business>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        business = blockchain.openContract(Business.createFromConfig({}, code));

        deployer = await blockchain.treasury('deployer');

        const deployResult = await business.sendDeploy(deployer.getSender(), toNano('0.05'));

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: business.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and business are ready to use
    });
});
