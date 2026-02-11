import { NextResponse } from 'next/server';

export enum ResultCode {
  SUCCESS = 200,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  ERROR = 500,
}

export interface Result<T = any> {
  code: number;
  message: string;
  data?: T;
}

/**
 * 成功响应
 * @param data 返回的数据
 * @param message 消息提示
 */
export function success<T>(data: T, message: string = 'Success'): NextResponse<Result<T>> {
  return NextResponse.json({
    code: ResultCode.SUCCESS,
    message,
    data
  }, { status: 200 });
}

/**
 * 错误响应
 * @param message 错误消息
 * @param code 业务错误码 (默认为 500)
 * @param status HTTP 状态码 (默认为 200，如果希望前端收到非 200 状态码可传入对应值)
 */
export function error(
  message: string = 'Internal Server Error',
  code: ResultCode = ResultCode.ERROR,
  status: number = 200
): NextResponse<Result<null>> {
  return NextResponse.json({
    code,
    message,
  }, { status });
}
