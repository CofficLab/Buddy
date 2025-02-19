import 'package:flutter/material.dart';
import 'package:gitok/layouts/project_list_layout.dart';
import 'package:gitok/layouts/project_detail_layout.dart';
import 'package:gitok/widgets/project/project_list.dart';
import 'package:gitok/models/git_project.dart';

/// GitOK应用程序的主体布局组件。
///
/// 提供一个分屏布局：
/// - 左侧固定宽度的项目列表
/// - 右侧自适应宽度的项目详情面板
///
/// 该组件负责处理主界面的整体布局结构，包括分割线的显示。
class HomeBodyLayout extends StatelessWidget {
  /// 是否启用调试模式以突出显示布局边界
  static const bool kDebugLayout = false;

  /// 项目列表的全局键，用于访问列表状态
  final GlobalKey<ProjectListState> projectListKey;

  const HomeBodyLayout({
    super.key,
    required this.projectListKey,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: kDebugLayout
          ? BoxDecoration(
              border: Border.all(color: Colors.red, width: 2),
              color: Colors.yellow.withOpacity(0.1),
            )
          : null,
      child: Row(
        children: [
          ProjectListLayout(listKey: projectListKey),
          const Expanded(child: ProjectDetailLayout()),
        ],
      ),
    );
  }
}
