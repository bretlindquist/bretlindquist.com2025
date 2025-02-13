"use client";

import React, { useEffect, useRef } from "react";

// A reusable component that creates a TradingView widget
interface TradingViewWidgetProps {
  containerId: string;
  symbol: string;
}

const TradingViewWidget: React.FC<TradingViewWidgetProps> = ({
  containerId,
  symbol,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Create the TradingView script tag only once per widget
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/tv.js";
    script.async = true;
    script.onload = () => {
      // @ts-ignore
      new TradingView.widget({
        width: "100%",
        height: "400",
        symbol: symbol,
        interval: "D",
        timezone: "Etc/UTC",
        theme: "dark",
        style: "1",
        locale: "en",
        toolbar_bg: "#f1f3f6",
        enable_publishing: false,
        allow_symbol_change: true,
        container_id: containerId,
      });
    };

    if (containerRef.current) {
      containerRef.current.innerHTML = ""; // Clear any existing content
      containerRef.current.appendChild(script);
    }
  }, [containerId, symbol]);

  return <div id={containerId} ref={containerRef} className="tradingview-widget-container" />;
};

export default function KChartsPage() {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="py-8 text-center">
        <h1 className="text-3xl font-bold">Korean Economy Dashboard</h1>
        <p className="mt-2 text-lg">
          (Access this page by typing the URL manually, e.g. <code>/kcharts</code>)
        </p>
      </header>
      <main className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <section>
            <h2 className="text-xl font-semibold mb-4">KOSPI Composite Index</h2>
            <TradingViewWidget containerId="tradingview_kospi" symbol="KRX:KOSPI" />
          </section>
          <section>
            <h2 className="text-xl font-semibold mb-4">Interest Rate</h2>
            <TradingViewWidget containerId="tradingview_interest" symbol="ECONOMICS:KRINTR" />
          </section>
          <section>
            <h2 className="text-xl font-semibold mb-4">Korean CPI (Household Costs)</h2>
            <TradingViewWidget containerId="tradingview_cpi" symbol="ECONOMICS:KRCPI" />
          </section>
          <section>
            <h2 className="text-xl font-semibold mb-4">Unemployment Rate</h2>
            <TradingViewWidget containerId="tradingview_unemployment" symbol="ECONOMICS:KRUR" />
          </section>
          <section className="md:col-span-2">
            <h2 className="text-xl font-semibold mb-4">Housing (Real Estate)</h2>
            <TradingViewWidget containerId="tradingview_housing" symbol="ECONOMICS:KRHPI" />
          </section>
        </div>
      </main>
    </div>
  );
}
