import React from "react";
import { WalletProvider, useWallet } from "./components/WalletProvider";
import { ContractProvider, useContract } from "./components/ContractProvider";
import { Navbar } from "./components/Navbar";
import { Dashboard } from "./components/Dashboard";
import { GroupDetails } from "./components/GroupDetails";
import {
  Wallet,
  TrendingUp,
  Shield,
  Shuffle,
  Activity,
  Layers,
  ArrowRight,
} from "lucide-react";

// Inner application switcher
const AppContent: React.FC = () => {
  const { isConnected, connect, isConnecting } = useWallet();
  const { activeGroupDetails } = useContract();

  if (!isConnected) {
    return (
      <div className="min-h-screen flex flex-col bg-[#030712]">
        {/* Simple Landing Navbar */}
        <header className="px-6 py-4 flex items-center justify-between border-b border-white/5 bg-transparent max-w-7xl mx-auto w-full">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
              DevD
            </span>
          </div>
          <button
            onClick={connect}
            disabled={isConnecting}
            className="glass-btn-primary px-4 py-2 rounded-xl text-xs font-semibold text-white flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Wallet className="w-3.5 h-3.5" />
            {isConnecting ? "Connecting..." : "Connect"}
          </button>
        </header>

        {/* Hero Section */}
        <main className="flex-1 flex flex-col items-center justify-center px-6 py-12 text-center max-w-5xl mx-auto space-y-12">
          <div className="space-y-4">
            <span className="text-[10px] uppercase font-extrabold tracking-widest px-3 py-1 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
              Splitwise × Stellar × Web3
            </span>
            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-400 leading-tight max-w-3xl">
              Modern expense sharing for developer squads.
            </h1>
            <p className="text-gray-400 text-sm sm:text-md max-w-xl mx-auto leading-relaxed">
              Log hackathon expenses, server bills, and startup subscriptions. Settle debts instantly on-chain using XLM on Stellar Testnet.
            </p>
          </div>

          <div className="flex items-center justify-center">
            <button
              onClick={connect}
              disabled={isConnecting}
              className="glass-btn-primary px-6 py-3.5 rounded-2xl flex items-center gap-2 text-sm font-semibold text-white cursor-pointer hover:scale-[1.02] active:scale-100 transition disabled:opacity-50"
            >
              <Wallet className="w-4 h-4" />
              {isConnecting ? "Connecting to Freighter..." : "Connect Freighter Wallet"}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full pt-8">
            <div className="glass-panel p-6 rounded-3xl text-left space-y-3 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-16 h-16 bg-purple-500/5 rounded-full blur-xl group-hover:bg-purple-500/10 transition-colors" />
              <div className="p-2 bg-purple-500/10 border border-purple-500/20 rounded-xl text-purple-400 w-fit">
                <TrendingUp className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-gray-200 text-sm">Instant Payments</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Send XLM directly from the app. No manual transfers or bank details required.
              </p>
            </div>

            <div className="glass-panel p-6 rounded-3xl text-left space-y-3 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-500/5 rounded-full blur-xl group-hover:bg-indigo-500/10 transition-colors" />
              <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400 w-fit">
                <Shield className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-gray-200 text-sm">Secure Ledger</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Expenses and settlements are permanently logged on the Stellar Testnet smart contract.
              </p>
            </div>

            <div className="glass-panel p-6 rounded-3xl text-left space-y-3 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/5 rounded-full blur-xl group-hover:bg-blue-500/10 transition-colors" />
              <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400 w-fit">
                <Shuffle className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-gray-200 text-sm">Debt Consolidation</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Minimize required transfers. DevD automatically calculates the optimal settlement graph.
              </p>
            </div>

            <div className="glass-panel p-6 rounded-3xl text-left space-y-3 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-16 h-16 bg-pink-500/5 rounded-full blur-xl group-hover:bg-pink-500/10 transition-colors" />
              <div className="p-2 bg-pink-500/10 border border-pink-500/20 rounded-xl text-pink-400 w-fit">
                <Activity className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-gray-200 text-sm">Real-time Events</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Background listeners pick up smart contract events to sync dashboard data instantly.
              </p>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="py-8 border-t border-white/5 text-center text-xs text-gray-500">
          © {new Date().getFullYear()} DevD. Built on Stellar Soroban Testnet.
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#030712]">
      <Navbar />
      {activeGroupDetails ? <GroupDetails /> : <Dashboard />}
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <WalletProvider>
      <ContractProvider>
        <AppContent />
      </ContractProvider>
    </WalletProvider>
  );
};

export default App;
