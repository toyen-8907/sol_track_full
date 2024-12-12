import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import WebSocketComponent from './WebSocketComponent';

const WalletDetails = () => {
  // 使用 useParams 從 URL 中提取地址參數
  const { address } = useParams();
  
  // 基本數據狀態：SOL餘額與SPL代幣列表
  const [solBalance, setSolBalance] = useState(null);
  const [splTokens, setSplTokens] = useState([]);

  // 追蹤載入狀態
  const [loading, setLoading] = useState(true);

  // 用於記錄前一次的SOL與代幣資訊（以便區分變化）
  const [prevSolBalance, setPrevSolBalance] = useState(null);
  const [prevSPLTokens, setPrevSPLTokens] = useState([]);

  // 用於顯示SOL變化幅度
  const [solChangePercent, setSolChangePercent] = useState(null);

  // 記錄新出現的SPL代幣（與上一次數據對比）
  const [newTokens, setNewTokens] = useState([]);

  // 初始化：從後端接口獲取初始數據
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const solRes = await fetch(`http://localhost:5001/solBalance/${address}`);
        const solJson = await solRes.json();

        const splRes = await fetch(`http://localhost:5001/splBalances/${address}`);
        const splJson = await splRes.json();

        // 設置初始數據
        setSolBalance(solJson.balance ?? 0);
        setSplTokens(Array.isArray(splJson) ? splJson : []);
        
        // 初始化時將前次數據設定為當前數據，以便後續對比
        setPrevSolBalance(solJson.balance ?? 0);
        setPrevSPLTokens(Array.isArray(splJson) ? splJson : []);
        
      } catch (err) {
        console.error('獲取數據失敗:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [address]);

  // WebSocket回調：當SOL餘額更新時
  const onSolUpdate = useCallback((info, newBal) => {
    // 計算變化比例
    if (prevSolBalance !== null && prevSolBalance !== 0) {
      const diff = ((newBal - prevSolBalance) / prevSolBalance) * 100;
      setSolChangePercent(diff.toFixed(2));
    } else {
      setSolChangePercent(null);
    }

    // 更新當前與上一次對比數據
    setSolBalance(newBal);
    setPrevSolBalance(newBal);
  }, [prevSolBalance]);

  // WebSocket回調：當SPL代幣列表更新時
  const onSPLUpdate = useCallback((info, latestTokens) => {
    if (!Array.isArray(latestTokens)) {
      return;
    }

    // 獲取舊的代幣mint地址列表
    const oldMints = prevSPLTokens.map(t => t.mint);
    // 找到新增代幣（以前不存在的mint）
    const newlyAdded = latestTokens.filter(token => !oldMints.includes(token.mint));
    
    setNewTokens(newlyAdded);
    setSplTokens(latestTokens);
    setPrevSPLTokens(latestTokens);
  }, [prevSPLTokens]);

  if (loading) {
    return <div>正在載入數據...</div>;
  }

  return (
    <div style={{ padding: '20px', border: '1px solid #ccc' }}>
      <h2>錢包詳情</h2>
      <p>地址：{address}</p>

      <div style={{ marginBottom: '20px' }}>
        <h3>目前SOL餘額：{solBalance ?? 0} SOL</h3>
        {solChangePercent !== null && (
          <p style={{ color: parseFloat(solChangePercent) > 0 ? 'green' : 'red' }}>
            變化幅度：{solChangePercent}%
          </p>
        )}
      </div>

      <div>
        <h3>SPL代幣列表</h3>
        {splTokens.length === 0 ? (
          <p>暫無代幣。</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {splTokens.map((token, idx) => {
              const isNew = newTokens.some(nt => nt.mint === token.mint);
              return (
                <div key={idx} style={{ border: '1px solid #aaa', padding: '10px' }}>
                  <p>代幣合約地址：{token.mint}</p>
                  <p>餘額：{token.balance}</p>
                  {isNew && <strong style={{ color: 'blue' }}>新發現的代幣！</strong>}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <WebSocketComponent
        account={address}
        onSolBalanceReceived={onSolUpdate}
        onSPLBalancesReceived={onSPLUpdate}
      />
    </div>
  );
};

export default WalletDetails;