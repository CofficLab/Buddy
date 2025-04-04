/**
 * 基础 IPC 通信模块
 * 提供基本的进程间通信功能
 */
import { ipcRenderer } from 'electron';
import { AiApi, ChatMessage, StreamChunkResponse, StreamDoneResponse } from '@/types/api-ai';
import { IPC_METHODS } from '@/types/ipc-methods';

export const aiApi: AiApi = {
  // AI聊天功能
  aiChat: async (messages: ChatMessage[]): Promise<string> => {
    return ipcRenderer.invoke(IPC_METHODS.AI_CHAT, messages);
  },

  // 启动流式AI聊天会话
  aiChatStreamStart: async (messages: ChatMessage[]): Promise<string> => {
    return ipcRenderer.invoke(IPC_METHODS.AI_CHAT_STREAM_START, messages);
  },

  // 注册流式聊天数据块监听器
  onAiChatStreamChunk: (callback: (response: StreamChunkResponse) => void): (() => void) => {
    const handler = (_: any, response: StreamChunkResponse) => callback(response);
    ipcRenderer.on(IPC_METHODS.AI_CHAT_STREAM_CHUNK, handler);

    // 返回取消注册函数
    return () => {
      ipcRenderer.removeListener(IPC_METHODS.AI_CHAT_STREAM_CHUNK, handler);
    };
  },

  // 注册流式聊天完成监听器
  onAiChatStreamDone: (callback: (response: StreamDoneResponse) => void): (() => void) => {
    const handler = (_: any, response: StreamDoneResponse) => callback(response);
    ipcRenderer.on(IPC_METHODS.AI_CHAT_STREAM_DONE, handler);

    // 返回取消注册函数
    return () => {
      ipcRenderer.removeListener(IPC_METHODS.AI_CHAT_STREAM_DONE, handler);
    };
  },

  // 取消AI聊天请求
  aiChatCancel: async (requestId: string, reason: string): Promise<boolean> => {
    return ipcRenderer.invoke(IPC_METHODS.AI_CHAT_CANCEL, requestId, reason);
  },

  // 获取AI配置
  aiGetConfig: async () => {
    return ipcRenderer.invoke(IPC_METHODS.AI_GET_CONFIG);
  },

  // 设置AI配置
  aiSetConfig: async (config: any) => {
    return ipcRenderer.invoke(IPC_METHODS.AI_SET_CONFIG, config);
  },
};
