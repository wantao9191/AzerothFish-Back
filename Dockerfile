FROM node:20-alpine AS base

# 设置时区
RUN apk add --no-cache tzdata
ENV TZ=Asia/Shanghai

# 1. 依赖安装阶段
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# 复制依赖文件
COPY package.json pnpm-lock.yaml* ./
# 安装 pnpm 并安装依赖
RUN npm install -g pnpm && pnpm i --frozen-lockfile

# 2. 构建阶段
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 禁用 Next.js 遥测
ENV NEXT_TELEMETRY_DISABLED 1

# 设置临时的 DATABASE_URL 以绕过构建时的检查
ENV DATABASE_URL="postgres://user:pass@localhost:5432/db"
ENV WX_APP_ID="build_mock_id"
ENV WX_APP_SECRET="build_mock_secret"
ENV AUTH_SECRET="build_mock_secret"

# 安装 pnpm 并构建项目
RUN npm install -g pnpm && pnpm run build

# 3. 运行阶段
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 复制构建产物
# COPY --from=builder /app/public ./public

# 自动复制 standalone 构建产物
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
# 绑定所有接口
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]