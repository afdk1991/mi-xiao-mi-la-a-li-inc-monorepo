import type { PlatformType } from './ITypes';
import type { INetworkModule } from './INetworkModule';
import type { IStorageModule } from './IStorageModule';
import type { ICryptoModule } from './ICryptoModule';
import type { ILogModule } from './ILogModule';
import type { ITerminalModule } from './ITerminalModule';

export interface IPlatformAdapter {
  readonly platform: PlatformType;

  readonly name: string;

  readonly version: string;

  network: INetworkModule;

  storage: IStorageModule;

  crypto: ICryptoModule;

  log: ILogModule;

  terminal: ITerminalModule;

  init(config?: Record<string, any>): void;

  destroy(): void;

  isSupported(): boolean;

  getPlatformInfo(): {
    platform: PlatformType;
    os?: string;
    osVersion?: string;
    deviceModel?: string;
    browser?: string;
    browserVersion?: string;
  };
}