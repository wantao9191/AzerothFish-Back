# 假设你在项目根目录
# 替换 user@ip:/path 为你的真实服务器信息
scp -r src drizzle package.json pnpm-lock.yaml next.config.mjs tsconfig.json drizzle.config.ts Dockerfile docker-compose.yml root@118.195.188.242:/root/azeroth-fish-back/
docker compose up -d --build

#重启
sudo systemctl restart nginx

# 启动
sudo systemctl start nginx

# 停止
sudo systemctl stop nginx

# 重启
sudo systemctl restart nginx

# 重新加载配置（不中断连接，推荐）
sudo systemctl reload nginx

# 查看状态
sudo systemctl status nginx
