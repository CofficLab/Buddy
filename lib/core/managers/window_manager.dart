/// GitOK - 窗口管理器
///
/// 负责管理应用程序的窗口功能，包括窗口的初始化、配置、
/// 显示、隐藏等操作。
library;

import 'dart:io' show Platform, exit;
import 'package:flutter/material.dart';
import 'package:macos_window_utils/macos_window_utils.dart';
import 'package:window_manager/window_manager.dart' as win;

/// 窗口监听器类
///
/// 用于处理窗口事件的回调
class WindowListener {
  /// 当窗口关闭时调用
  void onWindowClose() {}

  /// 当窗口获得焦点时调用
  void onWindowFocus() {}

  /// 当窗口失去焦点时调用
  void onWindowBlur() {}

  /// 当窗口最大化时调用
  void onWindowMaximize() {}

  /// 当窗口取消最大化时调用
  void onWindowUnmaximize() {}

  /// 当窗口最小化时调用
  void onWindowMinimize() {}

  /// 当窗口恢复时调用
  void onWindowRestore() {}

  /// 当窗口移动时调用
  void onWindowMove() {}

  /// 当窗口调整大小时调用
  void onWindowResize() {}
}

/// 窗口管理器类
///
/// 封装了所有与窗口相关的功能，包括：
/// - 窗口的初始化
/// - 窗口的配置
/// - 窗口的显示和隐藏
/// - 平台特定的窗口处理
class AppWindowManager with win.WindowListener {
  static final AppWindowManager _instance = AppWindowManager._internal();
  factory AppWindowManager() => _instance;
  AppWindowManager._internal();

  final List<WindowListener> _listeners = [];

  /// 初始化窗口管理器
  Future<void> init() async {
    // 初始化window_manager
    await win.windowManager.ensureInitialized();

    // 设置窗口选项
    win.WindowOptions windowOptions = const win.WindowOptions(
      size: Size(1200, 600),
      center: true,
      title: "GitOk",
      alwaysOnTop: false,
    );

    await win.windowManager.waitUntilReadyToShow(windowOptions, () async {
      await win.windowManager.show();
      await win.windowManager.focus();
    });

    // 如果是 macOS 平台，我们需要特殊照顾一下它的窗口 ✨
    if (Platform.isMacOS) {
      await WindowManipulator.initialize();
      WindowManipulator.makeTitlebarTransparent();
      WindowManipulator.enableFullSizeContentView();
      WindowManipulator.hideTitle();
    }
  }

  /// 隐藏窗口
  Future<void> hide() async {
    await win.windowManager.hide();
  }

  /// 显示窗口
  Future<void> show() async {
    await win.windowManager.show();
  }

  /// 将窗口带到前台
  Future<void> focus() async {
    await win.windowManager.focus();
  }

  /// 添加窗口监听器
  void addListener(WindowListener listener) {
    _listeners.add(listener);
  }

  /// 移除窗口监听器
  void removeListener(WindowListener listener) {
    _listeners.remove(listener);
  }

  /// 退出应用
  Future<void> quit() async {
    await win.windowManager.close();
    exit(0);
  }

  @override
  void onWindowClose() {
    for (final listener in _listeners) {
      listener.onWindowClose();
    }
  }

  @override
  void onWindowFocus() {
    for (final listener in _listeners) {
      listener.onWindowFocus();
    }
  }

  @override
  void onWindowBlur() {
    for (final listener in _listeners) {
      listener.onWindowBlur();
    }
  }

  @override
  void onWindowMaximize() {
    for (final listener in _listeners) {
      listener.onWindowMaximize();
    }
  }

  @override
  void onWindowUnmaximize() {
    for (final listener in _listeners) {
      listener.onWindowUnmaximize();
    }
  }

  @override
  void onWindowMinimize() {
    for (final listener in _listeners) {
      listener.onWindowMinimize();
    }
  }

  @override
  void onWindowRestore() {
    for (final listener in _listeners) {
      listener.onWindowRestore();
    }
  }

  @override
  void onWindowMove() {
    for (final listener in _listeners) {
      listener.onWindowMove();
    }
  }

  @override
  void onWindowResize() {
    for (final listener in _listeners) {
      listener.onWindowResize();
    }
  }
}
