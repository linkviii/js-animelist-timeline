interface Page {
    name: string;
    path: string;
}

const PAGES: Page[] = [
    { name: "Timeline", path: "" },
    { name: "Time to Watch", path: "time-to-watch/" },
    { name: "Watch Lulls", path: "lull/" },
    // {name:"",path:""},
];

function initNavBar() {
    const nav = document.getElementsByTagName("nav")[0];
    let here = window.location.pathname;
    if (!here.endsWith("/")) {
        here += "/";
    }

    /* Site is hosted on github pages so home isn't just `/`.  */
    let isHome = true;
    for (let page of PAGES.slice(1)) {
        if (here.endsWith(page.path)) {
            isHome = false;
            break;
        }
    }

    for (let i = 0; i < PAGES.length; ++i) {
        const { path, name } = PAGES[i];
        const isThisPage = (i === 0 && isHome) || (i !== 0 && here.endsWith(path));

        if (isThisPage) {
            const tag = document.createElement("span");
            tag.textContent = name;
            tag.className = "nav-active";
            nav.append(tag);
        } else {
            const tag = document.createElement("a");
            tag.textContent = name;
            tag.href = path;
            nav.append(tag);
        }
        if (i !== PAGES.length - 1) {
            nav.append(" | ");
        }
    }
}
initNavBar();