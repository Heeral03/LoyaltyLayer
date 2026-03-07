declare module 'qrcode.react' {
  import * as React from 'react';

  interface QRCodeProps {
    value: string;
    size?: number;
    level?: 'L' | 'M' | 'Q' | 'H';
    includeMargin?: boolean;
    includeMargin?: boolean;
  }

  const QRCode: React.FC<QRCodeProps>;
  export default QRCode;
}