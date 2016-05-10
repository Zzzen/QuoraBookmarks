import express = require("express");
import db = require("../db");

const router = express.Router();

const expires = new Date();
expires.setFullYear(expires.getFullYear() + 10);

router.get("/", (req, res) => {
    res.redirect("/");
});

// send cookie if password is correct, empty string otherwise.
router.post("/", async (req, res) => {
    const {username = "", password = "", email = ""} = req.body;

    if (password && (username || email)) {
        const user = {
            username,
            email
        };

        try {
            const tokenPair = await db.varifyUser(user, password);
            res.cookie("userId", tokenPair.userId, {expires});
            res.cookie("login", tokenPair.login, { expires });
            res.send(tokenPair);
        } catch (err) {
            res.status(400).send({ err });
        }

    } else {
        res.status(409).send({ err: "Empty username or password" });
    }
});

export = router;