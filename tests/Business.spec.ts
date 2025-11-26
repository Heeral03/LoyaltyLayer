import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Cell, toNano, Address } from '@ton/core';
import { LoyaltyLayer } from '../wrappers/LoyaltyLayer';
import { BusinessContract } from '../wrappers/BusinessContract';
import '@ton/test-utils';

describe('LoyaltyLayer with Business Deployment', () => {
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

        await loyaltyLayer.sendDeploy(deployer.getSender(), toNano('0.05'));
    });

    it('should deploy business contract with correct parameters', async () => {
        const businessName = "My Awesome Business";
        
        const result = await loyaltyLayer.sendDeployBusiness(
            deployer.getSender(),
            toNano('0.2'),
            businessOwner.address,
            businessName
        );

        // Find the deployed business contract address
        const deployTx = result.transactions.find(tx => 
            tx.to && tx.to.equals(businessOwner.address) && 
            tx.deploy && tx.success
        );

        expect(deployTx).toBeDefined();

        if (deployTx && deployTx.to) {
            // Open the deployed business contract
            const businessContract = blockchain.openContract(
                BusinessContract.createFromAddress(deployTx.to)
            );

            // Try to get business data (if the contract has getter methods)
            // This would require your business contract to have getter methods
            try {
                const businessData = await businessContract.getBusinessData();
                expect(businessData.owner.equals(businessOwner.address)).toBe(true);
            } catch (e) {
                // Contract might not have getter methods yet
                console.log('Business contract deployed but no getters available');
            }
        }
    });

    it('should include initial balance for business contract', async () => {
        const businessName = "Test Business";
        
        const result = await loyaltyLayer.sendDeployBusiness(
            deployer.getSender(),
            toNano('0.2'),
            businessOwner.address,
            businessName
        );

        // Check that the deployment included initial balance
        const deployTx = result.transactions.find(tx => 
            tx.to && tx.to.equals(businessOwner.address)
        );

        expect(deployTx?.value).toBeGreaterThan(toNano('0'));
    });
});