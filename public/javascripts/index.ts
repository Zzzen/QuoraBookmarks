import {Bookmark} from "../../db";
import {GetUserOption, GetBookmarkFlags} from "../../interfaces";

function animateCss($node: JQuery, animationName: string) {
    const animationEnd = 'webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend';
    $node.addClass('animated ' + animationName).one(animationEnd, function () {
        $node.removeClass('animated ' + animationName);
    });
}

function setUserListListener() {
    $("#userList a").click(event => {
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


setUserListListener();