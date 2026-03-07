import { NetworkProvider } from '@ton/blueprint';
import { Factory } from '../wrappers/Factory';
import { compile } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const factoryCode  = await compile('Factory');
    const businessCode = await compile('Business');
    console.log('BUSINESS_CODE_HEX:', businessCode.toBoc().toString('hex'));

    const factory = provider.open(
        Factory.createForDeploy(factoryCode, businessCode)
    );

    // Check if already deployed
    if (await provider.isContractDeployed(factory.address)) {
        console.log('Factory already deployed at:', factory.address.toString());
        return;
    }

    console.log('Deploying Factory to:', factory.address.toString());

    await factory.sendDeploy(provider.sender(), 50000000n); // 0.05 TON

    await provider.waitForDeploy(factory.address);

    console.log('✅ Factory deployed at:', factory.address.toString());
    console.log('Save this address — you will need it for the frontend!');

    // Verify getters work
    const total  = await factory.getTotalBusinesses();
    const nextId = await factory.getNextId();
    console.log('Total businesses:', total.toString());
    console.log('Next ID:', nextId.toString());
}