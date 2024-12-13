import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import WebSocketComponent from './WebSocketComponent';

const WalletDetails = () => {
  // 使用 useParams 从 URL 中提取地址参数
  const { address } = useParams();
  
  // 基本数据状态：SOL余额与SPL代币列表
  const [solBalance, setSolBalance] = useState(null);
  const [splTokens, setSplTokens] = useState([]);

  // 追踪加载状态
  const [loading, setLoading] = useState(true);

  // 用于记录前一次的SOL与代币信息（以便区分变化）
  const [prevSolBalance, setPrevSolBalance] = useState(null);
  const [prevSPLTokens, setPrevSPLTokens] = useState([]);

  // 用于显示SOL变化幅度
  const [solChangePercent, setSolChangePercent] = useState(null);

  // 记录新出现的SPL代币（与上一次数据对比）
  const [newTokens, setNewTokens] = useState([]);

  // 初始化：从后端接口获取初始数据
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const solRes = await fetch(`http://localhost:5001/solBalance/${address}`);
        const solJson = await solRes.json();

        const splRes = await fetch(`http://localhost:5001/splBalances/${address}`);
        const splJson = await splRes.json();

        // 设置初始数据
        setSolBalance(solJson.balance ?? 0);
        setSplTokens(Array.isArray(splJson) ? splJson : []);
        
        // 初始化时将前次数据设定为当前数据，以便后续对比
        setPrevSolBalance(solJson.balance ?? 0);
        setPrevSPLTokens(Array.isArray(splJson) ? splJson : []);
        
      } catch (err) {
        console.error('获取数据失败:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [address]);

  // WebSocket回调：当SOL余额更新时
  const onSolUpdate = useCallback((info, newBal) => {
    // 计算变化比例
    if (prevSolBalance !== null && prevSolBalance !== 0) {
      const diff = ((newBal - prevSolBalance) / prevSolBalance) * 100;
      setSolChangePercent(diff.toFixed(2));
    } else {
      setSolChangePercent(null);
    }

    // 更新当前与上一次对比数据
    setSolBalance(newBal);
    setPrevSolBalance(newBal);
  }, [prevSolBalance]);

  // WebSocket回调：当SPL代币列表更新时
  const onSPLUpdate = useCallback((info, latestTokens) => {
    if (!Array.isArray(latestTokens)) {
      return;
    }

    // 获取旧的代币mint地址列表
    const oldMints = prevSPLTokens.map(t => t.mint);
    // 找到新增代币（以前不存在的mint）
    const newlyAdded = latestTokens.filter(token => !oldMints.includes(token.mint));
    
    setNewTokens(newlyAdded);
    setSplTokens(latestTokens);
    setPrevSPLTokens(latestTokens);
  }, [prevSPLTokens]);

  if (loading) {
    return <div>正在加载数据...</div>;
  }

  return (
    <div style={{ padding: '20px', border: '1px solid #ccc' }}>
      <h2>钱包详情</h2>
      <p>地址：{address}</p>

      <div style={{ marginBottom: '20px' }}>
        <h3>当前SOL余额：{solBalance ?? 0} SOL</h3>
        {solChangePercent !== null && (
          <p style={{ color: parseFloat(solChangePercent) > 0 ? 'green' : 'red' }}>
            变化幅度：{solChangePercent}%
          </p>
        )}
      </div>

      <div>
        <h3>SPL代币列表</h3>
        {splTokens.length === 0 ? (
          <p>暂无代币。</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {splTokens.map((token, idx) => {
              const isNew = newTokens.some(nt => nt.mint === token.mint);
              return (
                <div key={idx} style={{ border: '1px solid #aaa', padding: '10px' }}>
                  <p>代币合约地址：{token.mint}</p>
                  <p>余额：{token.balance}</p>
                  {isNew && <strong style={{ color: 'blue' }}>新发现的代币！</strong>}
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