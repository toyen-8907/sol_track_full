// 前端 LogPage.jsx 範例
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

const LogPage = () => {
  const { address } = useParams();
  const [transactionData, setTransactionData] = useState(null);

  useEffect(() => {
    if (!address) return;

    // 建立 WebSocket 連線到後端
    const ws = new WebSocket('ws://localhost:5001/ws');

    ws.onopen = () => {
      console.log('WebSocket 連線已建立');
      // 向後端請求對特定地址的日誌訂閱
      ws.send(JSON.stringify({ action: 'logsubscribe', account: address }));
    };

    ws.onmessage = async (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === 'logs') {
        console.log('收到日誌資料：', msg);
        // 這裡的 msg.logsInfo 包含 signature
        const { logsInfo } = msg;
        if (logsInfo.signature) {
          try {
            const response = await fetch(`http://localhost:5001/transaction/${logsInfo.signature}`);
            const txData = await response.json();
            console.log('交易資料:', txData);
            setTransactionData(txData);
          } catch (error) {
            console.error('取得交易資料時出錯:', error);
          }
        }
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket 發生錯誤:', error);
    };

    return () => {
      console.log('元件卸載，斷開 WebSocket');
      ws.close();
    };
  }, [address]);

  return (
    <div>
      <h2>位址：{address} 的日誌</h2>
      <ul>
        {transactionData && <li>{JSON.stringify(transactionData)}</li>}
      </ul>
    </div>
  );
};

export default LogPage;
