// Home.js

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './App.css';
import WebSocketComponent from './WebSocketComponent';

const Home = () => {
  const [accounts, setAccounts] = useState([
    "GShiMwUiqpWfxyVxVnYo96upwQekeFVNrtMQT4aSH2RT",
    "CRVidEDtEUTYZisCxBZkpELzhQc9eauMLR3FWg74tReL",
  ]);
  // 後續改成接入資料庫讀取
  const [balances, setBalances] = useState({});
  const [newAddress, setNewAddress] = useState('');
  
  const navigate = useNavigate();
  const wsRef = useRef(null);

  // 從後端獲取初始餘額
  useEffect(() => {
    const fetchBalances = async () => {
      try {
        for (const account of accounts) {
          const solResponse = await fetch(`/solBalance/${account}`);
          const solData = await solResponse.json();

          setBalances(prev => ({ ...prev, [account]: solData.balance }));
        }
      } catch (error) {
        console.error('取得初始餘額時出錯:', error);
      }
    };

    fetchBalances();
  }, [accounts]);

  // 處理新增錢包地址
  const handleAddAccount = () => {
    if (newAddress && !accounts.includes(newAddress)) {
      setAccounts([...accounts, newAddress]);
      setNewAddress('');
    }
  };

  return (
    <div className="home-container">
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
          {accounts.map(account => (
            <div key={account} className="wallet-item">
              {/* 點擊錢包地址，導航到詳細頁面 */}
              <h3
                onClick={() => navigate(`/wallet/${account}`)}
                style={{ cursor: 'pointer' }}
              >
                {account}
              </h3>
              <p>餘額: {balances[account] || 0} $SOL</p>
            </div>
          ))}
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
