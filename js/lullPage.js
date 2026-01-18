/**
 * MIT licensed
 */
//  ██╗███╗   ███╗██████╗  ██████╗ ██████╗ ████████╗███████╗
//  ██║████╗ ████║██╔══██╗██╔═══██╗██╔══██╗╚══██╔══╝██╔════╝
//  ██║██╔████╔██║██████╔╝██║   ██║██████╔╝   ██║   ███████╗
//  ██║██║╚██╔╝██║██╔═══╝ ██║   ██║██╔══██╗   ██║   ╚════██║
//  ██║██║ ╚═╝ ██║██║     ╚██████╔╝██║  ██║   ██║   ███████║
//  ╚═╝╚═╝     ╚═╝╚═╝      ╚═════╝ ╚═╝  ╚═╝   ╚═╝   ╚══════╝
//
// imports
//
//import jquery
import "./jquery.js";
import "./lib/jquery-ui/jquery-ui.min.js";
// 
import { usingTestData } from "./env.js";
import * as MAL from "./src/MAL.js";
import { ListManager } from "./src/listManager.js";
import * as ATL from "./src/animelistTL.js";
import { daysBetween_abs, daysToYWD, fixDate, textNode, assertUnreachable, validateSelect } from "./src/util.js";
const nullSorter = (a, b) => 0;
const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
export const listManager = new ListManager();
// Just throw things into this bag. It'll be fine.
export const debugData = {};
export let activeUsername = "";
export let activeLang = "";
export let activeGrouper = null;
export const activeSorts = [nullSorter, nullSorter];
export const activeSortDirections = [1, 1];
// ██████╗  █████╗  ██████╗ ███████╗    ██╗      ██████╗  █████╗ ██████╗
// ██╔══██╗██╔══██╗██╔════╝ ██╔════╝    ██║     ██╔═══██╗██╔══██╗██╔══██╗
// ██████╔╝███████║██║  ███╗█████╗      ██║     ██║   ██║███████║██║  ██║
// ██╔═══╝ ██╔══██║██║   ██║██╔══╝      ██║     ██║   ██║██╔══██║██║  ██║
// ██║     ██║  ██║╚██████╔╝███████╗    ███████╗╚██████╔╝██║  ██║██████╔╝
// ╚═╝     ╚═╝  ╚═╝ ╚═════╝ ╚══════╝    ╚══════╝ ╚═════╝ ╚═╝  ╚═╝╚═════╝
//
// Page load
//
export const listPane = $("#list-pane");
export const consolePane = $("#console-pane");
class InputForm {
    inputForm = $("#form");
    listUsername = $("#listName");
    // readonly listKind = $("#list-kind") as JQuery<HTMLInputElement>;
    submitButton = $("#listFormSubmit");
    malUpload = document.getElementById("mal-upload");
    language = $("#language");
    groupBy = $("#group-by");
    sortPrimary = $("#sort-primary");
    sortPrimaryDirection = $("#sort-primary-check");
    sortPrimaryDirectionTxt = $("#sort-primary-check-text");
    // readonly sortSecondary = $("#sort-secondary") as JQuery<HTMLSelectElement>;
    // readonly sortSecondaryDirection = $("#sort-secondary-check") as JQuery<HTMLInputElement>;
    // readonly sortSecondaryDirectionTxt = $("#sort-secondary-check-text");
    sortSecondary = null;
    sortSecondaryDirection = null;
    sortSecondaryDirectionTxt = null;
    // ---------------------
    SELECT_SORT_VALUES = [
        "duration",
        "user-finish"
    ];
    SELECT_GROUP_VALUES = [
        "none",
        "watch-year",
        "lull",
    ];
    initParams() {
        /* Set default values */
        this.sortPrimary.val("duration");
        this.sortPrimaryDirection[0].checked = true;
    }
    initListeners() {
        const input = this;
        input.submitButton[0].addEventListener("click", onSubmit);
        /* ------------------------------------------ */
        input.malUpload.onchange = async () => {
            console.log("upload: onchange");
            const f = input.malUpload.files[0];
            const txt = await f.text();
            const parser = new DOMParser();
            const xml = parser.parseFromString(txt, "text/xml");
            // console.log(txt);
            // console.log(xml);
            const animeList = MAL.animeListFromMALExport(xml);
            activeUsername = animeList.user.userName;
            listManager.userAnimeCache.set(activeUsername, animeList);
            input.submitButton[0].disabled = true;
            input.listUsername[0].disabled = true;
            renderActiveList();
        };
        /* ------------------------------------------ */
        /* ------------------------------------------ */
        const setLang = () => {
            const value = input.language.val();
            activeLang = value;
            renderActiveList();
        };
        input.language.on("change", setLang);
        setLang();
        /* ------------------------------------------ */
        const sortInputs = [input.sortPrimary, input.sortSecondary];
        const sortDirChecks = [input.sortPrimaryDirection, input.sortSecondaryDirection];
        const sortDirTexts = [input.sortPrimaryDirectionTxt, input.sortSecondaryDirectionTxt];
        const initSorterN = (n) => {
            const setSort = () => {
                const value = sortInputs[n].val();
                console.log(`Sorter ${n}: ${value}`);
                switch (value) {
                    case "duration":
                        activeSorts[n] = durationSorter;
                        break;
                    case "user-finish":
                        activeSorts[n] = lullDateSorter;
                        break;
                    default:
                        console.warn(`Unhandled case: ${value}`);
                        assertUnreachable(value);
                }
                renderActiveList();
            };
            sortInputs[n].on("change", setSort);
            setSort();
            const setSortDir = () => {
                const checked = sortDirChecks[n][0].checked;
                const value = !checked ? 1 : -1;
                const txt = !checked ? "▲" : "▼";
                activeSortDirections[n] = value;
                sortDirTexts[n].text(txt);
                renderActiveList();
            };
            sortDirChecks[n].on("change", setSortDir);
            setSortDir();
        };
        initSorterN(0);
        // initSorterN(1);
        /* ------------------------------------------ */
        const setGroupBy = () => {
            const value = input.groupBy.val();
            console.log(`Grouper: ${value}`);
            switch (value) {
                case "none":
                    activeGrouper = null;
                    break;
                case "watch-year":
                    activeGrouper = (lull) => `00:${lull.thisEnd.slice(0, 4)}`;
                    break;
                case "lull":
                    activeGrouper = (lull) => lullClumper(lull.lull);
                    break;
                default:
                    console.warn(`Unhandled case: ${value}`);
                    assertUnreachable(value);
            }
            renderActiveList();
        };
        input.groupBy.on("change", setGroupBy);
        setGroupBy();
        /* ------------------------------------------ */
    }
    /* -------------- */
    validateHTML() {
        validateSelect(input.sortPrimary, this.SELECT_SORT_VALUES);
        validateSelect(input.groupBy, this.SELECT_GROUP_VALUES);
    }
    /* -------------- */
    init() {
        this.initParams();
        this.initListeners();
        this.validateHTML();
    }
}
export const input = new InputForm();
function init() {
    input.init();
    if (location.hostname === "127.0.0.1") {
        const favicon = document.getElementById("favicon");
        favicon.href = "../favicon_localhost.png";
    }
    // XXX
    // $("#listName").val("ONLOAD");
    // onSubmit();
}
$(document).ready(init);
const durationSorter = (a, b) => {
    return -(b.lull - a.lull);
};
const lullDateSorter = (a, b) => {
    return collator.compare(a.thisEnd, b.thisEnd);
};
// ███╗   ███╗ █████╗ ██╗███╗   ██╗
// ████╗ ████║██╔══██╗██║████╗  ██║
// ██╔████╔██║███████║██║██╔██╗ ██║
// ██║╚██╔╝██║██╔══██║██║██║╚██╗██║
// ██║ ╚═╝ ██║██║  ██║██║██║ ╚████║
// ╚═╝     ╚═╝╚═╝  ╚═╝╚═╝╚═╝  ╚═══╝
async function onSubmit() {
    const username = $("#listName").val().trim();
    // const listKind = $("#list-kind").val() as string;
    if (username === "") {
        reportNoUser();
        return;
    }
    if (usingTestData) {
        console.warn("Using test data.");
        giveFeedback("Using test data");
    }
    const animeList = await listManager.getAnimeList(username);
    if (animeList instanceof MAL.BadUsernameError) {
        reportBadUser(username);
        return;
    }
    activeUsername = username;
    renderActiveList();
}
const tvTimelineConfig = {
    userName: activeUsername,
    minDate: fixDate(MAL.rawNullDate, -1),
    maxDate: fixDate(MAL.rawNullDate, 1),
    lastN: 0,
    //
    lang: "english",
    seasons: false,
    width: 0,
    fontSize: 0,
    listKind: "ANIME",
    filter: { include: false, entrySet: new Set() },
    eventPreference: ATL.EventPreference.all,
    animeFormat: ATL.makeFormatSelection({ tv: true }),
};
function finishGrouper(anime) {
    return anime.userFinishDate.fixedDateStr;
}
function startGrouper(anime) {
    return anime.userStartDate.fixedDateStr;
}
function renderLullsTable(lulls, endGroups, startGroups) {
    // lulls.sort((a, b) => a.lull - b.lull);
    const sorterAB = (a, b) => {
        return activeSorts[0](a, b) * activeSortDirections[0];
        // ||            activeSorts[1](a, b) * activeSortDirections[1];
    };
    lulls.sort(sorterAB);
    // -------------------------------------------
    function displayAnimes(list) {
        const ul = document.createElement("div");
        for (let anime of list) {
            const li = document.createElement("div");
            const scoreNode = textNode("span", "", "title-score");
            if (anime.userScore !== 0) {
                scoreNode.append(anime.userScore.toString());
            }
            li.append(scoreNode);
            li.append(" ");
            li.append(textNode("span", anime.seriesTitle.preferred(activeLang), "title-name"));
            li.append(" ");
            const links = textNode("span", "", "title-links");
            if (anime.idAniList) {
                const link = document.createElement("a");
                // Probs not the best way to make the url, but I don't care.
                link.href = `https://anilist.co/anime/${anime.idAniList}`;
                link.textContent = "🔗";
                link.target = "_blank";
                links.append(link);
            }
            if (anime.idMAL) {
                const link = document.createElement("a");
                // Probs not the best way to make the url, but I don't care.
                link.href = `https://myanimelist.net/anime/${anime.idMAL}`;
                link.textContent = "🕶";
                link.target = "_blank";
                links.append(link);
            }
            li.append(links);
            ul.append(li);
        }
        return ul;
    }
    function displayEnds(lull) {
        return displayAnimes(endGroups[lull.thisEnd]);
    }
    function displayStarts(lull) {
        return displayAnimes(startGroups[lull.nextStart]);
    }
    const columns = [
        ["Lull", (lull) => daysToYWD(lull.lull), "col-num"],
        ["Day", (lull) => lull.thisEnd, "col-date"],
        ["Completed", displayEnds, "col-name-list"],
        ["Next", (lull) => lull.nextStart, "col-date"],
        ["Start", displayStarts, "col-name-list"],
    ];
    const table = document.createElement("table");
    const thead = table.createTHead();
    const tfoot = table.createTFoot();
    {
        const headRow = thead.insertRow();
        for (const col of columns) {
            const cell = document.createElement("th");
            cell.textContent = col[0];
            // cell.className = col[2];
            headRow.append(cell);
        }
    }
    {
        const headRow = tfoot.insertRow();
        for (const col of columns) {
            const cell = document.createElement("th");
            cell.textContent = col[0];
            // cell.className = col[2];
            headRow.append(cell);
        }
    }
    const tbody = table.createTBody();
    for (const lull of lulls) {
        const dataRow = tbody.insertRow();
        for (const it of columns) {
            const cell = dataRow.insertCell();
            cell.append(it[1](lull));
            cell.className = it[2];
        }
    }
    return table;
}
function renderActiveList() {
    const animeList = listManager.userAnimeCache.get(activeUsername);
    window["animelist"] = animeList;
    if (!(animeList)) {
        return;
    }
    const timeline = new ATL.AnimeListTimeline(animeList, tvTimelineConfig, true);
    window["timeline"] = timeline;
    listPane.empty();
    consolePane.empty();
    const endGroups = Object.groupBy(timeline.mediaSet, finishGrouper);
    const startGroups = Object.groupBy(timeline.mediaSet, startGrouper);
    delete endGroups[MAL.rawNullDate];
    delete startGroups[MAL.rawNullDate];
    const endGroupKeys = Object.keys(endGroups).sort(collator.compare);
    const startGroupKeys = Object.keys(startGroups).sort(collator.compare);
    const lulls = [];
    let finishIndex = 0;
    let startIndex = 0;
    let lastStart = null;
    /* For each day a series was finished on... */
    for (; finishIndex < endGroupKeys.length; ++finishIndex) {
        const thisEnd = endGroupKeys[finishIndex];
        let nextStart = null;
        /* Find the next day a series was started. */
        for (; startIndex < startGroupKeys.length; ++startIndex) {
            const aStart = startGroupKeys[startIndex];
            if (collator.compare(aStart, thisEnd) < 0) {
                continue;
            }
            else {
                nextStart = aStart;
                break;
            }
        }
        /* Nothing has been started since finishing this entry */
        if (nextStart === null) {
            break;
        }
        /* Ignore series that are finished when another series will have finished before starting something new. */
        if (nextStart === lastStart) {
            lulls.pop();
        }
        lastStart = nextStart;
        lulls.push({ thisEnd, nextStart, lull: daysBetween_abs(thisEnd, nextStart) });
    }
    // -------------------------------------------
    // -------------------------------------------
    // -------------------------------------------
    // -------------------------------------------
    if (activeGrouper === null) {
        const table = renderLullsTable(lulls, endGroups, startGroups);
        listPane.append(table);
    }
    else {
        const groupedLulls = Object.groupBy(lulls, activeGrouper);
        const groups = Object.keys(groupedLulls).sort(collator.compare);
        for (let id of groups) {
            const label = id.slice(3); // `20:Month Lull` -> `Month Lull`
            listPane.append(textNode("h3", label));
            const table = renderLullsTable(groupedLulls[id], endGroups, startGroups);
            listPane.append(table);
        }
    }
    // for (let lull of lulls) {
    //     if (lull.lull === 0) continue;
    //     const s = `${lull.lull}\t${lull.thisEnd} \t${endGroups[lull.thisEnd][0].seriesTitle.preferred(activeLang)}\t${lull.nextStart} \t${startGroups[lull.nextStart][0].seriesTitle.preferred(activeLang)}\t`;
    //     dumpTxt(s);
    // }
    // dumpTxt(lulls);
}
function lullClumper(span) {
    if (span < 3) {
        return `00:${span} Day Lull`;
    }
    if (span < 11) {
        return `10:Week Lull`;
    }
    if (span < 45) {
        return `20:Month Lull`;
    }
    if (span < 110) {
        return `30:Few Month Lull`;
    }
    if (span < 200) {
        return `40:Half Year Lull`;
    }
    if (span < 500) {
        return `50:Year Lull`;
    }
    return `99:Long Lull`;
}
function dumpTxt(txt) {
    if (typeof txt === 'string' || txt instanceof String) {
    }
    else {
        txt = JSON.stringify(txt, null, 2);
    }
    txt = txt + '\n';
    consolePane.append(txt);
}
// ███████╗███████╗███████╗██████╗ ██████╗  █████╗  ██████╗██╗  ██╗
// ██╔════╝██╔════╝██╔════╝██╔══██╗██╔══██╗██╔══██╗██╔════╝██║ ██╔╝
// █████╗  █████╗  █████╗  ██║  ██║██████╔╝███████║██║     █████╔╝ 
// ██╔══╝  ██╔══╝  ██╔══╝  ██║  ██║██╔══██╗██╔══██║██║     ██╔═██╗ 
// ██║     ███████╗███████╗██████╔╝██████╔╝██║  ██║╚██████╗██║  ██╗
// ╚═╝     ╚══════╝╚══════╝╚═════╝ ╚═════╝ ╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝
//
// feedback
//
function reportNoUser() {
    usernameFeedback("No username given.");
}
function reportBadUser(username) {
    usernameFeedback(username + " is not a valid AniList username.");
}
function reportNoDated() {
    const str = ["None of the anime in the list contained watched dates. ",
        "Try removing date filters. ",
    ]
        .join("");
    giveFeedback(str, 14);
}
function usernameFeedback(str) {
    giveFeedback(str);
    input.listUsername.select();
}
function giveFeedback(str, sec = 5) {
    const time = sec * 1000;
    const feedback = $("#feedback");
    feedback.text(str);
    // feedback[0].textContent = str;
    setTimeout(function () {
        feedback.text("");
    }, time);
}
//# sourceMappingURL=lullPage.js.map