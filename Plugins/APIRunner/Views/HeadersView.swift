//
//  HeadersView.swift
//  GitOK
//
//  Created by Angel on 2024/12/13.
//

import SwiftUI


// Headers 视图
struct HeadersView: View {
    let headers: [String: String]

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            ForEach(headers.sorted(by: { $0.key < $1.key }), id: \.key) { key, value in
                VStack(alignment: .leading) {
                    Text(key)
                        .font(.system(.caption, design: .monospaced))
                        .foregroundColor(.secondary)
                    Text(value)
                        .font(.system(.body, design: .monospaced))
                        .textSelection(.enabled)
                }
                Divider()
            }
        }
    }
}
