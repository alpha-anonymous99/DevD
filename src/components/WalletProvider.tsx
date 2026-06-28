import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { StellarWalletsKit } from "@creit.tech/stellar-wallets-kit";
import { Networks } from "@creit.tech/stellar-wallets-kit/types";
import { FreighterModule } from "@creit.tech/stellar-wallets-kit/modules/freighter";
import { xBullModule } from "@creit.tech/stellar-wallets-kit/modules/xbull";
import { AlbedoModule } from "@creit.tech/stellar-wallets-kit/modules/albedo";
import { Horizon } from "@stellar/stellar-sdk";

interface WalletContextType {
  address: string | null;
  balance: string;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  refreshBalance: () => Promise<void>;
  signTx: (xdr: string) => Promise<string>;
  network: Networks;
  setNetwork: (network: Networks) => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

const getHorizonUrl = (network: Networks) => {
  return network === Networks.PUBLIC
    ? "https://horizon.stellar.org"
    : "https://horizon-testnet.stellar.org";
};

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [address, setAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<string>("0");
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [network, setNetwork] = useState<Networks>(Networks.TESTNET);

  // Initialize the Stellar Wallets Kit static configuration when network changes
  useEffect(() => {
    StellarWalletsKit.init({
      network,
      modules: [
        new FreighterModule(),
        new xBullModule(),
        new AlbedoModule(),
      ],
    });
  }, [network]);

  // Load saved connection on mount
  useEffect(() => {
    const savedAddress = localStorage.getItem("devd_wallet_address");
    const savedNetwork = localStorage.getItem("devd_wallet_network");
    if (savedAddress) {
      setAddress(savedAddress);
    }
    if (savedNetwork) {
      setNetwork(savedNetwork as Networks);
    }
  }, []);

  const refreshBalance = useCallback(async () => {
    if (!address) return;
    try {
      const horizonUrl = getHorizonUrl(network);
      const server = new Horizon.Server(horizonUrl);
      const account = await server.loadAccount(address);
      const nativeBalance = account.balances.find((b) => b.asset_type === "native");
      if (nativeBalance) {
        setBalance(parseFloat(nativeBalance.balance).toFixed(2));
      } else {
        setBalance("0.00");
      }
      setError(null);
    } catch (err: any) {
      console.warn("Could not load wallet balance:", err);
      if (err?.response?.status === 404) {
        setBalance("0.00 (Unfunded)");
        setError("Your wallet is not funded on Testnet yet. Use Stellar Friendbot to fund it.");
      } else {
        setBalance("0.00");
      }
    }
  }, [address, network]);

  // Auto-refresh balance when address or network changes
  useEffect(() => {
    if (address) {
      refreshBalance();
      const interval = setInterval(refreshBalance, 15000);
      return () => clearInterval(interval);
    } else {
      setBalance("0");
    }
  }, [address, refreshBalance]);

  const connect = async () => {
    setIsConnecting(true);
    setError(null);
    try {
      // Connect using the static authModal of the kit
      const result = await StellarWalletsKit.authModal();
      if (!result || !result.address) {
        throw new Error("No public key returned from wallet");
      }
      setAddress(result.address);
      localStorage.setItem("devd_wallet_address", result.address);
      localStorage.setItem("devd_wallet_network", network);
      setError(null);
    } catch (err: any) {
      console.error("Wallet connection failed:", err);
      setError(err.message || "Wallet connection rejected or failed");
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = async () => {
    try {
      await StellarWalletsKit.disconnect();
    } catch (e) {
      console.warn("Error during disconnect:", e);
    }
    setAddress(null);
    setBalance("0");
    setError(null);
    localStorage.removeItem("devd_wallet_address");
    localStorage.removeItem("devd_wallet_network");
  };

  const signTx = async (xdr: string): Promise<string> => {
    if (!address) throw new Error("No wallet connected");

    try {
      const result = await StellarWalletsKit.signTransaction(xdr, {
        networkPassphrase: network,
        address,
      });
      return result.signedTxXdr;
    } catch (err: any) {
      console.error("Signing failed:", err);
      if (err?.message?.includes("User rejected")) {
        throw new Error("Transaction signature rejected by user.");
      }
      throw new Error(err.message || "Failed to sign transaction.");
    }
  };

  return (
    <WalletContext.Provider
      value={{
        address,
        balance,
        isConnected: !!address,
        isConnecting,
        error,
        connect,
        disconnect,
        refreshBalance,
        signTx,
        network,
        setNetwork,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
};
