import mongodb = require("mongodb");
import assert = require("assert")
import {Promise} from "es6-promise";


const server = new mongodb.Server('localhost', 27017, { auto_reconnect: true });
const db = new mongodb.Db('mydb', server, { w: 1 });
db.open((err, _) => { if (err) console.log(err); });

export interface User {
    _id?: mongodb.ObjectID;
    email?: string;
    userName: string;
    hashedPassword: string;
    quoraId?: string;
}

export interface Bookmark {
    _id?: mongodb.ObjectID;
    title: string;
    description?: string;
    creatorId?: string;
    answers?: string[];
}

export function addUser(user: User): Promise<User> {
    const promise = new Promise<User>((resolve, reject) => {
        db.collection('users').insertOne(user, (err, result) => {
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

export function addBookMark(bookmark: Bookmark): Promise<Bookmark> {
    const promise = new Promise<Bookmark>((resolve, reject) => {
        db.collection('bookmarks').insertOne(bookmark, (err, result) => {
            if (err) {
                console.log(err);
                reject(bookmark)
            } else {
                resolve(bookmark);
            }
        });
    });

    return promise;
}

export function addAnswer(bookmark: Bookmark, answer: string): Promise<string> {
    const promise = new Promise<string>((resolve, reject) => {
        db.collection('bookmarks').updateOne({ _id: bookmark._id }, { $addToSet: { answers: answer } }, (err, result) => {
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
        db.collection('users').find(selector, (err, cursor) => {
            if (err) {
                console.log(err);
                reject(null);

            } else {
                cursor.toArray((err, results) => {
                    assert.equal(err, null, "err: cursor.toArray");
                    resolve(results);
                })
            }
        });
    });

    return promise;
}

export function getBookmarkOfUser(userId: mongodb.ObjectID): Promise<Bookmark[]> {
    const promise = new Promise<Bookmark[]>((resolve, reject) => {
        if (!userId) {
            reject(null);
        } else {
            db.collection('bookmarks').find({ creatorId: userId }, (err, cursor) => {
                if (err) {
                    console.log(err);
                    reject(err);
                } else {
                    cursor.toArray((err, results) => {
                        assert.equal(err, null, "err: cursor.toArray");
                        resolve(results);
                    });
                }
            });
        }
    });

    return promise;
}