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
  commitment: 'confirmed',
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

// server.js

wss.on('connection', (ws) => {
  console.log('前端已通过 WebSocket 连接');

  // 初始化一个 Map 来存储多个账户的订阅信息
  ws.subscribedAccounts = new Map();

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      const { action } = data;

      if (action === 'subscribe') {
        const accounts = data.accounts || [];
        if (accounts.length === 0) {
          console.error('订阅请求的账号列表为空');
          return;
        }

        for (const account of accounts) {
          if (!ws.subscribedAccounts.has(account)) {
            // 如果尚未订阅该账号，则进行订阅
            const publicKey = new PublicKey(account);

            const subscriptionId = connection.onAccountChange(
              publicKey,
              async (accountInfo) => {
                console.log(`检测到账户 ${account} 的变动`);
                try {
                  const lamports = accountInfo.lamports;
                  const balance = lamports / 1000000000; // 转换为 SOL

                  // 向客户端发送更新的 SOL 余额
                  ws.send(
                    JSON.stringify({ type: 'solBalance', account, balance })
                  );

                  // 获取并发送 SPL 代币余额
                  const splTokenBalances = await fetchAllSplTokenBalances(account);
                  ws.send(
                    JSON.stringify({
                      type: 'splBalances',
                      account,
                      balances: splTokenBalances,
                    })
                  );
                } catch (error) {
                  console.error(`处理账户 ${account} 的变动时出错:`, error);
                }
              },
              'finalized' // Solana 的确认级别
            );

            // 将账户和订阅 ID 存入 Map
            ws.subscribedAccounts.set(account, subscriptionId);
            console.log(`账户 ${account} 已订阅，订阅 ID: ${subscriptionId}`);
          } else {
            console.log(`账户 ${account} 已经订阅，跳过`);
          }
        }
      }

      if (action === 'updateSubscriptions') {
        const newAccounts = data.accounts || [];
        const currentAccounts = Array.from(ws.subscribedAccounts.keys());

        // 取消不再需要的订阅
        for (const account of currentAccounts) {
          if (!newAccounts.includes(account)) {
            const subscriptionId = ws.subscribedAccounts.get(account);
            if (subscriptionId !== undefined) {
              await connection.removeAccountChangeListener(subscriptionId);
              ws.subscribedAccounts.delete(account);
              console.log(`已取消对账户 ${account} 的订阅`);
            }
          }
        }

        // 添加新的订阅
        for (const account of newAccounts) {
          if (!currentAccounts.includes(account)) {
            const publicKey = new PublicKey(account);

            const subscriptionId = connection.onAccountChange(
              publicKey,
              async (accountInfo) => {
                console.log(`检测到账户 ${account} 的变动`);
                try {
                  const lamports = accountInfo.lamports;
                  const balance = lamports / 1000000000; // 转换为 SOL

                  // 向客户端发送更新的 SOL 余额
                  ws.send(
                    JSON.stringify({ type: 'solBalance', account, balance })
                  );

                  // 获取并发送 SPL 代币余额
                  const splTokenBalances = await fetchAllSplTokenBalances(account);
                  ws.send(
                    JSON.stringify({
                      type: 'splBalances',
                      account,
                      balances: splTokenBalances,
                    })
                  );
                } catch (error) {
                  console.error(`处理账户 ${account} 的变动时出错:`, error);
                }
              },
              'finalized' // Solana 的确认级别
            );

            // 将账户和订阅 ID 存入 Map
            ws.subscribedAccounts.set(account, subscriptionId);
            console.log(`账户 ${account} 已订阅，订阅 ID: ${subscriptionId}`);
          }
        }
      }

      if (action === 'unsubscribe') {
        const accounts = data.accounts || [];
        for (const account of accounts) {
          const subscriptionId = ws.subscribedAccounts.get(account);
          if (subscriptionId !== undefined) {
            await connection.removeAccountChangeListener(subscriptionId);
            ws.subscribedAccounts.delete(account);
            console.log(`已取消对账户 ${account} 的订阅`);
          } else {
            console.warn(`账户 ${account} 未订阅，无需取消`);
          }
        }
      }
    } catch (error) {
      console.error('处理 WebSocket 消息时出错:', error);
    }
  });

  ws.on('close', () => {
    console.log('前端已断开连接，后端已接收');
    // 移除所有账户的订阅
    ws.subscribedAccounts.forEach(async (subscriptionId, account) => {
      try {
        await connection.removeAccountChangeListener(subscriptionId);
        console.log(`账户 ${account} 的监听器已移除`);
      } catch (error) {
        console.error(`移除账户 ${account} 的监听器时出错:`, error);
      }
    });
    ws.subscribedAccounts.clear(); // 清空 Map
  });
});
