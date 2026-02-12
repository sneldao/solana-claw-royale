/**
 * Claw Royale Token Management - Integration Tests
 */

import * as anchor from '@coral-xyz/anchor';
import { PublicKey, Keypair, SystemProgram } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';

describe('token-management', () => {
  // Configure the client to use the local cluster
  anchor.setAnchorProvider(anchor.AnchorProvider.local('http://127.0.0.1:8899'));
  
  const program = anchor.workspace.TokenManagement as anchor.Program;
  const provider = anchor.getProvider();
  
  const authority = Keypair.generate();
  const recipient = Keypair.generate();
  
  let usdcMint: PublicKey;
  let treasury: PublicKey;
  let tokenConfig: PublicKey;
  
  before(async () => {
    // Airdrop SOL to authority
    await provider.connection.requestAirdrop(authority.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL);
    
    // Derive PDA for token config
    [tokenConfig] = await PublicKey.findProgramAddress(
      [Buffer.from('token_config')],
      program.programId
    );
  });
  
  it('Initialize token config', async () => {
    // Create mint account
    const mintKeypair = Keypair.generate();
    usdcMint = mintKeypair.publicKey;
    
    // Create treasury token account
    treasury = await anchor.utils.token.associatedAddress({
      mint: usdcMint,
      owner: authority.publicKey,
    });
    
    const tx = await program.methods
      .initializeTokenConfig(usdcMint)
      .accounts({
        tokenConfig,
        authority: authority.publicKey,
        usdcMint: mintKeypair.publicKey,
        treasury,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([authority, mintKeypair])
      .rpc();
    
    console.log('Token config initialized. Transaction:', tx);
    
    // Fetch and verify
    const config = await program.account.tokenConfig.fetch(tokenConfig);
    assert.equal(config.authority.toString(), authority.publicKey.toString());
    assert.equal(config.usdcMInt.toString(), usdcMint.toString());
  });
  
  it('Mint USDC tokens', async () => {
    // Create recipient token account
    const recipientToken = await anchor.utils.token.associatedAddress({
      mint: usdcMint,
      owner: recipient.publicKey,
    });
    
    const amount = new anchor.BN(1_000_000); // 1 USDC
    
    const tx = await program.methods
      .mintUsdc(amount)
      .accounts({
        tokenConfig,
        usdcMint,
        mintAuthority: authority.publicKey,
        recipient: recipient.publicKey,
        recipientTokenAccount: recipientToken,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([authority])
      .rpc();
    
    console.log('Minted USDC. Transaction:', tx);
    
    // Verify balance
    const balance = await provider.connection.getTokenAccountBalance(recipientToken);
    assert.equal(balance.value.uiAmountString, '1');
  });
  
  it('Create prize vault', async () => {
    const battleId = Keypair.generate().publicKey;
    
    const [prizeVault] = await PublicKey.findProgramAddress(
      [Buffer.from('prize_vault'), battleId.toBuffer()],
      program.programId
    );
    
    const tx = await program.methods
      .createPrizeVault(battleId)
      .accounts({
        prizeVault,
        authority: authority.publicKey,
        systemProgram: SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([authority])
      .rpc();
    
    console.log('Prize vault created. Transaction:', tx);
    
    // Verify
    const vault = await program.account.prizeVault.fetch(prizeVault);
    assert.equal(vault.battle.toString(), battleId.toString());
    assert.equal(vault.amount.toNumber(), 0);
    assert.equal(vault.distributed, false);
  });
  
  it('Deposit and distribute prize', async () => {
    const battleId = Keypair.generate().publicKey;
    
    // Create prize vault
    const [prizeVault] = await PublicKey.findProgramAddress(
      [Buffer.from('prize_vault'), battleId.toBuffer()],
      program.programId
    );
    
    // Create prize vault token account
    const prizeVaultToken = await anchor.utils.token.associatedAddress({
      mint: usdcMint,
      owner: prizeVault,
    });
    
    await program.methods
      .createPrizeVault(battleId)
      .accounts({
        prizeVault,
        authority: authority.publicKey,
        systemProgram: SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([authority])
      .rpc();
    
    // Create recipient token account for winner
    const winner = Keypair.generate();
    const winnerToken = await anchor.utils.token.associatedAddress({
      mint: usdcMint,
      owner: winner.publicKey,
    });
    
    // Get vault authority PDA
    const [vaultAuthority] = await PublicKey.findProgramAddress(
      [Buffer.from('prize_vault')],
      program.programId
    );
    
    // Deposit prize
    await program.methods
      .depositPrize(new anchor.BN(500_000))
      .accounts({
        prizeVault,
        depositor: authority.publicKey,
        depositorToken: treasury,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([authority])
      .rpc();
    
    // Distribute prize
    await program.methods
      .distributePrize(new anchor.BN(500_000))
      .accounts({
        prizeVault,
        winnerToken,
        vaultAuthority,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();
    
    // Verify
    const vault = await program.account.prizeVault.fetch(prizeVault);
    assert.equal(vault.distributed, true);
  });
});
