import SwiftUI

struct TableData: View {
    let records: [[String: Any]]
    let columns: [String]
    @State private var columnWidths: [String: CGFloat] = [:]
    @State private var hoveredRow: Int? = nil
    @State private var draggingColumn: String? = nil
    @State private var dragOffset: CGFloat = 0
    @State private var totalWidth: CGFloat = 0
    
    var body: some View {
        GeometryReader { geometry in
            ScrollView([.horizontal, .vertical]) {
                LazyVStack(spacing: 0, pinnedViews: .sectionHeaders) {
                    Section {
                        VStack(alignment: .leading) {
                            // 数据行
                            ForEach(Array(records.enumerated()), id: \.offset) { index, record in
                                TableRow(
                                    record: record,
                                    columns: columns,
                                    columnWidths: columnWidths,
                                    isEven: index % 2 == 0,
                                    isHovered: hoveredRow == index
                                )
                                .onHover { isHovered in
                                    hoveredRow = isHovered ? index : nil
                                }
                            }
                            
                            Spacer()
                        }
                        .frame(minHeight: geometry.size.height, alignment: .top)
                    } header: {
                        // 表头
                        HStack(spacing: 0) {
                            ForEach(columns, id: \.self) { column in
                                ResizableColumn(
                                    title: column,
                                    width: columnWidths[column] ?? (geometry.size.width / CGFloat(columns.count)),
                                    onResize: { width in
                                        columnWidths[column] = width
                                    }
                                )
                            }
                            // 占位列
                            ResizableColumn(
                                title: "",
                                width: max(0, geometry.size.width - columns.reduce(0) { $0 + (columnWidths[$1] ?? geometry.size.width / CGFloat(columns.count)) }),
                                onResize: { _ in }
                            )
                        }
                        .background(Color(.windowBackgroundColor))
                    }
                    
                    Spacer()
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
            .background(Color(.textBackgroundColor))
            .onAppear {
                // 初始化每列宽度为平均值
                let averageWidth = geometry.size.width / CGFloat(columns.count)
                columns.forEach { column in
                    if columnWidths[column] == nil {
                        columnWidths[column] = averageWidth
                    }
                }
                totalWidth = geometry.size.width
            }
            .onChange(of: geometry.size.width) { newWidth in
                // 如果用户没有手动调整列宽，则自动调整
                if columnWidths.isEmpty {
                    let averageWidth = newWidth / CGFloat(columns.count)
                    columns.forEach { column in
                        columnWidths[column] = averageWidth
                    }
                } else {
                    // 如果用户调整过列宽，则按比例调整
                    let scale = newWidth / totalWidth
                    columns.forEach { column in
                        if let width = columnWidths[column] {
                            columnWidths[column] = width * scale
                        }
                    }
                }
                totalWidth = newWidth
            }
        }
    }
}
