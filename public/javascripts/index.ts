import {Bookmark, UserWithCreatedBookmark, Comment, User, LoginPair} from "../../db";
import {GetUserOption, GetBookmarkFlags} from "../../interfaces";
import * as vue from "vue";
import docCookies = require("./cookies");

const $answerDiv = $(".col-md-8");
const $loadingBar = $("#loadingBar");


function animateCss($node: JQuery, animationName: string) {
    const animationEnd = "webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend";
    $node.addClass("animated " + animationName).one(animationEnd, function () {
        $node.removeClass("animated " + animationName);
    });
}

function switchAnswerList(bookmarks: Bookmark[]) {

    const $answerList = $(".answerList");

    animateCss($answerList, "rollOut");

    $answerList.one("webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend", event => {
        $answerList.remove();

        const $newList = $(`<div class = "answerList list-group"> </div>`);

        bookmarks.forEach(bookmark => {
            // add title
            $newList.append($(`<a href = "/bookmark/${bookmark._id}?action=share" style="font-weight: bold;margin-left: 25%;margin-right: 25%;" class="list-group-item btn btn-primary"> ${bookmark.title} </a>`));


            // create answer list from response
            $newList.append(
                bookmark.answers.map(
                    answer => {
                        return $(`<a href = ${answer} class="list-group-item">
                                  ${answer.replace("https://www.quora.com/", "").replace(/\-/g, " ").replace("/answer/", " -- ").replace(/\s\d+/g, "")}
                              </a>`);
                    }));
        });



        animateCss($newList, "rollIn");

        $(".col-md-8").append($newList);
    });
}

function refresh() {
    // display loading bar
    $loadingBar.fadeIn("fast");

    // retrieve user data
    $.get("/user").done(
        (users: UserWithCreatedBookmark[]) => {
            const $newUserList = $(`<div class = "userList list-group"> </div>`);

            users.forEach(user => {
                const $user = $(`<a href = "#" class="list-group-item"> ${user.username} </a>`);
                $user.click(event => {
                    event.preventDefault();
                    switchAnswerList(user.createdBookmarks);
                })

                $newUserList.append($user);
            });

            $(".col-md-3 .userList").remove();
            $(".col-md-3").append($newUserList);
        }
    ).always(() => {
        $loadingBar.fadeOut("fast");
    });
}

function getComment(start = 0, length = 10) {
    return $.get("/comment", { start, length });
}

function openRegisterDialog() {
    return new Promise<{ username: string, password: string }>((resolve, reject) => {
        vex.dialog.open({
            message: 'Enter your username and password:',
            input: `<input name="username" type="text" placeholder="Username" required />
                    <input name="password" type="password" placeholder="Password" required />`,
            buttons: [
                $.extend({}, vex.dialog.buttons.YES, {
                    text: 'Yes'
                }), $.extend({}, vex.dialog.buttons.NO, {
                    text: 'No'
                })
            ],
            callback: (data: { username: string, password: string }) => {
                if (data) {
                    resolve(data);
                } else {
                    reject("No");
                }
            }
        });
    });
}

function showErrorMsg(text: string) {
    try {
        const json = JSON.parse(text);
        vex.dialog.alert(json.err);
    } catch (err) {
        vex.dialog.alert(text);
    }
}

$("#refresh").click(event => {
    event.preventDefault();

    refresh();
});

refresh();

const vmData = {
    content: "",
    comments: new Array<Comment>()
};

const vm = new Vue({
    el: "body",
    data: vmData,
    methods: {
        submit(event: MouseEvent) {
            $loadingBar.fadeIn("fast");

            $.post("/comment", { content: this.content })
                .done((comment: Comment) => {
                    this.comments.unshift(comment);
                    vex.dialog.alert("You have posted a comment successfully.");
                })
                .fail(err => {
                    console.log(err);
                })
                .always(() => { $loadingBar.fadeOut("fast"); });
        },
        register() {
            openRegisterDialog().then(user => {
                $.post("/user", user).done(
                    (added: User) => {
                        vex.dialog.alert("You have registered successfully.");
                    }
                ).fail((res: JQueryXHR) => {

                    this.register();

                    showErrorMsg(res.responseText)
                });
            }).catch(reason => { });
        },
        signin() {
            openRegisterDialog().then(user => {
                $.post("/login", user).done(
                    (pair: LoginPair) => {
                        console.log(pair);
                    }
                ).fail(
                    (res: JQueryXHR) => {
                        showErrorMsg(res.responseText);
                    });
            }).catch(reason => { });
        }
    }
});

// set windth of the bottom progress bar.
$(window).scroll(() => {
    const s = $(window).scrollTop();
    const d = $(document).height();
    const h = $(window).height();
    $(".scrollProgressBar").css("width", `${100 * s / (d - h)}%`);
});

getComment().done((comments: Comment[]) => {
    comments.forEach(x => vm.$data.comments.push(x));
});