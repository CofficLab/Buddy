import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:gitok/core/channels/channels.dart';
import 'package:gitok/core/channels/vscode_channel.dart';
import 'package:gitok/utils/logger.dart';

/// 伙伴提供者
///
/// 负责管理与被覆盖应用的交互，包括：
/// 1. 跟踪被覆盖的应用信息
/// 2. 提供状态变化通知
/// 3. 管理应用切换状态
class CompanionProvider extends ChangeNotifier {
  static const String _tag = 'CompanionProvider';
  static CompanionProvider? _instance;

  /// 获取单例实例
  factory CompanionProvider() {
    _instance ??= CompanionProvider._();
    Logger.debug(_tag, '获取单例实例');
    return _instance!;
  }

  CompanionProvider._() {
    Logger.debug(_tag, '创建单例实例');
  }

  /// 被覆盖的应用名称
  String? _overlaidAppName;
  String? get overlaidAppName => _overlaidAppName;

  /// 被覆盖的应用包名
  String? _overlaidAppBundleId;
  String? get overlaidAppBundleId => _overlaidAppBundleId;

  /// 被覆盖的应用进程ID
  int? _overlaidAppProcessId;
  int? get overlaidAppProcessId => _overlaidAppProcessId;

  /// VSCode 工作区路径
  String? _vscodeWorkspace;
  String? get vscodeWorkspace => _vscodeWorkspace;

  /// 初始化
  Future<void> initialize() async {
    Logger.info(_tag, '正在初始化...');

    try {
      // 设置方法调用处理器
      WindowChannel.instance.setMethodCallHandler(_handleMethodCall);
      Logger.info(_tag, '初始化完成');
    } catch (e) {
      Logger.error(_tag, '初始化失败', e);
    }
  }

  /// 处理来自原生端的方法调用
  Future<dynamic> _handleMethodCall(MethodCall call) async {
    Logger.info(_tag, '收到方法调用 - ${call.method}');

    switch (call.method) {
      case 'updateOverlaidApp':
        final Map<String, dynamic>? appInfo = call.arguments as Map<String, dynamic>?;
        await updateOverlaidApp(appInfo);
        break;
    }
  }

  /// 更新被覆盖的应用信息
  Future<void> updateOverlaidApp(Map<String, dynamic>? appInfo) async {
    if (appInfo == null) {
      _overlaidAppName = null;
      _overlaidAppBundleId = null;
      _overlaidAppProcessId = null;
      _vscodeWorkspace = null;
      notifyListeners();
      return;
    }

    _overlaidAppName = appInfo['name'] as String?;
    _overlaidAppBundleId = appInfo['bundleId'] as String?;
    _overlaidAppProcessId = appInfo['processId'] as int?;

    // 如果是 VSCode，获取工作区信息
    if (_overlaidAppBundleId == 'com.microsoft.VSCode') {
      _vscodeWorkspace = await VSCodeChannel.instance.getActiveWorkspace();
      Logger.info(_tag, '更新 VSCode 工作区: $_vscodeWorkspace');
    } else {
      _vscodeWorkspace = null;
    }

    notifyListeners();
  }

  @override
  void dispose() {
    Logger.debug(_tag, '正在释放资源...');
    WindowChannel.instance.setMethodCallHandler(null);
    super.dispose();
  }
}
