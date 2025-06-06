
import { IpcRoute } from '../provider/RouterService.js';
import { shell } from 'electron';
import { logger } from '../managers/LogManager.js';
import { viewManager } from '../managers/ViewManager.js';
import { IpcResponse } from '@coffic/buddy-types';
import { IPC_METHODS } from '@/types/ipc-methods.js';
import { createViewArgs } from '@/types/args.js';

/**
 * 基础的IPC路由配置
 */
export const baseRoutes: IpcRoute[] = [
    {
        channel: IPC_METHODS.Open_Folder,
        handler: (_, directory: string): IpcResponse<string> => {
            logger.debug(`打开: ${directory}`);
            try {
                shell.openPath(directory);
                return { success: true, data: "打开成功" };
            } catch (error) {
                const errorMessage =
                    error instanceof Error ? error.message : String(error);
                return { success: false, error: errorMessage };
            }
        },
    },

    {
        channel: IPC_METHODS.Create_View,
        handler: (_, bounds): Promise<unknown> => {
            return viewManager.createView(bounds);
        }
    },

    {
        channel: IPC_METHODS.Destroy_View,
        handler: (_, id): void => {
            return viewManager.destroyView(id);
        }
    },

    {
        channel: IPC_METHODS.Destroy_Plugin_Views,
        handler: (_): void => {
            return viewManager.destroyAllViews();
        }
    },

    {
        channel: IPC_METHODS.Update_View_Bounds,
        handler: (_, id, bounds): void => {
            return viewManager.updateViewPosition(id, bounds);
        }
    },

    {
        channel: IPC_METHODS.UPSERT_VIEW,
        handler: (_, args: createViewArgs): Promise<void> => {
            return viewManager.upsertView(args);
        }
    },
];