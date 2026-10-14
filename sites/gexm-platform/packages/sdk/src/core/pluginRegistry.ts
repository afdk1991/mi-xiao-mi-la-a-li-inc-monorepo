import type { IPlugin } from '@/interfaces/IPluginHost';
import type { IPlatformAdapter } from '@/interfaces/IPlatformAdapter';

export class PluginRegistry {
  private plugins = new Map<string, IPlugin>();
  private adapter: IPlatformAdapter | null = null;
  private pluginLoadedListeners: ((plugin: IPlugin) => void)[] = [];
  private pluginUnloadedListeners: ((pluginId: string) => void)[] = [];

  setAdapter(adapter: IPlatformAdapter): void {
    this.adapter = adapter;
  }

  getAdapter(): IPlatformAdapter | null {
    return this.adapter;
  }

  register(plugin: IPlugin): void {
    if (this.plugins.has(plugin.id)) {
      throw new Error(`Plugin already registered: ${plugin.id}`);
    }

    this.plugins.set(plugin.id, plugin);

    if (this.adapter && plugin.isEnabled()) {
      plugin.init(this.adapter);
    }

    this.pluginLoadedListeners.forEach((listener) => {
      try {
        listener(plugin);
      } catch {
        // ignore
      }
    });
  }

  unregister(pluginId: string): void {
    const plugin = this.plugins.get(pluginId);
    if (plugin) {
      plugin.destroy();
      this.plugins.delete(pluginId);

      this.pluginUnloadedListeners.forEach((listener) => {
        try {
          listener(pluginId);
        } catch {
          // ignore
        }
      });
    }
  }

  getPlugin(pluginId: string): IPlugin | undefined {
    return this.plugins.get(pluginId);
  }

  getAllPlugins(): IPlugin[] {
    return Array.from(this.plugins.values());
  }

  getEnabledPlugins(): IPlugin[] {
    return this.getAllPlugins().filter((plugin) => plugin.isEnabled());
  }

  enablePlugin(pluginId: string): void {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin not found: ${pluginId}`);
    }

    plugin.enable();

    if (this.adapter) {
      plugin.init(this.adapter);
    }
  }

  disablePlugin(pluginId: string): void {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin not found: ${pluginId}`);
    }

    plugin.disable();
    plugin.destroy();
  }

  initAllPlugins(): void {
    if (!this.adapter) {
      throw new Error('Platform adapter not set');
    }

    this.plugins.forEach((plugin) => {
      if (plugin.isEnabled()) {
        try {
          plugin.init(this.adapter!);
        } catch (error) {
          console.error(`Failed to initialize plugin ${plugin.id}:`, error);
        }
      }
    });
  }

  destroyAllPlugins(): void {
    this.plugins.forEach((plugin) => {
      try {
        plugin.destroy();
      } catch (error) {
        console.error(`Failed to destroy plugin ${plugin.id}:`, error);
      }
    });
  }

  hasPlugin(pluginId: string): boolean {
    return this.plugins.has(pluginId);
  }

  isRegistered(pluginId: string): boolean {
    return this.plugins.has(pluginId);
  }

  getPluginCount(): number {
    return this.plugins.size;
  }

  getPluginInfo(pluginId: string): ReturnType<IPlugin['getInfo']> | undefined {
    const plugin = this.plugins.get(pluginId);
    return plugin?.getInfo();
  }

  onPluginLoaded(listener: (plugin: IPlugin) => void): () => void {
    this.pluginLoadedListeners.push(listener);
    return () => {
      this.pluginLoadedListeners = this.pluginLoadedListeners.filter((l) => l !== listener);
    };
  }

  onPluginUnloaded(listener: (pluginId: string) => void): () => void {
    this.pluginUnloadedListeners.push(listener);
    return () => {
      this.pluginUnloadedListeners = this.pluginUnloadedListeners.filter((l) => l !== listener);
    };
  }
}