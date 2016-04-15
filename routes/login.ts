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
    const {username = "", password = "", email = ""} = req.body;

    if (password && (username || email)) {
        const user = {
            username,
            email
        };

        db.varifyUser(user, password).then(
            (cookie) => {
                // res.cookie("cookie", cookie);
                res.send(cookie);
            },
            (err) => { res.status(400).send({ err }); });
    } else {
        res.status(409).send({ err: "Empty username or password" });
    }
});

export = router;