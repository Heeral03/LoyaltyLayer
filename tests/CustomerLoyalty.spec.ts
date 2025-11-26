import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Cell, toNano } from '@ton/core';
import { CustomerLoyalty } from '../wrappers/CustomerLoyalty';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';

describe('CustomerLoyalty', () => {
    let code: Cell;

    beforeAll(async () => {
        code = await compile('CustomerLoyalty');
    });

    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let customerLoyalty: SandboxContract<CustomerLoyalty>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        customerLoyalty = blockchain.openContract(CustomerLoyalty.createFromConfig({}, code));

        deployer = await blockchain.treasury('deployer');

        const deployResult = await customerLoyalty.sendDeploy(deployer.getSender(), toNano('0.05'));

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: customerLoyalty.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and customerLoyalty are ready to use
    });
});
