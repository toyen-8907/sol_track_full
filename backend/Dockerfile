# 使用 Node.js 官方鏡像
FROM node:20

# 設置工作目錄
WORKDIR /app

# 複製 package.json 和 package-lock.json
COPY package*.json ./

# 安裝依賴
RUN npm install

# 複製專案檔案
COPY . .

# 開放服務的埠
EXPOSE 5001

# 啟動 Backend
CMD ["node", "server.js"]
