// solanaService.js

require('dotenv').config();
const { Connection, PublicKey } = require('@solana/web3.js');

const RPC_ENDPOINT = process.env.RPC_ENDPOINT;
const WS_ENDPOINT = process.env.WS_ENDPOINT;

if (!RPC_ENDPOINT || !WS_ENDPOINT) {
  console.error('RPC_ENDPOINT 或 WS_ENDPOINT 未在环境变量中定义。请在 .env 文件中设置它们。');
  process.exit(1);
}

const connection = new Connection(RPC_ENDPOINT, {
  commitment: 'finalized',
  wsEndpoint: WS_ENDPOINT,
});

// 查询 SOL 余额
async function fetchSolBalance(walletAddress) {
  try {
    const balance = await connection.getBalance(new PublicKey(walletAddress));
    return balance / 1e9; // 转换为 SOL
  } catch (error) {
    console.error('获取 SOL 余额时出错:', error);
    throw error;
  }
}

// 查询 SPL Token 余额
async function fetchAllSplTokenBalances(walletAddress) {
  try {
    const response = await connection.getParsedTokenAccountsByOwner(
      new PublicKey(walletAddress),
      { programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') }
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
    console.error('获取 SPL Token 余额时出错:', error);
    throw error;
  }
}

module.exports = {
  fetchSolBalance,
  fetchAllSplTokenBalances,
  connection,
};
