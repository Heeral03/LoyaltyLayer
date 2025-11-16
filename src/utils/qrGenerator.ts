// src/utils/qrGenerator.ts
import { CONTRACT_CONFIG } from "../config/contract";
export const generateBusinessQR = (businessId: string, contractAddress: string) => {
  // Standard format jo customer app parse kar payegi
  return `loyalty://business/${businessId}/${contractAddress}`;
};

export const parseQRCode = (qrData: string) => {
  if (!qrData.startsWith('loyalty://business/')) {
    throw new Error('Invalid QR code format');
  }
  
  const parts = qrData.replace('loyalty://business/', '').split('/');
  return {
    businessId: parts[0],
    contractAddress: parts[1] || CONTRACT_CONFIG.FACTORY_ADDRESS
  };
};