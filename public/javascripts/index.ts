import {Bookmark, UserWithCreatedBookmark} from "../../db";
import {GetUserOption, GetBookmarkFlags} from "../../interfaces";

function animateCss($node: JQuery, animationName: string) {
    const animationEnd = 'webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend';
    $node.addClass('animated ' + animationName).one(animationEnd, function () {
        $node.removeClass('animated ' + animationName);
    });
}

function setUserListListener() {
    $(".userList a").click(event => {
        event.preventDefault();

        const href = event.target.getAttribute("href");

        const getUserOption = GetUserOption.GetCreatedBookmarks;
        $.get(href, { getUserOption }).done(
            (bookmarks: Bookmark[]) => {
                let created = false;

                const $answerList = $(".answerList");

                animateCss($answerList, "rollOut");
                $answerList.one("webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend", event => {
                    $answerList.remove();

                    if (!created) {
                        created = true;

                        const $newList = $(`<div class = "answerList list-group"> </div>`);
                        $(".col-md-8").append($newList);

                        // create answer list from response
                        $newList.append(
                            bookmarks
                                .map(x => x.answers)
                                .reduce((prev, current) => { return prev.concat(current); }, [])
                                .map(answer => {
                                    return $(`<a href = ${answer} class="list-group-item">
                                                ${answer.replace("https://www.quora.com/", "").replace(/\-/g, " ").replace("/answer/", " -- ").replace(/\s\d+/g, "")}
                                           </a>`)
                                }));

                        animateCss($newList, "rollIn");
                    } else {
                        return;
                    }
                });
            }
        )
    });

}


// setUserListListener();

function switchAnswerList(answers: string[]) {
    const $answerList = $(".answerList");

    animateCss($answerList, "rollOut");

    $answerList.one("webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend", event => {
        $answerList.remove();

        const $newList = $(`<div class = "answerList list-group"> </div>`);

        // create answer list from response
        $newList.append(
            answers.map(
                answer => {
                    return $(`<a href = ${answer} class="list-group-item">
                                  ${answer.replace("https://www.quora.com/", "").replace(/\-/g, " ").replace("/answer/", " -- ").replace(/\s\d+/g, "")}
                              </a>`);
                }));

        animateCss($newList, "rollIn");

        $(".col-md-8").append($newList);
    });
}

function refresh() {
    $.get("/user").done(
        (users: UserWithCreatedBookmark[]) => {
            const $newUserList = $(`<div class = "userList list-group"> </div>`);

            for (const user of users) {
                const $user = $(`<a href = "#" class="list-group-item"> ${user.username} </a>`);
                $user.click(event => {
                    event.preventDefault();
                    switchAnswerList(user.createdBookmarks
                        .map(x => x.answers)
                        .reduce((prev, current) => { return prev.concat(current) }, []));
                })

                $newUserList.append($user);
            }

            $(".col-md-3").children().remove();
            $(".col-md-3").append($newUserList);
        }
    );
}

refresh();