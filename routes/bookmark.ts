import express = require("express");
import db = require("../db");

const router = express.Router();

function notEmpty(str: string): boolean {
    return str != null && str.length > 0;
}

function isValidateId(id: string): boolean {
    return id != null && (12 === id.length || 24 === id.length);
}

// @brief add new bookmark. return _id of bookmark if success.
// @param : {title: string, cookie: string, description?: string, answers?: string[]}
router.post("/", function(req, res, next) {
    const bookmark: db.Bookmark = {
        title: req.body.title,
        description: req.body.description
    };

    const cookie: string = req.body.cookie;


    if (notEmpty(bookmark.title) && notEmpty(cookie)) {
        db.getUserByCookie(cookie).then(
            (userId) => {
                bookmark.creatorId = userId;
                bookmark.answers = [];
                return db.addBookMark(bookmark);
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
router.get("/", function(req, res, next) {
    const userId: string = req.query.userId;

    if (isValidateId(userId)) {
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
router.get("/:bookmarkId", function(req, res, next) {
    const bookmarkId: string = req.params.bookmarkId;

    if (isValidateId(bookmarkId)) {
        db.getBookmarkById(bookmarkId).then((bookmark) => {
            res.send(bookmark);
        }, (err) => {
            res.status(404).send({});
        });
    } else {
        res.status(409).send({ err: "Invalid bookmark id" });
    }
});

// @brief add answers to a bookmark
router.post("/:bookmarkId", function(req, res, next) {
    const cookie: string = req.body.cookie;
    const answer: string = req.body.answer;
    const bookmarkId: string = req.params.bookmarkId;

    if (notEmpty(answer) && notEmpty(cookie)) {
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

export = router;