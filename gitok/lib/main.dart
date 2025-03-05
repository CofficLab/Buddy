import 'dart:io' show Platform;
import 'package:flutter/material.dart';
import 'package:flutter/widgets.dart';
import 'package:hotkey_manager/hotkey_manager.dart';
import 'package:macos_window_utils/macos_window_utils.dart';
import 'package:gitok/layouts/app.dart';
import 'package:window_manager/window_manager.dart';

/// GitOK - Git仓库管理工具
///
/// 这是应用程序的入口文件，负责初始化应用并配置基础设置。
/// 包括平台检测、窗口配置等全局设置。
///
/// 就像一个聪明的门卫 🚪，它会根据来访者的平台选择合适的"礼遇"方式：
/// - 看到 macOS 贵宾可以走专属通道 🍎
/// - 其他平台的朋友走普通通道 🎉
void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // 初始化window_manager
  await windowManager.ensureInitialized();

  // 设置窗口选项
  WindowOptions windowOptions = const WindowOptions(
    size: Size(800, 600),
    center: true,
    title: "GitOk",
  );

  await windowManager.waitUntilReadyToShow(windowOptions, () async {
    await windowManager.show();
    await windowManager.focus();
  });

  // 对于热重载，`unregisterAll()` 需要被调用。
  await hotKeyManager.unregisterAll();

  // 如果是 macOS 平台，我们需要特殊照顾一下它的窗口 ✨
  if (Platform.isMacOS) {
    await WindowManipulator.initialize();
    WindowManipulator.makeTitlebarTransparent();
    WindowManipulator.enableFullSizeContentView();
    WindowManipulator.hideTitle();
    // WindowManipulator.makeTitlebarOpaque();
    // WindowManipulator.makeTitlebarTransparent();
    runApp(const MyApp());
  } else {
    runApp(const MyApp());
  }
}
