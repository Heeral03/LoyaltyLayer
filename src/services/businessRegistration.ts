// src/services/businessRegistration.ts
import { beginCell, toNano, Address } from "@ton/core";
import { CONTRACT_CONFIG } from "../config/contract";
export const registerBusinessTransaction = (
  businessName: string,
  description: string, 
  category: string,
  senderAddress: string
) => {
  const payload = beginCell()
    .storeUint(1, 32) // op code
    .storeAddress(Address.parse(senderAddress))
    .storeRef(beginCell().storeStringTail(businessName).endCell())
    .storeRef(beginCell().storeStringTail(description).endCell())
    .storeRef(beginCell().storeStringTail(category).endCell())
    .endCell();

  return {
    address: CONTRACT_CONFIG.FACTORY_ADDRESS,
    amount: toNano("0.05").toString(),
    payload: payload.toBoc().toString("base64")
  };
};