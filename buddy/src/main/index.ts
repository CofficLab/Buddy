/**
 * Electron 主进程入口文件
 * 负责应用生命周期管理和各种管理器的初始化与协调
 */
import { appManager } from './managers/AppManager';
import { routerService } from './provider/RouterService';
import { routes as pluginRoutes } from './handlers/plugin_router';
import {
  routes as overlaidAppRoutes,
  initOverlaidAppEvents,
} from './handlers/overlaid_router';
import { routes as uiLogRoutes } from './handlers/log_router';
import { routes as updateRoutes } from './handlers/update_router';
import { baseRoutes, setupStreamListeners } from './handlers/common_handler';
import { aiRoutes } from './handlers/ai_handler';

// 初始化IPC处理器
routerService.registerRoutes(baseRoutes);
routerService.registerRoutes(aiRoutes);
routerService.registerRoutes(pluginRoutes);
routerService.registerRoutes(overlaidAppRoutes);
routerService.registerRoutes(uiLogRoutes);
routerService.registerRoutes(updateRoutes);

// 启动应用
appManager
  .start()
  .then(() => {
    // 初始化IPC路由
    routerService.initialize();
    // 初始化被覆盖应用相关事件
    initOverlaidAppEvents();
    // 初始化流式聊天监听器
    setupStreamListeners();
  })
  .catch((error) => {
    console.error('应用启动失败:', error);
    process.exit(1);
  });
