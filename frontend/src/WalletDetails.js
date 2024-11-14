// WalletDetails.js

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import WebSocketComponent from './WebSocketComponent';

const WalletDetails = () => {
  const { address } = useParams();
  const [balance, setBalance] = useState(0);
  const [percentageChange, setPercentageChange] = useState(null);
  const [splBalances, setSplBalances] = useState([]);

  // 初始加載 SOL 和 SPL 代幣餘額
  useEffect(() => {
    const fetchBalances = async () => {
      try {
        const solResponse = await fetch(`/solBalance/${address}`);
        const solData = await solResponse.json();
        setBalance(solData.balance);

        const splResponse = await fetch(`/splBalances/${address}`);
        const splData = await splResponse.json();

        if (Array.isArray(splData)) {
          const nonZeroBalances = splData.filter(token => parseFloat(token.balance) > 0);
          setSplBalances(nonZeroBalances);
        } else {
          console.error(`Expected an array but received: ${splData}`);
          setSplBalances([]);
        }
      } catch (error) {
        console.error('取得餘額時出錯:', error);
      }
    };

    fetchBalances();
  }, [address]);

  // 處理從 WebSocket 接收到的新 SOL 餘額
  const handleSolBalanceReceived = useCallback((newBalance) => {
    if (balance !== null && balance !== 0) {
      const change = ((newBalance - balance) / balance) * 100;
      setPercentageChange(change.toFixed(2));
    }
    setBalance(newBalance);
  }, [balance]);

  // 處理從 WebSocket 接收到的新的 SPL 代幣餘額
  const handleSPLBalancesReceived = useCallback((receivedBalances) => {
    console.log('通過 WebSocket 接收到的 SPL 代幣數據:', receivedBalances);
    const nonZeroBalances = Array.isArray(receivedBalances) ?
      receivedBalances.filter(token => parseFloat(token.balance) > 0) :
      [];
    setSplBalances(nonZeroBalances);
  }, []);

  return (
    <div className="wallet-details">
      <h2>錢包詳細資訊</h2>
      <p>地址: {address}</p>

      {/* 引入 WebSocketComponent，接收實時更新 */}
      <WebSocketComponent
        account={address}
        onSolBalanceReceived={handleSolBalanceReceived}
        onSPLBalancesReceived={handleSPLBalancesReceived}
      />

      <div className="balance-info">
        <h3>餘額: {balance} $SOL</h3>
        {percentageChange !== null && (
          <h4 style={{ color: percentageChange > 0 ? 'green' : 'red' }}>
            漲跌: {percentageChange}%
          </h4>
        )}
      </div>

      {/* SPL 代幣餘額列表 */}
      <div className="token-grid">
        {splBalances.length > 0 ? (
          splBalances.map((token, index) => (
            <div key={index} className="token-item">
              <p>TOKEN 合約地址: {token.mint.slice(0, 7)}...{token.mint.slice(-7)}</p>
              <p>錢包餘額: {parseFloat(token.balance).toFixed(4)}</p>
            </div>
          ))
        ) : (
          <p>此錢包沒有持有任何 SPL 代幣。</p>
        )}
      </div>
    </div>
  );
};

export default WalletDetails;
