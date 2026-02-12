# Solana Claw Royale - Makefile

.PHONY: all build test deploy clean setup-codespace

# Install dependencies and Anchor CLI
setup-codespace:
	@echo "Setting up Solana development environment..."
	@echo "For GitHub Codespaces:"
	@echo "1. Open https://github.com/codespaces/new?sudied=sneldao/solana-claw-royale"
	@echo "2. Select 'Create new codespace'"
	@echo "3. Anchor will be installed automatically via devcontainer.json"
	@echo ""
	@echo "For local development:"
	@echo "  curl -sSf https://cdn.anchor-lang.com/anchor-install.sh | sh"
	@echo "  OR"
	@echo "  cargo install --git https://github.com/coral-xyz/anchor --tag v0.30.1 --locked"

# Build Anchor programs
build:
	anchor build

# Test Anchor programs
test:
	anchor test

# Deploy to devnet
deploy:
	anchor deploy --provider.cluster devnet

# Run local validator
validator:
	solana-test-validator

# Keys and configuration
keys:
	@echo "Devnet wallet: $$(solana address)"
	@echo "Use ./scripts/wallet-manager.ts for key operations"

# Lint and format
lint:
	cargo fmt --check
	anchor fmt --check

format:
	cargo fmt
	anchor fmt

# Generate TypeScript clients
clients:
	anchor build --skip-lint
	anchor types --skip-lint -f ./programs/claw-royale/src/lib.rs

# Run demo script
demo:
	npx ts-node scripts/demo.ts

# Get USDC on devnet
faucet-usdc:
	npx ts-node scripts/get-usdc.ts

# Print help
help:
	@echo "Solana Claw Royale Development Commands"
	@echo ""
	@echo "Setup:"
	@echo "  make setup-codespace  - Setup GitHub Codespaces with Anchor"
	@echo ""
	@echo "Development:"
	@echo "  make build            - Build Anchor programs"
	@echo "  make test             - Run Anchor tests"
	@echo "  make deploy           - Deploy to devnet"
	@echo "  make validator        - Start local validator"
	@echo "  make demo             - Run demo script"
	@echo ""
	@echo "Utilities:"
	@echo "  make keys             - Show key addresses"
	@echo "  make lint             - Check code formatting"
	@echo "  make format           - Format code"
	@echo "  make clients          - Generate TypeScript clients"
	@echo "  make faucet-usdc      - Get USDC from devnet faucet"
