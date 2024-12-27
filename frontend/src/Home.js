import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './App.css';
import WebSocketComponent from './WebSocketComponent';
import fetch from 'node-fetch';

const Home = () => {
  const [accounts, setAccounts] = useState([
    "GShiMwUiqpWfxyVxVnYo96upwQekeFVNrtMQT4aSH2RT",
    "CRVidEDtEUTYZisCxBZkpELzhQc9eauMLR3FWg74tReL",
    "BeTvN1ucBnCj4Ef688i51KHn2oq35CWDvD2J5aLFp17t",
    "DhuHgXwAesSsT9zFRYcwroNuW6PABxKcD7QojX88HkHT"
  ]);
  const navigate = useNavigate();

  // 修改 balances 狀態結構，包含 current 和 previous
  const [balances, setBalances] = useState({});
  const [newAddress, setNewAddress] = useState('');
  const [data, setData] = useState(null);
  const [accountChainInfo, setAcChainInfo] = useState([
    'SOL',
    'SOL',
    'SOL',
    'SOL',
  ]);
  const [newAddressChainInfo, setNewAddressChainInfo] = useState('');
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
  const handleSolBalanceReceived = useCallback(async (account, newBalance) => {
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

    // 在餘額變動的同時，向後端請求該帳戶的 swap 紀錄
    try {
      const response =  await fetch(`http://localhost:5001/accountSwaps/${account}`);
      if (!response.ok) {
        throw new Error(`取得 swaps 資料錯誤, 狀態碼: ${response.status}`);
      }
      const jsonData = await response.json(); // 等待解析完整的 JSON 資料
      const transaction = jsonData.result[0];
      const buy_sell = transaction.transactionType
      const platform = transaction.exchangeName
      const time = transaction.blockTimestamp
      const buy_token = transaction.bought.name
      const buy_amount = transaction.bought.amount
      const value = transaction.bought.usdAmount
      const sell_token = transaction.sold.name
      const sell_amoumt = transaction.sold.amount
      const subCategory = transaction.subCategory
      const walletAddress = transaction.walletAddress
      const pairlabel = transaction.pariLabel
      const message = `${walletAddress} 在 ${time} 花費 ${sell_token} ${buy_sell} ${buy_token} ${buy_amount} 交易類型：${subCategory} 平台：${platform} 價值：${value} USD 交易對 ${pairlabel}`
      setData(message); // 將 JSON 物件設置到 data 狀態
    } catch (error) {
      console.error('取得 swaps 資料時出錯:', error);
    }

  }, []);

  // 處理 SPL 代幣餘額更新
  const onSPLBalancesReceived = useCallback((account, balances) => {
    // 處理 SPL 代幣餘額更新的邏輯
  }, []);

  // 處理新增錢包地址
  const handleAddAccount = () => {
    if (newAddress && !accounts.includes(newAddress)) {
      setAccounts([...accounts, newAddress]);
      setAcChainInfo([...accountChainInfo, newAddressChainInfo]);
      setNewAddress('');
      setNewAddressChainInfo('');
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
          <select
            value={newAddressChainInfo}
            onChange={(e) => setNewAddressChainInfo(e.target.value)}
          >
            <option value="" disabled>
              選擇公鏈
            </option>
            <option value="SOL">SOL</option>
            <option value="ETH">ETH</option>
            <option value="BSC">BSC</option>
          </select>
          <button onClick={handleAddAccount}>新增錢包</button>
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
                <p 
                  onClick={() => navigate(`/Log/${account}`)}
                  style={{ cursor: 'pointer', color:'blue'}}>
                    TX追蹤
                </p>
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
        <div>{data ? JSON.stringify(data) : '追蹤列表尚未有新交易...'}</div>
      </div>
    </div>
  );
};

export default Home;
