import { TonConnectUIProvider } from '@tonconnect/ui-react';
import { SDKProvider } from '@telegram-apps/sdk-react';
import { TON_CONNECT_MANIFEST_URL } from './constants';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <SDKProvider acceptCustomStyles debug>
    <TonConnectUIProvider manifestUrl={TON_CONNECT_MANIFEST_URL}>
      <App />
    </TonConnectUIProvider>
  </SDKProvider>
);