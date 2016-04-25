import express = require("express");
import db = require("../db");
import {GetUserOption, GetBookmarkFlags} from "../interfaces";

const router = express.Router();

router.get("/", function (req, res, next) {
    db.getRandomUser().then((users) => {
        res.send(users);
    }, (err) => {
        res.send(err);
    });
});

router.post("/", function (req, res, next) {

    const {username = "", password = "", email = ""} = req.body;

    if (password && (username || email)) {
        const salt: string = db.generateGUID();
        const user: db.User = {
            username,
            salt,
            hashedPassword: db.hash(password + salt),
            email: req.body.email,
            followedBookmarks: [],
            followedUsers: [],
            bookmarkNotifications: []
        };

        db.isUsernameAvailable(user.username).then(
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
router.get(`/:userId(${db.validateId})`, function (req, res, next) {
    const userId: string = req.params.userId;
    const {getBookmarkFlags = "NaN", getUserOption = "NaN"} = req.query;

    switch (Number(getUserOption)) {
        case GetUserOption.GetCreatedBookmarks:
            // send a array of Bookmark
            let projection: any = {};
            if (GetBookmarkFlags.IgnoreAnswers & Number(getBookmarkFlags)) {
                projection["answers"] = false;
            }
            db.getBookmarksOfUser(userId, projection).then((bookmarks) => {
                res.send(bookmarks);
            }, (err) => {
                res.status(400).send({ err: err });
            });
            break;

        case GetUserOption.GetFollowedBookmarks:
            // send an array of bookmarkId
            db.getFollowedBookmarks(userId).then((bookmarkIds) => {
                res.send(bookmarkIds);
            }, err => res.status(400).send({ err }));
            break;

        case GetUserOption.GetFollowedUsers:
            // send an array of User
            db.getFollowedUsers(userId).then(
                users => { res.send(users); },
                err => { res.status(400).send({ err }); }
            )
            break;

        case GetUserOption.GetBookmarkNotifications:
            db.getBookmarkNotifications(userId).then(
                notifis => { res.send(notifis); },
                err => { res.status(500).send({ err }); }
            )
            break;

        default:
            res.status(409).send({ err: "Unknow option" });
    }
});

// follow or unfollow bookmark
router.put("/", (req, res, next) => {
    const {
        bookmarkToFollow = "",
        bookmarkToUnfollow = "",
        userToFollow = "",
        userToUnfollow = "",
        bookmarkNotificationToRemove = "",
        cookie = ""
    } = req.body;

    if (cookie) {
        db.getUserByCookie(cookie).then(userId => {
            if (db.validateIdReg.test(bookmarkToFollow)) {
                db.followBookmark(bookmarkToFollow, userId).then(
                    () => { res.status(200).send({}); },
                    err => { res.status(500).send({ err: "Unknow error" }); });

            } else if (db.validateIdReg.test(bookmarkToUnfollow)) {
                db.unfollowBookmark(bookmarkToUnfollow, userId).then(
                    () => { res.send({}); },
                    err => { res.status(500).send({ err: "Unknow error" }); });

            } else if (db.validateIdReg.test(userToFollow)) {
                db.followUser(userToFollow, userId).then(
                    () => { res.status(200).send({}); },
                    err => { res.status(500).send({ err: "Unknow error" }); });

            } else if (db.validateIdReg.test(userToUnfollow)) {
                db.unfollowUser(userToUnfollow, userId).then(
                    () => { res.status(200).send({}); },
                    err => { res.status(500).send({ err: "Unknow error" }); });
            } else if (db.validateIdReg.test(bookmarkNotificationToRemove)) {
                db.removeBookmarkNotification(userId, bookmarkNotificationToRemove).then(
                    () => { res.send({}); },
                    err => { res.status(500).send({ err }); }
                )
            } else {
                res.status(409).send({ err: "Unknow operation" });
            }

        }, err => { res.status(400).send({ err: "Invalid cookie" }); })

    } else {
        res.status(409).send({ err: "Illegal cookie" });
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