/**
 * appStore.ts - 应用核心状态管理
 *
 * 这个store负责管理应用的核心状态：
 * 1. 当前视图
 * 2. 插件商店的显示状态
 * 3. 当前选中的动作
 * 4. 应用窗口的激活状态
 *
 * 主要功能：
 * - 控制视图切换
 * - 控制插件商店的显示/隐藏
 * - 管理当前选中的动作
 * - 监听和记录窗口激活状态
 *
 * 状态说明：
 * - currentView: 当前显示的视图（home/plugins）
 * - showPluginStore: 控制插件商店的显示状态
 * - selectedAction: 当前选中的插件动作
 * - isActive: 窗口是否处于激活状态
 *
 * 注意事项：
 * - 切换插件商店时会自动清理选中的动作
 * - 所有视图组件都应该通过这个store来管理状态
 * - 避免直接修改状态，应该使用提供的action
 */

import { defineStore } from 'pinia';
import type { SuperAction } from '@/types/super_action';
import { onMounted, onUnmounted } from 'vue';
import { WindowEvents } from '@/types/app-events';

export type ViewType = 'home' | 'plugins' | 'chat' | 'plugin-grid';

interface AppState {
  currentView: ViewType;
  showPluginStore: boolean;
  selectedAction: SuperAction | null;
  isActive: boolean; // 添加窗口激活状态
}

export const useAppStore = defineStore('app', {
  state: (): AppState => ({
    currentView: 'home',
    showPluginStore: false,
    selectedAction: null,
    isActive: true, // 默认为激活状态
  }),

  actions: {
    setView(view: ViewType) {
      this.currentView = view;
    },

    togglePluginStore() {
      this.showPluginStore = !this.showPluginStore;
      // 如果关闭插件商店，回到主界面
      if (!this.showPluginStore) {
        this.selectedAction = null;
      }
    },

    setSelectedAction(action: SuperAction | null) {
      this.selectedAction = action;
    },

    // 设置窗口激活状态
    setActiveState(isActive: boolean) {
      this.isActive = isActive;
    },

    // 初始化窗口激活状态监听器
    setupWindowActiveListeners() {
      // 使用window.electron.ipc替代直接导入的ipcRenderer
      const ipc = window.electron.ipc;

      // 监听窗口激活事件
      ipc.receive(WindowEvents.ACTIVATED, () => {
        this.setActiveState(true);
        console.log('应用窗口被激活');
      });

      // 监听窗口失活事件
      ipc.receive(WindowEvents.DEACTIVATED, () => {
        this.setActiveState(false);
        console.log('应用窗口失去焦点');
      });
    },

    // 清理窗口激活状态监听器
    cleanupWindowActiveListeners() {
      // 使用window.electron.ipc替代直接导入的ipcRenderer
      const ipc = window.electron.ipc;

      // 移除监听器
      ipc.removeListener(WindowEvents.ACTIVATED, () => { });
      ipc.removeListener(WindowEvents.DEACTIVATED, () => { });
    },
  },
});

// 提供一个组合式API风格的方法，方便在组件中使用
export function useAppWindowActive() {
  const appStore = useAppStore();

  onMounted(() => {
    appStore.setupWindowActiveListeners();
  });

  onUnmounted(() => {
    appStore.cleanupWindowActiveListeners();
  });

  return {
    isActive: () => appStore.isActive,
  };
}
