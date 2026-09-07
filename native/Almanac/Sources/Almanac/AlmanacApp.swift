import AppKit
import Foundation
import WebKit

@main
enum AlmanacMain {
    @MainActor
    static func main() {
        let application = NSApplication.shared
        let delegate = AlmanacAppDelegate()
        application.delegate = delegate
        application.setActivationPolicy(.regular)
        application.run()
        _ = delegate
    }
}

@MainActor
final class AlmanacAppDelegate: NSObject, NSApplicationDelegate, NSWindowDelegate, WKNavigationDelegate, WKDownloadDelegate {
    private let appURL = URL(string: "https://m83iyer.github.io/almanac/")!
    private let frameName = "AlmanacWindow"
    private let alwaysOnTopKey = "AlmanacKeepOnTop"
    private let hostSuffix = ".github.io"

    private var window: NSWindow!
    private var webView: WKWebView!
    private var keepOnTopItem: NSMenuItem!

    func applicationDidFinishLaunching(_ notification: Notification) {
        configureMenus()
        configureWindow()
        loadAlmanac()
        NSApp.activate(ignoringOtherApps: true)
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
        true
    }

    private func configureWindow() {
        let configuration = WKWebViewConfiguration()
        configuration.websiteDataStore = .default()
        configuration.preferences.javaScriptCanOpenWindowsAutomatically = false

        webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = self
        webView.allowsMagnification = true
        webView.setAccessibilityLabel("Almanac library")

        window = NSWindow(
            contentRect: NSRect(x: 0, y: 0, width: 900, height: 820),
            styleMask: [.titled, .closable, .miniaturizable, .resizable],
            backing: .buffered,
            defer: false
        )
        window.title = "Almanac"
        window.titleVisibility = .visible
        window.titlebarAppearsTransparent = false
        window.isMovable = true
        window.toolbarStyle = .unifiedCompact
        window.isReleasedWhenClosed = false
        window.minSize = NSSize(width: 480, height: 560)
        window.contentView = webView
        window.delegate = self
        window.collectionBehavior = [.fullScreenPrimary]

        let restoredFrame = window.setFrameUsingName(frameName)
        if !restoredFrame {
            window.center()
        }
        window.setFrameAutosaveName(frameName)

        applyWindowLevel(UserDefaults.standard.bool(forKey: alwaysOnTopKey))
        window.makeKeyAndOrderFront(nil)
    }

    private func configureMenus() {
        let mainMenu = NSMenu(title: "Main Menu")

        let appMenuItem = NSMenuItem()
        let appMenu = NSMenu(title: "Almanac")
        appMenu.addItem(withTitle: "About Almanac", action: #selector(NSApplication.orderFrontStandardAboutPanel(_:)), keyEquivalent: "")
        appMenu.addItem(.separator())
        appMenu.addItem(withTitle: "Quit Almanac", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q")
        appMenuItem.submenu = appMenu
        mainMenu.addItem(appMenuItem)

        let viewMenuItem = NSMenuItem()
        let viewMenu = NSMenu(title: "View")
        viewMenu.addItem(withTitle: "Reload", action: #selector(reloadAlmanac(_:)), keyEquivalent: "r")
        viewMenu.addItem(withTitle: "Open in Browser", action: #selector(openInBrowser(_:)), keyEquivalent: "b")
        viewMenuItem.submenu = viewMenu
        mainMenu.addItem(viewMenuItem)

        let windowMenuItem = NSMenuItem()
        let windowMenu = NSMenu(title: "Window")
        windowMenu.addItem(withTitle: "Minimize", action: #selector(NSWindow.performMiniaturize(_:)), keyEquivalent: "m")
        windowMenu.addItem(withTitle: "Zoom", action: #selector(NSWindow.performZoom(_:)), keyEquivalent: "")
        windowMenu.addItem(.separator())
        keepOnTopItem = NSMenuItem(title: "Keep on Top", action: #selector(toggleKeepOnTop(_:)), keyEquivalent: "")
        keepOnTopItem.target = self
        windowMenu.addItem(keepOnTopItem)
        windowMenuItem.submenu = windowMenu
        mainMenu.addItem(windowMenuItem)
        NSApp.windowsMenu = windowMenu

        NSApp.mainMenu = mainMenu
    }

    private func loadAlmanac() {
        var request = URLRequest(url: appURL, cachePolicy: .reloadRevalidatingCacheData, timeoutInterval: 12)
        request.setValue("Almanac/1.0 macOS", forHTTPHeaderField: "X-Almanac-Client")
        webView.load(request)
    }

    private func showOffline() {
        let page = """
        <!doctype html>
        <html lang="en">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Almanac is offline</title>
        <style>
        :root { color-scheme: light dark; }
        body { margin:0; min-height:100vh; display:grid; place-items:center; background:#100E09; color:#EDE9DC; font:16px -apple-system,BlinkMacSystemFont,sans-serif; }
        main { max-width:380px; padding:36px; text-align:center; }
        .mark { width:64px; height:64px; border-radius:16px; display:grid; place-items:center; margin:0 auto 22px; background:#EDE9DC; color:#100E09; font:700 26px Georgia,serif; }
        h1 { font:700 32px Georgia,serif; margin:0 0 12px; }
        p { line-height:1.55; color:#99937F; }
        a { display:inline-block; margin-top:14px; padding:12px 18px; border-radius:999px; background:#EDE9DC; color:#100E09; text-decoration:none; font-weight:700; }
        </style>
        <body><main><div class="mark">A</div><h1>Almanac is offline.</h1><p>Couldn't reach the library right now &mdash; check your connection.</p><a href="almanac://retry">Try again</a></main></body>
        </html>
        """
        webView.loadHTMLString(page, baseURL: nil)
    }

    private func isAlmanacHost(_ url: URL) -> Bool {
        guard let host = url.host?.lowercased() else { return false }
        return host.hasSuffix(hostSuffix)
    }

    private func applyWindowLevel(_ enabled: Bool) {
        window?.level = enabled ? .floating : .normal
        keepOnTopItem?.state = enabled ? .on : .off
    }

    @objc private func reloadAlmanac(_ sender: Any?) {
        if isAlmanacHost(webView.url ?? appURL) {
            webView.reload()
        } else {
            loadAlmanac()
        }
    }

    @objc private func openInBrowser(_ sender: Any?) {
        NSWorkspace.shared.open(appURL)
    }

    @objc private func toggleKeepOnTop(_ sender: NSMenuItem) {
        let enabled = window.level != .floating
        UserDefaults.standard.set(enabled, forKey: alwaysOnTopKey)
        applyWindowLevel(enabled)
    }

    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        showOffline()
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        showOffline()
    }

    func webView(
        _ webView: WKWebView,
        decidePolicyFor navigationAction: WKNavigationAction,
        decisionHandler: @escaping @MainActor @Sendable (WKNavigationActionPolicy) -> Void
    ) {
        guard let url = navigationAction.request.url else {
            decisionHandler(.cancel)
            return
        }

        if url.scheme == "almanac" {
            decisionHandler(.cancel)
            loadAlmanac()
            return
        }

        if navigationAction.shouldPerformDownload {
            decisionHandler(.download)
            return
        }

        if navigationAction.navigationType == .linkActivated && !isAlmanacHost(url) {
            NSWorkspace.shared.open(url)
            decisionHandler(.cancel)
            return
        }

        decisionHandler(.allow)
    }

    func webView(
        _ webView: WKWebView,
        decidePolicyFor navigationResponse: WKNavigationResponse,
        decisionHandler: @escaping @MainActor @Sendable (WKNavigationResponsePolicy) -> Void
    ) {
        decisionHandler(navigationResponse.canShowMIMEType ? .allow : .download)
    }

    func webView(_ webView: WKWebView, navigationAction: WKNavigationAction, didBecome download: WKDownload) {
        download.delegate = self
    }

    func webView(_ webView: WKWebView, navigationResponse: WKNavigationResponse, didBecome download: WKDownload) {
        download.delegate = self
    }

    func download(
        _ download: WKDownload,
        decideDestinationUsing response: URLResponse,
        suggestedFilename: String,
        completionHandler: @escaping @MainActor @Sendable (URL?) -> Void
    ) {
        guard let downloadsDirectory = FileManager.default.urls(for: .downloadsDirectory, in: .userDomainMask).first else {
            completionHandler(nil)
            return
        }

        let safeFilename = suggestedFilename
            .replacingOccurrences(of: "/", with: "-")
            .replacingOccurrences(of: ":", with: "-")
        let fileExtension = (safeFilename as NSString).pathExtension
        let stem = (safeFilename as NSString).deletingPathExtension
        var destination = downloadsDirectory.appendingPathComponent(safeFilename)
        var copyNumber = 2
        while FileManager.default.fileExists(atPath: destination.path) {
            let numberedName = fileExtension.isEmpty ? "\(stem)-\(copyNumber)" : "\(stem)-\(copyNumber).\(fileExtension)"
            destination = downloadsDirectory.appendingPathComponent(numberedName)
            copyNumber += 1
        }
        completionHandler(destination)
    }
}
