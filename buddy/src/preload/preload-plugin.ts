/**
 * 插件视图预加载脚本
 * 为插件视图提供与主应用通信的安全API
 *
 * 打开插件提供的视图时，会在单独的窗口中打开，然后注入这里提供的API
 */
import { PluginIpc } from '@coffic/buddy-types';
import { contextBridge, ipcRenderer } from 'electron';

// 提供给插件视图的API
const pluginViewAPI: PluginIpc = {
  logger: {
    info: (...args: any[]) => {
      ipcRenderer.send('plugin-log-info', ...args);
    },
    warn: (...args: any[]) => {
      ipcRenderer.send('plugin-log-warn', ...args);
    },
    error: (...args: any[]) => {
      ipcRenderer.send('plugin-log-error', ...args);
    },
  }
};

// 暴露API到插件视图全局环境
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('buddy', pluginViewAPI);
  } catch (error) {
    console.error('暴露插件API到全局环境失败:', error);
  }
} else {
  // @ts-ignore
  window.buddy = pluginViewAPI;
}

// 通知主进程插件视图已加载
window.addEventListener('DOMContentLoaded', () => {
  ipcRenderer.send('plugin-view-ready');
});
