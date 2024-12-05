import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import WebSocketComponent from './WebSocketComponent';

const WalletDetails = () => {
  const { address } = useParams(); // 从 URL 获取单个地址
  const [balance, setBalance] = useState(0);
  const [percentageChange, setPercentageChange] = useState(null);

  const [splBalances, setSplBalances] = useState([]);
  const [previousSplBalances, setPreviousSplBalances] = useState([]);
  const [addedTokens, setAddedTokens] = useState([]);

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
          setPreviousSplBalances(nonZeroBalances);
          setAddedTokens([]);
        } else {
          console.error(`收到的 SPL 数据格式不正确: ${splData}`);
          setSplBalances([]);
          setPreviousSplBalances([]);
          setAddedTokens([]);
        }
      } catch (error) {
        console.error('获取余额时发生错误:', error);
      }
    };

    fetchBalances();
  }, [address]);

  const handleSolBalanceReceived = useCallback((_, newBalance) => {
    console.log('处理 SOL 地址:', address);

    if (balance !== null && balance !== 0) {
      const change = ((newBalance - balance) / balance) * 100;
      setPercentageChange(change.toFixed(2));
    }
    setBalance(newBalance);
  }, [balance, address]);

  const handleSPLBalancesReceived = useCallback((_, receivedBalances) => {
    console.log('处理 SPL 地址:', address);

    const nonZeroBalances = Array.isArray(receivedBalances)
      ? receivedBalances.filter(token => parseFloat(token.balance) > 0)
      : [];

    const prevMints = previousSplBalances.map(token => token.mint);

    const newTokens = nonZeroBalances.filter(token => !prevMints.includes(token.mint));

    setAddedTokens(newTokens);
    setPreviousSplBalances(splBalances);
    setSplBalances(nonZeroBalances);
  }, [splBalances, previousSplBalances, address]);

  return (
    <div className="wallet-details">
      <h2>钱包详细信息</h2>
      <p>地址: {address}</p>

      <div className="balance-info">
        <h3>余额: {balance} $SOL</h3>
        {percentageChange !== null && (
          <h4 style={{ color: percentageChange > 0 ? 'green' : 'red' }}>
            涨跌: {percentageChange}%
          </h4>
        )}
      </div>

      <div className="token-grid">
        {splBalances.length > 0 ? (
          splBalances.map((token, index) => {
            const isNewToken = addedTokens.some(added => added.mint === token.mint);
            return (
              <div key={index} className={`token-item ${isNewToken ? 'new-token' : ''}`}>
                <p>
                  TOKEN 合约地址: {token.mint.slice(0, 7)}...{token.mint.slice(-7)}
                </p>
                <p>余额: {parseFloat(token.balance).toFixed(4)}</p>
                {isNewToken && <span className="new-token-label">新增代币</span>}
              </div>
            );
          })
        ) : (
          <p>此钱包没有任何 SPL 代币。</p>
        )}
      </div>

      <WebSocketComponent
        account={address}
        onSolBalanceReceived={handleSolBalanceReceived}
        onSPLBalancesReceived={handleSPLBalancesReceived}
      />
    </div>
  );
};

export default WalletDetails;
