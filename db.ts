import mongodb = require("mongodb");
import assert = require("assert");
import md5 = require("blueimp-md5");


const server = new mongodb.Server("localhost", 27017);
const db = new mongodb.Db("mydb", server, { w: 1 });
db.open((err, _) => { if (err) console.log(err); });

export const validateId = "[\\d\\w]{24}";
export const validateIdReg = /[\d\w]{24}/;

// when converted to json, mongodb.ObjectId becomes a hex string.
export type UserDB = User<mongodb.ObjectID>;
export type UserJSON = User<string>;

export type BookmarkDB = Bookmark<mongodb.ObjectID>;
export type BookmarkJSON = Bookmark<string>;

export type LoginPairDB = LoginPair<mongodb.ObjectID>;
export type LoginPairJSON = LoginPair<string>;

export type BookmarkNotificationDB = BookmarkNotification<mongodb.ObjectID>;
export type BookmarkNotificationJSON = BookmarkNotification<string>;

export type CommentDB = Comment<mongodb.ObjectID>;
export type CommentJSON = Comment<string>;

export type UserWithCreatedBookmarkDB = UserWithCreatedBookmark<mongodb.ObjectID>;
export type UserWithCreatedBookmarkJSON = UserWithCreatedBookmark<string>;

interface User<IdType> {
    _id?: IdType;
    email?: string;
    username: string;
    hashedPassword?: string;
    salt?: string;
    quoraId?: string;

    followedBookmarks?: IdType[];
    followedUsers?: IdType[];

    bookmarkNotifications?: BookmarkNotification<IdType>[];
}

interface UserWithCreatedBookmark<IdType> extends User<IdType> {
    createdBookmarks: Bookmark<IdType>[];
}

interface Bookmark<IdType> {
    _id?: IdType;
    title: string;
    description?: string;
    creatorId?: IdType;
    answers?: string[];
}

interface Cookie {
    _id?: mongodb.ObjectID;
    userId?: mongodb.ObjectID;
    login: string;
}

interface LoginPair<IdType> {
    userId: IdType;
    login: string;
}

interface BookmarkNotification<IdType> {
    sourceId?: IdType;
    title?: string;
    num: number;
}

interface Comment<IdType> {
    _id?: IdType;
    ip?: string;
    content: string;
}

function addBookmarkNotification(bookmark: string) {
    const sourceId = mongodb.ObjectID.createFromHexString(bookmark);
    return db.collection("users").bulkWrite([
        {
            updateMany: {
                filter: {
                    bookmarkNotifications: {
                        $elemMatch: { sourceId }
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
                    followedBookmarks: sourceId,
                    "bookmarkNotifications.sourceId": { $nin: [sourceId] }
                },
                update: {
                    $push: {
                        bookmarkNotifications: {
                            sourceId,
                            num: 1
                        }
                    }
                }
            }
        }
    ]);
}

export function removeBookmarkNotification(userId: mongodb.ObjectID, bookmark: string) {
    const sourceId = mongodb.ObjectID.createFromHexString(bookmark);
    return db.collection("users").updateOne(
        { _id: userId },
        {
            $pull: {
                bookmarkNotifications: { sourceId }
            }
        }
    );
}
// to do: use aggregation to find bookmarks
export async function getBookmarkNotifications(userHex: string): Promise<BookmarkNotificationDB[]> {
    const userId = mongodb.ObjectID.createFromHexString(userHex);

    const user: UserDB = await db.collection("users").find({ _id: userId }).limit(1).next();
    if (!user) {
        throw "user not found";

    } else if (0 === user.bookmarkNotifications.length) {
        return [];

    } else {
        const bookmarkIds = user.bookmarkNotifications.map(x => x.sourceId);
        const bookmarks: BookmarkDB[] = await db.collection("bookmarks").find({ _id: { $in: bookmarkIds } }).toArray();

        // set title for each notification.
        const notifis = user.bookmarkNotifications;
        const idToTitle = new Map<mongodb.ObjectID, string>();

        bookmarks.forEach(element => {
            idToTitle.set(element._id, element.title);
        });

        notifis.forEach(element => {
            element.title = idToTitle.get(element.sourceId);
        });

        return notifis;
    }
}

async function insertCookie(userId: mongodb.ObjectID): Promise<LoginPairDB> {
    const cookie: Cookie = {
        userId,
        login: generateGUID()
    };

    const result = await db.collection("cookies").insertOne(cookie);

    if (1 === result.insertedCount) {
        return { userId, login: cookie.login };
    } else {
        throw "fail to insert cookie";
    }
}

export async function getUserByCookie(cookie: string) {
    const result: Cookie = await db.collection("cookies").find({ login: cookie }).limit(1).next();

    if (result) {
        return result.userId;
    } else {
        throw "Invalid cookie";
    }
}

// check whether a name is available.
export async function isUsernameAvailable(username: string) {
    const user: UserDB = await db.collection("users").find({ $and: [{ username: { $ne: null } }, { username: username }] }).limit(1).next();

    if (!user) {
        return;
    } else {
        throw "username not available";
    }
}

// check whether a email address is available.
export async function isEmailAvailable(email: string) {
    const user: UserDB = await db.collection("users").find({ $and: [{ email: { $ne: null } }, { email: email }] }).limit(1).next();

    if (!user) {
        return;
    } else {
        throw "email not available";
    }
}

// @param user: email or username must be defined, password must be defined.
export async function varifyUser(user: UserDB, password: string) {
    const users: UserDB[] = await db.collection("users").find(
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
export async function addUser(user: UserDB): Promise<UserDB> {
    const result = await db.collection("users").insertOne(user);

    if (1 === result.insertedCount) {
        return user;
    } else {
        throw "fail to add a user";
    }
}

// @param bookmark: creatorId, title must be defined.
export async function addBookmark(bookmark: BookmarkDB): Promise<BookmarkDB> {
    const result = await db.collection("bookmarks").insertOne(bookmark);

    if (1 === result.insertedCount) {
        return bookmark;
    } else {
        throw "fail to add a bookmark";
    }

}

// @param bookmark: string representation of bookmark._id
// @param answer: the url of answer
export async function addAnswer(bookmark: string, answer: string, creatorId: mongodb.ObjectID) {
    const bookmarkId = mongodb.ObjectID.createFromHexString(bookmark);

    const result = await db.collection("bookmarks").updateOne({ _id: bookmarkId, creatorId }, { $addToSet: { answers: answer } });

    if (1 === result.modifiedCount) {
        return addBookmarkNotification(bookmark);
    } else {
        throw "fail to add an answer";
    }
}

export async function getUsers(selector: Object) {
    const users: UserDB[] = await db.collection("users").find(selector).toArray();

    return users;
}

// @brief get bookmarks of an user
// @param user: string representation of user._id
export async function getBookmarksOfUser(user: string, projection?: Object): Promise<BookmarkDB[]> {
    const userId = mongodb.ObjectID.createFromHexString(user);

    const bookmarks = await db.collection("bookmarks").find({ creatorId: userId }).project(projection).toArray();

    return bookmarks;
}


export async function getFollowedBookmarks(user: string): Promise<mongodb.ObjectID[]> {
    const userId = mongodb.ObjectID.createFromHexString(user);

    const found: UserDB = await db.collection("users").find({ _id: userId }).limit(1).next();

    if (found) {
        return found.followedBookmarks;
    } else {
        throw "user not found";
    }
}


// @brief get bookmark by id.
// @param bookmark: string representation of bookmark._id
export async function getBookmarkById(bookmark: string): Promise<BookmarkDB> {
    const bookmarkId = mongodb.ObjectID.createFromHexString(bookmark);

    const found: BookmarkDB = await db.collection("bookmarks").find({ _id: bookmarkId }).limit(1).next();

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
        throw "fail to remove an answer";
    }
}

export async function removeBookmark(bookmark: string, userId: mongodb.ObjectID): Promise<void> {
    const bookmarkId = mongodb.ObjectID.createFromHexString(bookmark);

    const result = await db.collection("bookmarks").deleteOne({ _id: bookmarkId, creatorId: userId });

    if (1 === result.deletedCount) {
        return;
    } else {
        throw "fail to remove an bookmark";
    }
}


export async function followBookmark(bookmark: string, userId: mongodb.ObjectID): Promise<void> {
    const bookmarkId = mongodb.ObjectID.createFromHexString(bookmark);

    const result = await db.collection("users").updateOne({ _id: userId }, { $addToSet: { followedBookmarks: bookmarkId } });

    if (1 === result.modifiedCount) {
        return;
    } else {
        throw "fail to follow a bookmark";
    }

}

export async function unfollowBookmark(bookmark: string, userId: mongodb.ObjectID): Promise<void> {
    const bookmarkId = mongodb.ObjectID.createFromHexString(bookmark);

    const result = await db.collection("users").updateOne({ _id: userId }, { $pull: { followedBookmarks: bookmarkId } });

    if (1 === result.modifiedCount) {
        return;
    } else {
        throw "fail to unfollow a bookmark";
    }
}

export async function getFollowedUsers(user: string): Promise<UserDB[]> {
    const userId = mongodb.ObjectID.createFromHexString(user);

    const found: UserDB = await db.collection("users").find({ _id: userId }).limit(1).next();

    if (found) {
        const followedUsers = await db.collection("users").find({ _id: { $in: found.followedUsers } }).toArray();
        return followedUsers;
    } else {
        throw "user not found";
    }
}

export async function followUser(userToFollow: string, userId: mongodb.ObjectID): Promise<void> {
    const anotherUserId = mongodb.ObjectID.createFromHexString(userToFollow);

    const result = await db.collection("users").updateOne({ _id: userId }, { $addToSet: { followedUsers: anotherUserId } });

    if (1 === result.modifiedCount) {
        return;
    } else {
        throw "unable to follow user";
    }
}

export async function unfollowUser(userToUnfollow: string, userId: mongodb.ObjectID): Promise<void> {
    const anotherUserId = mongodb.ObjectID.createFromHexString(userToUnfollow);

    const result = await db.collection("users").updateOne({ _id: userId }, { $pull: { followedUsers: anotherUserId } });

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

export function getRandomUser(num: number = 20): Promise<UserWithCreatedBookmarkDB[]> {
    const promise = new Promise<UserWithCreatedBookmarkDB[]>((resolve, reject) => {
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
            (err, results) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(results);
                }
            });
    });
    return promise;
}

export async function addComment(comment: CommentDB) {
    const result = await db.collection("comments").insertOne(comment);

    if (1 === result.insertedCount) {
        return comment;
    } else {
        throw "unable to add comment";
    }
}

export async function getComments(start = 0, length = 10) {
    const comments: CommentDB[] = await db.collection("comments").find({}).sort({ _id: -1 }).toArray();

    return comments;
}
