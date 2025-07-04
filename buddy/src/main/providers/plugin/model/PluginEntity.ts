/**
 * 插件实体类
 * 用于管理插件的所有相关信息，包括基本信息、路径、状态等
 */

import { join } from 'path';
import fs from 'fs';
import { readPackageJson, hasPackageJson } from '../util/PackageUtils.js';
import {
  ExecuteActionArgs,
  ExecuteResult,
  GetActionsArgs,
  PluginStatus,
  PluginType,
  SuperPlugin,
  ValidationResult,
} from '@coffic/buddy-types';
import { SendablePlugin } from '@/types/sendable-plugin.js';
import { PackageJson } from '@/types/package-json.js';

import { ActionEntity } from './ActionEntity.js';
import { LogFacade } from '@coffic/cosy-logger';

const title = '[PluginEntity] 🧩';

/**
 * 插件实体类
 */
export class PluginEntity {
  // 基本信息
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  main: string;
  validationError: string | null = null;
  path: string;
  type: PluginType;

  // 状态信息
  status: PluginStatus = 'active';
  error?: string;
  validation?: ValidationResult;
  isBuddyPlugin: boolean = true; // 是否是Buddy插件
  instance?: any; // 插件实例

  /**
   * 从目录创建插件实体
   *
   * @param pluginPath 插件目录路径
   * @param type 插件类型
   */
  public static async fromDir(
    pluginPath: string,
    type: PluginType
  ): Promise<PluginEntity> {
    if (!(await hasPackageJson(pluginPath))) {
      throw new Error(`插件目录 ${pluginPath} 缺少 package.json`);
    }

    const packageJson = await readPackageJson(pluginPath);
    const plugin = new PluginEntity(packageJson, pluginPath, type);

    // 在创建时进行验证
    const validation = plugin.validatePackage(packageJson);
    plugin.setValidation(validation);

    return plugin;
  }

  /**
   * 从NPM包信息创建插件实体
   * @param npmPackage NPM包信息
   * @returns 插件实体
   */
  public static fromPackage(
    npmPackage: PackageJson,
    type: PluginType
  ): PluginEntity {
    // 创建插件实体
    const plugin = new PluginEntity(npmPackage, '', type);

    // 使用NPM包中的名称作为显示名称（如果有的话）
    if (npmPackage.name) {
      // 格式化名称，移除作用域前缀和常见插件前缀
      plugin.name = PluginEntity.formatPluginName(npmPackage.name);
    }

    return plugin;
  }

  /**
   * 格式化插件名称为更友好的显示名称
   * @param packageName 包名
   */
  private static formatPluginName(packageName: string): string {
    // 移除作用域前缀 (如 @coffic/)
    let name = packageName.replace(/@[^/]+\//, '');

    // 移除常见插件前缀
    const prefixes = ['plugin-', 'buddy-', 'gitok-'];
    for (const prefix of prefixes) {
      if (name.startsWith(prefix)) {
        name = name.substring(prefix.length);
        break;
      }
    }

    // 转换为标题格式 (每个单词首字母大写)
    return name
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * 构造函数
   * @param pkg package.json 内容
   * @param path 插件路径
   * @param type 插件类型
   */
  constructor(pkg: PackageJson, path: string, type: PluginType) {
    this.id = pkg.name;
    this.name = pkg.name;
    this.description = pkg.description || '';
    this.version = pkg.version || '0.0.0';
    this.author = pkg.author || '';
    this.main = pkg.main || '';
    this.path = path;
    this.type = type;
  }

  /**
   * 获取插件主文件的完整路径
   */
  get mainFilePath(): string {
    return join(this.path, this.main);
  }

  /**
   * 获取插件的 package.json 路径
   */
  get packageJsonPath(): string {
    return join(this.path, 'package.json');
  }

  /**
   * 设置插件状态
   */
  setStatus(status: PluginStatus, error?: string): void {
    this.status = status;
    this.error = error;
  }

  /**
   * 设置插件验证状态
   */
  setValidation(validation: ValidationResult): void {
    this.validation = validation;
  }

  /**
   * 获取page属性对应的文件的源代码
   * @returns 插件页面视图路径
   */
  getPageSourceCode(): string {
    return 'source code';
  }

  /**
   * 禁用插件
   */
  disable(): void {
    this.status = 'disabled';
  }

  /**
   * 启用插件
   */
  enable(): void {
    if (this.status === 'disabled') {
      this.status = 'inactive';
    }
  }

  /**
   * 验证插件包信息
   * @param pkg package.json 内容
   * @returns 验证结果
   */
  private validatePackage(pkg: PackageJson): ValidationResult {
    const errors: string[] = [];

    // 检查基本字段
    if (!pkg.name) errors.push('缺少插件名称');
    if (!pkg.version) errors.push('缺少插件版本');
    if (!pkg.description) errors.push('缺少插件描述');
    if (!pkg.author) errors.push('缺少作者信息');
    if (!pkg.main) errors.push('缺少入口文件');

    const validation = {
      isValid: errors.length === 0,
      errors,
    };

    // 如果验证失败，设置错误状态
    if (!validation.isValid) {
      this.setStatus('error', `插件验证失败: ${errors.join(', ')} `);
    }

    return validation;
  }

  /**
   * 删除插件
   */
  delete(): void {
    const pluginPath = this.path;
    if (!pluginPath || !fs.existsSync(pluginPath)) {
      throw new Error('插件目录不存在');
    }

    fs.rmdirSync(pluginPath, { recursive: true });
    LogFacade.channel('plugin').info(`${title} 插件 ${this.id} 删除成功`);
  }

  /**
   * 获取插件的动作列表
   * @param keyword 搜索关键词（可选）
   * @returns 插件动作列表
   */
  async getActions(args: GetActionsArgs): Promise<ActionEntity[]> {
    // 如果插件未加载或状态不正常，返回空数组
    if (this.status !== 'active') {
      LogFacade.channel('plugin').warn(
        `${title} 插件 ${this.id} 未加载或状态不正常(${this.status})，返回空动作列表`,
        await this.getSendablePlugin()
      );
      return [];
    }

    try {
      if (!this.instance) {
        this.instance = await this.load(); // 加载插件实例
      }

      // 如果插件实例上没有getActions方法，则返回空数组
      if (!this.instance || typeof this.instance.getActions !== 'function') {
        return [];
      }

      // 假设插件实例有一个 getActions 方法
      const rawActions = await this.instance.getActions(args);

      // 在这里创建 ActionEntity
      return rawActions.map((rawAction: any) =>
        ActionEntity.fromRawAction(rawAction, this)
      );
    } catch (error) {
      LogFacade.channel('plugin').error(`${title} 获取动作列表失败`, {
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  /**
   * 执行插件动作
   * @returns 执行结果
   */
  async executeAction(args: ExecuteActionArgs): Promise<ExecuteResult> {
    const { actionId } = args;

    LogFacade.channel('plugin').info(`${title} 执行动作`, {
      id: this.id,
      args,
    });

    const pluginModule = await this.load();
    if (!pluginModule) {
      LogFacade.channel('plugin').warn(
        `${title} 插件模块加载失败: ${this.id}, 无法执行动作: ${actionId}`
      );

      throw new Error(
        `${title} 插件模块加载失败: ${this.id}, 无法执行动作: ${actionId}`
      );
    }

    if (typeof pluginModule.executeAction !== 'function') {
      LogFacade.channel('plugin').warn(
        `${title} 插件 ${this.id} 未实现 executeAction 方法, 无法执行动作: ${actionId}`
      );

      throw new Error(
        `${title} 插件 ${this.id} 未实现 executeAction 方法, 无法执行动作: ${actionId}`
      );
    }

    return pluginModule.executeAction(args);
  }

  async getAction(actionId: string): Promise<ActionEntity | null> {
    const actions = await this.getActions({ version: '1.0.0' });
    return actions.find((action) => action.id === actionId) || null;
  }

  /**
   * 加载插件模块
   * @param plugin 插件实例
   * @returns 插件模块
   *
   * 原理: 使用Node.js的require系统动态加载JavaScript模块。
   * 这种方式允许在运行时按需加载插件代码，不需要在应用启动时就加载所有插件。
   * 通过删除require.cache并重新require，还可以实现插件的热更新。
   *
   * 安全风险:
   * 1. 插件代码在Node.js环境中运行，可以访问所有Node.js API
   * 2. 插件可以执行任意Node.js代码，包括文件操作、网络请求、系统命令等
   * 3. 没有内置的权限隔离机制
   *
   * TODO: 增强插件安全性
   * - [ ] 实现插件签名验证机制，只加载可信来源的插件
   * - [ ] 考虑使用沙箱环境(如vm模块)限制插件权限
   * - [ ] 实现插件进程隔离，在单独的进程中运行插件代码
   * - [ ] 定义严格的API接口，限制插件能力范围
   */
  public async load(): Promise<SuperPlugin> {
    try {
      const mainFilePath = this.mainFilePath;
      if (!fs.existsSync(mainFilePath)) {
        throw new Error(`${title} 插件入口文件不存在: ${mainFilePath}`);
      }

      delete require.cache[require.resolve(mainFilePath)];
      const module = require(mainFilePath);
      // 如果模块导出了plugin对象，使用它
      if (module.plugin) {
        return module.plugin;
      }
      // 否则尝试使用默认导出或整个模块
      return module.default || module;
    } catch (error: any) {
      this.setStatus('error', error.message);
      throw error;
    }
  }

  /**
   * 获取插件的主页面路径
   * @returns 插件主页面路径
   */
  async getPagePath(): Promise<string> {
    const module = await this.load();
    if (!module) {
      LogFacade.channel('plugin').warn(
        `${title} 插件 ${this.id} 加载失败，无法获取主页面路径`,
        {
          id: this.id,
          path: this.path,
          main: this.main,
          mainFilePath: this.mainFilePath,
        }
      );
      return '';
    }

    const pagePath = module.pagePath || '';
    const absolutePagePath = join(this.path, pagePath);

    return pagePath ? absolutePagePath : '';
  }

  /**
   * 获取插件的SendablePlugin对象，用于发送给渲染进程
   *
   * @returns 插件的SendablePlugin对象
   */
  public async getSendablePlugin(): Promise<SendablePlugin> {
    let pagePath = '';
    let errors: string[] = [];

    if (this.error) {
      errors.push(this.error);
    }

    try {
      pagePath = await this.getPagePath();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      errors.push(errorMessage);
    }

    return {
      id: this.id,
      name: this.name,
      description: this.description,
      version: this.version,
      author: this.author,
      path: this.path,
      validationError: this.validationError,
      status: this.status,
      type: this.type,
      error: errors.join(', '),
      pagePath: pagePath || '',
    };
  }
}
