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
    num: number;
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

export function getBookmarkNotifications(user: string) {
    const userId = mongodb.ObjectID.createFromHexString(user);

    const promise = new Promise<BookmarkNotification[]>((resolve, reject) => {
        db.collection("users").find({ _id: userId }).limit(1).toArray((err: Error, users: User[]) => {
            if (err) {
                reject(err);
            } else {
                resolve(users[0].bookmarkNotifications);
            }
        });
    });
    return promise;
}

// @return Promise: string, cookieID
function insertCookie(userId: mongodb.ObjectID): Promise<Object> {
    const promise = new Promise<Object>((resolve, reject) => {
        const cookie: Cookie = {
            userId,
            content: generateGUID(),
            date: new Date()
        };

        db.collection("cookies").insertOne(cookie, (err, result) => {
            if (1 === result.insertedCount) {
                resolve({
                    userId,
                    cookie: cookie.content
                });
            } else {
                console.log(err);
                reject("fail to insert cookie");
            }
        });
    });
    return promise;
}

// reject if cookie is invalid.
export function getUserByCookie(cookie: string): Promise<mongodb.ObjectID> {
    const promise = new Promise<mongodb.ObjectID>((resolve, reject) => {
        db.collection("cookies").find({ content: cookie }).limit(1).toArray((err: Error, arr: Cookie[]) => {
            if (0 === arr.length) {
                reject();
            } else {
                resolve(arr[0].userId);
            }
        });
    });
    return promise;
}

// check whether a name is available.
// @return promise<void>
export function isUsernameAvailable(username: string): Promise<void> {
    const promise = new Promise<void>((resolve, reject) => {
        if (!username) {
            reject();
        } else {
            db.collection("users").find({ $and: [{ username: { $ne: null } }, { username: username }] }).limit(1).toArray((err, arr) => {
                assert.equal(err, null);
                if (0 === arr.length) {
                    resolve();
                } else {
                    reject();
                }
            });
        }
    });
    return promise;
}

// check whether a email address is available.
// @return promise<void>
export function isEmailAvailable(email: string): Promise<void> {
    const promise = new Promise<void>((resolve, reject) => {
        if (!email) {
            resolve();
        } else {
            db.collection("users").find({ $and: [{ email: { $ne: null } }, { email: email }] }).limit(1).toArray((err, arr) => {
                if (0 === arr.length) {
                    resolve();
                } else {
                    reject();
                }
            });
        }
    });
    return promise;
}

// @param user: email or username must be defined, password must be defined.
// @return Promise; resolve(cookie: string), reject("")
export function varifyUser(user: User, password: string): Promise<Object> {
    const promise = new Promise<Object>((resolve, reject) => {
        db.collection("users").find(
            {
                $or: [
                    { $and: [{ email: { $ne: null } }, { email: user.email }] },
                    { $and: [{ username: { $ne: null } }, { username: user.username }] }
                ]
            }
        ).limit(1).toArray((err: Error, results: User[]) => {
            assert.equal(err, null, "err: cursor.toArray");
            if (0 === results.length) {
                reject("Username not found");
            } else {
                const found = results[0];
                if (hash(password + found.salt) === found.hashedPassword) {
                    insertCookie(results[0]._id).then((id) => resolve(id),
                        (id) => reject(id));
                } else {
                    reject("Wrong password");
                }
            }
        });
    });

    return promise;
}

// @param user: email, username, hashedPassword must be defined.
export function addUser(user: User): Promise<User> {
    const promise = new Promise<User>((resolve, reject) => {
        db.collection("users").insertOne(user, (err, result) => {
            if (1 === result.insertedCount) {
                resolve(user);
            } else {
                console.log(err);
                reject(user);
            }
        });
    });

    return promise;
}

// @param bookmark: creatorId, title must be defined.
export function addBookmark(bookmark: Bookmark): Promise<Bookmark> {
    const promise = new Promise<Bookmark>((resolve, reject) => {
        db.collection("bookmarks").insertOne(bookmark, (err, result) => {
            if (1 === result.insertedCount) {
                resolve(bookmark);
            } else {
                console.log(err);
                reject(err);
            }
        });
    });

    return promise;
}

// @param bookmark: string representation of bookmark._id
// @param answer: the url of answer
// @return Promise
export function addAnswer(bookmark: string, answer: string, userId: mongodb.ObjectID) {
    const bookmarkId = mongodb.ObjectID.createFromHexString(bookmark);
    const promise = new Promise<void>((resolve, reject) => {
        db.collection("bookmarks").updateOne({ _id: bookmarkId, creatorId: userId }, { $addToSet: { answers: answer } }, (err, result) => {
            if (err) {
                console.log(err);
                reject(err);
            } else {
                resolve();

                if (1 === result.modifiedCount) {
                    addBookmarkNotification(bookmark);
                }
            }
        });
    });

    return promise;
}

export function getUsers(selector: Object): Promise<User[]> {
    const promise = new Promise<User[]>((resolve, reject) => {
        db.collection("users").find(selector).toArray((err: Error, results: User[]) => {
            resolve(results);
        });
    });

    return promise;
}

// @brief get bookmarks of an user
// @param user: string representation of user._id
// @return Promise<Bookmark[]> may be an empty array
export function getBookmarksOfUser(user: string, projection?: Object): Promise<Bookmark[]> {
    const userId = mongodb.ObjectID.createFromHexString(user);
    const promise = new Promise<Bookmark[]>((resolve, reject) => {
        if (!userId) {
            reject();
        } else {
            db.collection("bookmarks").find({ creatorId: userId }).project(projection).toArray((err: Error, results: Bookmark[]) => {
                resolve(results);
            });
        }
    });

    return promise;
}


export function getFollowedBookmarks(user: string): Promise<string[]> {
    const userId = mongodb.ObjectID.createFromHexString(user);
    const promise = new Promise<string[]>((resolve, reject) => {
        db.collection("users").find({ _id: userId }).limit(1).next((err: Error, result: User) => {
            if (err || !result) {
                reject(err);
            } else {
                resolve(result.followedBookmarks);
            }
        });
    });

    return promise;
}


// @brief get bookmark by id.
// @param bookmark: string representation of bookmark._id
export function getBookmarkById(bookmark: string): Promise<Bookmark> {
    const bookmarkId = mongodb.ObjectID.createFromHexString(bookmark);
    const promise = new Promise<Bookmark>((resolve, reject) => {
        db.collection("bookmarks").find({ _id: bookmarkId }).limit(1).toArray((err: Error, result: Bookmark[]) => {
            if (0 === result.length) {
                reject("bookmark not found");
            } else {
                resolve(result[0]);
            }
        });
    });

    return promise;
}

// @brief remove an answer of a bookmark
export function removeAnswer(answer: string, bookmark: string, userId: mongodb.ObjectID): Promise<void> {
    const bookmarkId = mongodb.ObjectID.createFromHexString(bookmark);
    const promise = new Promise<void>((resolve, reject) => {
        db.collection("bookmarks").updateOne({ _id: bookmarkId, creatorId: userId }, { $pull: { "answers": answer } }, (err, result) => {
            if (1 === result.modifiedCount) {
                resolve();
            } else {
                reject(err);
            }
        });
    });
    return promise;
}

export function removeBookmark(bookmark: string, userId: mongodb.ObjectID): Promise<void> {
    const bookmarkId = mongodb.ObjectID.createFromHexString(bookmark);
    const promise = new Promise<void>((resolve, reject) => {
        db.collection("bookmarks").deleteOne({ _id: bookmarkId, creatorId: userId }, (err, result) => {
            if (1 === result.deletedCount) {
                resolve();
            } else {
                reject(err);
            }
        });
    });

    return promise;
}


export function followBookmark(bookmark: string, userId: mongodb.ObjectID): Promise<void> {
    const promise = new Promise<void>((resolve, reject) => {
        db.collection("users").updateOne({ _id: userId }, { $addToSet: { followedBookmarks: bookmark } }, (err, result) => {
            if (1 === result.modifiedCount) {
                resolve();
            } else {
                reject(err);
            }
        });
    });
    return promise;
}

export function unfollowBookmark(bookmark: string, userId: mongodb.ObjectID): Promise<void> {
    const promise = new Promise<void>((resolve, reject) => {
        db.collection("users").updateOne({ _id: userId }, { $pull: { followedBookmarks: bookmark } }, (err, result) => {
            if (1 === result.modifiedCount) {
                resolve();
            } else {
                reject(err);
            }
        });
    });
    return promise;
}

export function getFollowedUsers(user: string): Promise<User[]> {
    const userId = mongodb.ObjectID.createFromHexString(user);
    const promise = new Promise<User[]>((resolve, reject) => {
        db.collection("users").find({ _id: userId }).limit(1).next((err: Error, result: User) => {
            // console.log("result: ", result);
            if (err || !result) {
                console.log(err);
                reject(err);
            } else {
                db.collection("users").find({ _id: { $in: result.followedUsers.map(mongodb.ObjectID.createFromHexString) } }).toArray((err, results) => {
                    resolve(results);
                });
            }
        });
    });

    return promise;
}

export function followUser(userToFollow: string, userId: mongodb.ObjectID): Promise<void> {
    const promise = new Promise<void>((resolve, reject) => {
        db.collection("users").updateOne({ _id: userId }, { $addToSet: { followedUsers: userToFollow } }, (err, result) => {
            if (1 === result.modifiedCount) {
                resolve();
            } else {
                reject(err);
            }
        })
    });
    return promise;
}

export function unfollowUser(userToUnfollow: string, userId: mongodb.ObjectID): Promise<void> {
    const promise = new Promise<void>((resolve, reject) => {
        db.collection("users").updateOne({ _id: userId }, { $pull: { followedUsers: userToUnfollow } }, (err, result) => {
            if (1 === result.modifiedCount) {
                resolve();
            } else {
                reject(err);
            }
        })
    })
    return promise;
}

export function removeUser(userId: mongodb.ObjectID): Promise<void> {
    const promise = new Promise<void>((resolve, reject) => {
        db.collection("users").deleteOne({ _id: userId }, (err, result) => {
            if (1 === result.deletedCount) {
                resolve();
            } else {
                reject();
            }
        });
    });
    return promise;
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