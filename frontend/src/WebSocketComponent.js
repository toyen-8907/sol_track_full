// WebSocketComponent.js

import React, { useEffect } from 'react';

const WebSocketComponent = ({ account, onSolBalanceReceived, onSPLBalancesReceived }) => {
  useEffect(() => {
    const ws = new WebSocket('ws://localhost:5001/ws');

    ws.onopen = () => {
      console.log('WebSocket 已連接');
      // 訂閱單個帳號地址
      if (account) {
        ws.send(JSON.stringify({ action: 'subscribe', account }));
      } else {
        console.error('帳號未定義');
      }
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
