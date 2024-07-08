import home from "./home.js"
import register from "./register.js"
import login from "./login.js"
import error from "./error.js"
import logout from "./logout.js"
import posts from "./posts.js"
import user from "./user.js"
import chat from "./chat.js"

export const navigateTo = (url) => {
    history.pushState(null, null, url)
    router()
}

export const navigateToWithoutSavingHistory = (url) => {
    history.replaceState(null, null, url)
    router()
}

export const router = async () => {
    const routes = [
        { path: "/", view: home },
        { path: "/register", view: register },
        { path: "/login", view: login },
        { path: "/logout", view: logout },
        { path: "/posts", view: posts },
        { path: "/user", view: user },
        { path: "/chat", view: chat },
    ]

    const potentialMatches = routes.map(route => {
        return {
            route: route,
            isMatch: location.pathname === route.path
        }
    })

    let match = potentialMatches.find(potentialMatch => potentialMatch.isMatch)
    if(match) {
        match.route.view()
    } else {
        error()
    }
}