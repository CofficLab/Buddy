/**
 * 插件管理器
 * 负责插件的加载、管理和通信
 *
 * 插件目录结构：
 * {app.getPath('userData')}/plugins/
 * ├── user/                    # 用户安装的插件
 * │   ├── plugin-1/           # 插件目录
 * │   │   ├── package.json   # 插件信息
 * │   │   ├── main.js       # 插件主文件
 * │   │   └── ...           # 其他资源
 * │   └── plugin-2/
 * │       └── ...
 * ├── builtin/               # 内置插件
 * │   ├── plugin-3/
 * │   │   └── ...
 * │   └── plugin-4/
 * │       └── ...
 * └── dev/                   # 开发中的插件
 *     ├── plugin-5/
 *     │   └── ...
 *     └── plugin-6/
 *         └── ...
 */
import { app } from 'electron';
import { join } from 'path';
import { EventEmitter } from 'events';
import fs from 'fs';
import { Logger } from '../utils/Logger';
import { configManager } from './ConfigManager';
import type {
  Plugin,
  PluginPackage,
  StorePlugin,
  PluginAction,
} from '../../types';

class PluginManager extends EventEmitter {
  private static instance: PluginManager;
  private plugins: Map<string, Plugin> = new Map();
  private logger: Logger;
  private config: any;

  // 插件目录
  private pluginsDir: string;
  private builtinPluginsDir: string;
  private devPluginsDir: string;

  private constructor() {
    super();
    // 从配置文件中读取配置
    this.config = configManager.getPluginConfig();
    this.logger = new Logger('PluginManager', {
      enabled: this.config.enableLogging,
      level: this.config.logLevel,
    });

    // 初始化插件目录
    const userDataPath = app.getPath('userData');
    const appPath = app.getAppPath();
    const pluginsRootDir = join(userDataPath, 'plugins');

    this.pluginsDir = join(pluginsRootDir, 'user');
    this.builtinPluginsDir = join(pluginsRootDir, 'builtin');
    this.devPluginsDir = join(pluginsRootDir, 'dev');

    this.logger.info('PluginManager 初始化', {
      pluginsRootDir,
      pluginsDir: this.pluginsDir,
      builtinPluginsDir: this.builtinPluginsDir,
      devPluginsDir: this.devPluginsDir,
    });
  }

  /**
   * 获取 PluginManager 实例
   */
  public static getInstance(): PluginManager {
    if (!PluginManager.instance) {
      PluginManager.instance = new PluginManager();
    }
    return PluginManager.instance;
  }

  /**
   * 初始化插件系统
   */
  async initialize(): Promise<void> {
    try {
      this.logger.info('开始初始化插件系统');

      // 确保插件目录存在
      await this.ensurePluginDirs();

      // 加载插件
      await this.loadPlugins();

      this.logger.info('插件系统初始化完成');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('插件系统初始化失败', { error: errorMessage });
    }
  }

  /**
   * 获取插件目录信息
   */
  getPluginDirectories() {
    return {
      user: this.pluginsDir,
      builtin: this.builtinPluginsDir,
      dev: this.devPluginsDir,
    };
  }

  /**
   * 确保插件目录存在
   */
  private async ensurePluginDirs(): Promise<void> {
    try {
      const dirs = [
        this.pluginsDir, // 用户插件目录
        this.builtinPluginsDir, // 内置插件目录
        this.devPluginsDir, // 开发插件目录
      ];

      for (const dir of dirs) {
        if (!fs.existsSync(dir)) {
          this.logger.info(`创建插件目录: ${dir}`);
          await fs.promises.mkdir(dir, { recursive: true });
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('创建插件目录失败', { error: errorMessage });
      throw error;
    }
  }

  /**
   * 加载所有插件
   */
  private async loadPlugins(): Promise<void> {
    this.logger.info('开始加载插件');

    try {
      // 加载内置插件
      await this.loadBuiltinPlugins();

      // 加载用户安装的插件
      await this.loadUserPlugins();

      // 加载开发中的插件
      await this.loadDevPlugins();

      this.logger.info(`已加载 ${this.plugins.size} 个插件`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('加载插件失败', { error: errorMessage });
      throw error;
    }
  }

  /**
   * 加载内置插件
   */
  private async loadBuiltinPlugins(): Promise<void> {
    if (!fs.existsSync(this.builtinPluginsDir)) {
      this.logger.info('内置插件目录不存在，跳过加载');
      return;
    }

    try {
      const entries = await fs.promises.readdir(this.builtinPluginsDir, {
        withFileTypes: true,
      });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          await this.loadPlugin(join(this.builtinPluginsDir, entry.name), true);
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('加载内置插件失败', { error: errorMessage });
    }
  }

  /**
   * 加载用户安装的插件
   */
  private async loadUserPlugins(): Promise<void> {
    try {
      const entries = await fs.promises.readdir(this.pluginsDir, {
        withFileTypes: true,
      });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          await this.loadPlugin(join(this.pluginsDir, entry.name), false);
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('加载用户插件失败', { error: errorMessage });
    }
  }

  /**
   * 加载开发中的插件
   */
  private async loadDevPlugins(): Promise<void> {
    if (!fs.existsSync(this.devPluginsDir)) {
      this.logger.info('开发插件目录不存在，跳过加载');
      return;
    }

    try {
      const entries = await fs.promises.readdir(this.devPluginsDir, {
        withFileTypes: true,
      });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          await this.loadPlugin(
            join(this.devPluginsDir, entry.name),
            false,
            true
          );
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('加载开发插件失败', { error: errorMessage });
    }
  }

  /**
   * 加载单个插件
   */
  private async loadPlugin(
    pluginPath: string,
    isBuiltin: boolean,
    isDev: boolean = false
  ): Promise<void> {
    try {
      const packageJsonPath = join(pluginPath, 'package.json');
      if (!fs.existsSync(packageJsonPath)) {
        this.logger.warn(`插件 ${pluginPath} 缺少 package.json，跳过加载`);
        return;
      }

      const packageJson = JSON.parse(
        await fs.promises.readFile(packageJsonPath, 'utf8')
      ) as PluginPackage;

      // 验证插件包信息
      if (!this.validatePluginPackage(packageJson)) {
        this.logger.warn(
          `插件 ${pluginPath} 的 package.json 格式无效，跳过加载`
        );
        return;
      }

      // 优先使用 gitokPlugin.id 作为插件ID，其次使用包名
      const pluginId = packageJson.gitokPlugin?.id || packageJson.name;

      const plugin: Plugin = {
        id: pluginId,
        name: packageJson.name,
        description: packageJson.description,
        version: packageJson.version,
        author: packageJson.author,
        path: pluginPath,
        isBuiltin,
        isDev,
      };

      this.plugins.set(plugin.id, plugin);
      this.logger.info(`已加载插件: ${plugin.name} v${plugin.version}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`加载插件失败: ${pluginPath}`, { error: errorMessage });
    }
  }

  /**
   * 验证插件包信息
   */
  private validatePluginPackage(pkg: PluginPackage): boolean {
    return !!(
      pkg.name &&
      pkg.version &&
      pkg.description &&
      pkg.author &&
      pkg.main
    );
  }

  /**
   * 获取所有已安装的插件
   */
  getPlugins(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * 获取指定插件
   */
  getPlugin(pluginId: string): Plugin | undefined {
    return this.plugins.get(pluginId);
  }

  /**
   * 从目录中读取插件信息
   */
  private async readPluginsFromDir(dir: string): Promise<StorePlugin[]> {
    if (!fs.existsSync(dir)) {
      return [];
    }

    const plugins: StorePlugin[] = [];
    const entries = await fs.promises.readdir(dir, { withFileTypes: true });
    const directories = this.getPluginDirectories();

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const pluginPath = join(dir, entry.name);
      const packageJsonPath = join(pluginPath, 'package.json');

      try {
        if (!fs.existsSync(packageJsonPath)) {
          this.logger.warn(`插件 ${pluginPath} 缺少 package.json，跳过`);
          continue;
        }

        const packageJson = JSON.parse(
          await fs.promises.readFile(packageJsonPath, 'utf8')
        ) as PluginPackage;

        if (!this.validatePluginPackage(packageJson)) {
          this.logger.warn(`插件 ${pluginPath} 的 package.json 格式无效，跳过`);
          continue;
        }

        // 确定插件的当前位置
        let currentLocation: 'user' | 'builtin' | 'dev' | undefined;
        if (dir === this.devPluginsDir) {
          currentLocation = 'dev';
        } else if (dir === this.builtinPluginsDir) {
          currentLocation = 'builtin';
        } else if (dir === this.pluginsDir) {
          currentLocation = 'user';
        }

        plugins.push({
          id: packageJson.name,
          name: packageJson.name,
          description: packageJson.description,
          version: packageJson.version,
          author: packageJson.author,
          directories,
          recommendedLocation: currentLocation || 'user',
          currentLocation,
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        this.logger.error(`读取插件信息失败: ${pluginPath}`, {
          error: errorMessage,
        });
      }
    }

    return plugins;
  }

  /**
   * 获取插件商店列表
   */
  async getStorePlugins(): Promise<StorePlugin[]> {
    this.logger.info('获取插件商店列表');

    try {
      // 从各个目录读取插件
      const [userPlugins, builtinPlugins, devPlugins] = await Promise.all([
        this.readPluginsFromDir(this.pluginsDir),
        this.readPluginsFromDir(this.builtinPluginsDir),
        this.readPluginsFromDir(this.devPluginsDir),
      ]);

      // 合并所有插件列表
      const allPlugins = [...userPlugins, ...builtinPlugins, ...devPlugins];

      // 按照插件名称排序
      allPlugins.sort((a, b) => a.name.localeCompare(b.name));

      return allPlugins;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('获取插件列表失败', { error: errorMessage });
      return [];
    }
  }

  /**
   * 获取插件动作
   * @param keyword 搜索关键词
   * @returns 匹配的插件动作列表
   */
  async getPluginActions(keyword: string = ''): Promise<PluginAction[]> {
    this.logger.info(`获取插件动作，关键词: "${keyword}"`);
    let allActions: PluginAction[] = [];

    try {
      // 从所有加载的插件中获取动作
      for (const plugin of this.plugins.values()) {
        try {
          // 动态加载插件入口文件
          const pluginModule = await this.loadPluginModule(plugin);

          if (pluginModule && typeof pluginModule.getActions === 'function') {
            const pluginActions = await pluginModule.getActions(keyword);
            if (Array.isArray(pluginActions)) {
              allActions = [...allActions, ...pluginActions];
            }
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          this.logger.error(`获取插件 ${plugin.id} 的动作失败`, {
            error: errorMessage,
          });
        }
      }

      this.logger.info(`找到 ${allActions.length} 个匹配的动作`);
      return allActions;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('获取插件动作失败', { error: errorMessage });
      return [];
    }
  }

  /**
   * 执行插件动作
   * @param actionId 要执行的动作ID
   * @returns 执行结果
   */
  async executePluginAction(actionId: string): Promise<any> {
    this.logger.info(`执行插件动作: ${actionId}`);

    try {
      // 解析插件ID和动作ID
      const [pluginId] = actionId.split(':');
      if (!pluginId) {
        throw new Error(`无效的动作ID: ${actionId}`);
      }

      // 获取插件实例
      const plugin = this.getPlugin(pluginId);
      if (!plugin) {
        throw new Error(`未找到插件: ${pluginId}`);
      }

      // 加载插件模块
      const pluginModule = await this.loadPluginModule(plugin);
      if (!pluginModule || typeof pluginModule.executeAction !== 'function') {
        throw new Error(`插件 ${pluginId} 不支持执行动作`);
      }

      // 获取动作信息
      const actions = await this.getPluginActions();
      const actionInfo = actions.find((a) => a.id === actionId);

      if (!actionInfo) {
        throw new Error(`未找到动作: ${actionId}`);
      }

      // 执行动作
      return await pluginModule.executeAction(actionInfo);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`执行插件动作失败: ${actionId}`, {
        error: errorMessage,
      });
      throw error;
    }
  }

  /**
   * 获取动作视图内容
   * @param actionId 动作ID
   * @returns 视图内容
   */
  async getActionView(actionId: string): Promise<string> {
    this.logger.info(`获取动作视图: ${actionId}`);

    try {
      // 解析插件ID
      const [pluginId] = actionId.split(':');
      if (!pluginId) {
        throw new Error(`无效的动作ID: ${actionId}`);
      }

      // 获取插件实例
      const plugin = this.getPlugin(pluginId);
      if (!plugin) {
        throw new Error(`未找到插件: ${pluginId}`);
      }

      // 获取动作信息
      const actions = await this.getPluginActions();
      const actionInfo = actions.find((a) => a.id === actionId);

      if (!actionInfo || !actionInfo.viewPath) {
        throw new Error(`动作 ${actionId} 没有关联视图`);
      }

      // 加载插件模块
      const pluginModule = await this.loadPluginModule(plugin);
      if (!pluginModule || typeof pluginModule.getViewContent !== 'function') {
        throw new Error(`插件 ${pluginId} 不支持获取视图内容`);
      }

      // 获取视图内容
      return await pluginModule.getViewContent(actionInfo.viewPath);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`获取动作视图失败: ${actionId}`, {
        error: errorMessage,
      });
      throw error;
    }
  }

  /**
   * 加载插件模块
   * @param plugin 插件实例
   * @returns 插件模块
   */
  private async loadPluginModule(plugin: Plugin): Promise<any> {
    try {
      const mainFilePath = join(plugin.path, 'index.js');
      if (!fs.existsSync(mainFilePath)) {
        throw new Error(`插件主入口文件不存在: ${mainFilePath}`);
      }

      // 清除缓存以确保重新加载
      delete require.cache[require.resolve(mainFilePath)];

      // 动态导入插件模块
      return require(mainFilePath);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`加载插件模块失败: ${plugin.id}`, {
        error: errorMessage,
      });
      throw error;
    }
  }
}

// 导出单例
export const pluginManager = PluginManager.getInstance();
