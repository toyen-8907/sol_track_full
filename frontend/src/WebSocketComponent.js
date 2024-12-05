import { useEffect, useRef } from 'react';

const WebSocketComponent = ({ accounts, account, onSolBalanceReceived, onSPLBalancesReceived }) => {
  const wsRef = useRef(null);
  const reconnectIntervalRef = useRef(1000); // 初始重連間隔1秒

  // 使用最新的帳號列表（accounts 陣列或單個 account 組成的陣列）
  const accountsRef = useRef([]);

  // 使用 useRef 保存最新的回調函數，避免閉包問題
  const onSolBalanceReceivedRef = useRef(onSolBalanceReceived);
  const onSPLBalancesReceivedRef = useRef(onSPLBalancesReceived);

  useEffect(() => {
    onSolBalanceReceivedRef.current = onSolBalanceReceived;
    onSPLBalancesReceivedRef.current = onSPLBalancesReceived;
  }, [onSolBalanceReceived, onSPLBalancesReceived]);

  useEffect(() => {
    let shouldReconnect = true;

    // 在連線前更新 accountsRef.current
    accountsRef.current = accounts || (account ? [account] : []);

    const connectWebSocket = () => {
      wsRef.current = new WebSocket('ws://localhost:5001/ws');
      
      wsRef.current.onopen = () => {
        console.log('WebSocket 已連線');
        reconnectIntervalRef.current = 1000; // 重置重連間隔

        if (accountsRef.current && accountsRef.current.length > 0) {
          console.log("發送訂閱消息:", accountsRef.current);
          wsRef.current.send(JSON.stringify({ action: 'subscribe', accounts: accountsRef.current }));
        } else {
          console.error('帳號列表為空');
        }
      };

      wsRef.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log('收到消息:', data);

        if (data.type === 'solBalance') {
          if (typeof onSolBalanceReceivedRef.current === 'function') {
            onSolBalanceReceivedRef.current(data.account, parseFloat(data.balance));
            console.log('SOL 餘額更新:', data.balance);
          }
        } else if (data.type === 'splBalances') {
          if (typeof onSPLBalancesReceivedRef.current === 'function') {
            onSPLBalancesReceivedRef.current(data.account, data.balances);
            console.log('SPL 代幣餘額更新:', data.balances);
          }
        } else if (data.type === 'heartbeat') {
          console.log('收到心跳消息');
        }
      };

      wsRef.current.onclose = (e) => {
        console.log('WebSocket 已斷開:', e.reason);
        if (shouldReconnect) {
          console.log(`嘗試在 ${reconnectIntervalRef.current / 1000} 秒後重新連線...`);
          setTimeout(connectWebSocket, reconnectIntervalRef.current);
          reconnectIntervalRef.current = Math.min(reconnectIntervalRef.current * 2, 30000); // 指數回退，最多30秒
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket 發生錯誤:', error);
        wsRef.current.close();
      };
    };

    connectWebSocket();

    return () => {
      shouldReconnect = false;
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [accounts, account]); // 加入 accounts 和 account 作為依賴

  // 當 accounts 或 account 變化時，更新訂閱
  useEffect(() => {
    accountsRef.current = accounts || (account ? [account] : []);
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify({ action: 'updateSubscriptions', accounts: accountsRef.current }));
      } catch (error) {
        console.error('發送 updateSubscriptions 失敗:', error);
      }
    } else {
      console.warn('WebSocket 未連線，無法更新訂閱');
    }
  }, [accounts, account]);

  return null;
};

export default WebSocketComponent;
