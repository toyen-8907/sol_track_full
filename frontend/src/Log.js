// 前端 LogPage.jsx 範例
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

const LogPage = () => {
  const { address } = useParams();
  const [transactionData, setTransactionData] = useState(null);
  const [logList, setLogList] = useState([]);
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
        const  logs  = msg.logs;
        console.log(`創建累積資料`)
        // 將這個新日誌累積到 logList 裏面
        setLogList((prevLogs) => {
          const updatedLogs = [...prevLogs, logs];
          
          return updatedLogs;
        });
        console.log('累積完成開始調用API')
        if (logList[0] && logList[0].signature) {
          try {
            const response = await fetch(`http://localhost:5001/transaction/${logList[0].signature}`);
            console.log(`調用完成`)
            const txData = await response.json();
            console.log('交易資料:', txData);

            setTransactionData(txData);
            if (logList.length >= 2) {
              console.log('logList 已達到 2 筆，清除所有內容');
              return [];
            }
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
