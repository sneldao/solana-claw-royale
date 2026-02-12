// Claw Royale Token Management Program
// Handles USDC minting, token accounts, and prize distribution

use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, Mint, TokenAccount, MintTo, Burn, Transfer};

declare_id!("HsaRwE8xHDDHaFsM55G4fYZyCRXEK4rupXgcBp3TtGtf");

// ═════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═════════════════════════════════════════════════════════════════════════════

const USDC_MINT_SEED: &[u8] = b"usdc_mint";
const TREASURY_SEED: &[u8] = b"treasury";
const PRIZE_VAULT_SEED: &[u8] = b"prize_vault";

// ═════════════════════════════════════════════════════════════════════════════
// DATA ACCOUNTS
// ═════════════════════════════════════════════════════════════════════════════

#[account]
pub struct TokenConfig {
    pub authority: Pubkey,
    pub usdc_mint: Pubkey,
    pub treasury: Pubkey,
    pub total_minted: u64,
    pub total_burned: u64,
    pub bump: u8,
}

#[account]
pub struct PrizeVault {
    pub battle: Pubkey,
    pub amount: u64,
    pub distributed: bool,
    pub bump: u8,
}

// ═════════════════════════════════════════════════════════════════════════════
// INSTRUCTIONS
// ═════════════════════════════════════════════════════════════════════════════

#[program]
pub mod token_management {
    use super::*;

    /// Initialize token configuration (once, by authority)
    pub fn initialize_token_config(
        ctx: Context<InitializeTokenConfig>,
        usdc_mint: Pubkey,
    ) -> Result<()> {
        let config = &mut ctx.accounts.token_config;
        config.authority = ctx.accounts.authority.key();
        config.usdc_mint = usdc_mint;
        config.treasury = ctx.accounts.treasury.key();
        config.total_minted = 0;
        config.total_burned = 0;
        config.bump = ctx.bumps.token_config;
        
        msg!("Token config initialized for mint: {}", usdc_mint);
        Ok(())
    }

    /// Mint new USDC tokens (for testing/faucet)
    pub fn mint_usdc(
        ctx: Context<MintUsdc>,
        amount: u64,
    ) -> Result<()> {
        let config = &mut ctx.accounts.token_config;
        
        // CPI to mint new tokens
        let cpi_accounts = MintTo {
            mint: ctx.accounts.usdc_mint.to_account_info(),
            to: ctx.accounts.recipient_token_account.to_account_info(),
            authority: ctx.accounts.mint_authority.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
        token::mint_to(cpi_ctx, amount)?;
        
        config.total_minted += amount;
        
        msg!("Minted {} USDC to {}", amount, ctx.accounts.recipient.key());
        Ok(())
    }

    /// Create prize vault for a battle
    pub fn create_prize_vault(
        ctx: Context<CreatePrizeVault>,
        battle_id: Pubkey,
    ) -> Result<()> {
        let vault = &mut ctx.accounts.prize_vault;
        vault.battle = battle_id;
        vault.amount = 0;
        vault.distributed = false;
        vault.bump = ctx.bumps.prize_vault;
        
        msg!("Prize vault created for battle: {}", battle_id);
        Ok(())
    }

    /// Deposit prize funds to vault
    pub fn deposit_prize(
        ctx: Context<DepositPrize>,
        amount: u64,
    ) -> Result<()> {
        // Transfer tokens to vault
        let cpi_accounts = Transfer {
            from: ctx.accounts.depositor_token.to_account_info(),
            to: ctx.accounts.prize_vault.to_account_info(),
            authority: ctx.accounts.depositor.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
        token::transfer(cpi_ctx, amount)?;
        
        let vault = &mut ctx.accounts.prize_vault;
        vault.amount += amount;
        
        msg!("Deposited {} USDC to prize vault", amount);
        Ok(())
    }

    /// Distribute prize to winner
    pub fn distribute_prize(
        ctx: Context<DistributePrize>,
        amount: u64,
    ) -> Result<()> {
        let vault = &mut ctx.accounts.prize_vault;
        
        require!(!vault.distributed, ErrorCode::PrizeAlreadyDistributed);
        require!(vault.amount >= amount, ErrorCode::InsufficientPrizeFunds);
        
        // Transfer prize to winner
        let cpi_accounts = Transfer {
            from: ctx.accounts.prize_vault.to_account_info(),
            to: ctx.accounts.winner_token.to_account_info(),
            authority: ctx.accounts.vault_authority.to_account_info(),
        };
        
        let seeds = &[PRIZE_VAULT_SEED, &[vault.bump]];
        let signer = [&[&seeds[..]]];
        
        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            cpi_accounts,
            &signer,
        );
        token::transfer(cpi_ctx, amount)?;
        
        vault.distributed = true;
        
        msg!("Distributed {} USDC to winner", amount);
        Ok(())
    }

    /// Burn tokens (for game mechanics or penalties)
    pub fn burn_tokens(
        ctx: Context<BurnTokens>,
        amount: u64,
    ) -> Result<()> {
        let cpi_accounts = Burn {
            mint: ctx.accounts.token_mint.to_account_info(),
            from: ctx.accounts.from_token.to_account_info(),
            authority: ctx.accounts.authority.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
        token::burn(cpi_ctx, amount)?;
        
        msg!("Burned {} tokens", amount);
        Ok(())
    }
}

// ═════════════════════════════════════════════════════════════════════════════
// ACCOUNT DERIVATIONS
// ═════════════════════════════════════════════════════════════════════════════

#[derive(Accounts)]
pub struct InitializeTokenConfig<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + size_of::<TokenConfig>(),
        seeds = [b"token_config"],
        bump
    )]
    pub token_config: Account<'info, TokenConfig>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    #[account(
        init,
        payer = authority,
        mint::decimals = 6,
        mint::authority = authority,
    )]
    pub usdc_mint: Account<'info, Mint>,
    
    #[account(
        init,
        payer = authority,
        token::mint = usdc_mint,
        token::authority = treasury,
    )]
    pub treasury: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct MintUsdc<'info> {
    #[account(mut)]
    pub token_config: Account<'info, TokenConfig>,
    
    #[account(mut)]
    pub usdc_mint: Account<'info, Mint>,
    
    #[account(mut)]
    pub mint_authority: Signer<'info>,
    
    #[account(mut)]
    pub recipient: AccountInfo<'info>,
    
    #[account(mut)]
    pub recipient_token_account: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
#[instruction(battle_id: Pubkey)]
pub struct CreatePrizeVault<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + size_of::<PrizeVault>(),
        seeds = [PRIZE_VAULT_SEED, battle_id.as_ref()],
        bump
    )]
    pub prize_vault: Account<'info, PrizeVault>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct DepositPrize<'info> {
    #[account(mut)]
    pub prize_vault: Account<'info, PrizeVault>,
    
    #[account(mut)]
    pub depositor: Signer<'info>,
    
    #[account(mut)]
    pub depositor_token: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct DistributePrize<'info> {
    #[account(mut)]
    pub prize_vault: Account<'info, PrizeVault>,
    
    #[account(mut)]
    pub winner_token: Account<'info, TokenAccount>,
    
    /// PDA that has authority over the vault
    pub vault_authority: AccountInfo<'info>,
    
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct BurnTokens<'info> {
    #[account(mut)]
    pub token_mint: Account<'info, Mint>,
    
    #[account(mut)]
    pub from_token: Account<'info, TokenAccount>,
    
    pub authority: Signer<'info>,
    
    pub token_program: Program<'info, Token>,
}

// ═════════════════════════════════════════════════════════════════════════════
// ERROR CODES
// ═════════════════════════════════════════════════════════════════════════════

#[error_code]
pub enum ErrorCode {
    #[msg("Prize has already been distributed")]
    PrizeAlreadyDistributed,
    
    #[msg("Insufficient funds in prize vault")]
    InsufficientPrizeFunds,
    
    #[msg("Unauthorized to perform this action")]
    Unauthorized,
    
    #[msg("Invalid token amount")]
    InvalidAmount,
}
