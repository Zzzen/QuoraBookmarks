import express = require("express");
import db = require("../db");

const router = express.Router();

function notEmpty(str: string): boolean {
    return str != null && str.length > 0;
}

function isValidateId(id: string): boolean {
    return id != null && (12 === id.length || 24 === id.length);
}

router.get("/", function(req, res, next) {
    db.getUsers(null).then((users) => {
        res.send(users);
    }, (err) => {
        res.send(err);
    });
});

router.post("/", function(req, res, next) {
    const user: db.User = {
        userName: req.body.userName,
        hashedPassword: req.body.hashedPassword,
        email: req.body.email,
        followedBookmarks: []
    };

    if (notEmpty(user.hashedPassword) && (notEmpty(user.userName) || notEmpty(user.email))) {
        db.isUserNameAvailable(user.userName).then(
            () => {
                return db.isEmailAvailable(user.email);
            },
            () => {
                res.status(400).send({ err: "Username has been occupied" });
            }
        ).then(() => {
            return db.addUser(user);
        }, () => {
            res.status(400).send({ err: "Email has been occupied" });
        }).then((user) => {
            res.send(user);
        }, () => {
            res.status(500).send({ err: "Unknown error" });
        });

    } else {
        res.status(409).send({ err: "Incomplete form." });
    }
});

// @brief return bookmarks of user
router.get("/:userId", function(req, res, next) {
    const userId: string = req.params.userId;
    const showAnswers: string = req.query.showAnswers;
    const toReturn: string = req.query.toReturn;

    if (isValidateId(userId)) {
        if ("followedBookmarks" === toReturn) {
            db.getFollowedBookmarks(userId).then((bookmarks) => {
                res.send(bookmarks);
            }, err => res.status(400).send({ err }));
        } else {
            db.getBookmarksOfUser(userId).then((bookmarks) => {
                if ("0" === showAnswers) {
                    bookmarks.map(x => x.answers = undefined);
                }
                res.send(bookmarks);
            }, (err) => {
                res.status(400).send({ err: err });
            });
        }
    } else {
        res.status(409).send({ err: "Invalid userId" });
    }
});

// follow or unfollow bookmark
router.put("/", (req, res, next) => {
    const bookmarkToFollow: string = req.body.bookmarkToFollow;
    const bookmarkToUnfollow: string = req.body.bookmarkToUnfollow;
    const cookie: string = req.body.cookie;

    if (isValidateId(bookmarkToFollow) && notEmpty(cookie)) {
        db.getUserByCookie(cookie).then((userId) => {
            db.followBookmark(bookmarkToFollow, userId).then(
                () => { res.status(200).send({}); },
                err => { res.status(500).send({ err: "Unknow error" }); });
        }, err => { res.status(400).send({ err: "Invalid cookie" }); });

    } else if (isValidateId(bookmarkToUnfollow) && notEmpty(cookie)) {
        db.getUserByCookie(cookie).then(userId => {
            db.unfollowBookmark(bookmarkToUnfollow, userId).then(
                () => { res.send({}); },
                err => { res.status(500).send({ err: "Unknow error" }); });
        }, err => res.status(400).send({ err: "Invalid cookie" }));
    } else {
        res.status(409).send({ err: "Illegal user id or bookmark id" });
    }
});

router.delete("/", (req, res) => {
    const cookie: string = req.body.cookie;

    if (notEmpty(cookie)) {
        db.getUserByCookie(cookie).then(userId => {
            db.removeUser(userId).then(() => {
                res.send({});
            }, () => { res.status(500).send({ err: "Unknown" }); });
        }, err => {
            res.status(400).send({ err: "Invalid cookie" });
        });
    } else {
        res.status(409).send({ err: "Empty cookie" });
    }
});

export = router;