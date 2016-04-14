import express = require("express");
import db = require("../db");

const router = express.Router();

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

    if (user.hashedPassword && (user.userName || user.email)) {
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
router.get(`/:userId(${db.validateId})`, function(req, res, next) {
    const userId: string = req.params.userId;
    const showAnswers: string = req.query.showAnswers;
    const toReturn: string = req.query.toReturn;

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

});

// follow or unfollow bookmark
router.put("/", (req, res, next) => {
    const bookmarkToFollow: string = req.body.bookmarkToFollow;
    const bookmarkToUnfollow: string = req.body.bookmarkToUnfollow;
    const cookie: string = req.body.cookie;

    if (db.validateIdReg.test(bookmarkToFollow) && cookie) {
        db.getUserByCookie(cookie).then((userId) => {
            db.followBookmark(bookmarkToFollow, userId).then(
                () => { res.status(200).send({}); },
                err => { res.status(500).send({ err: "Unknow error" }); });
        }, err => { res.status(400).send({ err: "Invalid cookie" }); });

    } else if (db.validateIdReg.test(bookmarkToUnfollow) && cookie) {
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

    if (cookie) {
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