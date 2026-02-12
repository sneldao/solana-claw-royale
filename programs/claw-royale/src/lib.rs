// Claw Royale - Minimal Solana Contract
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

declare_id!("5B9rGKGUNvBquNAVqSeEsZmkLrvXEZDEtDU5qAV1JZSW");

const MIN_BET: u64 = 1_000_000; // 1 USDC

#[account]
pub struct Game {
    pub authority: Pubkey,
    pub treasury: Pubkey,
    pub usdc_mint: Pubkey,
    pub battle_count: u64,
    pub total_volume: u64,
}

#[account]
pub struct Agent {
    pub owner: Pubkey,
    pub name: String,
    pub wins: u32,
    pub losses: u32,
    pub earnings: u64,
}

#[account]
pub struct Battle {
    pub game: Pubkey,
    pub agent_a: Pubkey,
    pub agent_b: Pubkey,
    pub bet_amount: u64,
    pub prize_pool: u64,
    pub winner: Option<Pubkey>,
    pub status: u8, // 0=open, 1=active, 2=completed
    pub start_time: i64,
}

#[program]
pub mod claw_royale {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, usdc_mint: Pubkey) -> Result<()> {
        let game = &mut ctx.accounts.game;
        game.authority = ctx.accounts.authority.key();
        game.treasury = ctx.accounts.treasury.key();
        game.usdc_mint = usdc_mint;
        game.battle_count = 0;
        game.total_volume = 0;
        Ok(())
    }

    pub fn register_agent(ctx: Context<RegisterAgent>, name: String) -> Result<()> {
        let agent = &mut ctx.accounts.agent;
        agent.owner = ctx.accounts.owner.key();
        agent.name = name;
        agent.wins = 0;
        agent.losses = 0;
        agent.earnings = 0;
        Ok(())
    }

    pub fn create_battle(ctx: Context<CreateBattle>, bet_amount: u64) -> Result<()> {
        require!(bet_amount >= MIN_BET, ErrorCode::BetTooSmall);
        
        let game = &ctx.accounts.game;
        let battle = &mut ctx.accounts.battle;
        
        battle.game = game.key();
        battle.agent_a = ctx.accounts.agent_a.key();
        battle.agent_b = Pubkey::default();
        battle.bet_amount = bet_amount;
        battle.prize_pool = bet_amount * 2;
        battle.winner = None;
        battle.status = 0; // open
        battle.start_time = Clock::get()?.unix_timestamp;
        
        // Transfer bet to treasury
        let cpi = Transfer {
            from: ctx.accounts.agent_a_token.to_account_info(),
            to: ctx.accounts.treasury.to_account_info(),
            authority: ctx.accounts.agent_a_owner.to_account_info(),
        };
        token::transfer(CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi), bet_amount)?;
        
        Ok(())
    }

    pub fn join_battle(ctx: Context<JoinBattle>) -> Result<()> {
        let battle = &mut ctx.accounts.battle;
        require!(battle.status == 0, ErrorCode::NotOpen);
        require!(battle.agent_b == Pubkey::default(), ErrorCode::Full);
        
        // Transfer bet
        let cpi = Transfer {
            from: ctx.accounts.agent_b_token.to_account_info(),
            to: ctx.accounts.treasury.to_account_info(),
            authority: ctx.accounts.agent_b_owner.to_account_info(),
        };
        token::transfer(CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi), battle.bet_amount)?;
        
        battle.agent_b = ctx.accounts.agent_b.key();
        battle.status = 1; // active
        
        Ok(())
    }

    pub fn resolve_battle(ctx: Context<ResolveBattle>, winner: Pubkey) -> Result<()> {
        let battle = &mut ctx.accounts.battle;
        require!(battle.status == 1, ErrorCode::NotActive);
        
        let total = battle.prize_pool;
        let fee = total / 100 / 2; // 0.5%
        let prize = total - fee;
        
        battle.winner = Some(winner);
        battle.status = 2; // completed
        
        // Transfer prize (simplified - would need PDA signer in production)
        msg!("Battle resolved! Winner: {}, Prize: {}", winner, prize);
        
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, payer = authority, space = 8 + 64)]
    pub game: Account<'info, Game>,
    #[account(init, payer = authority, token::mint = usdc_mint, token::authority = game)]
    pub treasury: Account<'info, TokenAccount>,
    pub usdc_mint: Account<'info, token::Mint>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RegisterAgent<'info> {
    #[account(mut)]
    pub game: Account<'info, Game>,
    #[account(init, payer = owner, space = 8 + 32 + 32 + 4 + 64)]
    pub agent: Account<'info, Agent>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CreateBattle<'info> {
    #[account(mut)]
    pub game: Account<'info, Game>,
    #[account(init, payer = agent_a_owner, space = 8 + 32 + 32 + 32 + 8 + 8 + 4 + 8 + 8)]
    pub battle: Account<'info, Battle>,
    pub agent_a: Account<'info, Agent>,
    #[account(mut)]
    pub agent_a_owner: Signer<'info>,
    #[account(mut)]
    pub agent_a_token: Account<'info, TokenAccount>,
    #[account(mut)]
    pub treasury: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct JoinBattle<'info> {
    #[account(mut)]
    pub battle: Account<'info, Battle>,
    pub agent_b: Account<'info, Agent>,
    #[account(mut)]
    pub agent_b_owner: Signer<'info>,
    #[account(mut)]
    pub agent_b_token: Account<'info, TokenAccount>,
    #[account(mut)]
    pub treasury: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct ResolveBattle<'info> {
    #[account(mut)]
    pub battle: Account<'info, Battle>,
    #[account(mut)]
    pub treasury: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Bet too small")]
    BetTooSmall,
    #[msg("Battle not open")]
    NotOpen,
    #[msg("Battle full")]
    Full,
    #[msg("Battle not active")]
    NotActive,
}
