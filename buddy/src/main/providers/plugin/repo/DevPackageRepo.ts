import { PluginEntity } from '../model/PluginEntity.js';
import { PluginType } from '@coffic/buddy-types';

export class DevPackageRepo {
  private enabled: boolean = true;

  // 单个插件的目录
  public rootDir: string;

  constructor(dir: string | null) {
    // 如果没有提供目录，则使用一个不会加载任何内容的假路径
    this.rootDir = dir ?? '';
    if (!dir) {
      this.enabled = false;
    }
  }

  public async get(): Promise<PluginEntity | null> {
    if (!this.enabled) {
      return null;
    }

    const plugin = await PluginEntity.fromDir(
      this.rootDir,
      this.getPluginType()
    );
    return plugin;
  }

  /**
   * 更新插件的根目录
   * @param newPath 新的根目录路径
   */
  public updatePackagePath(newPath: string): void {
    this.rootDir = newPath;
    this.enabled = true; // 确保仓库是启用的
  }

  /**
   * 获取插件类型
   */
  public getPluginType(): PluginType {
    return 'dev';
  }
}
