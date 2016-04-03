import express = require("express");
import db = require("../db");

const router = express.Router();

function notEmpty(str: string): boolean {
    return str != null && str.length > 0;
};

router.get("/", (req, res) => {
    res.redirect("/");
});

// send cookie if password is correct, empty string otherwise.
router.post("/", (req, res) => {
    const user = {
        userName: req.body.userName,
        email: req.body.email,
        hashedPassword: req.body.hashedPassword
    };

    if (notEmpty(user.hashedPassword) && (notEmpty(user.userName || notEmpty(user.email)))) {
        db.varifyUser(user).then(
            (cookie) => {
                res.cookie("cookie", cookie);
                res.send(cookie);
            },
            () => { res.status(400).send({ err: "Wrong username or password" }); });
    } else {
        res.status(409).send({ err: "Empty username or password" });
    }
});

export = router;