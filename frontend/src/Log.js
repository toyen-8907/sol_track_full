// Log.js
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Connection, PublicKey } from '@solana/web3.js';

const LogPage = () => {
  const { address } = useParams(); // 從 URL 中取得錢包地址參數
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    if (!address) return; // 若無有效地址則不訂閱

    let subscriptionId;
    let connection;

    (async () => {
      try {
        console.log('正在從後端取得 RPC 位址...');
        // 向後端取得 RPC URL
        const res = await fetch('http://localhost:5001/getRpcUrl');
        const data = await res.json();
        const httpRpcUrl = data.rpcHttpUrl; // HTTP/HTTPS RPC Endpoint
        const wsEndpoint = data.rpcWssUrl;  // WSS RPC Endpoint

        console.log('已取得 RPC 位址資訊:', { httpRpcUrl, wsEndpoint });

        // 建立到 Solana 節點的連線 (使用從後端取得的 rpcUrl)
        connection = new Connection(httpRpcUrl, {
          wsEndpoint,
          commitment: 'confirmed',
        });

        console.log('已成功與 Solana RPC 建立連線');

        // 將字串型地址轉為 PublicKey
        const targetPublicKey = new PublicKey(address);
        console.log(`正在訂閱位址的日誌：${address}`);

        // 使用 onLogs 訂閱該地址的交易日誌
        subscriptionId = connection.onLogs(
          targetPublicKey,
          (logsInfo) => {
            console.log('收到日誌更新:', logsInfo);
            setLogs((prev) => [...prev, logsInfo]);
          },
          'confirmed'
        );
        console.log(logs);
        console.log('日誌訂閱成功');
      } catch (e) {
        console.error('日誌訂閱過程中發生錯誤:', e);
      }
    })();

    // 組件卸載或地址改變時清理訂閱
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
        
          <li>{JSON.stringify(logs.signatue)}</li>
      </ul>
    </div>
  );
};

export default LogPage;
