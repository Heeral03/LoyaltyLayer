// src/services/customerOnboarding.ts
import { beginCell, toNano, Address } from "@ton/core";
export const joinLoyaltyProgram = async (
  customerWallet: string,
  businessContractAddress: string
) => {
  // Yahan par aap customer ko business ke loyalty program mein register karenge
  const payload = beginCell()
    .storeUint(1, 32) // register_customer op code
    .storeAddress(Address.parse(customerWallet))
    .endCell();

  return {
    address: businessContractAddress,
    amount: toNano("0.02").toString(),
    payload: payload.toBoc().toString("base64")
  };
};