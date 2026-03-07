// // src/components/QRCodeWrapper.tsx
// import React from 'react';
// import QRCodeLibCJS = require('qrcode.react'); // ✅ safe for TS+Vite

// interface QRCodeProps {
//   value: string;
//   size?: number;
//   level?: 'L' | 'M' | 'Q' | 'H';
//   includeMargin?: boolean;
// }

// export const QRCode: React.FC<QRCodeProps> = (props) => {
//   // Cast to any to satisfy JSX
//   const QRCodeComponent: React.FC<QRCodeProps> = QRCodeLibCJS as any;
//   return <QRCodeComponent {...props} />;
// };