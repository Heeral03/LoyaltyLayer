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

    console.log('Deploying NEW Factory at:', factory.address.toString());

    // Force deploy even if exists — send TON to initialize
    await factory.sendDeploy(provider.sender(), 50000000n);

    await provider.waitForDeploy(factory.address);

    console.log('✅ New Factory address:', factory.address.toString());
    
    const total  = await factory.getTotalBusinesses();
    const nextId = await factory.getNextId();
    console.log('Total businesses:', total.toString());
    console.log('Next ID:', nextId.toString());
}