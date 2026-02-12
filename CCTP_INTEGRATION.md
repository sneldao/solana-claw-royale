# 🌉 Cross-Chain CCTP Integration for Claw Royale

## Overview

Claw Royale supports **Cross-Chain USDC Transfers** via Circle's Cross-Chain Transfer Protocol (CCTP), enabling:
- USDC flows between Base and Solana
- Players can bet from either chain
- Prizes claimable on user's preferred chain

## CCTP Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     CCTP Cross-Chain Layer                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   BASE                          SOLANA                           │
│   ┌─────────┐                   ┌─────────┐                     │
│   │USDC     │╔══════════════════╗│USDC     │                     │
│   │(Native) │║  ATTESTATION     ││(Wrapped)│                     │
│   └────┬────║║     MERKLE        ║└────┬────┘                     │
│        │   ║║     PROOF         ║   │                          │
│        ▼   ╚╩═══════════════════╝   ▼                          │
│   ┌─────────┐                   ┌─────────┐                     │
│   │MESSAGE  │                   │RELAYER  │                     │
│   │TRANSMIT │                   │SERVICE  │                     │
│   └─────────┘                   └─────────┘                     │
└─────────────────────────────────────────────────────────────────┘
```

## CCTP Flow for Claw Royale

### Step 1: Deposit USDC (Base → Solana)

```
Player on Base wants to join Solana battle:
1. Lock USDC in Base MessageTransmitter
2. Wait for attestation (1-2 minutes)
3. Burn wrapped USDC on Solana
4. Receive native USDC on Solana
```

### Step 2: Claim USDC (Solana → Base)

```
Player won on Solana, wants to move to Base:
1. Burn wrapped USDC on Solana
2. Generate burn proof
3. Call MessageTransmitter on Base
4. Mint native USDC on Base
```

## Integration Points

### Base Contract

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {IMessageTransmitter} from "@circle/cctp/interfaces/IMessageTransmitter.sol";

interface IClawRoyaleCCTP {
    function bridgeToSolana(uint256 amount, bytes32 destinationCaller) external;
    function claimFromSolana(bytes calldata message, bytes calldata attestation) external;
}
```

### Solana Program

```rust
// Rust interface for CCTP integration
pub fn bridge_to_base(ctx: Context<BridgeToBase>, amount: u64) -> Result<()> {
    // Burn wrapped USDC on Solana
    // Emit message for attestation
    // Emit event for external relayer
    Ok(())
}
```

## CCTP Integration Benefits

| Feature | Without CCTP | With CCTP |
|---------|--------------|-----------|
| Chain Support | Single chain | Multi-chain |
| User Experience | Force single chain | Choose preferred chain |
| Liquidity | Fragmented | Unified |
| UX | Complex bridging | Native CCTP |

## Security Considerations

1. **Attestation Verification**: Always verify Circle attestations
2. **Message Nonces**: Prevent replay attacks
3. **Destination Callers**: Restrict to authorized contracts
4. **Amount Limits**: Rate limit large transfers

## Deployment

### Base Mainnet
- MessageTransmitter: 0x0a992d1915e9aa9a5e2d1e58a3a1666ca7bcc7de
- TokenMessenger: 0x2Bde949f932F0E39aF84BAdF20aFdA0e1D34d2eb

### Solana Mainnet
- MessageTransmitter: ATTN4...
- TokenMessenger: ...

## Demo Script

```bash
# Bridge 10 USDC from Base to Solana
npm run cctp -- bridge-base-to-solana 10

# Claim USDC from Solana to Base
npm run cctp -- claim-solana-to-base <message> <attestation>

# Check bridge status
npm run cctp -- status
```

## Resources

- [CCTP Documentation](https://www.circle.com/en/cctp)
- [Circle Developer Portal](https://developers.circle.com)
- [CCTP GitHub](https://github.com/circlefin/cctp)
