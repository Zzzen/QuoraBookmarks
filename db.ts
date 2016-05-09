import mongodb = require("mongodb");
import assert = require("assert");
import md5 = require("blueimp-md5");


const server = new mongodb.Server("localhost", 27017);
const db = new mongodb.Db("mydb", server, { w: 1 });
db.open((err, _) => { if (err) console.log(err); });

export const validateId = "[\\d\\w]{24}";
export const validateIdReg = /[\d\w]{24}/;

export interface User {
    _id?: mongodb.ObjectID;
    email?: string;
    username: string;
    hashedPassword?: string;
    salt?: string;
    quoraId?: string;

    followedBookmarks?: string[];
    followedUsers?: string[];

    bookmarkNotifications?: BookmarkNotification[];
}

export interface UserWithCreatedBookmark extends User {
    createdBookmarks: Bookmark[];
}

export interface Bookmark {
    _id?: mongodb.ObjectID;
    title: string;
    description?: string;
    creatorId?: mongodb.ObjectID;
    answers?: string[];
}

export interface Cookie {
    _id?: mongodb.ObjectID;
    userId?: mongodb.ObjectID;
    content: string;
    date: Date;
}

export interface BookmarkNotification {
    sourceId?: string;
    title?: string;
    num: number;
}

export interface Comment {
    _id?: mongodb.ObjectID;
    ip?: string;
    content: string;
}

export interface TokenPair {
    userId: string;
    cookie: string;
}

function addBookmarkNotification(bookmark: string) {
    return db.collection("users").bulkWrite([
        {
            updateMany: {
                filter: {
                    bookmarkNotifications: {
                        $elemMatch: {
                            sourceId: bookmark
                        }
                    }
                },
                update: {
                    $inc: {
                        "bookmarkNotifications.$.num": 1
                    }
                }
            },
        }, {
            updateMany: {
                filter: {
                    followedBookmarks: bookmark,
                    "bookmarkNotifications.sourceId": { $nin: [bookmark] }
                },
                update: {
                    $push: {
                        bookmarkNotifications: {
                            sourceId: bookmark,
                            num: 1
                        }
                    }
                }
            }
        }
    ]);
}

export function removeBookmarkNotification(userId: mongodb.ObjectID, bookmark: string) {
    return db.collection("users").updateOne(
        { _id: userId },
        {
            $pull: {
                bookmarkNotifications: {
                    sourceId: bookmark
                }
            }
        }
    );
}

export async function getBookmarkNotifications(user: string): Promise<BookmarkNotification[]> {
    const userId = mongodb.ObjectID.createFromHexString(user);

    const users: User[] = await db.collection("users").find({ _id: userId }).limit(1).toArray();
    if (0 === users.length) {
        throw "user not found";

    } else if (0 === users[0].bookmarkNotifications.length) {
        return [];

    } else {
        const bookmarkIds = users[0].bookmarkNotifications.map(x => mongodb.ObjectID.createFromHexString(x.sourceId))
        const bookmarks: Bookmark[] = await db.collection("bookmarks").find({ _id: { $in: bookmarkIds } }).toArray();

        // set title for each notification.
        const notifis = users[0].bookmarkNotifications;
        const idToTitle = new Map<string, string>();

        bookmarks.forEach(element => {
            idToTitle.set(element._id.toHexString(), element.title);
        });

        notifis.forEach(element => {
            element.title = idToTitle.get(element.sourceId);
        });

        return notifis;
    }
}

// @return Promise: string, cookieID
async function insertCookie(userId: mongodb.ObjectID): Promise<TokenPair> {
    const cookie: Cookie = {
        userId,
        content: generateGUID(),
        date: new Date()
    };

    const result = await db.collection("cookies").insertOne(cookie);

    if (1 === result.insertedCount) {
        return { userId: userId.toHexString(), cookie: cookie.content };
    } else {
        throw "failed to insert cookie";
    }
}

// reject if cookie is invalid.
export async function getUserByCookie(cookie: string) {
    const results: Cookie[] = await db.collection("cookies").find({ content: cookie }).limit(1).toArray();

    if (0 !== results.length) {
        return results[0].userId;
    } else {
        throw "Invalid cookie";
    }
}

// check whether a name is available.
export async function isUsernameAvailable(username: string) {
    const users = await db.collection("users").find({ $and: [{ username: { $ne: null } }, { username: username }] }).limit(1).toArray();

    if (0 === users.length) {
        return;
    } else {
        throw "username not available";
    }
}

// check whether a email address is available.
export async function isEmailAvailable(email: string) {
    const users = await db.collection("users").find({ $and: [{ email: { $ne: null } }, { email: email }] }).limit(1).toArray();

    if (0 === users.length) {
        return;
    } else {
        throw "email not available";
    }
}

// @param user: email or username must be defined, password must be defined.
export async function varifyUser(user: User, password: string) {
    const users: User[] = await db.collection("users").find(
        {
            $or: [
                { $and: [{ email: { $ne: null } }, { email: user.email }] },
                { $and: [{ username: { $ne: null } }, { username: user.username }] }
            ]
        }
    ).limit(1).toArray();

    if (0 !== users.length) {
        const found = users[0];

        if (hash(password + found.salt) === found.hashedPassword) {
            return await insertCookie(found._id);
        } else {
            throw "wrong password";
        }
    }
}

// @param user: email, username, hashedPassword must be defined.
export async function addUser(user: User): Promise<User> {
    const result = await db.collection("users").insertOne(user);

    if (1 === result.insertedCount) {
        return user;
    } else {
        throw "failed to add a user";
    }
}

// @param bookmark: creatorId, title must be defined.
export async function addBookmark(bookmark: Bookmark): Promise<Bookmark> {
    const result = await db.collection("bookmarks").insertOne(bookmark);

    if (1 === result.insertedCount) {
        return bookmark;
    } else {
        throw "failed to add a bookmark";
    }

}

// @param bookmark: string representation of bookmark._id
// @param answer: the url of answer
export async function addAnswer(bookmark: string, answer: string, userId: mongodb.ObjectID) {
    const bookmarkId = mongodb.ObjectID.createFromHexString(bookmark);

    const result = await db.collection("bookmarks").updateOne({ _id: bookmarkId, creatorId: userId }, { $addToSet: { answers: answer } });

    if (1 === result.modifiedCount) {
        addBookmarkNotification(bookmark);
    }
}

export async function getUsers(selector: Object) {
    const users: User[] = await db.collection("users").find(selector).toArray();

    return users;
}

// @brief get bookmarks of an user
// @param user: string representation of user._id
export async function getBookmarksOfUser(user: string, projection?: Object): Promise<Bookmark[]> {
    const userId = mongodb.ObjectID.createFromHexString(user);

    const bookmarks = await db.collection("bookmarks").find({ creatorId: userId }).project(projection).toArray();

    return bookmarks;
}


export async function getFollowedBookmarks(user: string): Promise<string[]> {
    const userId = mongodb.ObjectID.createFromHexString(user);

    const found: User = await db.collection("users").find({ _id: userId }).limit(1).next();

    if (found) {
        return found.followedBookmarks;
    } else {
        throw "user not found";
    }
}


// @brief get bookmark by id.
// @param bookmark: string representation of bookmark._id
export async function getBookmarkById(bookmark: string): Promise<Bookmark> {
    const bookmarkId = mongodb.ObjectID.createFromHexString(bookmark);

    const found: Bookmark = await db.collection("bookmarks").find({ _id: bookmarkId }).limit(1).next();

    if (found) {
        return found;
    } else {
        throw "bookmark not found";
    }
}

// @brief remove an answer of a bookmark
export async function removeAnswer(answer: string, bookmark: string, userId: mongodb.ObjectID): Promise<void> {
    const bookmarkId = mongodb.ObjectID.createFromHexString(bookmark);

    const result = await db.collection("bookmarks").updateOne({ _id: bookmarkId, creatorId: userId }, { $pull: { "answers": answer } });

    if (1 === result.modifiedCount) {
        return;
    } else {
        throw "failed to remove an answer";
    }
}

export async function removeBookmark(bookmark: string, userId: mongodb.ObjectID): Promise<void> {
    const bookmarkId = mongodb.ObjectID.createFromHexString(bookmark);

    const result = await db.collection("bookmarks").deleteOne({ _id: bookmarkId, creatorId: userId });

    if (1 === result.deletedCount) {
        return;
    } else {
        throw "failed to remove an bookmark";
    }
}


export async function followBookmark(bookmark: string, userId: mongodb.ObjectID): Promise<void> {
    const result = await db.collection("users").updateOne({ _id: userId }, { $addToSet: { followedBookmarks: bookmark } });

    if (1 === result.modifiedCount) {
        return;
    } else {
        throw "failed to follow a bookmark";
    }

}

export async function unfollowBookmark(bookmark: string, userId: mongodb.ObjectID): Promise<void> {
    const result = await db.collection("users").updateOne({ _id: userId }, { $pull: { followedBookmarks: bookmark } });

    if (1 === result.modifiedCount) {
        return;
    } else {
        throw "failed to unfollow a bookmark";
    }
}

export async function getFollowedUsers(user: string): Promise<User[]> {
    const userId = mongodb.ObjectID.createFromHexString(user);

    const found: User = await db.collection("users").find({ _id: userId }).limit(1).next();

    if (found) {
        const followedUsers = await db.collection("users").find({ _id: { $in: found.followedUsers.map(mongodb.ObjectID.createFromHexString) } }).toArray();
        return followedUsers;
    } else {
        throw "user not found";
    }
}

export async function followUser(userToFollow: string, userId: mongodb.ObjectID): Promise<void> {
    const result = await db.collection("users").updateOne({ _id: userId }, { $addToSet: { followedUsers: userToFollow } });

    if (1 === result.modifiedCount) {
        return;
    } else {
        throw "unable to follow user";
    }
}

export async function unfollowUser(userToUnfollow: string, userId: mongodb.ObjectID): Promise<void> {
    const result = await db.collection("users").updateOne({ _id: userId }, { $pull: { followedUsers: userToUnfollow } });

    if (1 === result.modifiedCount) {
        return;
    } else {
        throw "unable to unfollow user";
    }
}

export async function removeUser(userId: mongodb.ObjectID): Promise<void> {
    const result = await db.collection("users").deleteOne({ _id: userId });

    if (1 === result.deletedCount) {
        return;
    } else {
        throw "unable to remove user";
    }
}

export function generateGUID() {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000)
            .toString(16)
            .substring(1);
    }
    return s4() + s4() + s4() + s4() + s4() + s4() + s4() + s4();
}

export function hash(str: string) {
    return md5(str);
}

export function getRandomUser(num: number = 20): Promise<UserWithCreatedBookmark[]> {
    const promise = new Promise<User[]>((resolve, reject) => {
        db.collection("users").aggregate(
            [
                { $sample: { size: num } },
                {
                    $lookup: {
                        from: "bookmarks",
                        localField: "_id",
                        foreignField: "creatorId",
                        as: "createdBookmarks"
                    }
                },
                { $match: { createdBookmarks: { $not: { $size: 0 } } } }
            ],
            (err: Error, results: User[]) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(results);
                }
            });
    });
    return promise;
}

export async function addComment(comment: Comment) {
    const result = await db.collection("comments").insertOne(comment);

    if (1 === result.insertedCount) {
        return comment;
    } else {
        throw "unable to add comment";
    }
}

export async function getComments(start = 0, length = 10) {
    const comments: Comment[] = await db.collection("comments").find({}).sort({ _id: -1 }).toArray();

    return comments;
}
