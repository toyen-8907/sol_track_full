import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';

const WalletDetails = () => {
  const { address } = useParams();
  const [balance, setBalance] = useState(0);
  const [percentageChange, setPercentageChange] = useState(null);
  const [splBalances, setSplBalances] = useState([]);
  const wsRef = useRef(null); // 用于存储 WebSocket 实例

  // 初始加载 SOL 和 SPL 代币余额
  useEffect(() => {
    const fetchBalances = async () => {
      try {
        const solResponse = await fetch(`http://localhost:5001/solBalance/${address}`);
        const solData = await solResponse.json();
        setBalance(solData.balance);

        const splResponse = await fetch(`http://localhost:5001/splBalances/${address}`);
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

  // WebSocket 连接和监听
  useEffect(() => {
    // 初始化 WebSocket 连接
    wsRef.current = new WebSocket('ws://localhost:5001/ws');

    wsRef.current.onopen = () => {
      console.log('WebSocket 已连接');
      // 订阅当前钱包地址
      wsRef.current.send(JSON.stringify({ action: 'subscribe', accounts: [address] }));
    };

    wsRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'solBalance') {
        handleSolBalanceReceived(data.balance);
      } else if (data.type === 'splBalances') {
        handleSPLBalancesReceived(data.balances);
      }
    };

    wsRef.current.onclose = () => {
      console.log('WebSocket 已断开');
    };

    wsRef.current.onerror = (error) => {
      console.error('WebSocket 发生错误:', error);
    };

    // 页面卸载时断开 WebSocket 连接
    return () => {
      if (wsRef.current) {
        wsRef.current.close(); // 主动断开连接
        wsRef.current = null; // 清除引用
      }
    };
  }, [address]);

  // 处理从 WebSocket 接收到的新 SOL 余额
  const handleSolBalanceReceived = useCallback((newBalance) => {
    if (balance !== null && balance !== 0) {
      const change = ((newBalance - balance) / balance) * 100;
      setPercentageChange(change.toFixed(2));
    }
    setBalance(newBalance);
  }, [balance]);

  // 处理从 WebSocket 接收到的新 SPL 代币余额
  const handleSPLBalancesReceived = useCallback((receivedBalances) => {
    const nonZeroBalances = Array.isArray(receivedBalances) ?
      receivedBalances.filter(token => parseFloat(token.balance) > 0) :
      [];
    setSplBalances(nonZeroBalances);
  }, []);

  return (
    <div className="wallet-details">
      <h2>錢包詳細資訊</h2>
      <p>地址: {address}</p>

      <div className="balance-info">
        <h3>餘額: {balance} $SOL</h3>
        {percentageChange !== null && (
          <h4 style={{ color: percentageChange > 0 ? 'green' : 'red' }}>
            漲跌: {percentageChange}%
          </h4>
        )}
      </div>

      {/* SPL 代币余额列表 */}
      <div className="token-grid">
        {splBalances.length > 0 ? (
          splBalances.map((token, index) => (
            <div key={index} className="token-item">
              <p>TOKEN 合约地址: {token.mint.slice(0, 7)}...{token.mint.slice(-7)}</p>
              <p>钱包余额: {parseFloat(token.balance).toFixed(4)}</p>
            </div>
          ))
        ) : (
          <p>此钱包没有持有任何 SPL 代币。</p>
        )}
      </div>
    </div>
  );
};

export default WalletDetails;
