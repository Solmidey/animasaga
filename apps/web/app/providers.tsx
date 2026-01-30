"use client";

import "@rainbow-me/rainbowkit/styles.css";

import { ReactNode, useMemo, useState } from "react";
import { RainbowKitProvider, darkTheme, connectorsForWallets } from "@rainbow-me/rainbowkit";
import { injectedWallet, coinbaseWallet, walletConnectWallet } from "@rainbow-me/rainbowkit/wallets";

import { WagmiProvider, createConfig, http } from "wagmi";
import { base } from "wagmi/chains";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const APP_NAME = "AnimaSaga";
const BASE_RPC =
  process.env.NEXT_PUBLIC_BASE_RPC_URL ||
  process.env.NEXT_PUBLIC_RPC_URL ||
  "https://base-rpc.publicnode.com";

const WC_PROJECT_ID = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "00000000000000000000000000000000";

export default function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  const config = useMemo(() => {
    const connectors = connectorsForWallets(
      [
        {
          groupName: "Elyndra",
          // IMPORTANT (RainbowKit 2.2.10): pass wallet functions, do NOT invoke them.
          wallets: [injectedWallet, coinbaseWallet, walletConnectWallet],
        },
      ],
      {
        appName: APP_NAME,
        projectId: WC_PROJECT_ID,
      }
    );

    return createConfig({
      chains: [base],
      connectors,
      transports: {
        [base.id]: http(BASE_RPC),
      },
      ssr: true,
    });
  }, []);

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: "#e5e7eb",
            accentColorForeground: "#000000",
            borderRadius: "medium",
          })}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
