// WebSocketComponent.js

import React, { useEffect } from 'react';

const WebSocketComponent = ({ account, onSolBalanceReceived, onSPLBalancesReceived }) => {
  useEffect(() => {
    // 修改部分：更新 WebSocket 的 URL，添加指定的路徑 `/ws`
    const ws = new WebSocket('ws://localhost:5001/ws'); // 更新了 URL，添加了 '/ws' 路徑

    ws.onopen = () => {
      console.log('WebSocket 已連接');
      // 发送訂閱帳戶更新的請求
      ws.send(JSON.stringify({ action: 'subscribe', account }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'solBalance') {
        onSolBalanceReceived(parseFloat(data.balance));
      } else if (data.type === 'splBalances') {
        onSPLBalancesReceived(data.balances);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket 已斷開');
    };

    return () => {
      ws.close();
    };
  }, [account, onSolBalanceReceived, onSPLBalancesReceived]);

  return null;
};

export default WebSocketComponent;
