import express = require("express");
import db = require("../db");

const router = express.Router();

// @brief add new bookmark. return _id of bookmark if success.
// @param : {title: string, login: string, description?: string, answers?: string[]}
router.post("/", async (req, res) => {
    const bookmark: db.Bookmark = {
        title: req.body.title,
        description: req.body.description
    };

    const cookie: string = req.body.login;


    if (bookmark.title && cookie) {
        try {
            const userId = await db.getUserByCookie(cookie);

            bookmark.creatorId = userId;
            bookmark.answers = [];

            const created = await db.addBookmark(bookmark);
            res.send(created);

        } catch (err) {
            res.status(400).send({ err: "Invalid cookie" });
        }
    } else {
        res.status(409).send({});
    }
});

// @brief retrieve bookmarks of an user 
// @param: {userId: string}
router.get("/", async (req, res) => {
    const userId: string = req.query.userId;

    if (db.validateIdReg.test(userId)) {
        try {
            const bookmarks = await db.getBookmarksOfUser(userId);
            res.send(bookmarks);
        } catch (err) {
            res.status(404).send({ err });
        }

    } else {
        res.status(409).send({ err: "empty query" });
    }
});

// @brief get the content of a bookmark
router.get(`/:bookmarkId(${db.validateId})`, async (req, res) => {
    const bookmarkId: string = req.params.bookmarkId;
    const action: string = req.query.action;

    if (db.validateIdReg.test(bookmarkId)) {

        try {
            const bookmark = await db.getBookmarkById(bookmarkId);

            if ("share" === action) {
                res.render("sharedBookmark.jade", { title: bookmark.title, answers: bookmark.answers });
            } else {
                res.send(bookmark);
            }

        } catch (err) {
            res.status(404).send({ err });
        }

    } else {
        res.status(409).send({ err: "Invalid bookmark id" });
    }
});

// @brief add answers to a bookmark
router.post(`/:bookmarkId(${db.validateId})`, async (req, res) => {
    const {login = "", answer = ""} = req.body;
    const bookmarkId: string = req.params.bookmarkId;

    if (answer && login) {

        try {
            const userId = await db.getUserByCookie(login);

            try {
                await db.addAnswer(bookmarkId, answer, userId);
                res.send({});
            } catch (err) {
                res.status(500).send({ err });
            }

        } catch (err) {
            res.status(400).send({ err: "Invalid cookie" });
        }


    } else {
        res.status(409).send({ err: "Empty" });
    }
});

// @brief remove an answer of bookmark.
router.put(`/:bookmarkId(${db.validateId})`, async (req, res) => {
    const {login = "", answer = ""} = req.body;
    const bookmarkId: string = req.params.bookmarkId;

    if (answer && login) {
        try {
            const userId = await db.getUserByCookie(login);

            try {
                await db.removeAnswer(answer, bookmarkId, userId);
                res.send({});
            } catch (err) {
                res.status(500).send({ err });
            }

        } catch (err) {
            res.status(400).send({ err: "Invalid cookie" });
        }

    } else {
        res.status(409).send({ err: "Empty answer or cookie" });
    }
});

// @brief remove a bookmark
router.delete(`/:bookmarkId(${db.validateId})`, async (req, res) => {
    const login: string = req.body.login;
    const bookmarkId: string = req.params.bookmarkId;

    if (login && bookmarkId) {

        try {
            
            const userId = await db.getUserByCookie(login);

            try {
                await db.removeBookmark(bookmarkId, userId);
                res.send({});
            } catch (err) {
                res.status(500).send({ err });
            }
            
        } catch (err) {
            res.status(400).send({ err: "Invalid cookie" });
        }

    } else {
        res.status(409).send({ err: "Empty cookie" });
    }
});

export = router;