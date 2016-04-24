import express = require("express");
import db = require("../db");

const router = express.Router();

// @brief add new bookmark. return _id of bookmark if success.
// @param : {title: string, cookie: string, description?: string, answers?: string[]}
router.post("/", function (req, res, next) {
    const bookmark: db.Bookmark = {
        title: req.body.title,
        description: req.body.description
    };

    const cookie: string = req.body.cookie;


    if (bookmark.title && cookie) {
        db.getUserByCookie(cookie).then(
            (userId) => {
                bookmark.creatorId = userId;
                bookmark.answers = [];
                return db.addBookmark(bookmark);
            },
            (err) => {
                // cookie is invalid
                res.status(400).send({ err: "Invalid cookie" });
            }).then((value) => {
                res.send(value);
            });
    } else {
        res.status(409).send({});
    }
});

// @brief retrieve bookmarks of an user 
// @param: {userId: string}
router.get("/", function (req, res, next) {
    const userId: string = req.query.userId;

    if (db.validateIdReg.test(userId)) {
        db.getBookmarksOfUser(userId).then((bookmarks) => {
            res.send(bookmarks);
        }, () => {
            res.status(404).send({});
        });
    } else {
        res.status(409).send({ err: "empty query" });
    }
});

// @brief get the content of a bookmark
router.get(`/:bookmarkId(${db.validateId})`, function (req, res, next) {
    const bookmarkId: string = req.params.bookmarkId;
    const action: string = req.query.action;

    if (db.validateIdReg.test(bookmarkId)) {
        db.getBookmarkById(bookmarkId).then((bookmark) => {
            if ("share" === action) {
                res.render("sharedBookmark.jade", { title: bookmark.title, answers: bookmark.answers });
            } else {
                res.send(bookmark);
            }
        }, (err) => {
            res.status(404).send({});
        });
    } else {
        res.status(409).send({ err: "Invalid bookmark id" });
    }
});

// @brief add answers to a bookmark
router.post(`/:bookmarkId(${db.validateId})`, function (req, res, next) {
    const {cookie = "", answer = ""} = req.body;
    const bookmarkId: string = req.params.bookmarkId;

    if (answer && cookie) {
        db.getUserByCookie(cookie).then((userId) => {
            return db.addAnswer(bookmarkId, answer, userId);
        }, (err) => { res.status(400).send({ err: "Invalid cookie" }); }
        ).then((answer) => {
            res.send({});
        }, (err) => { res.status(500).send({ err: err }); });
    } else {
        res.status(409).send({ err: "Empty" });
    }
});

// @brief remove an answer of bookmark.
router.put(`/:bookmarkId(${db.validateId})`, (req, res, next) => {
    const {cookie = "", answer = ""} = req.body;
    const bookmarkId: string = req.params.bookmarkId;

    if (answer && cookie) {
        db.getUserByCookie(cookie).then(userId => {
            return db.removeAnswer(answer, bookmarkId, userId);
        }, err => {
            res.status(400).send({ err: "Invalid cookie" });
        }).then(() => {
            res.send({});
        }, err => {
            res.status(400).send({ err: err });
        });
    } else {
        res.status(409).send({ err: "Empty answer or cookie" });
    }
});

// @brief remove a bookmark
router.delete(`/:bookmarkId(${db.validateId})`, (req, res, next) => {
    const cookie: string = req.body.cookie;
    const bookmarkId: string = req.params.bookmarkId;

    if (cookie && bookmarkId) {
        db.getUserByCookie(cookie).then(userId => {
            return db.removeBookmark(bookmarkId, userId);
        }, err => {
            res.status(400).send({ err: "Invalid cookie" });
        }).then(() => res.send({}), err => res.status(400).send({ err: err }));
    } else {
        res.status(409).send({ err: "Empty cookie" });
    }
});

export = router;