import { toNano } from '@ton/core';
import { Business } from '../wrappers/Business';
import { compile, NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const business = provider.open(Business.createFromConfig({}, await compile('Business')));

    await business.sendDeploy(provider.sender(), toNano('0.05'));

    await provider.waitForDeploy(business.address);

    // run methods on `business`
}
