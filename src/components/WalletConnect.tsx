import React from 'react';
import { TonConnectUIProvider, TonConnectButton } from '@tonconnect/ui-react';

export const WalletConnect: React.FC = () => {
  return (
    <TonConnectUIProvider
      manifestUrl="https://raw.githubusercontent.com/Heeral03/loyalty-layer-manifest/refs/heads/main/tonconnect-manifest.json"
    >
      <div style={{ padding: 50 }}>
        <h1>Loyalty Layer dApp</h1>
        <TonConnectButton />
      </div>
    </TonConnectUIProvider>
  );
};
