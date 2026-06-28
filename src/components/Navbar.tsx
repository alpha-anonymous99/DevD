import React, { useState } from "react";
import { useWallet } from "./WalletProvider";
import { Wallet, LogOut, RefreshCw, Layers } from "lucide-react";

export const Navbar: React.FC = () => {
  const { address, balance, isConnected, isConnecting, connect, disconnect, refreshBalance, network } = useWallet();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshBalance();
    setTimeout(() => setIsRefreshing(false), 800);
  };

  const truncateAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <nav className="glass-panel sticky top-0 z-50 px-6 py-4 flex items-center justify-between border-b border-white/5 shadow-2xl backdrop-blur-md">
      {/* Logo */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl shadow-lg shadow-purple-500/20">
          <Layers className="w-6 h-6 text-white" />
        </div>
        <div>
          <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-white via-gray-100 to-gray-400 bg-clip-text text-transparent">
            DevD
          </span>
          <span className="ml-1.5 text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
            {network.toLowerCase()}
          </span>
        </div>
      </div>

      {/* Wallet Connection */}
      <div className="flex items-center gap-4">
        {isConnected && address ? (
          <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl p-1.5 pl-4 shadow-inner">
            {/* Balance */}
            <div className="flex items-center gap-2 pr-2 border-r border-white/10">
              <span className="text-gray-400 text-xs font-medium">Balance:</span>
              <span className="font-semibold text-sm text-purple-300 font-mono">
                {balance} XLM
              </span>
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className={`p-1 hover:bg-white/5 rounded-lg transition text-gray-400 hover:text-white ${
                  isRefreshing ? "animate-spin" : ""
                }`}
                title="Refresh balance"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Address */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-200 font-mono">
                {truncateAddress(address)}
              </span>
              <button
                onClick={disconnect}
                className="p-2 hover:bg-red-500/10 text-gray-400 hover:text-red-400 rounded-xl transition-colors"
                title="Disconnect Wallet"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={connect}
            disabled={isConnecting}
            className="glass-btn-primary px-5 py-2.5 rounded-2xl flex items-center gap-2 text-sm font-semibold text-white cursor-pointer disabled:opacity-50"
          >
            <Wallet className="w-4 h-4" />
            {isConnecting ? "Connecting..." : "Connect Wallet"}
          </button>
        )}
      </div>
    </nav>
  );
};
