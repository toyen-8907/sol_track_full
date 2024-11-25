import { useEffect, useRef } from 'react';

const WebSocketComponent = ({ accounts, account, onSolBalanceReceived, onSPLBalancesReceived }) => {
  const wsRef = useRef(null);
  const reconnectIntervalRef = useRef(1000); // 初始重连间隔1秒

  // 使用最新的账号列表（accounts 数组或单个 account 组成的数组）
  const accountsRef = useRef(accounts || (account ? [account] : []));

  useEffect(() => {
    let shouldReconnect = true;

    const connectWebSocket = () => {
      wsRef.current = new WebSocket('ws://localhost:5001/ws');
      
      wsRef.current.onopen = () => {
        console.log('WebSocket 已连接');
        reconnectIntervalRef.current = 1000; // 重置重连间隔

        // 确保 accountsRef.current 已更新
        if (accountsRef.current && accountsRef.current.length > 0) {
          console.log("发送订阅消息:", accountsRef.current);
          wsRef.current.send(JSON.stringify({ action: 'subscribe', accounts: accountsRef.current }));
        } else {
          console.error('账号列表为空');
        }
      };

      wsRef.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log('收到消息:', data);

        // 处理不同类型的消息
        if (data.type === 'solBalance') {
          if (typeof onSolBalanceReceived === 'function') {
            onSolBalanceReceived(data.account, parseFloat(data.balance));
            console.log('SOL 余额更新:', data.balance);
          }
        } else if (data.type === 'splBalances') {
          if (typeof onSPLBalancesReceived === 'function') {
            onSPLBalancesReceived(data.account, data.balances);
            console.log('SPL 代币余额更新:', data.balances);
          }
        } else if (data.type === 'heartbeat') {
          console.log('收到心跳消息');
        }
      };

      wsRef.current.onclose = (e) => {
        console.log('WebSocket 已断开:', e.reason);
        if (shouldReconnect) {
          console.log(`尝试在 ${reconnectIntervalRef.current / 1000} 秒后重新连接...`);
          setTimeout(connectWebSocket, reconnectIntervalRef.current);
          reconnectIntervalRef.current = Math.min(reconnectIntervalRef.current * 2, 30000); // 指数回退，最多30秒
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket 发生错误:', error);
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
  }, [onSolBalanceReceived, onSPLBalancesReceived]);

  // 当 accounts 或 account 变化时，通过 WebSocket 发送更新的订阅请求
  useEffect(() => {
    accountsRef.current = accounts || (account ? [account] : []);
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify({ action: 'updateSubscriptions', accounts: accountsRef.current }));
      } catch (error) {
        console.error('发送 updateSubscriptions 失败:', error);
      }
    } else {
      console.warn('WebSocket 未连接，无法更新订阅');
    }
  }, [accounts, account]);

  return null;
};

export default WebSocketComponent;
