import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './App.css';
import WebSocketComponent from './WebSocketComponent';

const Home = () => {
  const [accounts, setAccounts] = useState([
    "GShiMwUiqpWfxyVxVnYo96upwQekeFVNrtMQT4aSH2RT",
    "CRVidEDtEUTYZisCxBZkpELzhQc9eauMLR3FWg74tReL",
  ]);
  const navigate = useNavigate();

  // 修改 balances 狀態結構，包含 current 和 previous
  const [balances, setBalances] = useState({});

  const [newAddress, setNewAddress] = useState('');

  // 從後端獲取初始餘額
  useEffect(() => {
    const fetchBalances = async () => {
      try {
        const existingAccounts = Object.keys(balances);
        const newAccounts = accounts.filter(account => !existingAccounts.includes(account));

        for (const account of newAccounts) {
          const solResponse = await fetch(`http://localhost:5001/solBalance/${account}`);
          if (!solResponse.ok) {
            throw new Error(`HTTP error! status: ${solResponse.status}`);
          }
          const solData = await solResponse.json();

          setBalances(prev => ({
            ...prev,
            [account]: {
              current: solData.balance,
              previous: 0, // 新账户的上次余额默认为 0
            },
          }));
        }
      } catch (error) {
        console.error('取得初始餘額時出錯:', error);
      }
    };

    fetchBalances();
  }, [accounts]);

  // 處理 WebSocket 接收到新的餘額更新
  const handleSolBalanceReceived = useCallback((account, newBalance) => {
    setBalances(prev => {
      const prevBalance = prev[account]?.current || 0;
      return {
        ...prev,
        [account]: {
          current: newBalance,
          previous: prevBalance,
        },
      };
    });
  }, []);

  // 處理 SPL 代幣餘額更新
  const onSPLBalancesReceived = useCallback((account, balances) => {
    // 處理 SPL 代幣餘額更新的邏輯
  }, []);

  // 處理新增錢包地址
  const handleAddAccount = () => {
    if (newAddress && !accounts.includes(newAddress)) {
      setAccounts([...accounts, newAddress]);
      setNewAddress('');
    }
  };

  const handleSPLBalancesReceived = useCallback((account, balances) => {
    // 在这里处理 SPL 代币余额的更新
    console.log('收到 SPL 代币余额更新:', account, balances);
    // 您可以根据需要更新状态或执行其他操作
  }, []);

  // 計算百分比變化
  const calculatePercentageChange = (previous, current) => {
    if (previous === 0) return 'N/A';
    const change = ((current - previous) / previous) * 100;
    return change.toFixed(2);
  };

  return (
    <div className="home-container">
      <WebSocketComponent
        accounts={accounts}
        onSolBalanceReceived={handleSolBalanceReceived}
        onSPLBalancesReceived={handleSPLBalancesReceived} // 确保传递了函数

      />

      {/* 左側：錢包總覽和新增地址 */}
      <div className="left-side">
        <div className="add-account">
          <input
            type="text"
            placeholder="輸入新的錢包地址"
            value={newAddress}
            onChange={(e) => setNewAddress(e.target.value)}
          />
          <button onClick={handleAddAccount}>新增錢包地址</button>
        </div>

        <div className="wallet-overview">
          {accounts.map(account => {
            const accountData = balances[account] || {};
            const currentBalance = accountData.current || 0;
            const previousBalance = accountData.previous || 0;
            const percentageChange = calculatePercentageChange(previousBalance, currentBalance);

            return (
              <div key={account} className="wallet-item">
                {/* 點擊錢包地址，導航到詳細頁面 */}
                <h3
                  onClick={() => navigate(`/wallet/${account}`)}
                  style={{ cursor: 'pointer' }}
                >
                  {account}
                </h3>
                <p>餘額: {currentBalance} $SOL</p>
                <p>上次更新前的餘額: {previousBalance} $SOL</p>
                <h4 style={{ color: percentageChange > 0 ? 'green' : 'red' }}>帳戶變動： {percentageChange}%</h4>
              </div>
            );
          })}
        </div>
      </div>

      {/* 右側：買入代幣功能區域 */}
      <div className="right-side">
        <h3>買入代幣功能</h3>
        {/* 在此處添加您的買入代幣相關組件或代碼 */}
      </div>
    </div>
  );
};

export default Home;
