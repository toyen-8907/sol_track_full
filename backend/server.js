// server.js

const express = require('express');
const { Connection, PublicKey } = require('@solana/web3.js');
const WebSocket = require('ws');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');

dotenv.config();

const app = express();
const port = process.env.PORT || 5001;

app.use(cors());

// Solana 連接
const RPC_ENDPOINT = process.env.RPC_ENDPOINT;
const WS_ENDPOINT = process.env.WS_ENDPOINT;

if (!RPC_ENDPOINT || !WS_ENDPOINT) {
  console.error('請在 .env 檔案中定義 RPC_ENDPOINT 和 WS_ENDPOINT。');
  process.exit(1);
}

const connection = new Connection(RPC_ENDPOINT, {
  commitment: 'finalized',
  wsEndpoint: WS_ENDPOINT,
});

// **修改部分：將函數定義移動到使用之前**
async function fetchSolBalance(walletAddress) {
  try {
    const balance = await connection.getBalance(new PublicKey(walletAddress));
    return balance / 1000000000; // 將 lamports 轉換為 SOL
  } catch (error) {
    console.error("取得 SOL 餘額時出錯:", error);
    throw error;
  }
}

/**
 * 取得所有 SPL 代幣餘額的輔助函數
 */
async function fetchAllSplTokenBalances(walletAddress) {
  try {
    const response = await connection.getParsedTokenAccountsByOwner(
      new PublicKey(walletAddress),
      {
        programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
      }
    );

    const tokenBalances = response.value.map((accountInfo) => {
      const { mint, tokenAmount } = accountInfo.account.data.parsed.info;
      return {
        mint,
        balance: tokenAmount.uiAmountString,
      };
    });
    return tokenBalances;
  } catch (error) {
    console.error("取得 SPL 代幣餘額時出錯:", error);
    throw error;
  }
}

// **確保 REST API 路由在函數定義之後**

app.get('/solBalance/:address', async (req, res) => {
  const { address } = req.params;
  console.log('接收到地址:', address);
  try {
    const cleanAddress = address.replace(/\s+/g, '');
    const balance = await fetchSolBalance(cleanAddress);
    res.json({ balance });
  } catch (error) {
    console.error('取得 SOL 餘額時出錯:', error);
    res.status(500).json({ error: '取得 SOL 餘額時出錯', details: error.message });
  }
});

app.get('/splBalances/:address', async (req, res) => {
  const { address } = req.params;
  try {
    const cleanAddress = address.replace(/\s+/g, '');
    const balances = await fetchAllSplTokenBalances(cleanAddress);
    res.json(balances);
  } catch (error) {
    console.error('取得 SPL 代幣餘額時出錯:', error);
    res.status(500).json({ error: '取得 SPL 代幣餘額時出錯', details: error.message });
  }
});

// **其餘代碼保持不變，或者根據之前的建議進行調整**

// 在生產環境中，提供靜態檔案
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '..', 'frontend', 'build')));

  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'build', 'index.html'));
  });
}

// 啟動伺服器
const server = app.listen(port, () => {
  console.log(`伺服器正在執行於端口 ${port} http://localhost:${port}`);
});

// 設置 WebSocket 伺服器
const wss = new WebSocket.Server({ server, path: '/ws' });

wss.on('connection', (ws) => {
  console.log('前端已透过 WebSocket 连接');

  // 在连接建立时，设置心跳定时器
  const interval = setInterval(() => {
    ws.send(JSON.stringify({ type: 'heartbeat', message: '心跳测试' }));
  }, 500000);

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      const { action, account } = data;

      if (action === 'subscribe') {
        // 订阅账户变化
        const publicKey = new PublicKey(account);

        const subscriptionId = connection.onAccountChange(
          publicKey,
          async (accountInfo) => {
            console.log('检测到账户变动');
            try {
              const lamports = accountInfo.lamports;
              console.log('账户 lamports:', lamports);

              if (lamports !== undefined) {
                const balance = lamports / 1000000000;
                ws.send(JSON.stringify({ type: 'solBalance', balance }));
                console.log('发送 SOL 余额更新:', balance);
              }

              const splTokenBalances = await fetchAllSplTokenBalances(account);
              ws.send(JSON.stringify({ type: 'splBalances', balances: splTokenBalances }));
              console.log('发送 SPL 代币余额更新:', splTokenBalances);
            } catch (error) {
              console.error('处理账户变动时出错:', error);
            }
          },
          'finalized'
        );

        // 在 WebSocket 对象中存储订阅 ID
        ws.subscriptionId = subscriptionId;
      }
    } catch (error) {
      console.error('处理 WebSocket 消息时出错:', error);
    }
  });

  ws.on('error', (error) => {
    console.error('WebSocket 连接出错:', error);
  });

  ws.on('close', () => {
    console.log('前端已断开连接');

    // 清除心跳定时器
    clearInterval(interval);

    // 当客户端断开连接时，移除账户变化监听器
    if (ws.subscriptionId !== undefined) {
      connection.removeAccountChangeListener(ws.subscriptionId)
        .then(() => {
          console.log('已移除账户变化监听器。');
        })
        .catch((error) => {
          console.error('移除账户变化监听器时出错:', error);
        });
    }
  });
});
