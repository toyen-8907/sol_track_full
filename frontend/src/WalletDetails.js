import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import WebSocketComponent from './WebSocketComponent';
import './App.css'; // 確保 app.css 已正確載入



async function fetchTokensWithSymbol(tokens) {
  // 並行請求所有 token 的 symbol 資訊
  const tokensWithSymbol = await Promise.all(tokens.map(async (token) => {
    try {
      const res = await fetch(`http://localhost:5001/solana-tokens/${token.mint}`);
      const data = await res.json();
      // 假設 data 中含有 "symbol"、"name"、"logo"、"decimals" 等屬性
      return {
        ...token,
        symbol: data.symbol,
        name: data.name,
        logo: data.logo,
        decimals: data.decimals
      };
    } catch (err) {
      console.error(`Error fetching symbol for ${token.mint}`, err);
      // 若請求失敗，至少回傳原始 token 資料
      return token;
    }
  }));

  return tokensWithSymbol;
}




const WalletDetails = () => {
  // 使用 useParams 從 URL 中提取地址參數
  const { address } = useParams();

  // 基本資料狀態：SOL 餘額與 SPL 代幣列表
  const [solBalance, setSolBalance] = useState(null);
  const [splTokens, setSplTokens] = useState([]);

  // 追蹤加載狀態
  const [loading, setLoading] = useState(true);

  // 用於記錄前一次的 SOL 與代幣資訊（以便區分變化）
  const [prevSolBalance, setPrevSolBalance] = useState(null);
  const [prevSPLTokens, setPrevSPLTokens] = useState([]);

  // 用於顯示 SOL 變化幅度
  const [solChangePercent, setSolChangePercent] = useState(null);

  // 記錄新出現的 SPL 代幣（與上一次資料對比）
  const [newTokens, setNewTokens] = useState([]);
  
  // 初始化：從後端接口獲取初始資料
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const solRes = await fetch(`http://localhost:5001/solBalance/${address}`);
        const solJson = await solRes.json();

        const splRes = await fetch(`http://localhost:5001/splBalances/${address}`);
        const splJson = await splRes.json();

        

        // 設定初始資料
        setSolBalance(solJson.balance ?? 0);
        setSplTokens(Array.isArray(splJson) ? splJson : []);

        // 初始化時將前次資料設定為當前資料，以便後續對比
        setPrevSolBalance(solJson.balance ?? 0);
        setPrevSPLTokens(Array.isArray(splJson) ? splJson : []);
      } catch (err) {
        console.error('獲取資料失敗:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [address]);

  useEffect(() => {
    if (splTokens.length > 0) {
      (async () => {
        const updatedTokens = await fetchTokensWithSymbol(splTokens); // <-- 呼叫新加入的函式
        setSplTokens(updatedTokens);
      })();
    }
  }, [splTokens]);

  // WebSocket 回調：當 SOL 餘額更新時
  const onSolUpdate = useCallback((info, newBal) => {
    // 計算變化比例
    if (prevSolBalance !== null && prevSolBalance !== 0) {
      const diff = ((newBal - prevSolBalance) / prevSolBalance) * 100;
      setSolChangePercent(diff.toFixed(2));
    } else {
      setSolChangePercent(null);
    }

    // 更新當前與上一次對比資料
    setSolBalance(newBal);
    setPrevSolBalance(newBal);
  }, [prevSolBalance]);

  // WebSocket 回調：當 SPL 代幣列表更新時
  const onSPLUpdate = useCallback((info, latestTokens) => {
    if (!Array.isArray(latestTokens)) {
      return;
    }

    // 獲取舊的代幣 mint 地址列表
    const oldMints = prevSPLTokens.map(t => t.mint);
    // 找到新增代幣（以前不存在的 mint）
    const newlyAdded = latestTokens.filter(token => !oldMints.includes(token.mint));

    setNewTokens(newlyAdded);
    setSplTokens(latestTokens);
    setPrevSPLTokens(latestTokens);
  }, [prevSPLTokens]);

  if (loading) {
    return <div className="loading">正在載入資料...</div>;
  }

  return (
    <div className="wallet-details">
      <h2>錢包詳情</h2>
      <p>地址：{address}</p>

      <div className="sol-balance-section">
        <h3>當前 SOL 餘額：{solBalance ?? 0} SOL</h3>
        {solChangePercent !== null && (
          <p className={parseFloat(solChangePercent) > 0 ? 'change-positive' : 'change-negative'}>
            變化幅度：{solChangePercent}%
          </p>
        )}
      </div>

      <div className="spl-tokens-section">
      <h3>SPL 代幣列表</h3>
        {splTokens.length === 0 ? (
          <p>暫無代幣。</p>
        ) : (
          <div className="spl-tokens-grid">
            {splTokens.map((token, idx) => {
              const isNew = newTokens.some(nt => nt.mint === token.mint);
              return (
                <div key={idx} className="spl-token-item">
                  <p>代幣合約地址：{token.mint}</p>
                  <p>餘額：{token.balance}</p>
                  {/* <-- 新增的 symbol, name, logo 等資料可在此顯示 */}
                  {token.symbol && <p>Symbol：{token.symbol}</p>}
                  {isNew && <strong className="new-token">新發現的代幣！</strong>}
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
