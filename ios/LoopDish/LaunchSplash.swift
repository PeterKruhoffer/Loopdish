import SwiftUI

/// Reuse the native launch storyboard while restoring authentication so there is
/// no visual handoff or second layout to maintain. No minimum display duration.
struct LaunchSplash: UIViewControllerRepresentable {
    func makeUIViewController(context: Context) -> UIViewController {
        UIStoryboard(name: "LaunchScreen", bundle: .main).instantiateInitialViewController()!
    }

    func updateUIViewController(_ uiViewController: UIViewController, context: Context) {}
}
