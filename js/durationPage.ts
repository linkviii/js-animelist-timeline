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
import { Anime } from "./src/MAL.js";
import * as ATL from "./src/animelistTL.js";
import { daysBetween, daysToYMD, daysToYWD, fixDate, esSetEq, esSetIntersection, esSetDifference } from "./src/util.js";


//  ██████╗ ██╗      ██████╗ ██████╗  █████╗ ██╗     ███████╗
// ██╔════╝ ██║     ██╔═══██╗██╔══██╗██╔══██╗██║     ██╔════╝
// ██║  ███╗██║     ██║   ██║██████╔╝███████║██║     ███████╗
// ██║   ██║██║     ██║   ██║██╔══██╗██╔══██║██║     ╚════██║
// ╚██████╔╝███████╗╚██████╔╝██████╔╝██║  ██║███████╗███████║
//  ╚═════╝ ╚══════╝ ╚═════╝ ╚═════╝ ╚═╝  ╚═╝╚══════╝╚══════╝
//
// Global data
//


type AnimeSorter = (a: Anime, b: Anime) => number;
const nullSorter: AnimeSorter = (a: Anime, b: Anime) => 0;

// Just throw things into this bag. It'll be fine.
export const debugData = {};


export const listManager = new ListManager();

// Should this be in an object? Eh.
export let activeUsername = "";
export let activeGrouper: (_: Anime) => string = null;
export let activeRatio: (_: Anime) => string = ratioEpsDays_s;
export let activeLang = "";
export const activeSorts = [nullSorter, nullSorter];


export const listPane = $("#list-pane");


// ██████╗  █████╗  ██████╗ ███████╗    ██╗      ██████╗  █████╗ ██████╗
// ██╔══██╗██╔══██╗██╔════╝ ██╔════╝    ██║     ██╔═══██╗██╔══██╗██╔══██╗
// ██████╔╝███████║██║  ███╗█████╗      ██║     ██║   ██║███████║██║  ██║
// ██╔═══╝ ██╔══██║██║   ██║██╔══╝      ██║     ██║   ██║██╔══██║██║  ██║
// ██║     ██║  ██║╚██████╔╝███████╗    ███████╗╚██████╔╝██║  ██║██████╔╝
// ╚═╝     ╚═╝  ╚═╝ ╚═════╝ ╚══════╝    ╚══════╝ ╚═════╝ ╚═╝  ╚═╝╚═════╝
//
// Page load
//

function assertUnreachable(x: never): void { }

function validateSelect(select: JQuery<HTMLSelectElement>, options: Readonly<string[]>) {
    const name = select[0].id;
    const htmlValues = new Set(select.children().map((i, opt) => opt.value));
    const jsValues = new Set(options);
    // console.log(name, htmlValues);
    const isGood = esSetEq(htmlValues, jsValues);
    if (!isGood) {
        const fromHTML = esSetDifference(htmlValues, jsValues);
        const fromJS = esSetDifference(jsValues, htmlValues);

        console.warn(`${name}:\tInvalid select`);
        console.log("HTML Extra:", fromHTML);
        console.log("HTML Missing:", fromJS);

    }
}

class InputForm {
    readonly inputForm = $("#form") as JQuery<HTMLFormElement>;

    readonly listUsername = $("#listName") as JQuery<HTMLInputElement>;
    // readonly listKind = $("#list-kind") as JQuery<HTMLInputElement>;
    readonly submitButton = $("#listFormSubmit") as JQuery<HTMLButtonElement>;


    readonly sortPrimary = $("#sort-primary") as JQuery<HTMLSelectElement>;
    readonly sortSecondary = $("#sort-secondary") as JQuery<HTMLSelectElement>;
    readonly groupBy = $("#group-by") as JQuery<HTMLSelectElement>;

    readonly language = $("#language") as JQuery<HTMLSelectElement>;
    readonly ratio = $("#ratio-scale") as JQuery<HTMLSelectElement>;

    SELECT_SORT_VALUES = [
        "name",
        "duration",
        "ratio",
        "score",
        "user-start",
        "user-finish"
    ] as const;

    SELECT_GROUP_VALUES = [
        "none",
        "watch-year",
        "episode-count",
        "type",
        "in-season",
    ] as const;

    initParams() {
        /* Set default values */
    }

    initListeners(): void {
        const input = this;

        input.submitButton[0].addEventListener("click", onSubmit);


        /*  */
        const sortInputs = [input.sortPrimary, input.sortSecondary];
        const initSorterN = (n: number) => {
            const setSort = () => {
                const value = sortInputs[n].val() as string as (typeof this.SELECT_SORT_VALUES[number]);
                console.log(`Sorter ${n}: ${value}`);
                switch (value) {
                    case "name": activeSorts[n] = titleSorter; break;
                    case "duration": activeSorts[n] = durationSorter; break;
                    case "ratio": activeSorts[n] = ratioSorter; break;
                    case "score": activeSorts[n] = scoreSorter; break;
                    case "user-start": activeSorts[n] = makeDateSorter("userStartDate"); break;
                    case "user-finish": activeSorts[n] = makeDateSorter("userFinishDate"); break;
                    default:
                        console.warn(`Unhandled case: ${value}`);
                        assertUnreachable(value);

                }
                renderActiveList();
            };
            sortInputs[n].on("change", setSort);
            setSort();
        };
        initSorterN(0);
        initSorterN(1);
        /*  */
        const setGroupBy = () => {
            const value = input.groupBy.val() as string as (typeof this.SELECT_GROUP_VALUES[number]);
            console.log(value);
            switch (value) {
                case "none": activeGrouper = null; break;
                case "watch-year": activeGrouper = getWatchYear_s; break;
                case "episode-count": activeGrouper = getEpisodes_long; break;
                case "type": activeGrouper = getType; break;
                case "in-season": activeGrouper = watchedInSeason_long; break;

                default:
                    console.warn(`Unhandled case: ${value}`);
                    assertUnreachable(value);
            }
            renderActiveList();

        };
        input.groupBy.on("change", setGroupBy);
        setGroupBy();

        /*  */
        const setLang = () => {
            const value = input.language.val() as string;
            activeLang = value;
            renderActiveList();
        };
        input.language.on("change", setLang);
        setLang();

        /*  */
        const setRatio = () => {
            const value = input.ratio.val() as string;
            console.log(value);
            switch (value) {
                case "days": activeRatio = ratioEpsDays_s; break;
                case "weeks": activeRatio = ratioEpsWeeks_s; break;
                default:
                    console.warn(`Unhandled case: ${value}`);
            }
            renderActiveList();
        };
        input.ratio.on("change", setRatio);
        setRatio();

    }

    /* -------------- */
    validateHTML() {

        validateSelect(input.sortPrimary, this.SELECT_SORT_VALUES);
    }
    /* -------------- */
    init() {
        this.initParams();
        this.initListeners();
        this.validateHTML();

    }

}

export const input = new InputForm();

function init(): void {
    input.init();

    if (location.hostname === "127.0.0.1") {
        const favicon = document.getElementById("favicon") as HTMLLinkElement;
        favicon.href = "../favicon_localhost.png";
    }

    // XXX
    // $("#listName").val("ONLOAD");
    // onSubmit();

}

$(document).ready(init);

// 
// 
// 
const titleSorter: AnimeSorter = (a: Anime, b: Anime) => {
    return a.seriesTitle.preferred(activeLang)
        .localeCompare(b.seriesTitle.preferred(activeLang));
};

const durationSorter: AnimeSorter = (a: Anime, b: Anime) => {
    return -(daysToWatch(b) - daysToWatch(a));
};
const ratioSorter: AnimeSorter = (a: Anime, b: Anime) => {
    return ratioEpsDays(b) - ratioEpsDays(a);
};
const scoreSorter: AnimeSorter = (a: Anime, b: Anime) => {
    return b.userScore - a.userScore;
};

function makeDateSorter(key: "userFinishDate" | "userStartDate"): AnimeSorter {
    return (a: Anime, b: Anime) => {
        return a[key].compare(b[key]);
    };
}


// ███╗   ███╗ █████╗ ██╗███╗   ██╗
// ████╗ ████║██╔══██╗██║████╗  ██║
// ██╔████╔██║███████║██║██╔██╗ ██║
// ██║╚██╔╝██║██╔══██║██║██║╚██╗██║
// ██║ ╚═╝ ██║██║  ██║██║██║ ╚████║
// ╚═╝     ╚═╝╚═╝  ╚═╝╚═╝╚═╝  ╚═══╝


async function onSubmit() {
    const username = ($("#listName").val() as string).trim();
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

function daysToWatch(anime: Anime) {
    return daysBetween(
        anime.userStartDate.date,
        anime.userFinishDate.date
    ) + 1;
}


function ratioEpsDays(anime: Anime): number {
    const days = daysToWatch(anime);
    const ratio = anime.seriesEpisodes / days;
    return ratio;
}
function ratioEpsDays_s(anime: Anime): string {
    return ratioEpsDays(anime).toFixed(3);
}

function ratioEpsWeeks_s(anime: Anime): string {
    const days = daysToWatch(anime);
    const ratio = anime.seriesEpisodes * 7 / days;
    return ratio.toFixed(3);
}

function getEpisodes(anime: Anime) {
    return anime.seriesEpisodes;
}
function getEpisodes_long(anime: Anime) {
    const s = anime.seriesEpisodes === 0 ? "" : "s";
    return `${anime.seriesEpisodes} Episode${s}`;
}

function getType(anime: Anime): string {
    return anime.seriesType;
}

function watchedInSeason(anime: Anime): boolean {
    // Airing dates may be unavailable.
    try {
        return anime.userStartDate.inBounds(anime.seriesStart, anime.seriesEnd);
    } catch {
        return false;
    }
}
function watchedInSeason_short(anime: Anime): string {
    const inSeason = watchedInSeason(anime);
    return inSeason ? "✅" : "";
}
function watchedInSeason_long(anime: Anime): string {
    const inSeason = watchedInSeason(anime);
    return inSeason ? "Watched while airing" : "Watched after completed";
}

// function installTableSorting(table: HTMLTableElement) {
//     const tBody = table.tBodies[0];
//     const rows = Array.from(tBody.rows);
//     const headerCells = table.tHead.rows[0].cells;

//     for (const th of headerCells) {
//         const cellIndex = th.cellIndex;

//         th.addEventListener("click", () => {
//             rows.sort((tr1, tr2) => {
//                 const tr1Text = tr1.cells[cellIndex].textContent;
//                 const tr2Text = tr2.cells[cellIndex].textContent;
//                 return tr1Text.localeCompare(tr2Text);
//             });

//             tBody.append(...rows);
//         });
//     }
// }

function getWatchYear(anime: Anime): number {
    return anime.userStartDate.year();
}
function getWatchYear_s(anime: Anime): string {
    return anime.userStartDate.year().toString();
}


function renderListAsTable(list: Anime[]) {
    const activeLang = input.language.val() as string;

    const sorterAB = (a: Anime, b: Anime) => {
        return activeSorts[0](a, b) || activeSorts[1](a, b);
    };

    list.sort(sorterAB);


    const table = document.createElement("table");
    const thead = table.createTHead();
    const columns: [string, (_: Anime) => string][] = [
        ["Time to Watch", (anime: Anime) => daysToYWD(daysToWatch(anime))],
        ["Title", (anime: Anime) => anime.seriesTitle.preferred(activeLang)],
        ["Ratio", activeRatio],
        ["Score", (anime: Anime) => anime.userScore.toString()],
        ["Start Date", (anime: Anime) => anime.userStartDate.rawDateStr],
        ["Finish Date", (anime: Anime) => anime.userFinishDate.rawDateStr],
        ["In Season", (anime: Anime) => watchedInSeason_short(anime)]
    ];
    {
        const headRow = thead.insertRow();
        for (const label of columns) {

            headRow.insertCell().textContent = label[0];
        }

    }
    const tbody = table.createTBody();
    const boundedAnime = list;
    for (const anime of boundedAnime) {
        const dataRow = tbody.insertRow();

        for (const it of columns) {

            dataRow.insertCell().textContent = it[1](anime);
            // anime.
        }



    }
    return table;
}

function renderActiveList() {
    const animeList = listManager.userAnimeCache.get(activeUsername) as MAL.AnimeList;
    window["animelist"] = animeList;

    if (!(animeList)) {
        return;
    }

    const config: ATL.AnimeListTimelineConfig = {
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
        animeFormat: ATL.ALL_FORMATS
    };
    const timeline = new ATL.AnimeListTimeline(animeList, config);
    window["timeline"] = timeline;

    listPane.empty();

    {
        const name = document.createElement("h2");
        name.textContent = `${activeUsername}'s Anime List`;
        listPane.append(name);

    }

    const boundedAnime = timeline.boundedSet as Anime[];

    if (activeGrouper) {
        const groups = Object.groupBy(boundedAnime, activeGrouper);
        const groupNames = Object.keys(groups);
        groupNames.sort();

        for (const name of groupNames) {
            const h = document.createElement('h3');
            h.textContent = name;
            listPane.append(h);

            const list = groups[name];
            const table = renderListAsTable(list);
            listPane.append(table);
        }

    } else {

        const table = renderListAsTable(boundedAnime);
        listPane.append(table);
    }

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

function reportBadUser(username: string): void {
    usernameFeedback(username + " is not a valid AniList username.");
}

function reportNoDated() {
    const str = ["None of the anime in the list contained watched dates. ",
        "Try removing date filters. ",
    ]
        .join("");
    giveFeedback(str, 14);
}

function usernameFeedback(str: string) {
    giveFeedback(str);
    input.listUsername.select();
}

function giveFeedback(str: string, sec = 5) {

    const time = sec * 1000;

    const feedback = $("#feedback");
    feedback.text(str);
    // feedback[0].textContent = str;
    setTimeout(function () {
        feedback.text("");
    }, time);

}

