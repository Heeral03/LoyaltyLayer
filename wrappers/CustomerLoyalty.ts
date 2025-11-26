import { Address, Cell, Contract, ContractProvider } from "ton-core";

export class CustomerLoyalty implements Contract {
  constructor(
    readonly address: Address,
    readonly init?: { code: Cell; data: Cell }
  ) {}

  static createFromAddress(address: Address) {
    return new CustomerLoyalty(address);
  }

  async getCustomerData(provider: ContractProvider, customerAddress: Address) {
    const result = await provider.get('get_customer_data', [
      {
        type: 'slice',
        cell: new Cell().asBuilder().storeAddress(customerAddress).endCell()
      }
    ]);
    
    return {
      points: result.stack.readNumber(),
      transactions: result.stack.readNumber(),
      volume: result.stack.readNumber(),
      tier: result.stack.readNumber(),
      found: result.stack.readBoolean()
    };
  }
}