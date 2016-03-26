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
    bookmarks?: Bookmark;
}

export interface Bookmark {
    _id?: mongodb.ObjectID;
    title: string;
    description?: string;
    creatorId?: string;
    answers?: string[];
}

export interface Cookie {
    _id?: mongodb.ObjectID;
    userId?: mongodb.ObjectID;
    date: Date;
}

//@return Promise: string, cookieID
function insertCookie(userId: mongodb.ObjectID): Promise<Object>{
    const promise = new Promise<Object>((resolve, reject) =>{
        const cookie: Cookie = {
            userId: userId,
            date: new Date()
        };
        
        db.collection('cookies').insert(cookie, (err, results) =>{
            if(err){ 
                console.log(err);
                reject({});
            }else{
                assert.notEqual(cookie._id, null, "fail to insert cookie");
                resolve({
                    userId: userId,
                    cookie: cookie._id.toHexString()
                })
            }
        });
    });
    return promise;
}

// check whether a name has been occupied.
// @return promise<boolean>
export function isUserNameOccupied(userName: string): Promise<boolean> {
    const promise = new Promise<boolean>((resolve, reject)=>{
        db.collection('users').find({userName: userName}, (err, cursor)=>{
            cursor.toArray((err, arr)=>{
                assert.equal(err, null);
                
                if(0===arr.length){
                    resolve(true);
                }else{
                    reject(false);
                }
            });
        });
    });
    return promise;
}

// check whether a name has been occupied.
// @return promise<boolean>
export function isEmailOccupied(email: string): Promise<boolean>{
    const promise = new Promise<boolean> ((resolve, reject)=>{
        db.collection('users').find({email: email}, (err, cursor)=>{
            cursor.toArray((err, arr)=>{
                if(0===arr.length){
                    resolve(true);
                }else{
                    reject(false);
                }
            });
        });
    });
    return promise;
}

//@param user: email or userName must be defined, hashedPassword must be defined.
//@return Promise; resolve(cookie: string), reject("")
export function varifyUser(user: User): Promise<Object> {
    const promise = new Promise<Object>((resolve, reject) =>{
        db.collection('users').find({$and: [{hashedPassword: user.hashedPassword}, 
                                            {$or: [
                                                    {$and: [{email: {$ne: null}}, {email: user.email}]},
                                                    {$and: [{userName: {$ne: null}}, {userName: user.userName}]}
                                                  ]
                                            }
                                           ]
                                    }, (err, cursor)=>{
                                        if(err) {
                                            console.log(err);
                                            reject("");
                                        }else{
                                            cursor.toArray((err, results: User[]) => {
                                                assert.equal(err, null, "err: cursor.toArray");
                                                if(results.length===0){
                                                    reject({});
                                                }else{
                                                     insertCookie(results[0]._id).then((id)=>resolve(id),
                                                                                   (id)=>reject(id));
                                                }
                                            });
                                        }
                                    });
    });
    
    return promise;
}

//@param user: email, userName, hashedPassword must be defined.
export function addUser(user: User): Promise<User> {
    const promise = new Promise<User>((resolve, reject) => {
        db.collection('users').insert(user, (err, result) => {
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

//@param bookmark: creatorId, title must be defined.
export function addBookMark(bookmark: Bookmark): Promise<Bookmark> {
    const promise = new Promise<Bookmark>((resolve, reject) => {
        db.collection('bookmarks').insert(bookmark, (err, result) => {
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

// @param bookmark: _id must be defined.
// @param answer: the url of answer
// @return Promise
export function addAnswer(bookmark: Bookmark, answer: string): Promise<string> {
    const promise = new Promise<string>((resolve, reject) => {
        db.collection('bookmarks').update({ _id: bookmark._id }, { $addToSet: { answers: answer } }, (err, result) => {
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
                reject([]);

            } else {
                cursor.toArray((err, results: User[]) => {
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
                    cursor.toArray((err, results: Bookmark[]) => {
                        resolve(results);
                    });
                }
            });
        }
    });

    return promise;
}
