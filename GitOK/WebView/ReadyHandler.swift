import SwiftUI
import WebKit
import OSLog

class ReadyHandler: NSObject, WebHandler {
    var functionName: String = "ready"
    var label = "👷 ReadyHandler::"

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        let verbose = false 
        if verbose {
            os_log("\(self.label)JS call \(message.name)")
        }
        EventManager().emitJSReady()
    }
}

#Preview {
    AppPreview()
}
