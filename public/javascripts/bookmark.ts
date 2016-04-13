import docCookies = require("./cookies");
function validateInput(username: string, password: string) {
    const available = /[0-9A-Za-z_\.]+/;
    return username.length > 0 && available.test(password);
}

function getUsername() {
    return $("#username").val();
}

function getPassword() {
    return $("#password").val();
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

    const bookmarkId = window.location.pathname.replace(/.*\//g, "");
    const cookie = docCookies.getItem("cookie");

    $.ajax({
        method: "PUT",
        url: "/user",
        data: { cookie: cookie, bookmarkToFollow: bookmarkId }
    }).always((data: any, status: string) => {
        console.log(data);
        if ("success" === status) {
            $("#follow").text("Followed");
        } else {
            const res = JSON.parse(data.responseText);
            alert(res.err);
        }
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

    console.log(username, password);
    if (validateInput(username, password)) {
        $.ajax({
            method: "POST",
            url: "/user",
            data: { userName: username, hashedPassword: password }
        }).always((data: any, status: string) => {
            if ("success" === status) {
                alert("OK");
                $("#login").click();
            } else {
                const res = JSON.parse(data.responseText);
                alert(res.err);
            }
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
        $.ajax({
            method: "POST",
            url: "/login",
            data: { userName: username, hashedPassword: password }
        }).always((data, status) => {
            if ("success" === status) {
                docCookies.setItem("userId", data.userId, Infinity);
                docCookies.setItem("cookie", data.cookie, Infinity);
                docCookies.setItem("username", username, Infinity);
                showProfile();
                $("#profileUsername").text(username);
                $("form").remove();
                alert("You have log in successfully");
            } else {
                const res = JSON.parse(data.responseText);
                alert(res.err);
            }
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
    $("#profileUsername").text(docCookies.getItem("username") || "username");
}