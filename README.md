# Loyalty Layer — Decentralized Loyalty + Tipping System on TON

A Telegram-native micro-loyalty infrastructure for real-world businesses.

## Overview

Loyalty Layer is a Telegram Mini App powered by TON smart contracts that enables small shops, cafés, salons, and local businesses to launch instant, programmable loyalty programs — with zero setup, zero staff training, and no separate app downloads.

Customers earn on-chain, verifiable, portable loyalty points simply by scanning a QR and paying/tipping through TON.

This project won 2nd Runner-Up at The Open Hack 2025, during India Blockchain Week, Bengaluru.

# Key Features
## For Businesses

- No app installs, no dashboards — runs directly inside Telegram

- Instant onboarding: register → connect TON wallet → get loyalty QR

- On-chain transparency: all points, tips, redemption events are verifiable

- Ideal for micro-merchants (kirana stores, cafés, salons, canteens)

## For Customers

- Scan QR → auto-join → earn points instantly

- Keep your points forever: uninstalling apps doesn’t wipe rewards

- Fully portable points — designed to support cross-shop/mall networks

- Real-time balance updates through TON blockchain

## Powered by TON

- Ultra-low fees → micro-rewards like ₹5–₹50 become viable

- Real-time settlement

- Native Telegram integration via Mini Apps + TonConnect

- Scales to UPI-level usage

# Tech Stack
## Frontend

- React 18

- TypeScript

- @telegram-apps/sdk, @twa-dev/sdk

- TonConnect UI

- qrcode.react

## Backend

- Node.js + Express

- TON SDK (@ton/core, @ton/ton)

- Ngrok for secure tunneling during development

## Smart Contracts (Func)

- Factory.fc — Deploys business-specific loyalty contracts

- Business.fc — Stores business metadata

- CustomerLoyalty.fc — Manages on-chain points, tips, and transactions

## Tools

- TON Blueprint

- Local Sandbox

- Jest + RTL

- VS Code + GitHub
# Demo

https://www.youtube.com/shorts/FK1VcxxlbPo

# Why This Matters

## Most loyalty systems today are still Web2:

- Every brand has its own app, its own points, and its own wallet

- Small shops can’t afford loyalty infra, dashboards, or training

- Points are stored in centralized databases → easy to lose, hard to verify

- Nothing is portable — one café point can’t work at another café

This creates a loyalty system that feels fake, expensive, and fragmented.



## How Loyalty Layer Solves It (Powered by TON + Telegram)

###  On-Chain Ownership
- Points live on TON smart contracts — not on a private server.
- Customers truly own their rewards, even if apps change or businesses switch systems.

### Transparent & Trustless
Every reward, tip, and redemption is recorded on-chain.
No fake points, no backend manipulation.

### Ultra-Cheap Micro Rewards
- TON fees are almost zero (fractions of a paisa).
### Built Inside Telegram
- No new app.
- Users open a mini app in Telegram, scan a QR, connect wallet → done.
- Fits naturally into how people already interact with shops and communities.

### Scales Like UPI
- TON can handle massive throughput, so thousands of merchants in a city can run rewards without breaking the system.

# 🏆Achievement

- 2nd Runner-Up — The Open Hack 2025 (TON × Telegram Mini Apps)
- Awarded during India Blockchain Week, Bangalore.
- Prize: $500 + TON ecosystem mentorship and support.
