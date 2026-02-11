import { success, error as errorResponse, ResultCode } from "@/lib/response";
// @ts-ignore
import STS from "qcloud-cos-sts";

export async function GET(request: Request) {
  // 解析请求参数获取模块类型
  const { searchParams } = new URL(request.url);
  const moduleType = searchParams.get("module") || "common";

  // 定义允许的模块及其对应的存储目录
  const allowedModules: Record<string, string> = {
    avatar: "avatars",     // 头像 -> avatars/
    resource: "resources", // 资源 -> resources/
    common: "common",      // 通用 -> common/
  };

  // 校验模块类型
  if (!allowedModules[moduleType]) {
    return errorResponse("Invalid module type", ResultCode.ERROR, 400);
  }

  const targetDir = allowedModules[moduleType];
  // 构造允许的路径前缀，例如 "avatars/*"
  const allowPrefix = `${targetDir}/*`;

  // 1. 获取配置
  const secretId = process.env.COS_SECRET_ID;
  const secretKey = process.env.COS_SECRET_KEY;
  const bucket = process.env.COS_BUCKET;
  const region = process.env.COS_REGION;
  const proxy = process.env.COS_PROXY;

  // 2. 校验配置
  if (!secretId || !secretKey || !bucket || !region) {
    console.error("Missing COS configuration. Please check environment variables.");
    return errorResponse("Server misconfiguration", ResultCode.ERROR, 500);
  }

  // 构造策略
  const policy = STS.getPolicy([
    {
      action: [
        // 简单上传
        "name/cos:PutObject",
        "name/cos:PostObject",
        // 分片上传
        "name/cos:InitiateMultipartUpload",
        "name/cos:ListMultipartUploads",
        "name/cos:ListParts",
        "name/cos:UploadPart",
        "name/cos:CompleteMultipartUpload",
        // 下载
        "name/cos:GetObject",
      ],
      bucket: bucket,
      region: region,
      prefix: allowPrefix,
    },
  ]);

  const config = {
    secretId,
    secretKey,
    proxy,
    durationSeconds: 1800,
    policy: policy,
  };

  // 3. 生成临时密钥
  try {
    const data = await new Promise((resolve, reject) => {
      // @ts-ignore
      STS.getCredential(config, (err, data) => {
        if (err) {
          reject(err);
        } else {
          // 返回计算出的路径前缀给前端，方便前端拼接文件名
          resolve({ ...data, bucket, region, dir: targetDir });
        }
      });
    });

    return success(data);
  } catch (err) {
    console.error("STS error:", err);
    return errorResponse("Failed to generate STS token", ResultCode.ERROR, 500);
  }
}
