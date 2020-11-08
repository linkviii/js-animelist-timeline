/**
 * MIT licenced
 *
 * v0.1.1
 * 2017-04-06
 */
/*
 *
 * code outline:
 *
 * imports
 * global data
 * page load
 * main chain
 * feedback
 * types
 * buttons
 * util
 * data cleaning
 * url query manipulation
 * api urls
 * test(ing) stuff
 *
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
//import animelistTL.ts
import { AnimeListTimeline, AnimeListTimelineConfigKeys, //
NoDatedAnimeError } from "./src/animelistTL.js";
//import MAL.ts
import * as MAL from "./src/MAL.js";
//import timeline.ts
import { Timeline } from "./lib/timeline.js";
//import jquery
import "./jquery.js";
//  ██████╗ ██╗      ██████╗ ██████╗  █████╗ ██╗     ███████╗    
// ██╔════╝ ██║     ██╔═══██╗██╔══██╗██╔══██╗██║     ██╔════╝    
// ██║  ███╗██║     ██║   ██║██████╔╝███████║██║     ███████╗    
// ██║   ██║██║     ██║   ██║██╔══██╗██╔══██║██║     ╚════██║    
// ╚██████╔╝███████╗╚██████╔╝██████╔╝██║  ██║███████╗███████║    
//  ╚═════╝ ╚══════╝ ╚═════╝ ╚═════╝ ╚═╝  ╚═╝╚══════╝╚══════╝    
//
// Global data
//
export const debug = false;
// export const debug: boolean = true
// Just throw things into this bag. It'll be fine.
export let debugData = {};
export const usingTestData = false;
// export const usingTestData: boolean = true
if (debug || usingTestData) {
    console.warn("Don't commit debug!");
}
//
//
const siteUrl = "https://linkviii.github.io/js-animelist-timeline/";
const repoUrl = "https://github.com/linkviii/js-animelist-timeline";
const issueUrl = "https://github.com/linkviii/js-animelist-timeline/issues";
const dateRegex = /^\d\d\d\d[\-\/.]\d\d[\-\/\.]\d\d$|^\d\d\d\d\d\d\d\d$/;
const userAnimeCache = new Map();
const userMangaCache = new Map();
let timelineCount = 0;
// global for ease of testing. Used as globals.
export let username;
export let tln;
// ██████╗  █████╗  ██████╗ ███████╗    ██╗      ██████╗  █████╗ ██████╗ 
// ██╔══██╗██╔══██╗██╔════╝ ██╔════╝    ██║     ██╔═══██╗██╔══██╗██╔══██╗
// ██████╔╝███████║██║  ███╗█████╗      ██║     ██║   ██║███████║██║  ██║
// ██╔═══╝ ██╔══██║██║   ██║██╔══╝      ██║     ██║   ██║██╔══██║██║  ██║
// ██║     ██║  ██║╚██████╔╝███████╗    ███████╗╚██████╔╝██║  ██║██████╔╝
// ╚═╝     ╚═╝  ╚═╝ ╚═════╝ ╚══════╝    ╚══════╝ ╚═════╝ ╚═╝  ╚═╝╚═════╝ 
//
// Page load
//
function init() {
    const keys = AnimeListTimelineConfigKeys;
    // form fields
    const param = getJsonFromUrl();
    const listField = $("#listName");
    listField.select();
    if (param[keys.userName]) {
        listField.val(keys.userName);
    }
    if (param[keys.width]) {
        $("#width").val(param[keys.width]);
    }
    if (param[keys.minDate]) {
        $("#from").val(param[keys.minDate]);
    }
    if (param[keys.maxDate]) {
        $("#to").val(param[keys.maxDate]);
    }
    if (param[keys.lang]) {
        $("#language").val(param[keys.lang]);
    }
    if (param[keys.seasons]) {
        $("#seasons")[0].checked = "true" == param[keys.seasons];
    }
    if (param[keys.listKind]) {
        $("#list-kind").val(param[keys.listKind]);
    }
    if (param[keys.fontSize]) {
        $("#font-size").val(param[keys.fontSize]);
    }
    //buttons
    $("#listFormSubmit")[0].addEventListener("click", listFormSubmit);
    const removeAll = document.getElementById("clearAllTimelines");
    removeAll.disabled = true;
    removeAll.addEventListener("click", clearAllTimelines);
}
$(document).ready(init);
/*
 *
 * --------------------------------
 *
 *
 */
//  ██╗     ██╗███████╗████████╗███████╗
//  ██║     ██║██╔════╝╚══██╔══╝██╔════╝
//  ██║     ██║███████╗   ██║   ███████╗
//  ██║     ██║╚════██║   ██║   ╚════██║
//  ███████╗██║███████║   ██║   ███████║
//  ╚══════╝╚═╝╚══════╝   ╚═╝   ╚══════╝
export async function getAniList(userName) {
    if (usingTestData) {
        console.log("Using test data.");
        const url = "res/anilist_example.json";
        let job = await fetch(url).then(response => response.json());
        return job;
    }
    const query = `
    query ($userName: String) { 
        MediaListCollection(userName: $userName, type: ANIME) {
            hasNextChunk
            user {
                id
            }
            lists {
                name
                status
                entries {
                    mediaId
                    score
                    progress
                    startedAt { year month day } 
                    completedAt { year month day }
                    media {
                        duration
                        episodes
                        title {
                            romaji english native userPreferred
                        }
                    }
                }
            }
        }
    }
    `; // Could probably munch the whitespace with a regex but no real need to
    const variables = {
        userName: userName
    };
    // Define the config we'll need for our Api request
    const url = 'https://graphql.anilist.co', options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
        body: JSON.stringify({
            query: query,
            variables: variables
        })
    };
    const response = await fetch(url, options);
    const foo = await response.json();
    if (foo.errors) {
        console.error(foo.errors);
        return new MAL.BadUsernameError();
    }
    const data = foo.data.MediaListCollection;
    if (data.hasNextChunk) {
        console.warn("TODO: next chunk not implemented yet.");
    }
    return data;
}
export async function getMangaList(userName) {
    if (usingTestData) {
        console.log("Using test manga list data.");
        const url = "res/TODO.json";
        let job = await fetch(url).then(response => response.json());
        return job;
    }
    const query = `
    query ($userName: String) { 
        MediaListCollection(userName: $userName, type: MANGA) {
            hasNextChunk
            user {
                id
            }
            lists {
                name
                status
                entries {
                    mediaId
                    score
                    progress
                    startedAt { year month day } 
                    completedAt { year month day }
                    media {
                        duration
                        episodes
                        title {
                            romaji english native userPreferred
                        }
                    }
                }
            }
        }
    }
    `; // Could probably munch the whitespace with a regex but no real need to
    const variables = {
        userName: userName
    };
    // Define the config we'll need for our Api request
    const url = 'https://graphql.anilist.co', options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
        body: JSON.stringify({
            query: query,
            variables: variables
        })
    };
    const response = await fetch(url, options);
    const foo = await response.json();
    if (foo.errors) {
        console.error(foo.errors);
        return new MAL.BadUsernameError();
    }
    const data = foo.data.MediaListCollection;
    if (data.hasNextChunk) {
        console.warn("TODO: next chunk not implemented yet.");
    }
    return data;
}
/*
*
* --------------------------------
*
*
*/
// ███╗   ███╗ █████╗ ██╗███╗   ██╗
// ████╗ ████║██╔══██╗██║████╗  ██║
// ██╔████╔██║███████║██║██╔██╗ ██║
// ██║╚██╔╝██║██╔══██║██║██║╚██╗██║
// ██║ ╚═╝ ██║██║  ██║██║██║ ╚████║
// ╚═╝     ╚═╝╚═╝  ╚═╝╚═╝╚═╝  ╚═══╝
//
// main chain
//
// main I
// Entry point from html form
function listFormSubmit() {
    beforeAjax().then();
    return;
}
// main II
// Form api requests and call
async function beforeAjax() {
    username = $("#listName").val().trim();
    const listKind = $("#list-kind").val();
    if (username === "") {
        reportNoUser();
        return;
    }
    switch (listKind) {
        case "ANIME":
            { // check cache for name
                // to skip ajax
                const data = userAnimeCache.get(username);
                if (data) {
                    console.info([username, "'s data loaded from cache."].join(""));
                    if (data instanceof MAL.BadUsernameError) {
                        reportBadUser();
                    }
                    else {
                        prepareTimeline(data);
                    }
                    return;
                }
                const aniList = await getAniList(username);
                debugData["aniList"] = aniList;
                if (aniList instanceof MAL.BadUsernameError) {
                    reportBadUser();
                    userAnimeCache.set(username, aniList);
                    return;
                }
                const animeList = MAL.animeListFromAniList(aniList, username);
                debugData["list"] = animeList;
                userAnimeCache.set(username, animeList);
                // drawHoursWatched(animeList);
                prepareTimeline(animeList);
            }
            break;
        case "MANGA":
            {
                const data = userMangaCache.get(username);
                if (data) {
                    console.info([username, "'s data loaded from cache."].join(""));
                    if (data instanceof MAL.BadUsernameError) {
                        reportBadUser();
                    }
                    else {
                        prepareTimeline(data);
                    }
                    return;
                }
                const aniList = await getMangaList(username);
                debugData["aniList"] = aniList;
                if (aniList instanceof MAL.BadUsernameError) {
                    reportBadUser();
                    userMangaCache.set(username, aniList);
                    return;
                }
                const mangaList = MAL.mangaListFromAniList(aniList, username);
                debugData["list"] = mangaList;
                userMangaCache.set(username, mangaList);
                prepareTimeline(mangaList);
            }
            break;
        default:
            console.error("Unexpected list-kind:", listKind);
    }
}
// main V
// Use doc to build timeline
function prepareTimeline(mal) {
    const listKind = $("#list-kind").val();
    let startDate = $("#from").val().trim();
    let endDate = $("#to").val().trim();
    startDate = fixDate(startDate, -1);
    endDate = fixDate(endDate, 1);
    const widthStr = $("#width").val().trim();
    const language = $("#language").val();
    let width;
    if (isNormalInteger(widthStr)) {
        width = parseInt(widthStr);
    }
    else { //default
        width = 1000;
    }
    const showSeasons = $("#seasons")[0].checked;
    const fontSize = ($("#font-size")).val();
    const tlConfig = {
        userName: username,
        width: width,
        minDate: startDate,
        maxDate: endDate,
        lang: language,
        seasons: showSeasons,
        fontSize: fontSize,
        listKind: listKind,
    };
    updateUri(tlConfig);
    try {
        //global
        tln = new AnimeListTimeline(mal, tlConfig); // can throw NoDatedAnimeError
    }
    catch (err) {
        if (err instanceof NoDatedAnimeError) {
            reportNoDated();
            return;
        }
        else {
            throw err;
        }
    }
    displayTimeline();
}
// main VI
// write the timeline to the document
// pre: tln is a valid AnimeListTimeline object
function displayTimeline() {
    /*
     This comment could lie
     and so could any other

     `` div #tls
     ``** div
     ``**`` ul buttonlist
     ``**``** li
     ``**``**`` button
     ``**`` div .tl_[n]
     ``**```` svg

     ** → multiple
     `` → single

     */
    //Allways add new timeline on top
    const tlArea = document.createElement("div");
    $("#tls").prepend(tlArea);
    //make buttons
    const removeButton = document.createElement("button");
    removeButton.textContent = "X";
    removeButton.setAttribute("title", "Remove timeline from the page");
    removeButton.addEventListener("click", removeTl);
    const svgButton = document.createElement("button");
    svgButton.textContent = "S";
    svgButton.setAttribute("title", "Save as svg");
    svgButton.addEventListener("click", exportTimeline);
    svgButton.kind = exportType.Svg;
    const pngButton = document.createElement("button");
    pngButton.textContent = "P";
    pngButton.setAttribute("title", "Save as png");
    pngButton.addEventListener("click", exportTimeline);
    pngButton.kind = exportType.Png;
    const jsonButton = document.createElement("button");
    jsonButton.textContent = "J";
    jsonButton.setAttribute("title", "Save tln json");
    jsonButton.addEventListener("click", exportTimeline);
    jsonButton.kind = exportType.Json;
    //make list
    const controls = document.createElement("ul");
    controls.className = "buttonList";
    controls.appendChild(wrapListItem(removeButton));
    controls.appendChild(wrapListItem(svgButton));
    controls.appendChild(wrapListItem(pngButton));
    if (debug) {
        controls.appendChild(wrapListItem(jsonButton));
    }
    //make timeline container
    const tl = document.createElement("div");
    tl.className = "timeline";
    tl.id = "tl_" + timelineCount;
    timelineCount++;
    tl.meta = tln;
    // add to dom
    tlArea.appendChild(controls);
    tlArea.appendChild(tl);
    //make timeline after it has a valid anchor in the doc
    const svg = new Timeline(tln.data, tl.id);
    svg.build();
    const removeAll = document.getElementById("clearAllTimelines");
    removeAll.disabled = false;
}
// ***
// End main chain
// ***
function drawHoursWatched(mal) {
    const anime = [];
    const dateSet = new Set();
    // const dateSet: Set<number> = new Set();
    // Look for all the anime that are completed and have both start and finish dates
    for (let entry of mal.anime) {
        if (entry.myStatus != MAL.Status.Completed) {
            continue;
        }
        if (entry.myStartDate.isNullDate() || entry.myFinishDate.isNullDate()) {
            continue;
        }
        anime.push(entry);
        dateSet.add(entry.myStartDate.fixedDateStr);
        dateSet.add(entry.myFinishDate.fixedDateStr);
    }
    const dates = Array.from(dateSet);
    dates.sort(); // Probably fine on date strings
    // const watchTime:number[] = [];
    const watchTime = new Map();
    for (let d of dates) {
        // watchTime.push(0);
        watchTime.set(d, 0);
    }
    for (let entry of anime) {
        const duration = entry.seriesEpisodes * entry.seriesEpisodesDuration;
        watchTime.set(entry.myStartDate.fixedDateStr, watchTime.get(entry.myStartDate.fixedDateStr) + duration);
    }
    watchTime.delete(dates[0]);
    const maxDay = [...watchTime.entries()]
        .reduce((a, e) => e[1] > a[1] ? e : a);
    console.log(maxDay);
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
function reportBadUser() {
    usernameFeedback(username + " is not a valid AniList username.");
}
function reportNoDated() {
    const str = ["None of the anime in the list contained watched dates. ",
        "Try removing date filters. ",
        "If the list does contain watched dates and you see this error, please report an issue at ",
        issueUrl]
        .join("");
    giveFeedback(str, 14);
}
function usernameFeedback(str) {
    giveFeedback(str);
    $("#listName").select();
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
//
// types
//
var exportType;
(function (exportType) {
    exportType[exportType["Png"] = 0] = "Png";
    exportType[exportType["Svg"] = 1] = "Svg";
    exportType[exportType["Json"] = 2] = "Json";
})(exportType || (exportType = {}));
class MyButton extends HTMLButtonElement {
}
class MyContainer extends HTMLDivElement {
}
// ██████╗ ██╗   ██╗████████╗████████╗ ██████╗ ███╗   ██╗███████╗
// ██╔══██╗██║   ██║╚══██╔══╝╚══██╔══╝██╔═══██╗████╗  ██║██╔════╝
// ██████╔╝██║   ██║   ██║      ██║   ██║   ██║██╔██╗ ██║███████╗
// ██╔══██╗██║   ██║   ██║      ██║   ██║   ██║██║╚██╗██║╚════██║
// ██████╔╝╚██████╔╝   ██║      ██║   ╚██████╔╝██║ ╚████║███████║
// ╚═════╝  ╚═════╝    ╚═╝      ╚═╝    ╚═════╝ ╚═╝  ╚═══╝╚══════╝
//
// Buttons (other than submit)
//
// "Remove all" button
function clearAllTimelines() {
    this.disabled = true;
    $("#tls").empty();
}
//button listeners. `this` is the button
// "X" button
function removeTl() {
    //rm ../../.. → div {ul, div#tl_}
    this.parentElement.parentElement.parentElement.remove();
    // to do? disable remove all if there are no more timelines
}
// "P" | "S" button
function exportTimeline() {
    //div = ../../.. → div {ul, div#tl_}
    //svg = div/div#tl_/svg
    const div = this.parentElement.parentElement.parentElement;
    const container = div.getElementsByClassName("timeline")[0];
    const svg = container.firstElementChild;
    const fileName = container.meta.getDescriptor();
    const svgdata = new XMLSerializer().serializeToString(svg);
    switch (this.kind) {
        //
        case exportType.Png:
            {
                const img = document.createElement("img");
                img.setAttribute("src", "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgdata))));
                const canvas = document.createElement("canvas");
                const ctx = canvas.getContext("2d");
                const svgSize = svg.getBoundingClientRect();
                canvas.width = svgSize.width * 3;
                canvas.height = svgSize.height * 3;
                ctx.fillStyle = "white";
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                img.onload = function () {
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    canvas.toBlob(function (blob) {
                        saveAs(blob, fileName + ".png");
                    });
                };
            }
            break;
        //
        case exportType.Svg:
            {
                const blob = new Blob([svgdata], { type: "image/svg+xml" });
                saveAs(blob, fileName + ".svg");
            }
            break;
        case exportType.Json:
            {
                const blob = new Blob([container.meta.getJson()], { type: "application/json" });
                saveAs(blob, fileName + ".json");
            }
            break;
        //
        default: {
            console.error("unhandled export case");
        }
    }
}
// ██╗   ██╗████████╗██╗██╗     ██╗████████╗██╗   ██╗
// ██║   ██║╚══██╔══╝██║██║     ██║╚══██╔══╝╚██╗ ██╔╝
// ██║   ██║   ██║   ██║██║     ██║   ██║    ╚████╔╝ 
// ██║   ██║   ██║   ██║██║     ██║   ██║     ╚██╔╝  
// ╚██████╔╝   ██║   ██║███████╗██║   ██║      ██║   
//  ╚═════╝    ╚═╝   ╚═╝╚══════╝╚═╝   ╚═╝      ╚═╝   
//
// Util
//
function wrapListItem(elm) {
    const li = document.createElement("li");
    li.appendChild(elm);
    return li;
}
//
// Data cleaning
//
/**
 * Returns if the string represents a non negative integer.
 * @param str
 * @returns {boolean}
 */
function isNormalInteger(str) {
    const n = ~~Number(str);
    return (String(n) === str) && (n >= 0);
}
//make user input suitable for anime timeline
//must not be null
function fixDate(date, minmax) {
    const minYear = 1980; //Nerds can change this in the future
    const maxYear = 2030; //For now its sane
    const test = dateRegex.test(date);
    if (!test) {
        date = MAL.rawNullDate;
    }
    let ys;
    let ms;
    let ds;
    if (/^\d\d\d\d\d\d\d\d$/.test(date)) {
        ys = date.slice(0, 4);
        ms = date.slice(4, 6);
        ds = date.slice(6, 8);
    }
    else {
        ys = date.slice(0, 4);
        ms = date.slice(5, 7);
        ds = date.slice(8, 10);
    }
    const y = parseInt(ys);
    const m = parseInt(ms);
    const d = parseInt(ds);
    //A date needs at least a sane year
    if (y < minYear || y > maxYear) {
        if (minmax == -1)
            ys = minYear.toString();
        else // (minmax == 1)
            ys = maxYear.toString();
    }
    if (m < 0 || m > 12) {
        ms = "00";
    }
    if (d < 0 || d > 32) {
        ds = "00";
    }
    return [ys, ms, ds].join("-");
}
//
// url query manipulation
//
//http://stackoverflow.com/a/8486188/1993919
function getJsonFromUrl(hashBased) {
    let query;
    if (hashBased) {
        let pos = location.href.indexOf("?");
        if (pos == -1)
            return [];
        query = location.href.substr(pos + 1);
    }
    else {
        query = location.search.substr(1);
    }
    const result = {};
    query.split("&").forEach(function (part) {
        if (!part)
            return;
        part = part.split("+").join(" "); // replace every + with space, regexp-free version
        const eq = part.indexOf("=");
        let key = eq > -1 ? part.substr(0, eq) : part;
        const val = eq > -1 ? decodeURIComponent(part.substr(eq + 1)) : "";
        const from = key.indexOf("[");
        if (from == -1)
            result[decodeURIComponent(key)] = val;
        else {
            const to = key.indexOf("]");
            const index = decodeURIComponent(key.substring(from + 1, to));
            key = decodeURIComponent(key.substring(0, from));
            if (!result[key])
                result[key] = [];
            if (!index)
                result[key].push(val);
            else
                result[key][index] = val;
        }
    });
    return result;
}
//http://stackoverflow.com/a/19472410/1993919
function replaceQueryParam(param, newval, search) {
    // Could default but probably not intended.
    //search = search || window.location.search;
    const regex = new RegExp("([?;&])" + param + "[^&;]*[;&]?");
    const query = search.replace(regex, "$1").replace(/&$/, '');
    return (query.length > 2 ? query + "&" : "?") + (newval ? param + "=" + newval : '');
}
function updateUri(param) {
    // Why were these read from dom instead of `param`?
    // Was it because param squeezes the dates? (Does it?)
    let startDate = $("#from").val().trim();
    if (startDate === "") {
        startDate = "";
    }
    let endDate = $("#to").val().trim();
    if (endDate === "") {
        endDate = "";
    }
    const kind = $("#list-kind").val();
    const keys = AnimeListTimelineConfigKeys;
    let str = window.location.search;
    str = replaceQueryParam(keys.userName, username, str);
    str = replaceQueryParam(keys.width, param.width.toString(), str);
    str = replaceQueryParam(keys.minDate, startDate, str);
    str = replaceQueryParam(keys.maxDate, endDate, str);
    str = replaceQueryParam(keys.lang, param.lang, str);
    str = replaceQueryParam(keys.seasons, param.seasons.toString(), str);
    str = replaceQueryParam(keys.listKind, kind, str);
    str = replaceQueryParam(keys.fontSize, param.fontSize.toString(), str);
    window.history.replaceState(null, null, str);
}
//
// API urls
//
//
// test(ing) stuff
//
//# sourceMappingURL=main.js.map