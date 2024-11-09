// App.js

import React, { useState, useCallback, useEffect } from 'react';
import './App.css';
import WebSocketComponent from './WebSocketComponent';

const App = () => {
  const [solBalance, setSolBalance] = useState(null);
  const [previousBalance, setPreviousBalance] = useState(null);
  const [percentageChange, setPercentageChange] = useState(null);
  const [splBalances, setSplBalances] = useState([]);

  // 要监控的账户地址
  const account = "GShiMwUiqpWfxyVxVnYo96upwQekeFVNrtMQT4aSH2RT";

  // 从后端获取初始余额
  useEffect(() => {
    const fetchBalances = async () => {
      try {
        const solResponse = await fetch(`/solBalance/${account}`);
        const solData = await solResponse.json();
        setSolBalance(solData.balance);
        setPreviousBalance(solData.balance);

        const splResponse = await fetch(`/splBalances/${account}`);
        const splData = await splResponse.json();
        setSplBalances(splData.filter(token => parseFloat(token.balance) > 0));
      } catch (error) {
        console.error('获取初始余额时出错:', error);
      }
    };

    fetchBalances();
  }, [account]);

  // 处理从 WebSocket 接收到的新 SOL 余额
  const handleSolBalanceReceived = useCallback((balance) => {
    if (previousBalance !== null) {
      const change = ((balance - previousBalance) / previousBalance) * 100;
      setPercentageChange(change.toFixed(2));
    }
    setPreviousBalance(balance);
    setSolBalance(balance);
  }, [previousBalance]);

  // 处理从 WebSocket 接收到的新的 SPL 代币余额
  const handleSPLBalancesReceived = useCallback((balances) => {
    const nonZeroBalances = balances.filter(token => parseFloat(token.balance) > 0);
    setSplBalances(nonZeroBalances);
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <h2>Solana 账户监控</h2>
      </header>
      {/* 引入 WebSocketComponent，并传递必要的属性 */}
      <WebSocketComponent
        account={account}
        onSolBalanceReceived={handleSolBalanceReceived}
        onSPLBalancesReceived={handleSPLBalancesReceived}
      />
      {/* 主体内容 */}
      <div className='dashboard-co'>
        {/* 显示账户地址 */}
        <h2>{account}:</h2>
        <div className='dashboard-bottom-container'>
          {/* 左侧：SOL 余额 */}
          <div className='dashboard_left'>
            <h3>余额: {solBalance} $SOL</h3>
            {percentageChange !== null && (
              <h4 style={{ color: percentageChange > 0 ? 'green' : 'red' }}>
                涨跌: {percentageChange}%
              </h4>
            )}
          </div>
          {/* 右侧：SPL 代币余额 */}
          <div className='dashboard_right'>
            <div className="token-grid">
              {splBalances.map((token, index) => (
                <div key={index} className="token-item" onClick={() => navigator.clipboard.writeText(token.mint)}>
                  <p>TOKEN 合约地址: {token.mint.slice(0, 7)}...{token.mint.slice(-7)}</p>
                  <p>钱包余额: {parseFloat(token.balance).toFixed(4)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
