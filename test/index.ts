import mocha = require("mocha");
import request = require("supertest");
import express = require("express");
import should = require("should");

import {App as app} from "../app";
import {GetUserOption, GetBookmarkFlags} from "../interfaces";
import {BookmarkNotification} from '../db';


describe("GET /", () => {
    it("should be 200", (done) => {
        request(app)
            .get("/")
            .expect(200, done);
    });
});

const username = `艹${(new Date()).toISOString().replace(/[-:.]/g, "")}艹`;
const password = (new Date()).toISOString().replace(/[-:.]/g, "");
let cookie: string;
let userId: string;

describe("POST /user", () => {
    it("should add a user", done => {
        request(app)
            .post("/user")
            .send({ username, password })
            .expect("Content-Type", /json/)
            .expect((res: any) => {
                should(res.body).not.ownProperty("err", "should not return err");
                should(res.body).has.property("_id");
                userId = res.body._id;
            })
            .expect(200, done);
    });
});

describe("POST /user", () => {
    it("should fail to add a user with same name", done => {
        request(app)
            .post("/user")
            .send({ username, password })
            .expect("Content-Type", /json/)
            .expect((res: any) => {
                should(res.body).has.property("err");
            })
            .expect(400, done);
    });
})

const _username = `艹${(new Date()).toISOString().replace(/[-:.]/g, "")}艹艹`;
let _cookie: string;
let _userId: string;

describe("POST /user", () => {
    it("should add another user", done => {
        request(app)
            .post("/user")
            .send({ username: _username, password })
            .expect((res: any) => {
                _userId = res.body._id;
            })
            .expect(200, done);
    });
});

describe("POST /login", () => {
    it("should login successfully.", done => {
        request(app)
            .post("/login")
            .send({ username, password })
            .expect("Content-Type", /json/)
            .expect((res: any) => {
                should(res.body).not.ownProperty("err", "should not return err");
                should(res.body).hasOwnProperty("cookie", "should return a cookie");
                cookie = res.body.cookie;
            })
            .expect(200, done);
    });
});

describe("POST /login", () => {
    it("should login successfully again", done => {
        request(app)
            .post("/login")
            .send({ username: _username, password })
            .expect((res: any) => {
                _cookie = res.body.cookie;
            })
            .expect(200, done);
    });
});

describe("POST /login", () => {
    it("should fail with empty field", done => {
        request(app)
            .post("/login")
            .send({ username: username })
            .expect("Content-Type", /json/)
            .expect((res: any) => {
                should(res.body).ownProperty("err");
            })
            .expect(409, done);
    });
});

describe("POST /login", () => {
    it("should fail with wrong password", done => {
        request(app)
            .post("/login")
            .send({ username, password: password + "CAO" })
            .expect("Content-Type", /json/)
            .expect(400, done);
    });
});

let bookmarkId = "";
describe("POST /bookmark", () => {
    it("should add a bookmark", done => {
        request(app)
            .post("/bookmark")
            .send({ cookie: cookie, title: "DEFAULT TITLE" })
            .expect("Content-Type", /json/)
            .expect((res: any) => {
                should(res.body).not.ownProperty("err");
                should(res.body).ownProperty("_id");
                should(res.body).ownProperty("title");
                bookmarkId = res.body._id;
            })
            .expect(200, done);
    });
});


describe("GET /user", () => {
    it("should return an empty array", done => {
        const getUserOption = GetUserOption.GetFollowedBookmarks;

        request(app)
            .get(`/user/${_userId}`)
            .query({ getUserOption })
            .expect("Content-Type", /json/)
            .expect((res: any) => {
                should(res.body).is.Array();
                should(res.body).length(0);
            })
            .expect(200, done);
    });
});


describe("PUT /user", () => {
    it("should follow a bookmark", done => {
        request(app)
            .put("/user")
            .send({ cookie: _cookie, bookmarkToFollow: bookmarkId })
            .expect(200, done);
    });
});

describe("POST /bookmark/:bookmarkId", () => {
    it("should add an answer to bookmark", done => {
        request(app)
            .post(`/bookmark/${bookmarkId}`)
            .send({ cookie: cookie, answer: "http://boomarks.bubiu.com" })
            .expect("Content-Type", /json/)
            .expect((res: any) => {
                should(res.body).not.ownProperty("err");
            })
            .expect(200, done);
    });
});

describe("GET /user/$_user", () => {
    it("should recieve one notification about bookmark", done => {
        const getUserOption = GetUserOption.GetBookmarkNotifications;

        request(app)
            .get(`/user/${_userId}`)
            .query({ getUserOption })
            .expect("Content-Type", /json/)
            .expect(({body}) => {
                should(body).have.length(1);
            })
            .expect(200, done);
    });
});

describe("PUT /user", () => {
    it("should remove a notification about notificaton", done => {
        const cookie = _cookie;
        const bookmarkNotificationToRemove = bookmarkId;

        request(app)
            .put("/user")
            .send({ cookie, bookmarkNotificationToRemove })
            .expect(200, done);
    });

    it("should recieve zero notification about bookmark", done => {
        const getUserOption = GetUserOption.GetBookmarkNotifications;

        request(app)
            .get(`/user/${_userId}`)
            .query({ getUserOption })
            .expect("Content-Type", /json/)
            .expect(({body}) => {
                should(body).have.length(0);
            })
            .expect(200, done);
    });
});


describe("GET /user/:userId", () => {
    it("should return all bookmarks of an user", done => {
        const getUserOption = GetUserOption.GetCreatedBookmarks;

        request(app)
            .get(`/user/${userId}`)
            .query({ getUserOption })
            .expect("Content-Type", /json/)
            .expect((res: any) => {
                should(res.body).be.an.Array();
                should(res.body).length(1);
                should(res.body[0]).ownProperty("_id");
            })
            .expect(200, done);
    });
});

describe("GET /user/:userId", () => {
    it("should return all truncated bookmarks of an user", done => {
        const getUserOption = GetUserOption.GetCreatedBookmarks;
        const getBookmarkFlags = GetBookmarkFlags.IgnoreAnswers;

        request(app)
            .get(`/user/${userId}`)
            .query({ getUserOption, getBookmarkFlags })
            .expect((res: any) => {
                should(res.body).be.an.Array();
                should(res.body[0]).not.ownProperty("answers");
            })
            .expect(200, done);
    });
});

describe("GET /bookmark/:bookmarkId", () => {
    it("should return the bookmark", done => {
        request(app)
            .get(`/bookmark/${bookmarkId}`)
            .expect("Content-Type", /json/)
            .expect((res: any) => {
                should(res.body).ownProperty("answers");
                should(res.body.answers).be.an.Array();
                should(res.body.answers).length(1);
            })
            .expect(200, done);
    });
});

describe("GET /user/:userId", () => {
    it("should return a empty array of followed users", done => {
        const getUserOption = GetUserOption.GetFollowedUsers;

        request(app)
            .get(`/user/${_userId}`)
            .query({ getUserOption })
            .expect((res: any) => {
                should(res.body).be.an.Array();
                should(res.body).have.length(0);
            })
            .expect(200, done);
    });
});

describe("PUT /user/", () => {
    it("should follow a user", done => {
        const userToFollow = userId;
        const cookie = _cookie;

        request(app)
            .put("/user")
            .send({ userToFollow, cookie })
            .expect(200, done);
    });
});

describe("GET /user/:userId", () => {
    it("should return a followed user array that has length 1.", done => {
        const getUserOption = GetUserOption.GetFollowedUsers;

        request(app)
            .get(`/user/${_userId}`)
            .query({ getUserOption })
            .expect((res: any) => {
                should(res.body).have.length(1);
                should(res.body[0]._id).equal(userId);
            })
            .expect(200, done);
    })
})

describe("PUT /user/", () => {
    it("should unfollow a user", done => {
        const userToUnfollow = userId;
        const cookie = _cookie;

        request(app)
            .put("/user")
            .send({ userToUnfollow, cookie })
            .expect(200, done);
    });
});

describe("GET /user/:userId", () => {
    it("should return a empty array of followed users", done => {
        const getUserOption = GetUserOption.GetFollowedUsers;

        request(app)
            .get(`/user/${_userId}`)
            .query({ getUserOption })
            .expect((res: any) => {
                should(res.body).be.an.Array();
                should(res.body).have.length(0);
            })
            .expect(200, done);
    });
});

describe("GET /user/:userId", () => {
    it("should return a followed bookmark", done => {
        const getUserOption = GetUserOption.GetFollowedBookmarks;

        request(app)
            .get(`/user/${_userId}`)
            .query({ getUserOption })
            .expect((res: any) => {
                should(res.body).is.Array();
                should(res.body).length(1);
            })
            .expect(200, done);
    });
});

describe("PUT /user", () => {
    it("should unfollow a bookmark", done => {
        request(app)
            .put("/user")
            .send({ cookie: _cookie, bookmarkToUnfollow: bookmarkId })
            .expect(200, done);
    });
});

describe("PUT /bookmark/:bookmarkId", () => {
    it("should remove an answer from bookmark", done => {
        request(app)
            .put(`/bookmark/${bookmarkId}`)
            .send({ cookie: cookie, answer: "http://boomarks.bubiu.com" })
            .expect("Content-Type", /json/)
            .expect((res: any) => {
                should(res.body).be.empty();
            })
            .expect(200, done);
    });
});

describe("DELETE /bookmark/:bookmarkId", () => {
    it("should remove a bookmark", done => {
        request(app)
            .delete(`/bookmark/${bookmarkId}`)
            .send({ cookie: cookie })
            .expect("Content-Type", /json/)
            .expect((res: any) => {
                should(res.body).be.empty();
            })
            .expect(200, done);
    });
});

describe("DELETE /user", () => {
    it("should delete an user", done => {
        request(app)
            .delete("/user")
            .send({ cookie: cookie })
            .expect("Content-Type", /json/)
            .expect((res: any) => {
                should(res.body).be.empty();
            })
            .expect(200, done);
    });
});

describe("DELETE /user", () => {
    it("should delete another user", done => {
        request(app)
            .delete("/user")
            .send({ cookie: _cookie })
            .expect("Content-Type", /json/)
            .expect((res: any) => {
                should(res.body).be.empty();
            })
            .expect(200, done);
    });
});