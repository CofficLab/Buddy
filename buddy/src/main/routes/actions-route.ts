/**
 * 插件动作相关路由
 * 处理插件动作的查询和执行
 */

import { IPC_METHODS } from '@/types/ipc-methods.js';
import { RouteFacade } from '@coffic/cosy-framework';
import { PluginFacade } from '../providers/plugin/PluginFacade.js';
import { SendableAction } from '@/types/sendable-action.js';
import { ExecuteResult } from '@coffic/buddy-types';
import { appStateManager } from '../providers/state/StateManager.js';
import { app } from 'electron';

export function registerActionsRoutes(): void {
  // 获取插件动作列表
  RouteFacade.handle(
    IPC_METHODS.GET_ACTIONS,
    async (_event, keyword: string = ''): Promise<SendableAction[]> => {
      const overlaidApp = appStateManager.getOverlaidApp();
      const actions = await PluginFacade.actions({
        keyword,
        overlaidApp: overlaidApp?.name,
        version: app.getVersion(),
      });
      return actions.map((action) => action.toSendableAction());
    }
  )
    .validation({
      '0': {
        required: false,
        type: 'string',
        validator: (keyword) =>
          typeof keyword === 'string' || keyword === undefined
            ? true
            : '关键词必须是字符串',
      },
    })
    .description('获取插件动作列表，支持关键词搜索');

  // 执行插件动作
  RouteFacade.handle(
    IPC_METHODS.EXECUTE_PLUGIN_ACTION,
    async (
      _event,
      actionId: string,
      keyword: string
    ): Promise<ExecuteResult> => {
      return await PluginFacade.executeAction(actionId, keyword);
    }
  )
    .validation({
      '0': { required: true, type: 'string' },
      '1': { required: true, type: 'string' },
    })
    .description('执行指定的插件动作');

  // 获取动作视图的HTML内容
  RouteFacade.handle(
    IPC_METHODS.GET_ACTION_VIEW_HTML,
    async (_event, actionId: string): Promise<string> => {
      return await PluginFacade.getActionView(actionId);
    }
  )
    .validation({
      '0': { required: true, type: 'string' },
    })
    .description('获取插件动作的视图内容');
}
