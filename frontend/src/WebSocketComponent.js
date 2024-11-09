// WebSocketComponent.js

import React, { useEffect } from 'react';

const WebSocketComponent = ({ account, onSolBalanceReceived, onSPLBalancesReceived }) => {
  useEffect(() => {
    // 连接到后端 WebSocket 服务器
    const ws = new WebSocket('ws://localhost:5000'); // 如有需要，请更新 URL

    ws.onopen = () => {
      console.log('WebSocket 已连接');
      // 发送订阅账户更新的请求
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
      console.log('WebSocket 已断开');
    };

    return () => {
      ws.close();
    };
  }, [account, onSolBalanceReceived, onSPLBalancesReceived]);

  return null;
};

export default WebSocketComponent;
