import type { PluginInfo } from './ITypes';
import type { IPlatformAdapter } from './IPlatformAdapter';

export interface IPlugin {
  readonly id: string;

  readonly name: string;

  readonly version: string;

  readonly description?: string;

  init(adapter: IPlatformAdapter, config?: Record<string, any>): void;

  destroy(): void;

  isEnabled(): boolean;

  enable(): void;

  disable(): void;

  getInfo(): PluginInfo;
}

export interface IPluginHost {
  register(plugin: IPlugin): void;

  unregister(pluginId: string): void;

  getPlugin(pluginId: string): IPlugin | undefined;

  getAllPlugins(): IPlugin[];

  getEnabledPlugins(): IPlugin[];

  enablePlugin(pluginId: string): void;

  disablePlugin(pluginId: string): void;

  initAllPlugins(): void;

  destroyAllPlugins(): void;

  onPluginLoaded(listener: (plugin: IPlugin) => void): () => void;

  onPluginUnloaded(listener: (pluginId: string) => void): () => void;
}