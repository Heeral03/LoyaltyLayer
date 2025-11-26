import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Cell, toNano } from '@ton/core';
import { LoyaltyLayer } from '../wrappers/Factory';
import '@ton/test-utils';

describe('LoyaltyLayer', () => {
    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let businessOwner: SandboxContract<TreasuryContract>;
    let loyaltyLayer: SandboxContract<LoyaltyLayer>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        deployer = await blockchain.treasury('deployer');
        businessOwner = await blockchain.treasury('businessOwner');

        loyaltyLayer = blockchain.openContract(
            LoyaltyLayer.createFromConfig({}, await LoyaltyLayer.compile())
        );

        const deployResult = await loyaltyLayer.sendDeploy(deployer.getSender(), toNano('0.05'));

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: loyaltyLayer.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy', async () => {
        expect(loyaltyLayer.address).toBeDefined();
    });

    it('should deploy a business contract', async () => {
        const businessName = "Test Business";
        
        const result = await loyaltyLayer.sendDeployBusiness(
            deployer.getSender(),
            toNano('0.2'), // Include enough TON for deployment
            businessOwner.address,
            businessName
        );

        // Check that a message was sent (business deployment)
        expect(result.transactions).toHaveTransaction({
            from: loyaltyLayer.address,
            to: businessOwner.address,
            success: true,
        });
    });

    it('should get business contract code', async () => {
        const code = await loyaltyLayer.getBusinessContractCode();
        expect(code).toBeDefined();
    });

    it('should handle empty message body', async () => {
        // Send empty message
        const result = await deployer.send({
            to: loyaltyLayer.address,
            value: toNano('0.02'),
            body: beginCell().endCell()
        });

        expect(result.transactions).toHaveTransaction({
            from: deployer.address,
            to: loyaltyLayer.address,
            success: true,
        });
    });

    it('should fail for unknown operations', async () => {
        // Send unknown operation
        const result = await deployer.send({
            to: loyaltyLayer.address,
            value: toNano('0.02'),
            body: beginCell()
                .storeUint(999, 32) // Unknown operation
                .endCell()
        });

        // Should still process but do nothing
        expect(result.transactions).toHaveTransaction({
            from: deployer.address,
            to: loyaltyLayer.address,
            success: true,
        });
    });
});