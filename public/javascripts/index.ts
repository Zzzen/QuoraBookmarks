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
    const loadingBar = $("#loadingBar");
    loadingBar.fadeIn("fast");

    // retrieve user data
    $.get("/user").done(
        (users: UserWithCreatedBookmark[]) => {
            const $newUserList = $(`<div class = "userList list-group"> </div>`);

            for (const user of users) {
                const $user = $(`<a href = "#" class="list-group-item"> ${user.username} </a>`);
                $user.click(event => {
                    event.preventDefault();
                    switchAnswerList(user.createdBookmarks);
                })

                $newUserList.append($user);
            }

            $(".col-md-3 .userList").remove();
            $(".col-md-3").append($newUserList);
        }
    ).always(() => {
        loadingBar.fadeOut("fast");
    });
}


$("#refresh").click(event => {
    event.preventDefault();

    refresh();
});

refresh();
