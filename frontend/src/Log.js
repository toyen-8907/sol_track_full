// Log.js
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Connection, PublicKey } from '@solana/web3.js';

const LogPage = () => {
  const { address } = useParams(); 
  const [logs, setLogs] = useState([]);
  const [transactionData, setTransactionData] = useState(null);

  useEffect(() => {
    if (!address) return;

    let subscriptionId;
    let connection;

    (async () => {
      try {
        console.log('正在從後端取得 RPC 位址...');
        const res = await fetch('http://localhost:5001/getRpcUrl');
        const data = await res.json();
        const httpRpcUrl = data.rpcHttpUrl; 
        const wsEndpoint = data.rpcWssUrl;

        console.log('已取得 RPC 位址資訊:', { httpRpcUrl, wsEndpoint });

        connection = new Connection(httpRpcUrl, {
          wsEndpoint,
          commitment: 'confirmed',
        });

        console.log('已成功與 Solana RPC 建立連線');

        const targetPublicKey = new PublicKey(address);
        console.log(`正在訂閱位址的日誌：${address}`);

        // 在 onLogs 的 callback 中取得日誌資訊並透過 signature 查交易資料
        subscriptionId = connection.onLogs(
          targetPublicKey,
          async (logsInfo) => {
            console.log('收到日誌更新:', logsInfo);
            setLogs((prev) => [...prev, logsInfo]);

            // 在這裡使用 logsInfo.signature 查詢交易資料
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
          },
          'confirmed'
        );

        console.log('日誌訂閱成功');

      } catch (e) {
        console.error('日誌訂閱過程中發生錯誤:', e);
      }
    })();

    return () => {
      if (connection && subscriptionId != null) {
        console.log(`正在解除訂閱位址日誌：${address}`);
        connection.removeOnLogsListener(subscriptionId);
        console.log('已解除日誌訂閱並斷開連線');
      }
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
