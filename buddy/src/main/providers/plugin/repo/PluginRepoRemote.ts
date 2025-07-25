import { npmRegistryService } from '@/main/service/NpmRegistryService.js';
import { PackageEntity } from '@/main/providers/plugin/model/PackageEntity.js';
import { PackageJson } from '@/types/package-json.js';
import { EMOJI } from '@/main/constants.js';
import { LogFacade } from '@coffic/cosy-framework';
import { SendablePackage } from '@/types/sendable-package';

const logger = console;

/**
 * 远程插件仓库
 * 负责从远程 npm registry 获取插件并缓存
 */
export class PluginRepoRemote {
  private static instance: PluginRepoRemote;

  // 缓存刷新时间间隔 (毫秒): 1小时
  private readonly CACHE_REFRESH_INTERVAL = 60 * 60 * 1000;

  // 上次缓存刷新时间
  private lastCacheRefreshTime: number = 0;

  // 包列表缓存
  private cachedRemotePackages: PackageEntity[] = [];

  /**
   * 刷新缓存标志，防止并发刷新
   */
  private isRefreshingCache = false;

  private constructor() {
    // 初始化时立即刷新包列表
    this.refreshRemotePackages();
    // 设置定时刷新
    setInterval(() => {
      this.refreshRemotePackages();
    }, this.CACHE_REFRESH_INTERVAL);
  }

  public static getInstance(): PluginRepoRemote {
    if (!PluginRepoRemote.instance) {
      PluginRepoRemote.instance = new PluginRepoRemote();
    }
    return PluginRepoRemote.instance;
  }

  /**
   * 获取远程包列表
   */
  public async getPackages(): Promise<PackageEntity[]> {
    try {
      // 检查缓存是否过期
      if (this.shouldRefreshCache() && !this.isRefreshingCache) {
        await this.refreshRemotePackages();
      }
      return this.cachedRemotePackages;
    } catch (error) {
      logger.error(
        `获取远程插件包列表失败: ${error instanceof Error ? error.message : String(error)}`
      );
      return [];
    }
  }

  public async getSendablePackages(): Promise<SendablePackage[]> {
    const packages = await this.getPackages();
    return packages.map((pkg) => pkg.toSendablePackage());
  }

  /**
   * 搜索并处理包
   */
  private async searchPackages(): Promise<PackageEntity[]> {
    try {
      const packages =
        await npmRegistryService.searchPackagesByKeyword('buddy-plugin');
      return packages.map((pkg: PackageJson) =>
        PackageEntity.fromPackageJSON(pkg, 'remote')
      );
    } catch (error) {
      logger.error(
        `搜索包失败: ${error instanceof Error ? error.message : String(error)}`
      );
      return [];
    }
  }

  /**
   * 刷新远程包列表缓存
   */
  private async refreshRemotePackages(): Promise<void> {
    try {
      logger.info('开始刷新远程包列表缓存');

      // 搜索 buddy-plugin 关键词
      const packages = await this.searchPackages();

      if (packages && Array.isArray(packages) && packages.length > 0) {
        this.cachedRemotePackages = packages;
        this.lastCacheRefreshTime = Date.now();
        LogFacade.channel('plugin').info(
          `${EMOJI} [PluginRepoRemote] 远程包列表缓存已更新, count`,
          {
            count: packages.length,
          }
        );
        return;
      }

      logger.warn(`${EMOJI} [PluginRepoRemote] 未能获取远程包列表`);
    } catch (error) {
      logger.error(`${EMOJI} [PluginRepoRemote] 刷新远程插件列表失败`, {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * 判断缓存是否需要刷新
   */
  private shouldRefreshCache(): boolean {
    const now = Date.now();
    return now - this.lastCacheRefreshTime > this.CACHE_REFRESH_INTERVAL;
  }

  getPluginType(): 'remote' {
    return 'remote';
  }
}

// 导出单例
export const remotePluginDB = PluginRepoRemote.getInstance();
