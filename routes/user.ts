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

router.post("/", async (req, res) => {

    const {username = "", password = "", email = ""} = req.body;

    if (password && (username || email)) {
        const salt = db.generateGUID();
        const user: db.User = {
            username,
            salt,
            hashedPassword: db.hash(password + salt),
            email: req.body.email,
            followedBookmarks: [],
            followedUsers: [],
            bookmarkNotifications: []
        };


        try {
            await db.isUsernameAvailable(user.username);
            await db.isEmailAvailable(user.email);

            try {
                const added = await db.addUser(user);
                res.send(added);
            } catch (err) {
                res.status(500).send({ err });
            }

        } catch (err) {
            res.status(400).send({ err: "invalid username or email" });
        }

    } else {
        res.status(409).send({ err: "Incomplete form." });
    }
});

// @brief return bookmarks of user
router.get(`/:userId(${db.validateId})`, async (req, res) => {
    const userId: string = req.params.userId;
    const {getBookmarkFlags = "NaN", getUserOption = "NaN"} = req.query;

    switch (Number(getUserOption)) {
        case GetUserOption.GetCreatedBookmarks:
            // send a array of Bookmark
            let projection: any = {};
            if (GetBookmarkFlags.IgnoreAnswers & Number(getBookmarkFlags)) {
                projection["answers"] = false;
            }

            try {
                const bookmarks = await db.getBookmarksOfUser(userId, projection);
                res.send(bookmarks);
            } catch (err) {
                res.status(400).send({ err });

            }

            break;

        case GetUserOption.GetFollowedBookmarks:
            // send an array of bookmarkId
            try {
                const followed = await db.getFollowedBookmarks(userId);
                res.send(followed);
            } catch (err) {
                res.status(400).send({ err });
            }
            break;

        case GetUserOption.GetFollowedUsers:
            // send an array of User
            try {
                const followed = await db.getFollowedUsers(userId);
                res.send(followed);
            } catch (err) {
                res.status(400).send({ err });
            }
            break;

        case GetUserOption.GetBookmarkNotifications:
            try {
                const notifis = await db.getBookmarkNotifications(userId);
                res.send(notifis);
            } catch (err) {
                res.status(500).send({ err });
            }
            break;

        default:
            res.status(409).send({ err: "Unknow option" });
    }
});

router.put("/", async (req, res) => {
    const {
        bookmarkToFollow = "",
        bookmarkToUnfollow = "",
        userToFollow = "",
        userToUnfollow = "",
        bookmarkNotificationToRemove = "",
        cookie = ""
    } = req.body;

    if (cookie) {

        try {

            const userId = await db.getUserByCookie(cookie);

            try {

                if (db.validateIdReg.test(bookmarkToFollow)) {
                    await db.followBookmark(bookmarkToFollow, userId);

                } else if (db.validateIdReg.test(bookmarkToUnfollow)) {
                    await db.unfollowBookmark(bookmarkToUnfollow, userId);

                } else if (db.validateIdReg.test(userToFollow)) {
                    await db.followUser(userToFollow, userId);

                } else if (db.validateIdReg.test(userToUnfollow)) {
                    await db.unfollowUser(userToUnfollow, userId);

                } else if (db.validateIdReg.test(bookmarkNotificationToRemove)) {
                    await db.removeBookmarkNotification(userId, bookmarkNotificationToRemove);

                } else {
                    throw "Unknow Operation";
                }

                res.send({});

            } catch (err) {
                res.status(500).send({ err });
            }

        } catch (err) {
            res.status(400).send({ err: "Invalid cookie" });
        }
    } else {
        res.status(409).send({ err: "Illegal cookie" });
    }

});

router.delete("/", async (req, res) => {
    const cookie: string = req.body.cookie;

    if (cookie) {

        try {
            const userId = await db.getUserByCookie(cookie);

            try {
                await db.removeUser(userId);
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