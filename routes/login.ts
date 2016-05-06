import express = require("express");
import db = require("../db");

const router = express.Router();

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
            const cookie = await db.varifyUser(user, password);
            res.send(cookie);
        } catch (err) {
            res.status(400).send({ err });
        }

    } else {
        res.status(409).send({ err: "Empty username or password" });
    }
});

export = router;