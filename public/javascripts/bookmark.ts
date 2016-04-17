import docCookies = require("./cookies");
import {GetUserOption, GetBookmarkFlags} from "../../interfaces";

const bookmarkId = window.location.pathname.replace(/.*\//g, "");

let isFollowed = false;

function validateInput(username: string, password: string) {
    const available = /[0-9A-Za-z_\.]+/;
    return username.length > 0 && available.test(password);
}

function getUsername(): string {
    return $("#username").val();
}

function getPassword(): string {
    return $("#password").val();
}

function getFollowedBookmarks() {
    const userId = docCookies.getItem("userId");
    const getUserOption = GetUserOption.GetFollowedBookmarks;
    return $.get(`/user/${userId}`, { getUserOption });
}

function reloadCat() {
    let src = $("#cat").attr("src");
    src = src.replace(/\&t\=.*/g, "");
    $("#cat").attr("src", src + "&t=" + new Date().getTime());
}

function showProfile() {
    $("#profile").attr("style", "");
}

function logout() {
    let cookies = document.cookie.split(";");

    for (let i = 0; i < cookies.length; i++) {
        let cookie = cookies[i];
        let eqPos = cookie.indexOf("=");
        let name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
        document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT";
    }
}

$("#follow").click((event) => {
    event.preventDefault();

    const cookie = docCookies.getItem("cookie");
    const action = isFollowed ? "bookmarkToUnfollow" : "bookmarkToFollow";

    $.ajax({
        method: "PUT",
        url: "/user",
        data: { cookie, [action]: bookmarkId }
    })
        .done((data: any, statusText: string) => {
            isFollowed = !isFollowed;
            $("#follow").text(isFollowed ? "Unfollow" : "Follow");

        })
        .fail((data: any, statusText: any) => {
            const res = JSON.parse(data.responseText);
            alert(res.err);
        });
});

$("#logout").click((event) => {
    event.preventDefault();
    logout();
    window.location.reload();
});

$("#register").click((event) => {
    event.preventDefault();
    const username = getUsername();
    const password = getPassword();

    // console.log(username, password);
    if (validateInput(username, password)) {
        $.post("/user", { username, password })
            .done(res => {
                $("#login").click();
            })
            .fail(data => {
                const res = JSON.parse(data.responseText);
                alert(res.err);
            });
    } else {
        alert("Illegal input");
    }
});

$("#login").click((event) => {
    event.preventDefault();
    const username = getUsername();
    const password = getPassword();
    if (validateInput(username, password)) {
        $.post("/login", { username, password })
            .done((data: any, statusText: string) => {
                docCookies.setItem("userId", data.userId, Infinity);
                docCookies.setItem("cookie", data.cookie, Infinity);
                docCookies.setItem("username", username, Infinity);
                showProfile();
                $("#profileUsername").text(username);
                $("form").remove();
            })
            .fail((data: any, statusText: string) => {
                const res = JSON.parse(data.responseText);
                alert(res.err);
            });
    } else {
        alert("Illegal input");
    }
});

$("#cat").on("error", reloadCat);
$("#cat").parent().click((event) => { event.preventDefault(); reloadCat(); });

if (docCookies.getItem("cookie")) {
    console.log("been logged in");
    $("#profile").attr("style", "");
    $("form").remove();
    $("#profileUsername").text(docCookies.getItem("username") || "Username");


    getFollowedBookmarks().done((followedBookmarks: string[]) => {
        isFollowed = followedBookmarks.indexOf(bookmarkId) > -1;
        if (isFollowed) {
            $("#follow").text("Unfollow");
        }
    });
}