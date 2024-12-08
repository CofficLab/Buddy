import Foundation
import OSLog
import SwiftData
import SwiftUI

enum AppConfig {
    static let id = "com.yueyi.cisum"
    static let fileManager = FileManager.default
    static let coversDirName = "covers"
    static let imagesDirName = debug ? "images_debug" : "images"
    static let trashDirName = "trash"
    static let cacheDirName = "audios_cache"
    /// iCloud容器的ID
    static let containerIdentifier = "iCloud.yueyi.cisum"
    static let logger = Logger.self
    static func getAppName() -> String {
        if let appName = Bundle.main.infoDictionary?["CFBundleName"] as? String {
            return appName
        } else {
            os_log("无法获取应用程序名称")

            return ""
        }
    }

    static var debug: Bool {
        #if DEBUG
            true
        #else
            false
        #endif
    }
}

#Preview {
    AppPreview()
}
