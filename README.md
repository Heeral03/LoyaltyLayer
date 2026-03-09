#  Loyalty Layer

> **Decentralized loyalty programs on TON — empowering small merchants and their customers.**

[![TON](https://img.shields.io/badge/Built%20on-TON-0098EA?style=for-the-badge&logo=telegram)](https://ton.org)
[![Tolk](https://img.shields.io/badge/Smart%20Contracts-Tolk-6c63ff?style=for-the-badge)](https://docs.ton.org/v3/documentation/smart-contracts/tolk/overview)
[![TonConnect](https://img.shields.io/badge/Wallet-TonConnect-3ecfcf?style=for-the-badge)](https://docs.ton.org/v3/guidelines/ton-connect/overview)
[![TypeScript](https://img.shields.io/badge/Frontend-TypeScript%20%2B%20React-3178c6?style=for-the-badge)](https://www.typescriptlang.org/)

---

## 🏆 Achievement

  ### 2nd Runner Up — The Open Hack 2025
---

##  The Problem

Small shop owners running loyalty programs face two major challenges:

- **For merchants:** Setting up a loyalty program requires expensive SaaS tools or complex tech infrastructure — out of reach for small businesses.
- **For customers:** Loyalty points are stored in centralized databases. If a shop closes suddenly, points vanish forever.

---

##  The Solution

Loyalty Layer is a **Telegram Mini App** that lets any merchant launch their own on-chain loyalty program in seconds — with zero setup cost and zero technical knowledge required.

Points live on the TON blockchain. They belong to the customer's wallet — not a company's database. A shop closing can never erase them.

---

##  Features

### For Merchants
-  **One-click deployment** — launch a personal loyalty smart contract with a single transaction
-  **Owner Dashboard** — view total customers, total tips received, business stats
-  **Issue Points** — manually reward customers with loyalty points
-  **Withdraw TON** — withdraw accumulated tips and payments directly to wallet
-  **QR Code Generation** — share a unique QR code and code for customers to find your program

### For Customers
-  **Personalized Dashboard** — paste a merchant code and see your loyalty points instantly
-  **Earn Points Automatically** — tip or buy a product in TON and points credit instantly (1 pt per 0.01 TON)
-  **Redeem Points** — redeem accumulated points on-chain
-  **Points are yours** — stored against your wallet address, not an email or account

---

##  Architecture

```
LoyaltyLayer/
├── blockchain/                  # Smart contracts (Tolk)
│   ├── contracts/
│   │   ├── factory.tolk         # Master deployer contract
│   │   └── business.tolk        # Individual merchant contract
│           
│
└── frontend/                    # React Telegram Mini App
```

---

##  Smart Contracts

### Factory Contract (`factory.tolk`)

A single master contract deployed on TON. Responsible for deploying individual merchant contracts using the **Factory Pattern**.

**Storage:**
```
nextId        → auto-incrementing merchant ID
totalCount    → total merchants deployed
businessCode  → compiled Business contract code (for deployment)
```

**Op Codes:**
| Code | Operation | Description |
|------|-----------|-------------|
| `1` | `DEPLOY_BUSINESS` | Deploy a new merchant loyalty contract |

**How deployment works:**
1. Frontend sends op code `1` with owner address and business name
2. Factory builds `StateInit` from Business contract code + initial data
3. Factory deploys the new contract — address is **deterministically calculated** from `hash(code + data)`
4. Factory increments `nextId` and `totalCount`


---

### Business Contract (`business.tolk`)

Each merchant gets their own dedicated contract. All loyalty data is stored entirely on-chain.

**Storage:**
```
owner            → merchant's wallet address
businessName     → shop name (as cell)
businessId       → unique ID assigned by factory
totalCustomers   → number of unique customers
totalTips        → accumulated TON received
customerPoints   → hashmap<address, uint64> — points per customer
```

**Op Codes:**
| Code | Operation | Who Can Call | Description |
|------|-----------|-------------|-------------|
| `1` | `ISSUE_POINTS` | Owner only | Manually award points to a customer |
| `2` | `TIP` | Anyone | Send TON tip → auto-earn points |
| `3` | `WITHDRAW` | Owner only | Withdraw accumulated TON to owner wallet |
| `4` | `BUY_PRODUCT` | Anyone | Pay for product in TON → auto-earn points |
| `5` | `REDEEM_POINTS` | Customer | Burn points on-chain |

**Points conversion rate:**
```
1 TON = 100 points  (1 point per 0.01 TON)
```

**Error codes:**
| Code | Meaning |
|------|---------|
| `101` | Unauthorized (not owner) |
| `102` | Zero points specified |
| `103` | Zero tip amount |
| `104` | Insufficient balance |
| `105` | Zero payment |
| `106` | Insufficient points to redeem |



---


##  Screens

| Screen | Description |
|--------|-------------|
| **Landing** | Connect wallet via TonConnect, navigate to merchant/customer/owner |
| **Merchant** | Enter shop name, deploy contract, receive contract address + QR code |
| **Owner** | Search shop by name, view stats (customers, tips), issue points, withdraw TON |
| **Customer** | Paste merchant code, view personal points, tip, buy products, redeem points |

---

##  Tech Stack

| Layer | Technology |
|-------|-----------|
| Smart Contracts | [Tolk](https://docs.ton.org/v3/documentation/smart-contracts/tolk/overview) (TON's modern smart contract language) |
| Blockchain | [TON](https://ton.org) |
| Frontend | React + TypeScript |
| Platform | Telegram Mini App |
| Wallet Auth | [TonConnect](https://docs.ton.org/v3/guidelines/ton-connect/overview) |
| TON SDK | [@ton/core](https://github.com/ton-org/ton), [@ton/ton](https://github.com/ton-org/ton) |
| Contract Testing | [@ton/sandbox](https://github.com/ton-org/sandbox) |

---

##  Getting Started

### Prerequisites
- Node.js v18+
- A TON wallet (Tonkeeper recommended)
- Telegram account

### Installation

```bash
# Clone the repository
git clone https://github.com/Heeral03/LoyaltyLayer.git
cd LoyaltyLayer

# Install blockchain dependencies
cd blockchain
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### Running the Frontend

```bash
cd frontend
npm run dev
```

### Compiling & Deploying Contracts

```bash
cd blockchain
npx blueprint build    # Compile Tolk contracts
npx blueprint run      # Deploy to testnet
```

---

##  Key Design Decisions

**Why TON?**
TON's sharding architecture and low gas fees make micro-transactions (tips, point issuance) economically viable. Each loyalty operation costs fractions of a cent.

**Why one contract per merchant?**
Isolates merchant data completely. One merchant's contract issues cannot affect another's. Also aligns with TON's sharding model — contracts in different shards process in parallel.

**Why Telegram Mini App?**
Merchants and customers already use Telegram. Zero additional app download required. TonConnect works natively inside Telegram with Tonkeeper.

**Why store points on-chain?**
Points stored on-chain are owned by the customer's wallet address — not a company account. Merchant closure, database failures, or company shutdowns cannot erase customer points.

---



