const express = require('express');
const { Connection, PublicKey } = require('@solana/web3.js');
const WebSocket = require('ws');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');  // 新增此行

dotenv.config();

const app = express();
const port = process.env.PORT || 5001;

app.use(cors());

// Solana 连接
const RPC_ENDPOINT = process.env.RPC_ENDPOINT;
const WS_ENDPOINT = process.env.WS_ENDPOINT;

if (!RPC_ENDPOINT || !WS_ENDPOINT) {
  console.error('请在 .env 文件中定义 RPC_ENDPOINT 和 WS_ENDPOINT。');
  process.exit(1);
}

const connection = new Connection(RPC_ENDPOINT, {
  commitment: 'finalized',
  wsEndpoint: WS_ENDPOINT,
});

// 提供靜態文件 - 設定 `../frontend/build` 為靜態資源目錄
app.use(express.static(path.join(__dirname, '..', 'frontend', 'build')));

// 輔助函式
async function fetchSolBalance(walletAddress) {
  try {
    const balance = await connection.getBalance(new PublicKey(walletAddress));
    return balance / 1000000000; // 將 lamports 轉換為 SOL
  } catch (error) {
    console.error("获取 SOL 余额时出错:", error);
    throw error;
  }
}

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
    console.error("获取 SPL 代币余额时出错:", error);
    throw error;
  }
}

// REST API 路由
app.get('/solBalance/:address', async (req, res) => {
  const { address } = req.params;
  try {
    const balance = await fetchSolBalance(address);
    res.json({ balance });
  } catch (error) {
    res.status(500).json({ error: '获取 SOL 余额时出错' });
  }
});

app.get('/splBalances/:address', async (req, res) => {
  const { address } = req.params;
  try {
    const balances = await fetchAllSplTokenBalances(address);
    res.json(balances);
  } catch (error) {
    res.status(500).json({ error: '获取 SPL 代币余额时出错' });
  }
});

// 將所有未知路由轉發給 React 的 `index.html`
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'build', 'index.html'));
});

// 启动服务器
const server = app.listen(port, () => {
  console.log(`服务器正在运行在端口 ${port} http://localhost:${port}`);
});

// WebSocket 服务器
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  console.log('前端已通过 WebSocket 连接');

  ws.on('message', async (message) => {
    const data = JSON.parse(message);
    const { action, account } = data;

    if (action === 'subscribe') {
      // 订阅账户变化
      const publicKey = new PublicKey(account);

      const subscriptionId = await connection.onAccountChange(
        publicKey,
        async (accountInfo) => {
          const lamports = accountInfo.lamports;

          if (lamports !== undefined) {
            const balance = lamports / 1000000000;
            ws.send(JSON.stringify({ type: 'solBalance', balance }));
          }

          const splTokenBalances = await fetchAllSplTokenBalances(account);
          ws.send(JSON.stringify({ type: 'splBalances', balances: splTokenBalances }));
        },
        'finalized'
      );

      // 在 WebSocket 对象中存储订阅 ID
      ws.subscriptionId = subscriptionId;
    }
  });

  ws.on('close', () => {
    console.log('前端已断开连接');

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
