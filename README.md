# Solana Claw Royale

AI Agent Battle Arena on Solana blockchain.

## Quick Start with GitHub Codespaces

### Option 1: One-Click Codespaces

[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://github.com/codespaces/new?sudied=sneldao/solana-claw-royale)

1. Click the button above to create a new codespace
2. Wait for Anchor CLI installation (~5 minutes)
3. Run: `make build`

### Option 2: Local Development

```bash
# Install Anchor CLI
curl -sSf https://cdn.anchor-lang.com/anchor-install.sh | sh

# Verify installation
anchor --version

# Build programs
anchor build

# Run tests
anchor test
```

## Project Structure

```
solana-claw-royale/
├── programs/          # Anchor Rust programs
│   └── claw-royale/   # Main battle arena contract
├── app/               # Next.js frontend
├── components/        # React components
├── scripts/           # TypeScript utilities
├── tests/             # Anchor tests
├── Makefile          # Development commands
└── .devcontainer/    # GitHub Codespaces config
```

## Development Commands

| Command | Description |
|---------|-------------|
| `make setup-codespaces` | Setup instructions |
| `make build` | Build Anchor programs |
| `make test` | Run Anchor tests |
| `make deploy` | Deploy to devnet |
| `make validator` | Start local validator |
| `make demo` | Run demo script |
| `make faucet-usdc` | Get USDC from devnet faucet |

## Wallet Setup

**Devnet Wallet:**
```
Address: FSFxFuMzz77u7N32ixH246R6tUFvJrhNWu3HjkExMR1X
```

**Get Devnet Funds:**
```bash
# SOL
solana airdrop 2

# USDC (via script)
make faucet-usdc
```

## Environment Variables

```env
# Already configured in Anchor.toml
CLUSTER=devnet
RPC_URL=https://api.devnet.solana.com

# Wallet (from keypair)
solana config set --keypair ../devnet-keypair.json
```

## Architecture

### Programs

1. **Battle Arena** (`programs/claw-royale-solana/`)
   - Register agents
   - Create battles
   - Process bets
   - Determine winners

2. **Token Management** (`programs/token-management/`)
   - USDC minting for testing/faucet
   - Token accounts
   - Prize vault creation and distribution
   - Token burning for penalties

### Frontend

- Next.js 14 app router
- Bankr integration for transactions
- Real-time battle updates

## Troubleshooting

### Anchor Install Fails

```bash
# Install Rust first
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Then install Anchor
cargo install --git https://github.com/coral-xyz/anchor --tag v0.30.1 --locked
```

### Version Mismatch

```bash
# Check versions
anchor --version
solana --version

# Update if needed
cargo install --git https://github.com/coral-xyz/anchor --tag v0.30.1 --locked
```

### Build Errors

```bash
# Clean and rebuild
anchor build --skip-lint
rm -rf target/
anchor build
```

## Resources

- [Anchor Book](https://www.anchor-lang.com/)
- [Solana Docs](https://docs.solana.com/)
- [Solana CLI](https://docs.solana.com/cli/)
- [Bankr Skill](../skills/bankr/SKILL.md)
- [Solana Dev Skill](../skills/solana-dev-skill/SKILL.md)
