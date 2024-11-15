// 在 wss.on('connection', (ws) => { ... }) 中

// 在 wss.on('connection', (ws) => { ... }) 中

wss.on('connection', (ws) => {
  console.log('前端已透过 WebSocket 连接');

  // 在连接建立时，初始化订阅的账户列表
  ws.subscribedAccounts = new Set();

  // 心跳定时器
  const interval = setInterval(() => {
    ws.send(JSON.stringify({ type: 'heartbeat', message: '心跳测试' }));
  }, 5000);

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      const { action, account } = data;

      if (action === 'subscribe') {
        // 订阅账户变动
        const publicKey = new PublicKey(account);

        // 检查是否已经订阅过
        if (!ws.subscribedAccounts.has(account)) {
          const subscriptionId = connection.onAccountChange(
            publicKey,
            async (accountInfo) => {
              console.log(`检测到账户 ${account} 变动`);
              try {
                const lamports = accountInfo.lamports;
                console.log(`账户 ${account} lamports:`, lamports);

                if (lamports !== undefined) {
                  const balance = lamports / 1000000000;
                  ws.send(JSON.stringify({ type: 'solBalance', account, balance }));
                  console.log(`发送账户 ${account} 的 SOL 余额更新:`, balance);
                }

                const splTokenBalances = await fetchAllSplTokenBalances(account);
                ws.send(JSON.stringify({ type: 'splBalances', account, balances: splTokenBalances }));
                console.log(`发送账户 ${account} 的 SPL 代币余额更新:`, splTokenBalances);
              } catch (error) {
                console.error('处理账户变动时出错:', error);
              }
            },
            'finalized'
          );

          // 在 WebSocket 对象中存储订阅信息
          ws.subscribedAccounts.add(account);
          ws[`subscriptionId_${account}`] = subscriptionId;
        }
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

    // 移除所有账户的变动监听器
    ws.subscribedAccounts.forEach((account) => {
      const subscriptionId = ws[`subscriptionId_${account}`];
      if (subscriptionId !== undefined) {
        connection.removeAccountChangeListener(subscriptionId)
          .then(() => {
            console.log(`已移除账户 ${account} 的变化监听器。`);
          })
          .catch((error) => {
            console.error('移除账户变化监听器时出错:', error);
          });
      }
    });
  });
});
