import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from './lib/auth';
import { ResultCode } from './lib/response';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. 定义公开路径（无需登录即可访问）
  const publicPaths = [
    '/api/auth/login'
    // 如果有其他公开接口，如获取配置、注册等，添加在这里
  ];

  // 2. 如果是公开路径或非 API 路径，直接放行
  // 注意：Next.js 的 middleware 默认也会拦截静态资源，通常在 config.matcher 中排除，但这里双重保险
  if (publicPaths.some(path => pathname.startsWith(path)) || !pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  // 3. 获取 Token
  // 约定前端在 Header 中传递：Authorization: Bearer <token>
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return NextResponse.json(
      { code: ResultCode.UNAUTHORIZED, message: '未登录或Token缺失' },
      { status: 401 }
    );
  }

  // 4. 验证 Token
  const payload = await verifyToken(token);

  if (!payload) {
    return NextResponse.json(
      { code: ResultCode.UNAUTHORIZED, message: 'Token无效或已过期' },
      { status: 401 }
    );
  }

  // 5. 验证通过，将用户信息注入 Header 供后续使用
  // 注意：Header 的值只能是字符串
  const requestHeaders = new Headers(request.headers);
  if (payload.openid) {
    requestHeaders.set('x-user-openid', payload.openid as string);
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

// 配置匹配规则，仅拦截 /api 下的路由
export const config = {
  matcher: '/api/:path*',
};
