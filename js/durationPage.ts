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
import { daysBetween, daysToYMD, daysToYWD, fixDate, esSetEq, esSetIntersection, esSetDifference, textNode } from "./src/util.js";


// 
// 
if (Object.groupBy === undefined) {
    alert("Your browser is not supported. The site is tested with Firefox. The group by feature will not work.");
}

//  ██████╗ ██╗      ██████╗ ██████╗  █████╗ ██╗     ███████╗
// ██╔════╝ ██║     ██╔═══██╗██╔══██╗██╔══██╗██║     ██╔════╝
// ██║  ███╗██║     ██║   ██║██████╔╝███████║██║     ███████╗
// ██║   ██║██║     ██║   ██║██╔══██╗██╔══██║██║     ╚════██║
// ╚██████╔╝███████╗╚██████╔╝██████╔╝██║  ██║███████╗███████║
//  ╚═════╝ ╚══════╝ ╚═════╝ ╚═════╝ ╚═╝  ╚═╝╚══════╝╚══════╝
//
// Global data
//

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

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
export const activeSortDirections = [1, 1];
export const activeFilters = {
    day1Ep1: false,
};


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

class LabelCheckbox_PushButton {
    /* https://stackoverflow.com/a/66550060/1993919 */

    topElm = document.createElement("label");

    inputElm = document.createElement("input");

    textElm = document.createElement("span");

    constructor(parent: HTMLElement, text: string) {
        this.topElm.className = "label-checkbox";

        this.inputElm.type = "checkbox";

        this.textElm.textContent = text;

        this.topElm.append(this.inputElm);
        this.topElm.append(this.textElm);

        parent.append(this.topElm);
    }
}

class InputForm {
    readonly inputForm = $("#form") as JQuery<HTMLFormElement>;

    readonly listUsername = $("#listName") as JQuery<HTMLInputElement>;
    // readonly listKind = $("#list-kind") as JQuery<HTMLInputElement>;
    readonly submitButton = $("#listFormSubmit") as JQuery<HTMLButtonElement>;




    readonly sortPrimary = $("#sort-primary") as JQuery<HTMLSelectElement>;
    readonly sortPrimaryDirection = $("#sort-primary-check") as JQuery<HTMLInputElement>;
    readonly sortPrimaryDirectionTxt = $("#sort-primary-check-text");

    readonly sortSecondary = $("#sort-secondary") as JQuery<HTMLSelectElement>;
    readonly sortSecondaryDirection = $("#sort-secondary-check") as JQuery<HTMLInputElement>;
    readonly sortSecondaryDirectionTxt = $("#sort-secondary-check-text");

    readonly groupBy = $("#group-by") as JQuery<HTMLSelectElement>;

    readonly filteringSection = $("#filtering-set");

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
        const sortDirChecks = [input.sortPrimaryDirection, input.sortSecondaryDirection];
        const sortDirTexts = [input.sortPrimaryDirectionTxt, input.sortSecondaryDirectionTxt];

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
        initSorterN(1);
        /*  */
        const setGroupBy = () => {
            const value = input.groupBy.val() as string as (typeof this.SELECT_GROUP_VALUES[number]);
            console.log(`Grouper: ${value}`);
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

        /* ------------------------------------------ */

        function initSetFilter(key: keyof typeof activeFilters, button: LabelCheckbox_PushButton) {
            const setter = () => {
                const checked = button.inputElm.checked;
                activeFilters[key] = checked;
                renderActiveList()
            };
            button.inputElm.onchange = setter;
        }

        const b1Day1Ep = new LabelCheckbox_PushButton(input.filteringSection[0], "❌ 1 Ep 1 Day");
        initSetFilter("day1Ep1", b1Day1Ep);


        /* ------------------------------------------ */
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
            console.log(`Ratio: ${value}`);
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


function filterList(list: Anime[]) {
    return list.filter((anime: Anime) => {

        if (activeFilters.day1Ep1) {
            if (anime.seriesEpisodes === 1 && daysToWatch(anime) === 1) {
                return false;
            }
        }

        return true;
    });
}

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

function getEpisodes(anime: Anime): number {
    return anime.seriesEpisodes;
}
function getEpisodes_s(anime: Anime): string {
    return anime.seriesEpisodes.toString();
}

function getEpisodes_long(anime: Anime): string {
    const n = anime.seriesEpisodes;
    if (n === 1) {
        return "1: 1 Episode";
    }

    const tops = [1, 4, 9, 13, 18, 27, 55, 100];
    const level = tops.findIndex((x) => x >= n);

    if (level < 0) {
        return `${tops.length + 1}: ${tops[tops.length - 1] + 1}+`;
    } else {
        return `${level + 1}: ${tops[level - 1] + 1}-${tops[level]} Episodes`;
    }
    // let range = "";
    // if (n <=4){
    //     range = "2-4"
    // }

    // const s =  === 1 ? "" : "s";
    // return `${anime.seriesEpisodes} Episode${s}`;
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
        return activeSorts[0](a, b) * activeSortDirections[0] ||
            activeSorts[1](a, b) * activeSortDirections[1];
    };

    list.sort(sorterAB);


    const table = document.createElement("table");

    const columns: [string, (_: Anime) => string, string][] = [
        ["Time to Watch", (anime: Anime) => daysToYWD(daysToWatch(anime)), "col-num"],
        ["Eps", getEpisodes_s, "col-num"],
        ["Title", (anime: Anime) => anime.seriesTitle.preferred(activeLang), "col-title"],
        ["Ratio", activeRatio, "col-num"],
        ["Score", (anime: Anime) => anime.userScore.toString(), "col-num"],
        ["Start Date", (anime: Anime) => anime.userStartDate.rawDateStr, "col-num"],
        ["Finish Date", (anime: Anime) => anime.userFinishDate.rawDateStr, "col-date"],
        ["In Season", watchedInSeason_short, "col-date"]
    ];

    // for (let col of columns){
    //     const cg = document.createElement("colgroup")
    // }

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
    const boundedAnime = list;
    for (const anime of boundedAnime) {
        const dataRow = tbody.insertRow();

        for (const it of columns) {
            const cell = dataRow.insertCell();
            cell.textContent = it[1](anime);
            cell.className = it[2];
        }



    }
    return table;
}

function calculateStats(list: Anime[]) {
    const titleCount = list.length;
    let episodeCount = 0;
    let totalMinutes = 0;

    let sumMinutesPerDay = 0;

    for (const anime of list) {
        episodeCount += anime.seriesEpisodes;
        const seriesMin = anime.seriesEpisodes * anime.seriesEpisodesDuration;
        totalMinutes += seriesMin;

        const watchDays = daysToWatch(anime);
        sumMinutesPerDay += seriesMin / watchDays;
    }
    const meanMinPerDayPerTitle = sumMinutesPerDay / titleCount;

    return {
        titleCount,
        episodeCount,
        totalMinutes,
        meanMinPerDayPerTitle
    };
}

function renderStats(stats: ReturnType<typeof calculateStats>) {
    const div = document.createElement("div");
    {
        const h = document.createElement("h4");
        h.textContent = "Stats";
        div.append(h);
    }

    {
        const days = Math.floor(stats.totalMinutes / 60 / 24);
        const txt = `
Watched ${stats.episodeCount} episodes from ${stats.titleCount} titles. 
${daysToYMD(days)} (${stats.totalMinutes.toLocaleString()} minutes) watched.
        `;
        div.append(textNode('p', txt));

    }
    {
        const txt = `
Average minutes per day per title: ${stats.meanMinPerDayPerTitle.toFixed(1)}        
        `;
        div.append(textNode('p', txt));


    }

    return div;
}

const fullTimelineConfig: ATL.AnimeListTimelineConfig = {
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

function renderActiveList() {
    const animeList = listManager.userAnimeCache.get(activeUsername) as MAL.AnimeList;
    window["animelist"] = animeList;

    if (!(animeList)) {
        return;
    }


    const timeline = new ATL.AnimeListTimeline(animeList, fullTimelineConfig);
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
        groupNames.sort(collator.compare);

        for (const name of groupNames) {
            const h = document.createElement('h3');
            h.textContent = name;
            listPane.append(h);

            const list = filterList(groups[name]);
            const table = renderListAsTable(list);
            listPane.append(table);

            listPane.append(renderStats(calculateStats(list)));
        }

    } else {

        const flist = filterList(boundedAnime);
        const table = renderListAsTable(flist);
        listPane.append(table);
        listPane.append(renderStats(calculateStats(flist)));

        const namedLists = Object.keys((animeList.namedLists));
        if (namedLists.length !== 0) {
            const db: Record<number, Anime> = {};
            for (let anime of flist) {
                db[anime.id] = anime;
            }

            for (const listName of namedLists) {

                const list = [];
                for (const id of animeList.namedLists[listName]) {
                    const anime = db[id];
                    if (anime) { list.push(anime); }
                }
                if (list.length !== 0) {
                    const h = document.createElement('h3');
                    h.textContent = listName;
                    listPane.append(h);

                    const table = renderListAsTable(list);
                    listPane.append(table);

                    listPane.append(renderStats(calculateStats(list)));

                }
            }

        }

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

