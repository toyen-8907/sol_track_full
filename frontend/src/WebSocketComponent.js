import React, { useEffect } from 'react';

const WebSocketComponent = ({ accounts, onSolBalanceReceived, onSPLBalancesReceived }) => {
  useEffect(() => {
    const ws = new WebSocket('ws://localhost:5001/ws');

    ws.onopen = () => {
      console.log('WebSocket 已連接');
      // 訂閱多個帳號地址
      if (accounts && accounts.length > 0) {
        accounts.forEach(account => {
          ws.send(JSON.stringify({ action: 'subscribe', account }));
        });
      } else {
        console.error('帳號列表為空');
      }
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('收到消息:', data);

      // 處理不同類型的消息
      if (data.type === 'solBalance') {
        onSolBalanceReceived(data.account, parseFloat(data.balance));
        console.log('SOL 餘額更新:', data.balance);
      } else if (data.type === 'splBalances') {
        onSPLBalancesReceived(data.account, data.balances);
        console.log('SPL 代幣餘額更新:', data.balances);
      } else if (data.type === 'heartbeat') {
        console.log('收到心跳消息');
      }
    };

    ws.onclose = () => {
      console.log('WebSocket 已斷開');
    };

    return () => {
      ws.close();
    };
  }, [accounts, onSolBalanceReceived, onSPLBalancesReceived]);

  return null;
};

export default WebSocketComponent;
