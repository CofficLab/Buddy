/**
 * 窗口管理器
 * 负责创建、管理主窗口以及处理窗口相关配置和事件
 */
import { app, shell, BrowserWindow, screen, globalShortcut } from 'electron';
import { join } from 'path';
import { is } from '@electron-toolkit/utils';
import icon from '../../../resources/icon.png?asset';
import { EventEmitter } from 'events';
import { ConfigManager } from './ConfigManager';
import { Logger } from '../utils/Logger';

export class WindowManager extends EventEmitter {
  private mainWindow: BrowserWindow | null = null;
  private configManager: ConfigManager;
  private logger: Logger;
  private quitting: boolean = false;

  constructor(configManager: ConfigManager) {
    super();
    this.configManager = configManager;
    this.logger = new Logger('WindowManager');
    this.logger.info('WindowManager 初始化');
  }

  /**
   * 获取主窗口实例
   */
  getMainWindow(): BrowserWindow | null {
    return this.mainWindow;
  }

  /**
   * 设置应用即将退出状态
   */
  setQuitting(isQuitting: boolean): void {
    this.quitting = isQuitting;
    this.logger.debug(`设置应用退出状态: ${isQuitting}`);
  }

  /**
   * 创建主窗口
   */
  createWindow(): BrowserWindow {
    this.logger.info('开始创建主窗口');
    const windowConfig = this.configManager.getWindowConfig();
    const showTrafficLights = windowConfig.showTrafficLights;
    const showDebugToolbar = windowConfig.showDebugToolbar;
    const debugToolbarPosition = windowConfig.debugToolbarPosition || 'right';
    const spotlightMode = windowConfig.spotlightMode;
    const spotlightSize = windowConfig.spotlightSize || {
      width: 700,
      height: 500,
    };
    const alwaysOnTop = windowConfig.alwaysOnTop;

    this.logger.debug('窗口配置', { windowConfig });

    // 如果窗口已经存在，先销毁它
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.logger.debug('销毁已存在的窗口');
      this.mainWindow.destroy();
    }

    // 基本窗口配置
    const windowOptions: Electron.BrowserWindowConstructorOptions = {
      width: spotlightMode ? spotlightSize.width : 1200,
      height: spotlightMode ? spotlightSize.height : 1400,
      show: false,
      autoHideMenuBar: true,
      ...(process.platform === 'linux' ? { icon } : {}),
      webPreferences: {
        preload: join(__dirname, '../../preload/index.js'),
        sandbox: false,
      },
    };

    // Spotlight模式特定配置
    if (spotlightMode) {
      this.logger.debug('应用Spotlight模式窗口配置');
      Object.assign(windowOptions, {
        frame: false,
        transparent: true,
        resizable: false,
        movable: true,
        center: true,
        alwaysOnTop: alwaysOnTop,
        skipTaskbar: true,
        vibrancy: 'under-window', // macOS 特效
        visualEffectState: 'active',
        roundedCorners: true,
      });

      // 如果在macOS上，隐藏dock图标
      if (process.platform === 'darwin' && app.dock) {
        this.logger.debug('在macOS上隐藏Dock图标');
        app.dock.hide();
      }
    } else {
      // 常规模式下的macOS特定配置
      if (process.platform === 'darwin') {
        this.logger.debug('应用常规模式macOS窗口配置');
        Object.assign(windowOptions, {
          titleBarStyle: showTrafficLights ? 'default' : 'hiddenInset',
          trafficLightPosition: showTrafficLights
            ? undefined
            : { x: -20, y: -20 },
        });
      }
    }

    // 创建浏览器窗口
    this.logger.debug('创建浏览器窗口', { options: windowOptions });
    this.mainWindow = new BrowserWindow(windowOptions);

    // 窗口加载完成后显示
    this.mainWindow.on('ready-to-show', () => {
      this.logger.debug('窗口准备就绪');
      if (!spotlightMode && this.mainWindow) {
        this.logger.info('显示主窗口');
        this.mainWindow.show();
      }

      // 根据配置决定是否打开开发者工具及其位置
      if (showDebugToolbar && this.mainWindow) {
        this.logger.debug(`打开开发者工具，位置: ${debugToolbarPosition}`);
        this.mainWindow.webContents.openDevTools({
          mode: debugToolbarPosition,
        });
      }
    });

    // 处理外部链接
    this.mainWindow.webContents.setWindowOpenHandler((details) => {
      this.logger.debug('拦截外部链接打开请求', { url: details.url });
      shell.openExternal(details.url);
      return { action: 'deny' };
    });

    // HMR for renderer base on electron-vite cli.
    // Load the remote URL for development or the local html file for production.
    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
      this.logger.debug('开发模式：加载开发服务器URL', {
        url: process.env['ELECTRON_RENDERER_URL'],
      });
      this.mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
    } else {
      const htmlPath = join(__dirname, '../../renderer/index.html');
      this.logger.debug('生产模式：加载本地HTML文件', { path: htmlPath });
      this.mainWindow.loadFile(htmlPath);
    }

    // Spotlight模式下设置窗口失焦自动隐藏
    if (spotlightMode) {
      this.logger.debug('Spotlight模式：设置窗口失焦自动隐藏');
      this.setupBlurHandler();
    }

    this.logger.info('主窗口创建完成');
    return this.mainWindow;
  }

  /**
   * 设置窗口失焦处理
   */
  private setupBlurHandler(): void {
    if (!this.mainWindow) return;

    this.mainWindow.on('blur', () => {
      const windowConfig = this.configManager.getWindowConfig();
      // 添加一个小延迟，防止窗口刚显示就触发blur事件
      if (
        this.mainWindow &&
        !this.mainWindow.isDestroyed() &&
        windowConfig.spotlightMode
      ) {
        // 使用标志记录最后一次显示的时间
        // @ts-ignore 忽略类型检查错误
        const lastShowTime = this.mainWindow.lastShowTime || 0;
        const now = Date.now();

        // @ts-ignore 忽略类型检查错误
        const justTriggered = this.mainWindow.justTriggered === true;

        // 如果窗口刚刚被触发显示，或者刚刚显示（小于500毫秒），则不要立即隐藏
        if (justTriggered || now - lastShowTime < 500) {
          this.logger.debug('忽略失焦事件，窗口刚刚显示');
        } else {
          this.logger.info('窗口失去焦点，自动隐藏');
          this.mainWindow.hide();
        }
      }
    });
  }

  /**
   * 显示或隐藏主窗口
   */
  toggleMainWindow(): void {
    if (!this.mainWindow) {
      this.logger.warn('尝试切换窗口状态但没有主窗口实例');
      return;
    }

    const windowConfig = this.configManager.getWindowConfig();

    if (this.mainWindow.isVisible()) {
      this.logger.info('窗口当前可见，执行隐藏操作');
      this.mainWindow.hide();
    } else {
      this.logger.info('窗口当前不可见，执行显示操作');

      // 获取当前鼠标所在屏幕的信息
      const cursorPoint = screen.getCursorScreenPoint();
      const currentDisplay = screen.getDisplayNearestPoint(cursorPoint);
      this.logger.debug('获取屏幕信息', {
        cursorPoint,
        display: {
          id: currentDisplay.id,
          bounds: currentDisplay.bounds,
          workArea: currentDisplay.workArea,
        },
      });

      // 计算窗口在当前显示器上的居中位置
      const windowWidth =
        windowConfig.spotlightMode && windowConfig.spotlightSize
          ? windowConfig.spotlightSize.width
          : this.mainWindow.getBounds().width;
      const windowHeight =
        windowConfig.spotlightMode && windowConfig.spotlightSize
          ? windowConfig.spotlightSize.height
          : this.mainWindow.getBounds().height;

      const x = Math.floor(
        currentDisplay.workArea.x +
          (currentDisplay.workArea.width - windowWidth) / 2
      );
      const y = Math.floor(
        currentDisplay.workArea.y +
          (currentDisplay.workArea.height - windowHeight) / 2
      );

      this.logger.debug('计算窗口位置', { windowWidth, windowHeight, x, y });

      // 记录显示时间戳
      // @ts-ignore 忽略类型检查错误
      this.mainWindow.lastShowTime = Date.now();
      // 设置额外的标志，表示窗口刚刚被通过快捷键打开
      // @ts-ignore 忽略类型检查错误
      this.mainWindow.justTriggered = true;
      this.logger.debug('设置窗口保护标志，防止立即失焦隐藏');

      // 窗口是否跟随桌面
      if (windowConfig.followDesktop) {
        this.logger.info('窗口配置为跟随桌面模式');

        // macOS特定优化
        if (process.platform === 'darwin') {
          this.logger.debug('跨桌面显示窗口：执行macOS特定优化');

          // 1. 先确保窗口不可见
          if (this.mainWindow.isVisible()) {
            this.logger.debug('窗口已可见，先隐藏');
            this.mainWindow.hide();
          }

          // 2. 设置位置
          this.logger.debug(`设置窗口位置 (${x}, ${y})`);
          this.mainWindow.setPosition(x, y);

          // 3. 使窗口在所有工作区可见
          this.logger.debug('设置窗口在所有工作区可见');
          this.mainWindow.setVisibleOnAllWorkspaces(true);

          // 4. 确保窗口是顶层窗口
          const originalAlwaysOnTop = this.mainWindow.isAlwaysOnTop();
          this.logger.debug(
            `临时设置窗口置顶，原始状态: ${originalAlwaysOnTop}`
          );
          this.mainWindow.setAlwaysOnTop(true);

          // 5. 显示窗口
          this.logger.debug('显示窗口');
          this.mainWindow.show();

          // 6. 确保窗口聚焦
          this.logger.debug('聚焦窗口');
          this.mainWindow.focus();

          // 7. 还原到单桌面可见（重要：延迟执行这一步）
          setTimeout(() => {
            if (this.mainWindow && !this.mainWindow.isDestroyed()) {
              this.logger.debug('将窗口设置回当前工作区可见');
              this.mainWindow.setVisibleOnAllWorkspaces(false);
              // 还原原始的置顶状态
              this.logger.debug(
                `还原窗口置顶状态: ${originalAlwaysOnTop || !!windowConfig.alwaysOnTop}`
              );
              this.mainWindow.setAlwaysOnTop(
                originalAlwaysOnTop || !!windowConfig.alwaysOnTop
              );

              // 延迟500毫秒后重置justTriggered标志
              setTimeout(() => {
                if (this.mainWindow && !this.mainWindow.isDestroyed()) {
                  // @ts-ignore 忽略类型检查错误
                  this.mainWindow.justTriggered = false;
                  this.logger.debug('窗口触发保护期已结束');
                }
              }, 500);
            }
          }, 300);
        } else {
          // 其他平台的处理
          this.logger.debug('非macOS平台跨桌面显示窗口');
          this.mainWindow.setPosition(x, y);
          this.mainWindow.setVisibleOnAllWorkspaces(true, {
            visibleOnFullScreen: true,
          });
          this.mainWindow.show();
          this.mainWindow.focus();
          this.mainWindow.setVisibleOnAllWorkspaces(false);

          // 延迟500毫秒后重置justTriggered标志
          setTimeout(() => {
            if (this.mainWindow && !this.mainWindow.isDestroyed()) {
              // @ts-ignore 忽略类型检查错误
              this.mainWindow.justTriggered = false;
              this.logger.debug('窗口触发保护期已结束');
            }
          }, 500);
        }
      } else {
        // 不跟随桌面的普通显示方式
        this.logger.info('窗口配置为不跟随桌面模式');
        this.mainWindow.setPosition(x, y);
        this.mainWindow.show();
        this.mainWindow.focus();

        // 延迟500毫秒后重置justTriggered标志
        setTimeout(() => {
          if (this.mainWindow && !this.mainWindow.isDestroyed()) {
            // @ts-ignore 忽略类型检查错误
            this.mainWindow.justTriggered = false;
            this.logger.debug('窗口触发保护期已结束');
          }
        }, 500);
      }
    }
  }

  /**
   * 设置全局快捷键
   */
  setupGlobalShortcut(): void {
    // 清除已有的快捷键
    this.logger.info('设置全局快捷键');
    this.logger.debug('清除已有的全局快捷键');
    globalShortcut.unregisterAll();

    const windowConfig = this.configManager.getWindowConfig();

    // 如果启用了Spotlight模式，注册全局快捷键
    if (windowConfig.spotlightMode && windowConfig.spotlightHotkey) {
      this.logger.debug(
        `尝试注册Spotlight模式全局快捷键: ${windowConfig.spotlightHotkey}`
      );
      try {
        globalShortcut.register(
          windowConfig.spotlightHotkey,
          this.toggleMainWindow.bind(this)
        );
        this.logger.info(
          `已成功注册全局快捷键: ${windowConfig.spotlightHotkey}`
        );
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        this.logger.error('注册全局快捷键失败', { error: errorMessage });
      }
    } else {
      this.logger.debug(
        '未启用Spotlight模式或未设置快捷键，跳过全局快捷键注册'
      );
    }
  }

  /**
   * 清理资源
   */
  cleanup(): void {
    this.logger.info('WindowManager清理资源');

    // 取消注册所有快捷键
    this.logger.debug('取消注册所有全局快捷键');
    globalShortcut.unregisterAll();

    // 关闭窗口（如果需要的话）
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.logger.debug('关闭主窗口');
      this.mainWindow.close();
      this.mainWindow = null;
    }

    this.logger.info('WindowManager资源清理完成');
  }
}
