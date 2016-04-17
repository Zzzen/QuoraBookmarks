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
export function addBookMark(bookmark: Bookmark): Promise<Bookmark> {
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
export function addAnswer(bookmark: string, answer: string, userId: mongodb.ObjectID): Promise<string> {
    const bookmarkId = mongodb.ObjectID.createFromHexString(bookmark);
    const promise = new Promise<string>((resolve, reject) => {
        db.collection("bookmarks").updateOne({ _id: bookmarkId, creatorId: userId }, { $addToSet: { answers: answer } }, (err, result) => {
            if (err) {
                console.log(err);
                reject(answer);
            } else {
                resolve(answer);
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
            db.collection("bookmarks").find({ creatorId: userId }, projection).toArray((err: Error, results: Bookmark[]) => {
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