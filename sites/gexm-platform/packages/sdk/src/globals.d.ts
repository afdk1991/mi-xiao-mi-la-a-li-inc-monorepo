interface Window {
  __wxjs_environment?: string;
  electron?: any;
  __uni__?: any;
  uni?: any;
}

declare const uni: any;

declare module '@dcloudio/uni-app' {
  export = uni;
}

declare module '@dcloudio/uni-h5' {
  export = uni;
}

declare module '@dcloudio/uni-mp-weixin' {
  export = uni;
}

declare module '@dcloudio/uni-mp-alipay' {
  export = uni;
}