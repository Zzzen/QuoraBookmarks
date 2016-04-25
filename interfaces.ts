//enum starts with 1 to prevent unexpected `0===Number("")`
export enum GetUserOption {
    GetCreatedBookmarks = 1,
    GetFollowedUsers,
    GetFollowedBookmarks,
    GetBookmarkNotifications
}

export enum GetBookmarkFlags {
    IgnoreAnswers = 1 << 0
}