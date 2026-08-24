/**
 * 媒体地址契约快照
 *
 * 纯数据常量：记录 getMediaUrl 的 URL 归一化规则。
 * 来源：frontend/src/lib/media.ts。不引入任何测试框架。
 */

export const MEDIA_CONTRACT = {
  getMediaUrl: {
    method: 'LOCAL',
    endpoint: '纯函数：相对媒体路径 → 绝对 URL',
    rules: [
      '空值 → 空字符串',
      'http://、https://、data:、blob:、/api/ 开头 → 原样返回',
      '/ 开头 → API_BASE_URL（去尾斜杠）拼接',
      '其余相对形式 → 原样返回',
    ],
    consume: ['url', "process.env.NEXT_PUBLIC_API_URL (默认 http://localhost:8083)"],
  },
} as const;
