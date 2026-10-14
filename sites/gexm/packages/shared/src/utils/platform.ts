export type PlatformType = 'h5' | 'mp-weixin' | 'mp-alipay' | 'mp-baidu' | 'mp-toutiao' | 'mp-harmony' | 'app-plus' | 'app' | 'app-harmony' | 'desktop' | 'server' | 'unknown';

export interface PlatformInfo {
  platform: PlatformType;
  isH5: boolean;
  isMp: boolean;
  isApp: boolean;
  isWeiXin: boolean;
  isAliPay: boolean;
}

export function getPlatform(): PlatformType {
  // #ifdef H5
  return 'h5';
  // #endif

  // #ifdef MP-WEIXIN
  return 'mp-weixin';
  // #endif

  // #ifdef MP-ALIPAY
  return 'mp-alipay';
  // #endif

  // #ifdef MP-BAIDU
  return 'mp-baidu';
  // #endif

  // #ifdef MP-TOUTIAO
  return 'mp-toutiao';
  // #endif

  // #ifdef MP-HARMONY
  return 'mp-harmony';
  // #endif

  // #ifdef APP-PLUS
  return 'app-plus';
  // #endif

  // #ifdef APP-HARMONY
  return 'app-harmony';
  // #endif

  // #ifdef APP
  return 'app';
  // #endif

  // #ifdef DESKTOP
  return 'desktop';
  // #endif

  // #ifdef SERVER
  return 'server';
  // #endif

  return 'unknown';
}

export function getPlatformInfo(): PlatformInfo {
  const platform = getPlatform();
  return {
    platform,
    isH5: platform === 'h5',
    isMp: ['mp-weixin', 'mp-alipay', 'mp-baidu', 'mp-toutiao', 'mp-harmony'].includes(platform),
    isApp: ['app-plus', 'app', 'app-harmony'].includes(platform),
    isWeiXin: platform === 'mp-weixin',
    isAliPay: platform === 'mp-alipay',
  };
}

export function isH5(): boolean {
  return getPlatform() === 'h5';
}

export function isMp(): boolean {
  const platform = getPlatform();
  return ['mp-weixin', 'mp-alipay', 'mp-baidu', 'mp-toutiao'].includes(platform);
}

export function isApp(): boolean {
  const platform = getPlatform();
  return ['app-plus', 'app'].includes(platform);
}

export function isWeiXin(): boolean {
  return getPlatform() === 'mp-weixin';
}

export function isAliPay(): boolean {
  return getPlatform() === 'mp-alipay';
}