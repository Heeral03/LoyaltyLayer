import { toNano } from '@ton/core';
import { CustomerLoyalty } from '../wrappers/CustomerLoyalty';
import { compile, NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const customerLoyalty = provider.open(CustomerLoyalty.createFromConfig({}, await compile('CustomerLoyalty')));

    await customerLoyalty.sendDeploy(provider.sender(), toNano('0.05'));

    await provider.waitForDeploy(customerLoyalty.address);

    // run methods on `customerLoyalty`
}
