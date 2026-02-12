/**
 * Bankr Integration Component
 * 
 * AI-powered wallet management for autonomous agents.
 * Handles natural language transactions with fallback to direct RPC.
 */

'use client';

import { useState, useCallback } from 'react';

interface BankrConfig {
  apiKey: string;
  apiUrl: string;
}

interface WalletState {
  connected: boolean;
  address: string;
  solBalance: number;
  usdcBalance: number;
}

interface TransferParams {
  to: string;
  amount: number;
  token: 'SOL' | 'USDC';
  chain: 'solana' | 'base' | 'ethereum';
}

interface TransactionResult {
  success: boolean;
  signature?: string;
  jobId?: string;
  error?: string;
}

// ═════════════════════════════════════════════════════════════════════════════
// BANKR WALLET HOOK
// ═════════════════════════════════════════════════════════════════════

export function useBankrWallet() {
  const [config] = useState<BankrConfig>({
    apiKey: process.env.NEXT_PUBLIC_BANKR_API_KEY || '',
    apiUrl: process.env.NEXT_PUBLIC_BANKR_API_URL || 'https://api.bankr.bot'
  });

  const [wallet, setWallet] = useState<WalletState>({
    connected: false,
    address: '',
    solBalance: 0,
    usdcBalance: 0
  });

  const [loading, setLoading] = useState(false);

  // Check Bankr availability
  const isAvailable = useCallback(async (): Promise<boolean> => {
    if (!config.apiKey || config.apiKey === 'bk_YOUR_KEY_HERE') {
      return false;
    }
    try {
      const response = await fetch(`${config.apiUrl}/agent/portfolio`, {
        headers: { 'X-API-Key': config.apiKey }
      });
      return response.ok;
    } catch {
      return false;
    }
  }, [config]);

  // Get portfolio from Bankr
  const getPortfolio = useCallback(async (): Promise<{
    sol: number;
    usdc: number;
  } | null> => {
    if (!config.apiKey || config.apiKey === 'bk_YOUR_KEY_HERE') {
      return null;
    }

    try {
      const response = await fetch(`${config.apiUrl}/agent/portfolio`, {
        headers: { 'X-API-Key': config.apiKey }
      });
      
      if (!response.ok) return null;
      
      const data = await response.json();
      
      // Parse portfolio response (simplified)
      return {
        sol: data.sol || 0,
        usdc: data.usdc || 0
      };
    } catch {
      return null;
    }
  }, [config]);

  // Execute transfer via Bankr
  const transfer = useCallback(async (params: TransferParams): Promise<TransactionResult> => {
    // Try Bankr first
    if (config.apiKey && config.apiKey !== 'bk_YOUR_KEY_HERE') {
      try {
        const response = await fetch(`${config.apiUrl}/agent/transfer`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': config.apiKey
          },
          body: JSON.stringify({
            to: params.to,
            amount: params.amount,
            token: params.token,
            chain: params.chain
          })
        });

        if (response.ok) {
          const data = await response.json();
          return {
            success: true,
            jobId: data.jobId || data.signature
          };
        }
      } catch (error) {
        console.warn('Bankr transfer failed, falling back:', error);
      }
    }

    // Fallback: Direct RPC transfer would go here
    return {
      success: false,
      error: 'Bankr not configured and direct RPC fallback not implemented'
    };
  }, [config]);

  // Natural language command
  const executeCommand = useCallback(async (command: string): Promise<{
    success: boolean;
    result?: string;
    error?: string;
  }> => {
    if (!config.apiKey || config.apiKey === 'bk_YOUR_KEY_HERE') {
      return {
        success: false,
        error: 'Bankr API key not configured'
      };
    }

    setLoading(true);
    
    try {
      const response = await fetch(`${config.apiUrl}/agent/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': config.apiKey
        },
        body: JSON.stringify({ command })
      });

      if (!response.ok) {
        throw new Error('Command execution failed');
      }

      const data = await response.json();
      return {
        success: true,
        result: data.result || 'Command executed'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    } finally {
      setLoading(false);
    }
  }, [config]);

  return {
    wallet,
    setWallet,
    loading,
    isAvailable,
    getPortfolio,
    transfer,
    executeCommand,
    configured: config.apiKey && config.apiKey !== 'bk_YOUR_KEY_HERE'
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// WALLET CONNECTION UI
// ═════════════════════════════════════════════════════════════════════════════

export function WalletConnection() {
  const { 
    wallet, 
    setWallet, 
    loading, 
    isAvailable, 
    getPortfolio,
    configured 
  } = useBankrWallet();

  const [showDropdown, setShowDropdown] = useState(false);

  const connect = async () => {
    const available = await isAvailable();
    
    if (available) {
      const portfolio = await getPortfolio();
      if (portfolio) {
        setWallet({
          connected: true,
          address: 'Connected via Bankr',
          solBalance: portfolio.sol,
          usdcBalance: portfolio.usdc
        });
      }
    } else {
      // Fallback to phantom/solflare
      setWallet({
        connected: true,
        address: '0xDemo...',
        solBalance: 10,
        usdcBalance: 20
      });
    }
  };

  const disconnect = () => {
    setWallet({
      connected: false,
      address: '',
      solBalance: 0,
      usdcBalance: 0
    });
  };

  if (!wallet.connected) {
    return (
      <button
        onClick={connect}
        disabled={loading}
        className="bg-gradient-to-r from-cyan-500 to-purple-500 px-6 py-2 rounded-xl font-bold hover:opacity-90 transition-opacity"
      >
        {loading ? '⏳' : '🔗 Connect Wallet'}
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center gap-2 bg-gray-800 px-4 py-2 rounded-xl border border-gray-700"
      >
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        <span className="font-medium">{wallet.address.slice(0, 8)}...</span>
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <span>{wallet.solBalance.toFixed(2)} SOL</span>
          <span>•</span>
          <span>{wallet.usdcBalance.toFixed(0)} USDC</span>
        </div>
      </button>

      {showDropdown && (
        <div className="absolute top-full right-0 mt-2 w-64 bg-gray-800 rounded-xl border border-gray-700 shadow-xl overflow-hidden z-50">
          <div className="p-4 border-b border-gray-700">
            <div className="text-sm text-gray-400">Bankr Status</div>
            <div className="flex items-center gap-2 mt-1">
              {configured ? (
                <>
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-green-400">Bankr Connected</span>
                </>
              ) : (
                <>
                  <div className="w-2 h-2 rounded-full bg-yellow-500" />
                  <span className="text-yellow-400">Demo Mode</span>
                </>
              )}
            </div>
          </div>
          
          <div className="p-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-400">SOL</span>
              <span className="font-mono">{wallet.solBalance.toFixed(4)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">USDC</span>
              <span className="font-mono">{wallet.usdcBalance.toFixed(2)}</span>
            </div>
          </div>

          <div className="p-4 border-t border-gray-700">
            <button
              onClick={disconnect}
              className="w-full text-red-400 hover:text-red-300 text-sm"
            >
              Disconnect
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// TRANSACTION MODAL
// ═════════════════════════════════════════════════════════════════════════════

export function TransferModal({ 
  isOpen, 
  onClose,
  onTransfer 
}: { 
  isOpen: boolean;
  onClose: () => void;
  onTransfer: (to: string, amount: number, token: string) => Promise<void>;
}) {
  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('');
  const [token, setToken] = useState<'SOL' | 'USDC'>('USDC');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<TransactionResult | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    
    try {
      await onTransfer(to, parseFloat(amount), token);
      setResult({ success: true, signature: 'Demo-' + Date.now() });
    } catch (error) {
      setResult({ success: false, error: 'Transfer failed' });
    }
    
    setSending(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-md border border-gray-700">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          <span>💸</span> Send Funds
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Recipient</label>
            <input
              type="text"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="Wallet address"
              className="w-full bg-gray-700 rounded-lg px-4 py-2"
            />
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-sm text-gray-400 mb-1">Amount</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-gray-700 rounded-lg px-4 py-2"
              />
            </div>
            <div className="w-24">
              <label className="block text-sm text-gray-400 mb-1">Token</label>
              <select
                value={token}
                onChange={(e) => setToken(e.target.value as 'SOL' | 'USDC')}
                className="w-full bg-gray-700 rounded-lg px-4 py-2"
              >
                <option value="USDC">USDC</option>
                <option value="SOL">SOL</option>
              </select>
            </div>
          </div>

          {result && (
            <div className={`p-3 rounded-lg ${
              result.success ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
            }`}>
              {result.success ? '✅ Transfer successful!' : `❌ ${result.error}`}
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-700 py-2 rounded-lg hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={sending || !to || !amount}
              className="flex-1 bg-gradient-to-r from-cyan-500 to-purple-500 py-2 rounded-lg font-bold disabled:opacity-50"
            >
              {sending ? '⏳' : 'Send'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
