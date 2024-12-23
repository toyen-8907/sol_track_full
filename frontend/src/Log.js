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
        const  logs  = msg;
        console.log('創建累積資料')
        // 將這個新日誌累積到 logList 裏面
        setLogList((prevLogs) => {
          const updatedLogs = [...prevLogs, logs];
          
          return updatedLogs;
        });
        console.log('累積完成開始調用API')
        if (logList[0].logs && logList[0].logs.signature) {
          try {
            const response = await fetch(`http://localhost:5001/transaction/${logList[0].logs.signature}`);
            const txData = await response.json();
            console.log('交易資料:', txData);


            //回傳訊息
            let summaryString = `【交易資訊】\n`;
            summaryString += `- 交易版本：${txData.version}\n`;
            summaryString += `- 交易簽名：${txData.signature}\n`;
            summaryString += `- 所在 Slot：${txData.slot}\n`;
            summaryString += `- 區塊時間：${txData.blockTime}\n`;
            summaryString += `- 交易結果：${txData.isSuccess ? '成功' : '失敗'}\n`;
            summaryString += `- 手續費 (lamports)：${txData.fee}\n`;
            summaryString += `- 消耗的計算單位：${txData.computeUnitsConsumed}\n`;
            summaryString += `- 日誌筆數：${txData.logMessages.length}\n`;
            summaryString += `\n【餘額變化】\n`;

            setTransactionData(summaryString);
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
  //{transactionData && <li>{JSON.stringify(transactionData)}</li>}
  }, [address]);

  return (
    <div>
      <h2>位址：{address} 的日誌</h2>
      <ul>
        
        <li>{ transactionData }</li>
      </ul>
    </div>
  );
};

export default LogPage;
