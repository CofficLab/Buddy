/**
 * GitOK示例插件
 * 演示如何创建一个基本的插件，提供动作和自定义视图
 */

// 引入文件系统模块
const fs = require('fs');
const path = require('path');

// 插件ID
const PLUGIN_ID = 'example-plugin';

// 日志函数
const log = {
  info: function (message, ...args) {
    console.log(`[示例插件] ${message}`, ...args);
  },
  error: function (message, ...args) {
    console.error(`[示例插件] ${message}`, ...args);
  },
  debug: function (message, ...args) {
    console.log(`[示例插件:调试] ${message}`, ...args);
  },
};

// 插件信息
const plugin = {
  id: PLUGIN_ID,
  name: '示例插件',
  description: '这是一个示例插件，演示如何创建GitOK插件',
  version: '1.0.0',
  author: 'Coffic',

  /**
   * 获取插件提供的动作列表
   * @param {string} keyword 搜索关键词
   * @returns {Promise<Array>} 动作列表
   */
  async getActions(keyword = '') {
    log.info(`获取动作列表，关键词: "${keyword}"`);

    // 创建基础动作列表
    const actions = [
      {
        id: `${PLUGIN_ID}:hello`,
        title: '打招呼',
        description: '显示一个问候消息',
        icon: '👋',
        plugin: PLUGIN_ID,
      },
      {
        id: `${PLUGIN_ID}:time`,
        title: '当前时间',
        description: '显示当前时间',
        icon: '🕒',
        plugin: PLUGIN_ID,
        viewPath: 'views/time.html',
        viewMode: 'embedded',
        devTools: false,
      },
      {
        id: `${PLUGIN_ID}:calculate`,
        title: '计算器',
        description: '简单的计算器',
        icon: '🧮',
        plugin: PLUGIN_ID,
        viewPath: 'views/calculator.html',
        viewMode: 'window',
        devTools: false,
      },
    ];

    log.debug(`基础动作列表: ${actions.length} 个动作`);

    // 如果有关键词，过滤匹配的动作
    if (keyword) {
      const lowerKeyword = keyword.toLowerCase();
      log.debug(`过滤包含关键词 "${lowerKeyword}" 的动作`);

      const filteredActions = actions.filter(
        (action) =>
          action.title.toLowerCase().includes(lowerKeyword) ||
          action.description.toLowerCase().includes(lowerKeyword)
      );

      log.info(`过滤后返回 ${filteredActions.length} 个动作`);
      return filteredActions;
    }

    log.info(`返回所有 ${actions.length} 个动作`);
    return actions;
  },

  /**
   * 执行插件动作
   * @param {Object} action 要执行的动作
   * @returns {Promise<any>} 动作执行结果
   */
  async executeAction(action) {
    log.info(`执行动作: ${action.id} (${action.title})`);

    try {
      switch (action.id) {
        case `${PLUGIN_ID}:hello`:
          log.debug(`执行打招呼动作`);
          return { message: '你好，这是来自示例插件的问候！' };

        case `${PLUGIN_ID}:time`:
          log.debug(`执行时间动作（有自定义视图）`);
          return { success: true };

        case `${PLUGIN_ID}:calculate`:
          log.debug(`执行计算器动作（有自定义视图）`);
          return { success: true };

        default:
          const errorMsg = `未知的动作ID: ${action.id}`;
          log.error(errorMsg);
          throw new Error(errorMsg);
      }
    } catch (error) {
      log.error(`执行动作 ${action.id} 失败:`, error);
      throw error;
    }
  },

  /**
   * 获取视图内容
   * @param {string} viewPath 视图路径
   * @returns {Promise<string>} HTML内容
   */
  async getViewContent(viewPath) {
    log.info(`获取视图内容: ${viewPath}`);

    try {
      // 从文件系统读取HTML文件
      const htmlFilePath = path.join(__dirname, viewPath);
      log.debug(`尝试读取文件: ${htmlFilePath}`);

      if (!fs.existsSync(htmlFilePath)) {
        throw new Error(`视图文件不存在: ${htmlFilePath}`);
      }

      // 读取HTML文件内容
      const html = fs.readFileSync(htmlFilePath, 'utf-8');

      log.info(
        `成功读取视图HTML，文件: ${htmlFilePath}，长度: ${html.length} 字节`
      );
      return html;
    } catch (error) {
      log.error(`获取视图内容失败:`, error);
      throw error;
    }
  },
};

// 插件初始化输出
log.info(`示例插件已加载: ${plugin.name} v${plugin.version}`);

// 导出插件
module.exports = plugin;
