import { hasSession } from "./views/helpers.js"
import { router, navigateTo } from "./views/router.js"
import { addConnection } from "./views/ws.js"


window.addEventListener("popstate", router)

// document.addEventListener("DOMContentLoaded", () => {
//     document.body.addEventListener("click", event => {
//         if(event.target.matches("[data-link]")) {
//             event.preventDefault()
//             navigateTo(event.target.href)
//         }
//     })
//     router()
// })

document.addEventListener("DOMContentLoaded", () => {
    document.body.addEventListener("click", event => {
        const isLinkElement = event.target.closest("[data-link]");

        if (isLinkElement) {
            event.preventDefault();
            navigateTo(isLinkElement.href);
        }
    });

    router();
});

const isAuthorized = await hasSession()
if(isAuthorized) {
    addConnection()
}