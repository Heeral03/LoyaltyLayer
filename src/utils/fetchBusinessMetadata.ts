import { Address, TupleReader } from "@ton/core";
import { TonClient4 } from "@ton/ton";
import { Buffer } from "buffer";
import process from "process";

// ✅ Polyfill missing Node globals for browser
(window as any).global = window;
(window as any).Buffer = Buffer;
(window as any).process = process;

// ✅ Initialize TonClient4 with mainnet endpoint
const client = new TonClient4({
  endpoint: "https://mainnet-v4.tonhubapi.com", // reliable public TON hub endpoint
});

export async function fetchBusinessMetadata(factoryAddress: string) {
  try {
    const address = Address.parse(factoryAddress);

    // ✅ Always get the latest block before running get-methods
    const latestBlock = await client.getLastBlock();

    // ✅ Run get-method calls using correct signature (seqno + address + method + stack)
    const nameRes = await client.runMethod(latestBlock.last.seqno, address, "get_business_name", []);
    const descRes = await client.runMethod(latestBlock.last.seqno, address, "get_business_description", []);
    const catRes = await client.runMethod(latestBlock.last.seqno, address, "get_business_category", []);

    // ✅ Decode result using TupleReader
    const decodeResult = (res: any) => {
      const reader = new TupleReader(res.result);
      const cell = reader.readCellOpt();
      if (!cell) return "";
      const slice = cell.beginParse();
      return slice.loadStringTail();
    };

    return {
      name: decodeResult(nameRes),
      description: decodeResult(descRes),
      category: decodeResult(catRes),
    };
  } catch (err) {
    console.error("❌ Error fetching metadata:", err);
    throw err;
  }
}
