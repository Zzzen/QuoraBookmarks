import mongodb = require("mongodb");
import assert = require("assert");
import {Promise} from "es6-promise";


const server = new mongodb.Server("localhost", 27017, { auto_reconnect: true });
const db = new mongodb.Db("mydb", server, { w: 1 });
db.open((err, _) => { if (err) console.log(err); });

export interface User {
    _id?: mongodb.ObjectID;
    email?: string;
    userName: string;
    hashedPassword: string;
    quoraId?: string;
    bookmarks?: Bookmark;
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
    date: Date;
}

// @return Promise: string, cookieID
function insertCookie(userId: mongodb.ObjectID): Promise<Object> {
    const promise = new Promise<Object>((resolve, reject) => {
        const cookie: Cookie = {
            userId: userId,
            date: new Date()
        };

        db.collection("cookies").insert(cookie, (err, results) => {
            if (err) {
                console.log(err);
                reject({});
            }else {
                assert.notEqual(cookie._id, null, "fail to insert cookie");
                resolve({
                    userId: userId,
                    cookie: cookie._id.toHexString()
                });
            }
        });
    });
    return promise;
}

export function getUserByCookie(cookie: string): Promise<mongodb.ObjectID> {
    const promise = new Promise<mongodb.ObjectID>((resolve, reject) => {
        db.collection("cookies").find({_id: mongodb.ObjectID.createFromHexString(cookie)}, (err, cursor) => {
            cursor.toArray((err: Error, arr: Cookie[]) => {
                if (0 === arr.length) {
                    reject(null);
                }else {
                    resolve(arr[0].userId);
                }
            });
        });
    });
    return promise;
}

// check whether a name is available.
// @return promise<void>
export function isUserNameAvailable(userName: string): Promise<void> {
    const promise = new Promise<void>((resolve, reject) => {
        if ( !userName || 0 === userName.length) {
            resolve();
        }else {
            db.collection("users").find({$and: [{userName: {$ne: null}}, {userName: userName}]}, (err, cursor) => {
                cursor.toArray((err, arr) => {
                    assert.equal(err, null);

                    if (0 === arr.length) {
                        resolve();
                    }else {
                        reject();
                    }
                });
            });
        }
    });
    return promise;
}

// check whether a email address is available.
// @return promise<void>
export function isEmailAvailable(email: string): Promise<void> {
    const promise = new Promise<void> ((resolve, reject) => {
        if ( !email || 0 === email.length) {
            resolve();
        }else {
            db.collection("users").find({$and: [{email: {$ne: null}}, {email: email}]}, (err, cursor) => {
                cursor.toArray((err, arr) => {
                    if (0 === arr.length) {
                        resolve();
                    }else {
                        reject();
                    }
                });
            });
        }
    });
    return promise;
}

// @param user: email or userName must be defined, hashedPassword must be defined.
// @return Promise; resolve(cookie: string), reject("")
export function varifyUser(user: User): Promise<Object> {
    const promise = new Promise<Object>((resolve, reject) => {
        db.collection("users").find({$and: [{hashedPassword: user.hashedPassword},
                                            {$or: [
                                                    {$and: [{email: {$ne: null}}, {email: user.email}]},
                                                    {$and: [{userName: {$ne: null}}, {userName: user.userName}]}
                                                  ]
                                            }
                                           ]
                                    }, (err, cursor) => {
                                        if (err) {
                                            console.log(err);
                                            reject("");
                                        }else {
                                            cursor.toArray((err: Error, results: User[]) => {
                                                assert.equal(err, null, "err: cursor.toArray");
                                                if (0 === results.length) {
                                                    reject({});
                                                }else {
                                                     insertCookie(results[0]._id).then((id) => resolve(id),
                                                                                   (id) => reject(id));
                                                }
                                            });
                                        }
                                    });
    });

    return promise;
}

// @param user: email, userName, hashedPassword must be defined.
export function addUser(user: User): Promise<User> {
    const promise = new Promise<User>((resolve, reject) => {
        db.collection("users").insert(user, (err, result) => {
            if (err) {
                console.log(err);
                reject(user);
            } else {
                resolve(user);
            }
        });
    });

    return promise;
}

// @param bookmark: creatorId, title must be defined.
export function addBookMark(bookmark: Bookmark): Promise<Bookmark> {
    const promise = new Promise<Bookmark>((resolve, reject) => {
        db.collection("bookmarks").insert(bookmark, (err, result) => {
            if (err) {
                console.log(err);
                reject(bookmark);
            } else {
                resolve(bookmark);
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
        db.collection("bookmarks").update({ _id: bookmarkId, creatorId: userId }, { $addToSet: { answers: answer } }, (err, result) => {
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
        db.collection("users").find(selector, (err, cursor) => {
            if (err) {
                console.log(err);
                reject([]);

            } else {
                cursor.toArray((err: Error, results: User[]) => {
                    resolve(results);
                });
            }
        });
    });

    return promise;
}

// @brief get bookmarks of an user
// @param user: string representation of user._id
// @return Promise<Bookmark[]> may be an empty array
export function getBookmarksOfUser(user: string): Promise<Bookmark[]> {
    const userId = mongodb.ObjectID.createFromHexString(user);
    const promise = new Promise<Bookmark[]>((resolve, reject) => {
        if (!userId) {
            reject(null);
        } else {
            db.collection("bookmarks").find({ creatorId: userId }, (err, cursor) => {
                if (err) {
                    console.log(err);
                    reject(err);
                } else {
                    cursor.toArray((err: Error, results: Bookmark[]) => {
                        resolve(results);
                    });
                }
            });
        }
    });

    return promise;
}


// @brief get bookmark by id.
// @param bookmark: string representation of bookmark._id
export function getBookmarkById(bookmark: string): Promise<Bookmark> {
    const bookmarkId = mongodb.ObjectID.createFromHexString(bookmark);
    const promise = new Promise<Bookmark>((resolve, reject) => {
        db.collection("bookmarks").find({_id: bookmarkId}, (err, cursor) => {
            if (err) {
                console.log(err);
                reject(err);
            }else {
                cursor.toArray((err: Error, result: Bookmark[]) => {
                    if (0 === result.length) {
                        reject("bookmark not found");
                    }else {
                        resolve(result[0]);
                    }
                });
            }
        });
    });

    return promise;
}