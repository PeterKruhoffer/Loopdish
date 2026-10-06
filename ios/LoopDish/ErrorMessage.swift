import ConvexMobile
import Foundation

/// Only approved copy reaches the UI. SDK descriptions may contain server details.
enum ErrorMessage {
    static let fallback = "We couldn't complete that. Please try again."
    static let duplicateDish = "This dish is already saved. You can choose it from your dishes."
    static let connection = "Couldn't connect to LoopDish. Check your internet connection and try again."

    static func text(for error: Error) -> String {
        if error is URLError { return connection }
        if error is WorkOSAuthError {
            return "Couldn't complete sign-in or sign-out. Please try again."
        }
        guard case let ClientError.ConvexError(data) = error,
              let message = try? JSONDecoder().decode(String.self, from: Data(data.utf8)) else {
            return fallback
        }
        // Existing servers send JSON strings, including the saved name for duplicates.
        if message.hasSuffix(" is already in your dishes") { return duplicateDish }
        switch message {
        case "Sign in to use LoopDish":
            return "Please sign in to continue."
        case "Give the dish a name":
            return "Give your dish a name before saving."
        case "Give your household a name":
            return "Give your household a name before saving."
        case "Use a name between 1 and 100 characters":
            return "Use a name between 1 and 100 characters."
        case "Only the household owner can do that":
            return "Only the person who created your household can make this change."
        case "That invite is not valid", "That invite is no longer available":
            return "This invitation is unavailable or expired. Ask for a new invitation link."
        case "You already belong to another household", "You already have a household with saved meals":
            return "You already have a household. You can't join another one with this invitation."
        case "That dish is not available in this household", "That dish no longer exists":
            return "This dish is no longer available. Choose another dish."
        case "That planned meal is not in your household", "That planned meal no longer exists":
            return "This dinner is no longer available. Check your weekly plan and try again."
        case "An eaten meal cannot be removed from the plan":
            return "This dinner is marked as eaten and can't be removed from the plan."
        case "Add a dish before asking for suggestions":
            return "Save a dish first, then ask for suggestions."
        case "This household has used its five AI suggestions for the last 24 hours":
            return "Your household has used all five suggestions for now. Please try again tomorrow."
        case "AI suggestions have not been configured yet":
            return "Suggestions aren't available yet. You can still plan dinners yourself."
        case "Cloudflare could not generate suggestions right now", "Cloudflare returned an empty suggestion",
             "The AI returned an invalid suggestion", "The AI returned an invalid meal plan",
             "The AI returned an incomplete meal plan", "The AI returned too many new dishes",
             "A weekly plan needs seven dinners", "A suggested dish has an invalid name",
             "A suggested dish has an invalid note", "A suggested meal has an invalid date",
             "A suggested plan must cover seven consecutive days", "A suggested plan can add at most two new dishes",
             "A suggested dish could not be saved", "Choose a seven-day week":
            return "We couldn't make a usable dinner suggestion. Please try generating suggestions again."
        default:
            return fallback
        }
    }
}
