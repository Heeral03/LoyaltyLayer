// src/services/tonService.ts
import { Address, Cell, Slice } from '@ton/core';

const TONCENTER_API = 'https://toncenter.com/api/v2';

interface TonResponse {
  ok: boolean;
  result: any;
  stack: any[];
  error?: string;
}

interface TonErrorResponse {
  ok: boolean;
  stack: any[];
  error: string;
}

export class TonService {
  private lastRequestTime = 0;
  private readonly MIN_REQUEST_INTERVAL = 2000;
  private retryCount = 0;
  private readonly MAX_RETRIES = 3;

  private async delayIfNeeded(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.MIN_REQUEST_INTERVAL) {
      await new Promise(resolve => 
        setTimeout(resolve, this.MIN_REQUEST_INTERVAL - timeSinceLastRequest)
      );
    }
    
    this.lastRequestTime = Date.now();
  }

  async callGetMethod(address: string, method: string, stack: any[] = []): Promise<TonResponse> {
    await this.delayIfNeeded();
    
    try {
      // Validate address format
      try {
        Address.parse(address);
      } catch {
        throw new Error(`Invalid TON address: ${address}`);
      }

      console.log(`📡 Calling ${method} on ${address}`);
      
      const response = await fetch(`${TONCENTER_API}/runGetMethod`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          address: address,
          method: method,
          stack: stack,
        }),
      });

      if (response.status === 429) {
        this.retryCount++;
        if (this.retryCount <= this.MAX_RETRIES) {
          console.log(`🔄 Rate limit hit, retrying in ${this.retryCount * 2000}ms...`);
          await new Promise(resolve => setTimeout(resolve, this.retryCount * 2000));
          return this.callGetMethod(address, method, stack);
        } else {
          throw new Error('Rate limit exceeded. Please wait a few minutes and try again.');
        }
      }

      // Reset retry count on successful request
      this.retryCount = 0;

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      console.log(`📊 Raw response for ${method}:`, data);
      
      if (data.ok === false) {
        // Check if method doesn't exist
        if (data.error && data.error.includes('method not found')) {
          throw new Error(`Method ${method} not found on contract`);
        }
        throw new Error(data.error || 'Unknown error from TON Center');
      }

      return data;
    } catch (error) {
      console.error('Error calling get method:', error);
      throw error;
    }
  }

  decodeCellFromStack(stack: any[]): string {
    try {
      console.log('🔍 Decoding stack:', stack);
      
      if (!stack || stack.length === 0) {
        console.log('❌ Stack is empty');
        return "";
      }
      
      const stackItem = stack[0];
      console.log('📦 Stack item:', stackItem);
      
      if (stackItem && stackItem[0] === 'cell') {
        console.log('🔧 Processing cell...');
        const cell = Cell.fromBase64(stackItem[1].bytes);
        console.log('📄 Cell parsed:', cell);
        const slice = cell.beginParse();
        
        // Try different ways to read the string
        let result = "";
        try {
          result = slice.loadStringTail();
        } catch (e) {
          console.log('❌ Failed to load string tail, trying alternative method...');
          try {
            // Alternative method to read string from slice
            result = this.loadStringFromSlice(slice);
          } catch (e2) {
            console.log('❌ Failed to load string');
          }
        }
        
        console.log('✅ Decoded string:', result);
        return result;
      } else if (stackItem && stackItem[0] === 'null') {
        console.log('📭 Stack item is null');
        return "";
      } else if (stackItem && stackItem[0] === 'slice') {
        console.log('🔪 Stack item is slice');
        try {
          const sliceData = Cell.fromBase64(stackItem[1].bytes).beginParse();
          const tailResult = sliceData.loadStringTail();
          return tailResult || this.loadStringFromSlice(sliceData);
        } catch (e) {
          return "";
        }
      } else {
        console.log('❓ Unknown stack item type:', stackItem?.[0]);
        return "";
      }
    } catch (error) {
      console.error('❌ Error decoding cell:', error);
      return "";
    }
  }

  // Alternative method to load string from slice
  private loadStringFromSlice(slice: Slice): string {
    try {
      // Try to read as much string data as possible
      let result = "";
      while (slice.remainingBits >= 8) {
        try {
          const charCode = slice.loadUint(8);
          if (charCode === 0) break; // Null terminator
          result += String.fromCharCode(charCode);
        } catch (e) {
          break;
        }
      }
      return result;
    } catch (error) {
      console.error('Error loading string from slice:', error);
      return "";
    }
  }

  // Sequential method calls to avoid rate limiting
  async callGetMethodsSequentially(address: string, methods: string[]): Promise<(TonResponse | TonErrorResponse)[]> {
    const results: (TonResponse | TonErrorResponse)[] = [];
    for (const method of methods) {
      await this.delayIfNeeded();
      try {
        const result = await this.callGetMethod(address, method);
        results.push(result);
      } catch (error: any) {
        console.error(`❌ Failed to call ${method}:`, error.message);
        // Create a proper error response object
        results.push({ 
          ok: false, 
          stack: [], 
          error: error.message 
        });
      }
    }
    return results;
  }
}

export const tonService = new TonService();