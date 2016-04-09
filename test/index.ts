import mocha = require("mocha");
import request = require("supertest");
import express = require("express");
import should = require("should");

import {App as app} from "../app";


describe("GET /", () => {
    it("should be 200", (done) => {
        request(app)
            .get("/")
            .expect(200, done);
    });
});

const userName = `艹${(new Date()).toISOString().replace(/[-:.]/g, "")}艹`;
const hashedPassword = (new Date()).toISOString().replace(/[-:.]/g, "");
let cookie: string;
let userId: string;

describe("POST /user", () => {
    it("should add a user", done => {
        request(app)
            .post("/user")
            .send({ userName: userName, hashedPassword: hashedPassword })
            .expect("Content-Type", /json/)
            .expect((res: any) => {
                should(res.body).not.ownProperty("err", "should not return err");
                should(res.body).has.property("_id");
                userId = res.body._id;
            })
            .expect(200, done);
    });
});

describe("POST /login", () => {
    it("should login successfully.", done => {
        request(app)
            .post("/login")
            .send({ userName: userName, hashedPassword: hashedPassword })
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
    it("should fail with empty field", done => {
        request(app)
            .post("/login")
            .send({ userName: userName })
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
            .send({ userName: userName, hashedPassword: hashedPassword + "CAO" })
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

describe("GET /user/:userId", () => {
    it("should return all bookmarks of an user", done => {
        request(app)
            .get(`/user/${userId}`)
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
        request(app)
            .get(`/user/${userId}`)
            .query({ showAnswers: "0" })
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