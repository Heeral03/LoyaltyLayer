// src/components/CustomerApp.tsx
import { useState, useEffect } from "react";
import { useTonConnectUI, useTonAddress } from "@tonconnect/ui-react";
import { beginCell, toNano, Address } from "@ton/core";

const APP_CONFIG = {
  useMockData: window.Telegram?.WebApp || 
               window.location.hostname.includes('localhost') ||
               window.location.hostname.includes('ngrok-free.dev'),
  mockPoints: 150,
  mockTransactions: 5,
  mockBusinessCount: 11
};

// Default contract address
const LOYALTY_CONTRACT_ADDRESS = "EQBWArzgGY3kDWzaq_kW-pcKUI4B4sZWuosyLQdc3LXlYZPv";

// REMOVED: Hardcoded BUSINESS_TYPES object

// Tipping Presets
const TIPPING_PRESETS = [
  { amount: 1, label: "Thanks! 🎉" },
  { amount: 5, label: "Great Service! ⭐" }, 
  { amount: 10, label: "Excellent! 🌟" },
  { amount: 20, label: "Outstanding! 💫" }
];

// Telegram styles (same as before)
const telegramStyles = {
  container: {
    padding: "16px",
    background: "var(--tg-theme-bg-color, #ffffff)",
    minHeight: "100vh",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
  },
  card: {
    background: "var(--tg-theme-secondary-bg-color, #f8f9fa)",
    padding: "16px",
    borderRadius: "12px",
    marginBottom: "16px",
    border: "1px solid var(--tg-theme-hint-color, #e0e0e0)"
  },
  button: {
    background: "var(--tg-theme-button-color, #2481cc)",
    color: "var(--tg-theme-button-text-color, #ffffff)",
    border: "none",
    padding: "12px 16px",
    borderRadius: "8px",
    fontSize: "16px",
    fontWeight: "500" as const,
    width: "100%",
    cursor: "pointer"
  }
};

interface BusinessInfo {
  businessId: string;
  contractAddress: string;
  name: string;
  description: string;
  category: string; // Changed from specific types to string
  rewards?: Reward[]; // Added: Business-specific rewards
  actions?: Action[]; // Added: Business-specific actions
}

interface Reward {
  id: string;
  name: string;
  points: number;
  description: string;
}

interface Action {
  id: string;
  name: string;
  amount: number;
  points: number;
}

interface OnChainData {
  points: number;
  transactions?: number;
  totalVisits?: number;
  isRegistered: boolean;
  lastActivity?: Date;
  lastTransaction?: Date | null;
  transactionCount?: number;
}

interface CustomerData {
  walletAddress: string;
  businessId: string;
  points: number;
  totalVisits: number;
  streakDays: number;
  memberSince: string;
  lastVisit: string;
  tier: string;
  totalSpent: number;
  isRegistered: boolean;
}

// TON Center API helper (same as before)
const toncenterApi = {
  cache: new Map<string, { data: any; timestamp: number }>(),
  cacheTimeout: 60000,
  lastCallTime: 0,
  minCallInterval: 3000,

  getCorsProxies() {
    return [
      'https://api.allorigins.win/raw?url=',
      'https://corsproxy.io/?',
      'https://cors-anywhere.herokuapp.com/'
    ];
  },

  async safeFetch(url: string, options?: RequestInit): Promise<Response> {
    const proxies = this.getCorsProxies();
    
    for (const proxy of proxies) {
      try {
        const proxyUrl = proxy + encodeURIComponent(url);
        console.log(`Trying proxy: ${proxy}`);
        
        const response = await fetch(proxyUrl, {
          ...options,
          headers: {
            ...options?.headers,
            'User-Agent': 'Telegram-Loyalty-App/1.0'
          }
        });
        
        if (response.ok) {
          console.log(`✅ Success with proxy: ${proxy}`);
          return response;
        }
      } catch (proxyError) {
        console.warn(`Proxy failed (${proxy}):`, proxyError);
        continue;
      }
    }
    
    try {
      console.log('Trying direct fetch...');
      return await fetch(url, options);
    } catch (directError:any) {
      console.error('All fetch attempts failed:', directError);
      throw new Error(`Network error: ${directError.message}`);
    }
  },

  async getContractState(address: string): Promise<any> {
    const cacheKey = `contract_${address}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    try {
      const now = Date.now();
      const timeSinceLastCall = now - this.lastCallTime;
      if (timeSinceLastCall < this.minCallInterval) {
        await new Promise(resolve => setTimeout(resolve, this.minCallInterval - timeSinceLastCall));
      }
      
      const url = `https://testnet.toncenter.com/api/v2/getAddressInformation?address=${address}`;
      const response = await this.safeFetch(url);
      
      if (response.status === 429) {
        console.warn('Rate limited, waiting 15 seconds...');
        await new Promise(resolve => setTimeout(resolve, 15000));
        return this.getContractState(address);
      }
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      this.cache.set(cacheKey, { data, timestamp: Date.now() });
      this.lastCallTime = Date.now();
      return data;
    } catch (error: any) {
      console.error('API Error in getContractState:', error);
      return { 
        ok: false, 
        error: error.message,
        result: {
          balance: "0",
          state: "uninitialized"
        }
      };
    }
  },

  async getTransactionHistory(address: string, limit = 15): Promise<any[]> {
    const cacheKey = `tx_${address}_${limit}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      console.log('📦 Using cached transactions');
      return cached.data;
    }

    try {
      const now = Date.now();
      const timeSinceLastCall = now - this.lastCallTime;
      if (timeSinceLastCall < this.minCallInterval) {
        await new Promise(resolve => setTimeout(resolve, this.minCallInterval - timeSinceLastCall));
      }
      
      const url = `https://testnet.toncenter.com/api/v2/getTransactions?address=${address}&limit=${limit}`;
      console.log('🌐 Fetching transactions from:', url);
      
      const response = await this.safeFetch(url);
      
      if (response.status === 429) {
        console.warn('Rate limited, waiting 15 seconds...');
        await new Promise(resolve => setTimeout(resolve, 15000));
        return this.getTransactionHistory(address, limit);
      }
      
      if (!response.ok) {
        console.error('HTTP error:', response.status, response.statusText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      const result = Array.isArray(data?.result) ? data.result : [];
      
      console.log(`✅ Fetched ${result.length} transactions`);
      
      this.cache.set(cacheKey, { data: result, timestamp: Date.now() });
      this.lastCallTime = Date.now();
      return result;
    } catch (error) {
      console.error('API Error in getTransactionHistory:', error);
      return [];
    }
  },

  async runGetMethod(address: string, method: string, stack: any[] = []): Promise<any> {
    try {
      const now = Date.now();
      const timeSinceLastCall = now - this.lastCallTime;
      if (timeSinceLastCall < this.minCallInterval) {
        await new Promise(resolve => setTimeout(resolve, this.minCallInterval - timeSinceLastCall));
      }
      
      const url = 'https://testnet.toncenter.com/api/v2/runGetMethod';
      const payload = {
        address: address,
        method: method,
        stack: stack,
      };
      
      const response = await this.safeFetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      if (response.status === 429) {
        await new Promise(resolve => setTimeout(resolve, 10000));
        return this.runGetMethod(address, method, stack);
      }
      
      const data = await response.json();
      this.lastCallTime = Date.now();
      return data;
    } catch (error) {
      console.error('API Error in runGetMethod:', error);
      return null;
    }
  },

  clearCache() {
    this.cache.clear();
    this.lastCallTime = 0;
    console.log('🧹 API cache cleared');
  }
};

// REMOVED: ManualRefresh component (same as before)

// fetchOnChainCustomerData function (same as before)
async function fetchOnChainCustomerData(walletAddress: string, contractAddress: string): Promise<OnChainData> {
  try {
    console.log('🔍 Fetching on-chain data for:', {
      wallet: walletAddress,
      contract: contractAddress
    });
    
    const txHistory = await toncenterApi.getTransactionHistory(contractAddress);
    console.log('📜 Total transactions found:', txHistory.length);

    const minValue = Number(toNano("0.05"));

    const userTransactions = Array.isArray(txHistory) 
      ? txHistory.filter((tx: any) => {
          if (!tx.in_msg) return false;
          
          const source = tx.in_msg.source;
          const destination = tx.in_msg.destination;
          const value = parseInt(tx.in_msg.value || '0');
          const opCode = tx.in_msg?.op_code || 0;

          const isValidTransaction = (
            source === walletAddress && 
            destination === contractAddress && 
            value >= minValue
          );

          if (isValidTransaction) {
            console.log('✅ Valid customer transaction:', {
              hash: tx.transaction_id?.hash?.slice(0, 10),
              source: source?.slice(0, 8),
              destination: destination?.slice(0, 8),
              value: (value / 1e9).toFixed(3) + ' TON',
              opCode: opCode,
              timestamp: new Date(tx.utime * 1000).toLocaleTimeString()
            });
          }

          return isValidTransaction;
        })
      : [];

    console.log('👤 Customer-specific transactions:', userTransactions.length);

    const totalVisits = userTransactions.length;
    
    const totalPoints = userTransactions.reduce((sum, tx) => {
      const valueInNano = parseInt(tx.in_msg?.value || '0');
      const valueInTON = valueInNano / 1e9;
      const opCode = tx.in_msg?.op_code || 0;
      
      if (opCode === 2) {
        const points = Math.max(1, Math.floor(valueInTON * 10));
        console.log(`💰 Purchase: ${valueInTON} TON → ${points} points`);
        return sum + points;
      }
      
      if (opCode === 1) return sum + 10;
      if (opCode === 3) return sum + 5;
      if (opCode === 7) return sum + 2;
      
      return sum;
    }, 0);

    const lastTransaction = userTransactions.length > 0 
      ? new Date(userTransactions[0].utime * 1000) 
      : null;

    console.log('📊 Final on-chain data:', {
      totalVisits,
      totalPoints,
      transactions: userTransactions.length,
      lastTransaction: lastTransaction?.toLocaleTimeString()
    });

    return {
      points: totalPoints,
      totalVisits: totalVisits,
      isRegistered: userTransactions.length > 0,
      lastTransaction: lastTransaction,
      transactionCount: userTransactions.length,
      lastActivity: lastTransaction || undefined
    };
    
  } catch (error) {
    console.error('❌ Error fetching on-chain data:', error);
    return {
      points: 0,
      totalVisits: 0,
      isRegistered: false,
      transactionCount: 0
    };
  }
}

// Local Storage Management (same as before)
const storage = {
  getCustomerData: (walletAddress: string, businessId: string): CustomerData | null => {
    try {
      const key = `customer_${walletAddress}_${businessId}`;
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  saveCustomerData: (walletAddress: string, businessId: string, data: CustomerData) => {
    try {
      const key = `customer_${walletAddress}_${businessId}`;
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save customer data:', error);
    }
  },

  getAllBusinessesForCustomer: (walletAddress: string): string[] => {
    try {
      const businesses: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(`customer_${walletAddress}_`)) {
          const businessId = key.replace(`customer_${walletAddress}_`, '');
          businesses.push(businessId);
        }
      }
      return businesses;
    } catch {
      return [];
    }
  }
};

// NEW: Dynamic Business Configuration
const getDefaultBusinessConfig = (category: string = "general") => {
  // Default rewards and actions for any business
  const defaultRewards: Reward[] = [
    { id: 'welcome-bonus', name: 'Welcome Bonus', points: 100, description: 'Welcome to our loyalty program!' },
    { id: 'free-item', name: 'Free Item', points: 200, description: 'Redeem for a free item' },
    { id: 'discount-10', name: '10% Discount', points: 300, description: 'Get 10% off your next purchase' },
    { id: 'vip-treatment', name: 'VIP Treatment', points: 500, description: 'Exclusive VIP benefits' }
  ];

  const defaultActions: Action[] = [
    { id: 'small-purchase', name: 'Small Purchase', amount: 5, points: 5 },
    { id: 'medium-purchase', name: 'Medium Purchase', amount: 15, points: 15 },
    { id: 'large-purchase', name: 'Large Purchase', amount: 25, points: 25 }
  ];

  // Category-specific configurations
  const categoryConfigs: { [key: string]: { rewards: Reward[], actions: Action[] } } = {
    cafe: {
      rewards: [
        { id: 'free-coffee', name: 'Free Coffee', points: 50, description: 'Any medium coffee' },
        { id: 'pastry', name: 'Free Pastry', points: 75, description: 'Any pastry from display' },
        { id: 'breakfast-combo', name: 'Breakfast Combo', points: 150, description: 'Coffee + Sandwich' }
      ],
      actions: [
        { id: 'coffee-purchase', name: 'Coffee Purchase', amount: 5, points: 5 },
        { id: 'breakfast-purchase', name: 'Breakfast Purchase', amount: 15, points: 15 }
      ]
    },
    restaurant: {
      rewards: [
        { id: 'free-appetizer', name: 'Free Appetizer', points: 100, description: 'Complimentary starter' },
        { id: 'dessert', name: 'Free Dessert', points: 150, description: 'Any dessert from menu' },
        { id: 'main-course', name: 'Free Main Course', points: 300, description: 'One main course item' }
      ],
      actions: [
        { id: 'lunch', name: 'Lunch', amount: 20, points: 20 },
        { id: 'dinner', name: 'Dinner', amount: 50, points: 50 }
      ]
    },
    retail: {
      rewards: [
        { id: 'discount-10', name: '10% Discount', points: 100, description: '10% off your next purchase' },
        { id: 'free-gift', name: 'Free Gift', points: 250, description: 'Complimentary gift item' },
        { id: 'premium-item', name: 'Premium Item', points: 400, description: 'Upgrade to premium item' }
      ],
      actions: [
        { id: 'small-shop', name: 'Small Purchase', amount: 10, points: 10 },
        { id: 'medium-shop', name: 'Medium Purchase', amount: 30, points: 30 }
      ]
    }
  };

  return categoryConfigs[category.toLowerCase()] || {
    rewards: defaultRewards,
    actions: defaultActions
  };
};

// TransactionLogger component (same as before)
const TransactionLogger = ({ transactions }: { transactions: any[] }) => {
  return (
    <div style={telegramStyles.card}>
      <h3 style={{ margin: "0 0 16px 0", color: "var(--tg-theme-text-color, #000000)" }}>
        🔗 On-Chain Transactions
      </h3>
      {transactions.length === 0 ? (
        <div style={{ textAlign: 'center', color: "var(--tg-theme-hint-color, #999999)", padding: '20px' }}>
          No on-chain transactions yet
        </div>
      ) : (
        <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
          {transactions.map((tx, index) => (
            <div key={index} style={{
              padding: '8px',
              borderBottom: '1px solid #e0e0e0',
              fontSize: '12px',
              fontFamily: 'monospace'
            }}>
              <div>📝 {tx.transaction_id.hash.slice(0, 10)}...{tx.transaction_id.hash.slice(-8)}</div>
              <div>⏰ {new Date(tx.utime * 1000).toLocaleTimeString()}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// BlockchainStatus component (same as before)
const BlockchainStatus = ({ contractAddress, walletAddress }: { 
  contractAddress: string; 
  walletAddress: string;
}) => {
  const [contractStatus, setContractStatus] = useState<any>(null);
  const [userTransactions, setUserTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const checkBlockchainStatus = async () => {
    try {
      setIsLoading(true);
      toncenterApi.clearCache();
      
      const contractState = await toncenterApi.getContractState(contractAddress);
      setContractStatus(contractState);

      const txHistory = await toncenterApi.getTransactionHistory(contractAddress);
      console.log('📊 TX History for status:', txHistory.length);
      
      const userTx = Array.isArray(txHistory) 
        ? txHistory.filter((tx: any) => {
            const isFromUser = tx.in_msg?.source === walletAddress;
            const isToContract = tx.in_msg?.destination === contractAddress;
            return isFromUser && isToContract;
          })
        : [];
      
      console.log('✅ User transactions found:', userTx.length);
      setUserTransactions(userTx);
    } catch (error) {
      console.error('Error checking blockchain status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkBlockchainStatus();
  }, [contractAddress, walletAddress]);

  return (
    <div style={telegramStyles.card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h3 style={{ margin: 0, color: "var(--tg-theme-text-color, #000000)", fontSize: '14px' }}>
          ⛓️ Blockchain Status
        </h3>
        <button 
          onClick={checkBlockchainStatus}
          disabled={isLoading}
          style={{
            background: '#6b7280',
            color: 'white',
            border: 'none',
            padding: '6px 12px',
            borderRadius: '6px',
            fontSize: '12px',
            cursor: 'pointer',
            opacity: isLoading ? 0.6 : 1
          }}
        >
          {isLoading ? '🔄' : '🔁'}
        </button>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
        <div style={{ color: "var(--tg-theme-hint-color, #999999)" }}>Contract:</div>
        <div style={{ 
          color: contractStatus?.ok ? '#10b981' : '#ef4444', 
          fontWeight: '500',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          {contractStatus?.ok ? '✅ Active' : '❌ Inactive'}
        </div>
        
        <div style={{ color: "var(--tg-theme-hint-color, #999999)" }}>Your TXs:</div>
        <div style={{ fontWeight: '500' }}>
          {userTransactions.length} transactions
        </div>
        
        <div style={{ color: "var(--tg-theme-hint-color, #999999)" }}>Balance:</div>
        <div style={{ fontWeight: '500' }}>
          {contractStatus?.result?.balance ? `${(parseInt(contractStatus.result.balance) / 1e9).toFixed(2)} TON` : 'N/A'}
        </div>

        <div style={{ color: "var(--tg-theme-hint-color, #999999)" }}>Last TX:</div>
        <div style={{ fontWeight: '500', fontSize: '10px' }}>
          {userTransactions[0] ? new Date(userTransactions[0].utime * 1000).toLocaleTimeString() : 'Never'}
        </div>
      </div>

      {userTransactions.length > 0 && (
        <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e0e0e0' }}>
          <div style={{ fontSize: '11px', color: "var(--tg-theme-hint-color, #999999)", marginBottom: '4px' }}>
            Recent Transactions:
          </div>
          <div style={{ maxHeight: '80px', overflowY: 'auto', fontSize: '10px' }}>
            {userTransactions.slice(0, 3).map((tx, index) => (
              <div key={index} style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                padding: '2px 0',
                borderBottom: '1px solid #f0f0f0'
              }}>
                <span>📝 {tx.transaction_id.hash.slice(0, 6)}...</span>
                <span>{(parseInt(tx.in_msg?.value || '0') / 1e9).toFixed(2)} TON</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// QRScanner component (same as before)
const QRScanner = ({ onScan, onBack }: { 
  onScan: (businessInfo: BusinessInfo) => void; 
  onBack: () => void;
}) => {
  const [manualInput, setManualInput] = useState("");

  const handleManualScan = () => {
    if (manualInput.trim()) {
      try {
        console.log("📱 Processing QR data:", manualInput);
        
        let businessName = "Business Loyalty";
        let businessId = "";
        let contractAddress = LOYALTY_CONTRACT_ADDRESS;
        let category = "general";

        if (manualInput.startsWith('loyalty://business/')) {
          const cleanData = manualInput.replace('loyalty://business/', '');
          const parts = cleanData.split('/');
          
          if (parts.length >= 2) {
            businessName = decodeURIComponent(parts[0]) || "Business Loyalty";
            contractAddress = parts[1] || LOYALTY_CONTRACT_ADDRESS;
            
            // Extract category if provided
            if (parts.length >= 3) {
              category = parts[2] || "general";
            }
            
            businessId = businessName
              .toLowerCase()
              .replace(/\s+/g, '-')
              .replace(/[^a-z0-9-]/g, '')
              + '-' + Date.now();
            
            console.log("✅ Parsed business:", { businessName, businessId, contractAddress, category });
          }
        } 
        else if (manualInput.includes('loyalty.ton/business/')) {
          const urlParts = manualInput.split('/business/');
          if (urlParts.length >= 2) {
            const businessPart = urlParts[1];
            const businessParts = businessPart.split('/');
            
            businessName = decodeURIComponent(businessParts[0]) || "Business Loyalty";
            businessId = businessName.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now();
            
            if (businessParts.length >= 2) {
              category = businessParts[1] || "general";
            }
            
            console.log("✅ Parsed URL business:", { businessName, businessId, category });
          }
        }
        else if (manualInput.length > 0) {
          businessName = manualInput;
          businessId = businessName.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now();
        }
        else {
          throw new Error("Invalid QR code format");
        }

        const displayName = businessName
          .replace(/-\d+$/, '')
          .replace(/business-/i, '')
          .replace(/-\d+-[a-z0-9]+$/i, '');

        if (!businessId) {
          throw new Error("Business ID not found in QR code");
        }

        // Get business configuration based on category
        const businessConfig = getDefaultBusinessConfig(category);

        const businessInfo: BusinessInfo = {
          businessId, 
          contractAddress,
          name: displayName,
          description: "Join our loyalty program and earn rewards!",
          category: category,
          rewards: businessConfig.rewards,
          actions: businessConfig.actions
        };

        console.log("🔍 Final business info:", businessInfo);
        onScan(businessInfo);
        
      } catch (error: any) {
        alert(`Invalid QR code format: ${error.message}`);
      }
    } else {
      alert("Please enter a QR code or business URL");
    }
  };

  return (
    <div style={telegramStyles.card}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
        <button onClick={onBack} style={{ 
          background: "transparent", 
          border: "none", 
          color: "var(--tg-theme-text-color, #000000)", 
          fontSize: "18px", 
          cursor: "pointer",
          marginRight: '12px'
        }}>
          ←
        </button>
        <h3 style={{ margin: 0, color: "var(--tg-theme-text-color, #000000)" }}>
          📱 Join Business Loyalty
        </h3>
      </div>

      <div style={{ marginBottom: "16px" }}>
        <label style={{ display: "block", fontSize: "14px", fontWeight: "500", color: "var(--tg-theme-text-color, #000000)", marginBottom: "8px" }}>
          Enter Business QR Code or URL:
        </label>
        <input 
          style={{
            width: "100%",
            padding: "12px",
            border: "1px solid var(--tg-theme-hint-color, #e0e0e0)",
            borderRadius: "8px",
            fontSize: "16px",
            background: "var(--tg-theme-bg-color, #ffffff)",
            color: "var(--tg-theme-text-color, #000000)"
          }} 
          placeholder="loyalty://business/Business Name/ContractAddress/Category"
          value={manualInput}
          onChange={(e) => setManualInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleManualScan()}
        />
        <div style={{ fontSize: "12px", color: "var(--tg-theme-hint-color, #999999)", marginTop: "4px" }}>
          Format: loyalty://business/BusinessName/ContractAddress/Category
        </div>
      </div>

      <button 
        onClick={handleManualScan}
        style={{ ...telegramStyles.button, background: "#8b5cf6" }}
      >
        🔍 Join Loyalty Program
      </button>

      <div style={{ marginTop: "16px", padding: "12px", background: "#f0f9ff", borderRadius: "8px", border: "1px solid #bae6fd" }}>
        <div style={{ fontSize: "12px", color: "#0369a1", fontWeight: "500", marginBottom: "8px" }}>
          💡 Try these demo QR codes:
        </div>
        <div style={{ fontSize: "10px", color: "#0369a1", fontFamily: "monospace" }}>
          loyalty://business/Demo Cafe/EQBWArzgGY3kDWzaq_kW-pcKUI4B4sZWuosyLQdc3LXlYZPv/cafe
        </div>
        <div style={{ fontSize: "10px", color: "#0369a1", fontFamily: "monospace", marginTop: "4px" }}>
          loyalty://business/Pizza Palace/EQBWArzgGY3kDWzaq_kW-pcKUI4B4sZWuosyLQdc3LXlYZPv/restaurant
        </div>
      </div>
    </div>
  );
};

// PaymentSection component (same as before, but uses business.actions)
const PaymentSection = ({ business, onPaymentSuccess, tonConnectUI, walletAddress }: {
  business: BusinessInfo;
  onPaymentSuccess: (amount: number, points: number, txHash: string) => void;
  tonConnectUI: any;
  walletAddress: string;
}) => {
  const [paymentAmount, setPaymentAmount] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastTransaction, setLastTransaction] = useState<string | null>(null);

  const calculatePoints = (amount: number) => {
    return Math.max(1, Math.round(amount * 10));
  };

  const handlePayment = async () => {
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      alert("Please enter a valid payment amount");
      return;
    }

    try {
      setIsProcessing(true);
      
      const amount = parseFloat(paymentAmount);
      const paymentInNano = toNano(amount.toString()).toString();
      
      console.log('🚀 Starting contract payment...', {
        amount,
        wallet: walletAddress,
        contract: business.contractAddress
      });

      if (!business.contractAddress || business.contractAddress.trim() === '') {
        throw new Error("Business contract address is not available");
      }

      const payload = beginCell()
        .storeUint(2, 32)
        .storeAddress(Address.parse(walletAddress))
        .endCell();

      const transaction = {
        validUntil: Math.floor(Date.now() / 1000) + 300,
        messages: [
          {
            address: business.contractAddress.trim(),
            amount: paymentInNano,
            payload: payload.toBoc().toString("base64"),
          },
        ],
      };

      console.log("📤 Sending contract transaction...");
      
      const result = await tonConnectUI.sendTransaction(transaction);
      console.log('✅ Contract transaction sent:', result);
      
      let txHash = '';
      if (typeof result === 'string') {
        txHash = result;
      } else if (result?.boc) {
        txHash = result.boc;
      } else {
        txHash = 'temp_' + Date.now();
      }
      
      setLastTransaction(txHash);
      
      const pointsEarned = Math.max(1, Math.round(amount * 10));
      
      if (onPaymentSuccess) {
        onPaymentSuccess(amount, pointsEarned, txHash);
      }
      
      if (window.Telegram?.WebApp) {
        window.Telegram.WebApp.showPopup({
          title: 'Payment Successful! 🎉',
          message: `${amount} TON paid! ${pointsEarned} points earned on-chain!`,
          buttons: [{ type: 'ok' }]
        });
      }

      setTimeout(() => {
        setPaymentAmount("");
        setLastTransaction(null);
      }, 5000);
        
    } catch (error: any) {
      console.error("❌ Contract payment failed:", error);
      alert(`Contract payment failed: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const displayAmount = parseFloat(paymentAmount || '0');
  const displayPoints = calculatePoints(displayAmount);

  return (
    <div style={telegramStyles.card}>
      <h3 style={{ margin: "0 0 16px 0", color: "var(--tg-theme-text-color, #000000)" }}>
        💳 Make Payment (On-Chain)
      </h3>
      
      <div style={{ marginBottom: "16px" }}>
        <label style={{ display: "block", fontSize: "14px", fontWeight: "500", color: "var(--tg-theme-text-color, #000000)", marginBottom: "8px" }}>
          Enter Payment Amount (TON):
        </label>
        <input
          type="number"
          step="0.1"
          min="0.1"
          placeholder="Enter amount in TON"
          value={paymentAmount}
          onChange={(e) => setPaymentAmount(e.target.value)}
          disabled={isProcessing}
          style={{
            width: "100%",
            padding: "12px",
            border: "1px solid var(--tg-theme-hint-color, #e0e0e0)",
            borderRadius: "8px",
            fontSize: "16px",
            opacity: isProcessing ? 0.6 : 1
          }}
        />
      </div>

      <div style={{ 
        background: "#f0fdf4", 
        padding: "12px", 
        borderRadius: "8px", 
        marginBottom: "16px",
        border: "1px solid #bbf7d0"
      }}>
        <div style={{ fontSize: "14px", color: "#15803d", fontWeight: "500" }}>
          💡 Earn 10% back in loyalty points!
        </div>
        <div style={{ fontSize: "12px", color: "#15803d", marginTop: "4px" }}>
          Pay {displayAmount} TON → Earn {displayPoints} points
        </div>
      </div>

      {lastTransaction && (
        <div style={{ 
          background: "#f0fdf4", 
          padding: "12px", 
          borderRadius: "8px", 
          marginBottom: "16px",
          border: "1px solid #bbf7d0",
          fontSize: '12px',
          fontFamily: 'monospace'
        }}>
          ✅ Transaction Sent: {lastTransaction.startsWith('temp_') ? 'Processing...' : lastTransaction.slice(0, 10) + '...'}
        </div>
      )}

      <button
        onClick={handlePayment}
        disabled={!paymentAmount || isProcessing || parseFloat(paymentAmount) < 0.1}
        style={{
          ...telegramStyles.button,
          background: "#10b981",
          opacity: (paymentAmount && !isProcessing && parseFloat(paymentAmount) >= 0.1) ? 1 : 0.6
        }}
      >
        {isProcessing ? "⛓️ Processing on Blockchain..." : `Pay ${paymentAmount || '0'} TON`}
      </button>

      {isProcessing && (
        <div style={{ 
          textAlign: "center", 
          marginTop: "12px", 
          color: "#f59e0b",
          fontSize: "14px" 
        }}>
          ⏳ Waiting for blockchain confirmation... (8-15 seconds)
        </div>
      )}

      <div style={{ 
        marginTop: "12px", 
        padding: "8px", 
        background: "#f8f9fa", 
        borderRadius: "6px",
        fontSize: "10px",
        color: "#6b7280",
        textAlign: "center"
      }}>
        💡 Minimum payment: 0.1 TON. Transactions may take 8-15 seconds to confirm.
      </div>
    </div>
  );
};

// TipStaff component (same as before)
const TipStaff = ({ business, onTipSent, tonConnectUI }: { 
  business: BusinessInfo; 
  onTipSent: (amount: number, pointsEarned: number) => void;
  tonConnectUI: any;
}) => {
  const [isTipping, setIsTipping] = useState(false);

  const handleTip = async (amount: number) => {
    try {
      setIsTipping(true);
      
      const tipAmountInNano = toNano(amount.toString()).toString();
      
      if (!business.contractAddress || business.contractAddress.trim() === '') {
        throw new Error("Business contract address is not available");
      }

      const payload = beginCell()
        .storeUint(7, 32)
        .storeAddress(Address.parse('0QDRl_r0pqWSObJfOBrVYY-uf4R3_MWRw8kMZJbwEuJNywCY'))
        .endCell();

      const transaction = {
        validUntil: Math.floor(Date.now() / 1000) + 300,
        messages: [
          {
            address: business.contractAddress.trim(),
            amount: tipAmountInNano,
            payload: payload.toBoc().toString("base64"),
          },
        ],
      };

      console.log("Sending tip transaction:", transaction);
      
      await tonConnectUI.sendTransaction(transaction);
      
      const pointsEarned = Math.max(1, Math.round(amount * 5));
      onTipSent(amount, pointsEarned);
      
      if (window.Telegram?.WebApp) {
        window.Telegram.WebApp.showPopup({
          title: 'Tip Sent! 🎉',
          message: `${amount} TON tip sent! ${pointsEarned} bonus points earned!`,
          buttons: [{ type: 'ok' }]
        });
      }
    } catch (error: any) {
      console.error("Tip failed:", error);
      alert(`Tip failed: ${error.message}`);
    } finally {
      setIsTipping(false);
    }
  };

  return (
    <div style={telegramStyles.card}>
      <h3 style={{ margin: "0 0 16px 0", color: "var(--tg-theme-text-color, #000000)" }}>
        💰 Tip Service Staff
      </h3>

      <div style={{ marginBottom: "16px" }}>
        <label style={{ display: "block", fontSize: "14px", fontWeight: "500", color: "var(--tg-theme-text-color, #000000)", marginBottom: "8px" }}>
          Quick Tip Amounts:
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
          {TIPPING_PRESETS.map((tip) => (
            <button
              key={tip.amount}
              onClick={() => handleTip(tip.amount)}
              disabled={isTipping}
              style={{
                ...telegramStyles.button,
                background: "#8b5cf6",
                fontSize: "14px",
                padding: "12px",
                opacity: isTipping ? 0.6 : 1
              }}
            >
              {tip.amount} TON<br/><small>{tip.label}</small>
            </button>
          ))}
        </div>
      </div>

      <div style={{ 
        background: "#f0f9ff", 
        padding: "12px", 
        borderRadius: "8px", 
        border: "1px solid #bae6fd",
        fontSize: "12px",
        color: "#0369a1"
      }}>
        💡 Get 5% bonus points when you tip staff!
      </div>
    </div>
  );
};

// BusinessSelection component (same as before)
const BusinessSelection = ({ 
  businesses, 
  onSelectBusiness,
  onScanNew 
}: { 
  businesses: { business: BusinessInfo, customerData: CustomerData }[];
  onSelectBusiness: (business: BusinessInfo, customerData: CustomerData) => void;
  onScanNew: () => void;
}) => {
  return (
    <div style={telegramStyles.card}>
      <h3 style={{ margin: "0 0 16px 0", color: "var(--tg-theme-text-color, #000000)", textAlign: 'center' }}>
        🏢 Your Loyalty Programs
      </h3>
      
      {businesses.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>👤</div>
          <p style={{ color: "var(--tg-theme-hint-color, #999999)", marginBottom: '16px' }}>
            You haven't joined any loyalty programs yet
          </p>
          <button 
            onClick={onScanNew}
            style={telegramStyles.button}
          >
            📱 Scan Business QR
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '12px' }}>
          {businesses.map(({ business, customerData }) => (
            <div 
              key={business.businessId}
              onClick={() => onSelectBusiness(business, customerData)}
              style={{
                background: 'white',
                padding: '16px',
                borderRadius: '8px',
                border: '1px solid #e0e0e0',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = '#f8f9fa';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'white';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 'bold', color: "var(--tg-theme-text-color, #000000)", marginBottom: '4px' }}>
                    {business.name}
                  </div>
                  <div style={{ fontSize: '12px', color: "var(--tg-theme-hint-color, #999999)", marginBottom: '8px' }}>
                    {business.category.charAt(0).toUpperCase() + business.category.slice(1)}
                  </div>
                  <div style={{ display: 'flex', gap: '12px', fontSize: '12px' }}>
                    <span style={{ color: '#10b981', fontWeight: 'bold' }}>
                      {customerData.points} ⭐
                    </span>
                    <span style={{ color: '#6b7280' }}>
                      {customerData.totalVisits} visits
                    </span>
                    <span style={{ color: '#6b7280' }}>
                      {customerData.tier}
                    </span>
                  </div>
                </div>
                <div style={{ 
                  background: customerData.isRegistered ? '#10b981' : '#f59e0b',
                  color: 'white', 
                  padding: '4px 8px', 
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}>
                  {customerData.isRegistered ? 'Active' : 'Pending'}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {businesses.length > 0 && (
        <button 
          onClick={onScanNew}
          style={{ 
            ...telegramStyles.button, 
            marginTop: '16px',
            background: 'transparent',
            border: '1px solid #e0e0e0',
            color: "var(--tg-theme-text-color, #000000)"
          }}
        >
          ➕ Join New Business
        </button>
      )}
    </div>
  );
};

// UPDATED: Customer Loyalty Dashboard with dynamic business configuration
const CustomerLoyaltyDashboard = ({ 
  business,
  customerData,
  onUpdateCustomer,
  onBack,
  tonConnectUI,
  walletAddress,
  onChainData
}: { 
  business: BusinessInfo;
  customerData: CustomerData;
  onUpdateCustomer: (updates: Partial<CustomerData>) => void;
  onBack: () => void;
  tonConnectUI: any;
  walletAddress: string;
  onChainData: OnChainData | null;
}) => {
  const [status, setStatus] = useState("");
  const [activeTab, setActiveTab] = useState<'payment' | 'actions' | 'rewards' | 'tips'>('payment');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Use business-specific rewards and actions, fallback to default
  const rewards = business.rewards || getDefaultBusinessConfig(business.category).rewards;
  const actions = business.actions || getDefaultBusinessConfig(business.category).actions;

  useEffect(() => {
    if (onChainData && onChainData.totalVisits !== undefined) {
      console.log('🔄 Syncing local data with on-chain data:', {
        onChainVisits: onChainData.totalVisits,
        localVisits: customerData.totalVisits,
        onChainPoints: onChainData.points,
        localPoints: customerData.points
      });
      
      if (onChainData.totalVisits !== customerData.totalVisits) {
        onUpdateCustomer({
          totalVisits: onChainData.totalVisits,
          points: Math.max(customerData.points, onChainData.points),
          tier: getTierFromVisits(onChainData.totalVisits)
        });
        setStatus(`✅ Synced with blockchain: ${onChainData.totalVisits} visits`);
      }
    }
  }, [onChainData]);

  const getTierFromVisits = (visits: number): string => {
    if (visits >= 20) return "Gold";
    if (visits >= 10) return "Silver";
    if (visits >= 5) return "Bronze";
    if (visits >= 1) return "Member";
    return "New";
  };

  const renderOnChainInfo = () => {
    if (!onChainData) return null;

    return (
      <div style={telegramStyles.card}>
        <h4 style={{ margin: "0 0 12px 0", color: "var(--tg-theme-text-color, #000000)" }}>
          ⛓️ On-Chain Verification
        </h4>
        <div style={{ fontSize: '12px', color: "var(--tg-theme-hint-color, #999999)" }}>
          <div>✅ Contract: Active</div>
          <div>👥 Visits: {onChainData.totalVisits || onChainData.transactionCount || 0}</div>
          <div>🕒 Last: {onChainData.lastTransaction ? onChainData.lastTransaction.toLocaleTimeString() : 
                onChainData.lastActivity ? onChainData.lastActivity.toLocaleTimeString() : 'Never'}</div>
        </div>
      </div>
    );
  };

  const registerCustomer = async () => {
    try {
      setIsProcessing(true);
      setStatus("🔄 Registering on blockchain...");
      
      if (!business.contractAddress || business.contractAddress.trim() === '') {
        throw new Error("Business contract address is not available");
      }

      const payload = beginCell()
        .storeUint(1, 32)
        .storeAddress(Address.parse('0QDRl_r0pqWSObJfOBrVYY-uf4R3_MWRw8kMZJbwEuJNywCY'))
        .endCell();

      const transaction = {
        validUntil: Math.floor(Date.now() / 1000) + 300,
        messages: [
          {
            address: business.contractAddress.trim(),
            amount: toNano("0.05").toString(),
            payload: payload.toBoc().toString("base64"),
          },
        ],
      };

      await tonConnectUI.sendTransaction(transaction);
      
      onUpdateCustomer({
        isRegistered: true,
        points: 100,
        totalVisits: 1,
        streakDays: 1,
        memberSince: new Date().toISOString().split('T')[0],
        lastVisit: new Date().toISOString().split('T')[0],
        tier: "Bronze"
      });
      
      setStatus("✅ Registered successfully! 100 welcome points added.");
    } catch (error: any) {
      console.error("Registration failed:", error);
      setStatus(`❌ Registration failed: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const checkIn = async () => {
    try {
      setIsProcessing(true);
      setStatus("📍 Checking in on blockchain...");
      
      if (!customerData.isRegistered) {
        throw new Error("Please register first");
      }

      const payload = beginCell()
        .storeUint(3, 32)
        .storeAddress(Address.parse('0QDRl_r0pqWSObJfOBrVYY-uf4R3_MWRw8kMZJbwEuJNywCY'))
        .storeUint(customerData.streakDays + 1, 8)
        .endCell();

      const transaction = {
        validUntil: Math.floor(Date.now() / 1000) + 300,
        messages: [
          {
            address: business.contractAddress.trim(),
            amount: toNano("0.05").toString(),
            payload: payload.toBoc().toString("base64"),
          },
        ],
      };

      await tonConnectUI.sendTransaction(transaction);
      
      const pointsEarned = customerData.streakDays >= 7 ? 25 : customerData.streakDays >= 30 ? 50 : 10;
      onUpdateCustomer({
        points: customerData.points + pointsEarned,
        totalVisits: customerData.totalVisits + 1,
        streakDays: customerData.streakDays + 1,
        lastVisit: new Date().toISOString().split('T')[0]
      });
      
      setStatus(`✅ Check-in Successful! ${pointsEarned} points earned.`);
    } catch (error: any) {
      console.error("Check-in failed:", error);
      setStatus(`❌ Check-in failed: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePaymentSuccess = async (amount: number, pointsEarned: number, txHash: string) => {
    try {
      const currentVisits = onChainData?.transactionCount || customerData.totalVisits;
      const newVisitCount = currentVisits + 1;
      
      onUpdateCustomer({
        points: customerData.points + pointsEarned,
        totalVisits: newVisitCount,
        totalSpent: customerData.totalSpent + amount,
        lastVisit: new Date().toISOString().split('T')[0],
        tier: getTierFromVisits(newVisitCount)
      });
      
      const displayHash = txHash.startsWith('temp_') ? 'Processing...' : `${txHash.slice(0, 10)}...`;
      setStatus(`✅ ${amount} TON Payment Successful! TX: ${displayHash} ${pointsEarned} points earned. Visit #${newVisitCount}`);
      
      setTimeout(() => {
        toncenterApi.clearCache();
      }, 3000);
      
    } catch (error: any) {
      console.error("Payment update failed:", error);
      setStatus(`❌ Payment update failed: ${error.message}`);
    }
  };

  const makePurchase = async (action: Action) => {
    try {
      setIsProcessing(true);
      setStatus(`🛍️ Processing ${action.name}...`);
      
      if (!customerData.isRegistered) {
        throw new Error("Please register first");
      }

      const purchaseInNano = toNano(action.amount.toString()).toString();
      
      const payload = beginCell()
        .storeUint(2, 32)
        .storeUint(BigInt(purchaseInNano), 64)
        .endCell();

      const transaction = {
        validUntil: Math.floor(Date.now() / 1000) + 300,
        messages: [
          {
            address: business.contractAddress.trim(),
            amount: purchaseInNano,
            payload: payload.toBoc().toString("base64"),
          },
        ],
      };

      await tonConnectUI.sendTransaction(transaction);
      
      const newVisitCount = customerData.totalVisits + 1;
      onUpdateCustomer({
        points: customerData.points + action.points,
        totalVisits: newVisitCount,
        totalSpent: customerData.totalSpent + action.amount,
        lastVisit: new Date().toISOString().split('T')[0],
        tier: getTierFromVisits(newVisitCount)
      });
      
      setStatus(`✅ ${action.name} successful! ${action.points} points earned. Visit #${newVisitCount}`);
    } catch (error: any) {
      console.error("Purchase failed:", error);
      setStatus(`❌ Purchase failed: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const formatTierName = (tier: string) => {
    const tierMap: { [key: string]: string } = {
      'gold': 'Gold',
      'silver': 'Silver', 
      'bronze': 'Bronze',
      'member': 'Member',
      'new': 'New'
    };
    return tierMap[tier.toLowerCase()] || tier;
  };

  const redeemReward = async (rewardId: string, rewardPoints: number) => {
    if (customerData.points < rewardPoints) {
      setStatus(`❌ Need ${rewardPoints - customerData.points} more points`);
      return;
    }

    try {
      setIsProcessing(true);
      setStatus("🔄 Redeeming reward on blockchain...");
      
      if (!customerData.isRegistered) {
        throw new Error("Please register first");
      }

      const payload = beginCell()
        .storeUint(5, 32)
        .storeAddress(Address.parse('0QDRl_r0pqWSObJfOBrVYY-uf4R3_MWRw8kMZJbwEuJNywCY'))
        .storeUint(rewardPoints, 64)
        .endCell();

      const transaction = {
        validUntil: Math.floor(Date.now() / 1000) + 300,
        messages: [
          {
            address: business.contractAddress.trim(),
            amount: toNano("0.05").toString(),
            payload: payload.toBoc().toString("base64"),
          },
        ],
      };

      await tonConnectUI.sendTransaction(transaction);
      
      onUpdateCustomer({
        points: customerData.points - rewardPoints
      });
      
      setStatus(`🎉 Reward redeemed! ${rewardPoints} points used.`);
    } catch (error: any) {
      setStatus(`❌ Redemption failed: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTipSent = async (amount: number, pointsEarned: number) => {
    onUpdateCustomer({
      points: customerData.points + pointsEarned,
      lastVisit: new Date().toISOString().split('T')[0]
    });
    setStatus(`✅ ${amount} TON Tip Sent! ${pointsEarned} bonus points added.`);
  };

  return (
    <div>
      <div style={{ textAlign: "center", marginBottom: "24px" }}>
        <button onClick={onBack} style={{ background: "transparent", border: "none", color: "var(--tg-theme-text-color, #000000)", fontSize: "18px", cursor: "pointer", position: "absolute", left: "16px", top: "16px" }}>
          ←
        </button>
        <div style={{ fontSize: "48px", marginBottom: "8px" }}>⭐</div>
        <h1 style={{ margin: "0 0 8px 0", color: "var(--tg-theme-text-color, #000000)", fontSize: "24px" }}>
          {business.name}
        </h1>
        <p style={{ color: "var(--tg-theme-hint-color, #999999)", margin: 0 }}>
          {business.category.charAt(0).toUpperCase() + business.category.slice(1)} • {formatTierName(customerData.tier)} Member
        </p>
      </div>

      {renderOnChainInfo()}

      {!customerData.isRegistered && (
        <div style={telegramStyles.card}>
          <h3 style={{ margin: "0 0 16px 0", color: "var(--tg-theme-text-color, #000000)" }}>
            🆕 Complete Registration
          </h3>
          <p style={{ color: "var(--tg-theme-hint-color, #999999)", marginBottom: "16px" }}>
            Register on blockchain to start earning loyalty points
          </p>
          <button 
            onClick={registerCustomer}
            disabled={isProcessing}
            style={{
              ...telegramStyles.button,
              background: "#10b981",
              opacity: isProcessing ? 0.6 : 1
            }}
          >
            {isProcessing ? "Registering..." : "📝 Register on Blockchain"}
          </button>
        </div>
      )}

      {customerData.isRegistered && (
        <div style={{
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          color: "white",
          padding: "20px",
          borderRadius: "16px",
          textAlign: "center",
          marginBottom: "20px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
        }}>
          <div style={{ fontSize: "14px", opacity: 0.9, marginBottom: "8px" }}>
            ON-CHAIN LOYALTY BALANCE
          </div>
          <div style={{ fontSize: "48px", fontWeight: "bold", marginBottom: "8px" }}>
            {customerData.points}
          </div>
          <div style={{ fontSize: "14px", opacity: 0.8 }}>
            {customerData.tier} Member • {customerData.totalVisits} Visits
            {customerData.streakDays > 0 && ` • ${customerData.streakDays} day streak`}
          </div>
        </div>
      )}

      {customerData.isRegistered && (
        <div style={{ display: 'flex', background: 'var(--tg-theme-secondary-bg-color, #f8f9fa)', borderRadius: '12px', padding: '4px', marginBottom: '20px', overflowX: 'auto' }}>
          <button onClick={() => setActiveTab('payment')} style={{ flex: 1, padding: '10px', border: 'none', borderRadius: '8px', background: activeTab === "payment" ? 'var(--tg-theme-button-color, #2481cc)' : 'transparent', color: activeTab === "payment" ? 'var(--tg-theme-button-text-color, #ffffff)' : 'var(--tg-theme-text-color, #000000)', cursor: 'pointer', fontWeight: '500', fontSize: '12px', whiteSpace: 'nowrap' }}>
            💳 Pay Now
          </button>
          <button onClick={() => setActiveTab('actions')} style={{ flex: 1, padding: '10px', border: 'none', borderRadius: '8px', background: activeTab === "actions" ? 'var(--tg-theme-button-color, #2481cc)' : 'transparent', color: activeTab === "actions" ? 'var(--tg-theme-button-text-color, #ffffff)' : 'var(--tg-theme-text-color, #000000)', cursor: 'pointer', fontWeight: '500', fontSize: '12px', whiteSpace: 'nowrap' }}>
            🛍️ Quick Buy
          </button>
          <button onClick={() => setActiveTab('rewards')} style={{ flex: 1, padding: '10px', border: 'none', borderRadius: '8px', background: activeTab === "rewards" ? 'var(--tg-theme-button-color, #2481cc)' : 'transparent', color: activeTab === "rewards" ? 'var(--tg-theme-button-text-color, #ffffff)' : 'var(--tg-theme-text-color, #000000)', cursor: 'pointer', fontWeight: '500', fontSize: '12px', whiteSpace: 'nowrap' }}>
            🎁 Redeem
          </button>
          <button onClick={() => setActiveTab('tips')} style={{ flex: 1, padding: '10px', border: 'none', borderRadius: '8px', background: activeTab === "tips" ? 'var(--tg-theme-button-color, #2481cc)' : 'transparent', color: activeTab === "tips" ? 'var(--tg-theme-button-text-color, #ffffff)' : 'var(--tg-theme-text-color, #000000)', cursor: 'pointer', fontWeight: '500', fontSize: '12px', whiteSpace: 'nowrap' }}>
            💰 Tips
          </button>
        </div>
      )}

      {customerData.isRegistered && (
        <>
          {activeTab === 'payment' && (
            <PaymentSection 
              business={business}
              onPaymentSuccess={handlePaymentSuccess}
              tonConnectUI={tonConnectUI}
              walletAddress={walletAddress}
            />
          )}

          {activeTab === 'actions' && (
            <div style={telegramStyles.card}>
              <h3 style={{ margin: "0 0 16px 0", color: "var(--tg-theme-text-color, #000000)" }}>
                🛍️ Quick Purchase
              </h3>
              <div style={{ display: "grid", gap: "12px" }}>
                {actions.map((action) => (
                  <button 
                    key={action.id}
                    onClick={() => makePurchase(action)}
                    disabled={isProcessing}
                    style={{
                      ...telegramStyles.button,
                      background: "#10b981",
                      fontSize: "14px",
                      padding: "16px",
                      textAlign: "left",
                      opacity: isProcessing ? 0.6 : 1
                    }}
                  >
                    <div style={{ fontWeight: "600", marginBottom: "4px" }}>{action.name}</div>
                    <div style={{ fontSize: "12px", opacity: 0.9 }}>
                      {action.amount} TON • Earn {action.points} points
                    </div>
                  </button>
                ))}
                
                <button 
                  onClick={checkIn}
                  disabled={isProcessing}
                  style={{
                    ...telegramStyles.button,
                    background: "#f59e0b",
                    fontSize: "14px",
                    padding: "16px",
                    opacity: isProcessing ? 0.6 : 1
                  }}
                >
                  📍 Daily Check-in ({customerData.streakDays} day streak)
                </button>
              </div>
            </div>
          )}

          {activeTab === 'rewards' && (
            <div style={telegramStyles.card}>
              <h3 style={{ margin: "0 0 16px 0", color: "var(--tg-theme-text-color, #000000)" }}>
                🎁 Available Rewards
              </h3>
              <div style={{ display: "grid", gap: "12px" }}>
                {rewards.map((reward) => {
                  const canRedeem = customerData.points >= reward.points;
                  return (
                    <div 
                      key={reward.id}
                      style={{
                        background: "white",
                        padding: "16px",
                        borderRadius: "12px",
                        border: `2px solid ${canRedeem ? "#10b981" : "#e5e7eb"}`,
                        opacity: canRedeem ? 1 : 0.6
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: "600", color: "var(--tg-theme-text-color, #000000)", marginBottom: "4px" }}>
                            {reward.name}
                          </div>
                          <div style={{ fontSize: "12px", color: "var(--tg-theme-hint-color, #999999)" }}>
                            {reward.description}
                          </div>
                        </div>
                        <div style={{ 
                          background: canRedeem ? "#10b981" : "#6b7280",
                          color: "white",
                          padding: "6px 12px",
                          borderRadius: "20px",
                          fontSize: "14px",
                          fontWeight: "600"
                        }}>
                          {reward.points} pts
                        </div>
                      </div>
                      <button
                        onClick={() => redeemReward(reward.id, reward.points)}
                        disabled={!canRedeem || isProcessing}
                        style={{
                          ...telegramStyles.button,
                          background: canRedeem ? "#8b5cf6" : "#9ca3af",
                          fontSize: "14px",
                          padding: "12px",
                          opacity: (canRedeem && !isProcessing) ? 1 : 0.6
                        }}
                      >
                        {canRedeem ? "🔄 Redeem Now" : "Need More Points"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'tips' && (
            <TipStaff 
              business={business} 
              onTipSent={handleTipSent}
              tonConnectUI={tonConnectUI}
            />
          )}
        </>
      )}

      {status && (
        <div style={{ 
          background: status.includes("❌") ? "#fef2f2" : "#f0fdf4", 
          color: status.includes("❌") ? "#dc2626" : "#15803d", 
          padding: "12px", 
          borderRadius: "8px", 
          border: `1px solid ${status.includes("❌") ? "#fecaca" : "#bbf7d0"}`, 
          textAlign: "center", 
          fontWeight: "500", 
          fontSize: "14px",
          marginTop: "16px"
        }}>
          {status}
        </div>
      )}

      <div style={{ 
        background: "#f8f9fa", 
        padding: "12px", 
        borderRadius: "8px", 
        marginTop: "16px",
        fontSize: "12px",
        color: "#6b7280",
        textAlign: "center"
      }}>
        🔗 Contract: {business.contractAddress.slice(0, 8)}...{business.contractAddress.slice(-8)}
      </div>
    </div>
  );
};

// Main CustomerApp Component
export default function CustomerApp() {
  const [currentView, setCurrentView] = useState<'wallet' | 'businesses' | 'scanner' | 'dashboard'>('wallet');
  const [currentBusiness, setCurrentBusiness] = useState<BusinessInfo | null>(null);
  const [customerData, setCustomerData] = useState<CustomerData | null>(null);
  const [onChainData, setOnChainData] = useState<OnChainData | null>(null);
  const [customerBusinesses, setCustomerBusinesses] = useState<{ business: BusinessInfo, customerData: CustomerData }[]>([]);
  const [status, setStatus] = useState("");
  
  const userAddress = useTonAddress();
  const [tonConnectUI] = useTonConnectUI();

  useEffect(() => {
    if (userAddress) {
      loadCustomerBusinesses(userAddress);
      setCurrentView('businesses');
    } else {
      setCurrentView('wallet');
    }
  }, [userAddress]);

  useEffect(() => {
    if (currentBusiness && userAddress) {
      loadOnChainData();
    }
  }, [currentBusiness, userAddress]);

  const loadOnChainData = async () => {
    if (!currentBusiness || !userAddress) return;
    
    const data = await fetchOnChainCustomerData(userAddress, currentBusiness.contractAddress);
    setOnChainData(data);
    
    if (data) {
      console.log('📊 On-chain data loaded:', data);
      setStatus(`✅ On-chain data: ${(data.transactionCount || data.transactions || 0)} transactions`);
    }
  };

  const loadCustomerBusinesses = (walletAddress: string) => {
    const businessIds = storage.getAllBusinessesForCustomer(walletAddress);
    const businesses = businessIds.map(businessId => {
      const customerData = storage.getCustomerData(walletAddress, businessId);
      if (customerData) {
        const businessData = localStorage.getItem(`business_${businessId}`);
        let businessInfo: BusinessInfo;
        
        if (businessData) {
          try {
            const parsed = JSON.parse(businessData);
            businessInfo = {
              businessId,
              contractAddress: parsed.contractAddress || LOYALTY_CONTRACT_ADDRESS,
              name: parsed.name || formatBusinessName(businessId),
              description: parsed.description || "Loyalty Program",
              category: parsed.category || "general",
              rewards: parsed.rewards,
              actions: parsed.actions
            };
          } catch (error) {
            businessInfo = createDefaultBusinessInfo(businessId);
          }
        } else {
          businessInfo = createDefaultBusinessInfo(businessId);
        }
        
        return { business: businessInfo, customerData };
      }
      return null;
    }).filter(Boolean) as { business: BusinessInfo, customerData: CustomerData }[];
    
    setCustomerBusinesses(businesses);
  };

  const createDefaultBusinessInfo = (businessId: string): BusinessInfo => {
    const category = "general";
    const config = getDefaultBusinessConfig(category);
    
    return {
      businessId,
      contractAddress: LOYALTY_CONTRACT_ADDRESS,
      name: formatBusinessName(businessId),
      description: "Loyalty Program",
      category: category,
      rewards: config.rewards,
      actions: config.actions
    };
  };

  const formatBusinessName = (businessId: string) => {
    console.log("🔧 Formatting business name from ID:", businessId);
    
    if (businessId.includes('loyalty.ton/business/')) {
      const urlParts = businessId.split('/business/');
      if (urlParts.length >= 2) {
        const namePart = urlParts[1].split('/')[0];
        return decodeURIComponent(namePart)
          .replace(/-\d+$/, '')
          .replace(/business-/i, '')
          .replace(/-\d+-[a-z0-9]+$/i, '')
          .split('-')
          .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
          .join(' ');
      }
    }

    let cleanId = businessId
      .replace(/^business-/, '')
      .replace(/-\d+$/, '')
      .replace(/-\d+-[a-z0-9]+$/i, '')
      .replace(/^demo-/, '')
      .replace(/^test-/, '')
      .replace(/^ccd-/, '');

    if (!cleanId || cleanId === '-') {
      return "Business Loyalty";
    }

    try {
      cleanId = decodeURIComponent(cleanId);
    } catch (e) {
      // If decoding fails, use as is
    }

    const nameParts = cleanId.split('-');
    
    const formattedName = nameParts
      .filter(part => part.length > 0)
      .map(part => {
        if (part === 'cafe') return 'Café';
        if (part === 'restaurant') return 'Restaurant';
        if (part === 'coffee') return 'Coffee';
        if (part === 'tech') return 'Tech';
        if (part === 'store') return 'Store';
        if (part === 'ccd') return 'CCD';
        if (part === 'ton') return 'TON';
        
        return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
      })
      .join(' ');

    return formattedName || "Business Loyalty";
  };

  const handleQRScan = async (businessInfo: BusinessInfo) => {
    try {
      if (!userAddress) {
        setCurrentView('wallet');
        return;
      }

      console.log("📱 Joining business:", businessInfo);

      const existingData = storage.getCustomerData(userAddress, businessInfo.businessId);
      if (existingData) {
        setCurrentBusiness(businessInfo);
        setCustomerData(existingData);
        setCurrentView('dashboard');
        setStatus("✅ Welcome back!");
        return;
      }
      
      const newCustomerData: CustomerData = {
        walletAddress: userAddress,
        businessId: businessInfo.businessId,
        points: 0,
        totalVisits: 0,
        streakDays: 0,
        memberSince: new Date().toISOString().split('T')[0],
        lastVisit: new Date().toISOString().split('T')[0],
        tier: "New",
        totalSpent: 0,
        isRegistered: false
      };
      
      localStorage.setItem(`business_${businessInfo.businessId}`, JSON.stringify(businessInfo));
      storage.saveCustomerData(userAddress, businessInfo.businessId, newCustomerData);
      
      setCurrentBusiness(businessInfo);
      setCustomerData(newCustomerData);
      setCurrentView('dashboard');
      loadCustomerBusinesses(userAddress);
      setStatus("🎉 Business joined! Complete registration to start earning points.");
      
    } catch (error: any) {
      console.error("QR scan error:", error);
      setStatus(`❌ Error: ${error.message}`);
    }
  };

  const handleUpdateCustomer = (updates: Partial<CustomerData>) => {
    if (!userAddress || !currentBusiness || !customerData) return;
    
    const updatedData = { ...customerData, ...updates };
    setCustomerData(updatedData);
    storage.saveCustomerData(userAddress, currentBusiness.businessId, updatedData);
    
    loadCustomerBusinesses(userAddress);
  };

  const handleSelectBusiness = (business: BusinessInfo, customerData: CustomerData) => {
    setCurrentBusiness(business);
    setCustomerData(customerData);
    setCurrentView('dashboard');
  };

  const handleBackToBusinesses = () => {
    setCurrentView('businesses');
    setCurrentBusiness(null);
    setCustomerData(null);
  };

  const renderContent = () => {
    switch (currentView) {
      case 'wallet':
        return (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ fontSize: '64px', marginBottom: '20px' }}>👛</div>
            <h2 style={{ color: "var(--tg-theme-text-color, #000000)", marginBottom: '16px' }}>
              Connect Your Wallet
            </h2>
            <p style={{ color: "var(--tg-theme-hint-color, #999999)", marginBottom: '24px' }}>
              Connect your TON wallet to access loyalty programs
            </p>
            <button 
              onClick={() => tonConnectUI.openModal()}
              style={telegramStyles.button}
            >
              Connect TON Wallet
            </button>
          </div>
        );

      case 'businesses':
        return (
          <BusinessSelection 
            businesses={customerBusinesses}
            onSelectBusiness={handleSelectBusiness}
            onScanNew={() => setCurrentView('scanner')}
          />
        );

      case 'scanner':
        return (
          <QRScanner 
            onScan={handleQRScan}
            onBack={() => setCurrentView('businesses')}
          />
        );

      case 'dashboard':
        return currentBusiness && customerData ? (
          <CustomerLoyaltyDashboard 
            business={currentBusiness}
            customerData={customerData}
            onUpdateCustomer={handleUpdateCustomer}
            onBack={handleBackToBusinesses}
            tonConnectUI={tonConnectUI}
            walletAddress={userAddress}
            onChainData={onChainData}
          />
        ) : null;

      default:
        return null;
    }
  };

  return (
    <div style={telegramStyles.container}>
      {status && (
        <div style={{ 
          background: status.includes("❌") ? "#fef2f2" : "#f0fdf4", 
          color: status.includes("❌") ? "#dc2626" : "#15803d", 
          padding: "12px", 
          borderRadius: "8px", 
          border: `1px solid ${status.includes("❌") ? "#fecaca" : "#bbf7d0"}`, 
          textAlign: "center", 
          fontWeight: "500", 
          fontSize: "14px",
          marginBottom: "16px"
        }}>
          {status}
        </div>
      )}
      
      {renderContent()}
    </div>
  );
}