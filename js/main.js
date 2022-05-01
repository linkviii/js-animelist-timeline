/**
 * MIT licensed
 *
 * v0.2.1
 * 2021-04-18
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
import * as ATL from "./src/animelistTL.js";
import * as Heat from "./src/heatmap.js";
//import MAL.ts
import * as MAL from "./src/MAL.js";
//import timeline.ts
import { Timeline } from "./lib/timeline.js";
//import jquery
import "./jquery.js";
import "./lib/jquery-ui/jquery-ui.min.js";
import "./lib/chartjs/Chart.bundle.js";
import "./lib/awesomplete/awesomplete.js";
//  ██████╗ ██╗      ██████╗ ██████╗  █████╗ ██╗     ███████╗    
// ██╔════╝ ██║     ██╔═══██╗██╔══██╗██╔══██╗██║     ██╔════╝    
// ██║  ███╗██║     ██║   ██║██████╔╝███████║██║     ███████╗    
// ██║   ██║██║     ██║   ██║██╔══██╗██╔══██║██║     ╚════██║    
// ╚██████╔╝███████╗╚██████╔╝██████╔╝██║  ██║███████╗███████║    
//  ╚═════╝ ╚══════╝ ╚═════╝ ╚═════╝ ╚═╝  ╚═╝╚══════╝╚══════╝    
//
// Global data
//
/** Enable extra features that aren't generally useful, Might be able to change in the console. */
export var debug = false;
// export var debug: boolean = true
// Just throw things into this bag. It'll be fine.
export const debugData = {};
/** Use a local file instead of asking anilist's servers */
export const usingTestData = false;
// export const usingTestData: boolean = true
// Should probably figure out something to enforce that...
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
export const knownAnime = new Map();
// Const reference that awesomplete binds to
export const filterList = [];
export const activeFilter = new Set();
function fillFilterList() {
    filterList.splice(0, filterList.length); // Clear the list first
    const lang = input.language.val();
    for (let [id, title] of knownAnime.entries()) {
        if (!activeFilter.has(id)) {
            filterList.push({ label: title.preferred(lang), value: id });
        }
    }
    if (filterList.length !== 0) {
        input.titleFilter.disabled = false;
        input.titleFilter.placeholder = "Search for titles";
    }
}
// global for ease of testing. Used as globals.
// export let username: string;
// export let tln: AnimeListTimeline;
// ██████╗  █████╗  ██████╗ ███████╗    ██╗      ██████╗  █████╗ ██████╗ 
// ██╔══██╗██╔══██╗██╔════╝ ██╔════╝    ██║     ██╔═══██╗██╔══██╗██╔══██╗
// ██████╔╝███████║██║  ███╗█████╗      ██║     ██║   ██║███████║██║  ██║
// ██╔═══╝ ██╔══██║██║   ██║██╔══╝      ██║     ██║   ██║██╔══██║██║  ██║
// ██║     ██║  ██║╚██████╔╝███████╗    ███████╗╚██████╔╝██║  ██║██████╔╝
// ╚═╝     ╚═╝  ╚═╝ ╚═════╝ ╚══════╝    ╚══════╝ ╚═════╝ ╚═╝  ╚═╝╚═════╝ 
//
// Page load
//
class InputForm {
    constructor() {
        this.advancedToggle = $("#show-advanced");
        // Would be awkward to have both `form` and `from` fields
        this.inputForm = $("#form");
        this.listField = $("#listName");
        this.language = $("#language");
        this.seasonsToggle = $("#seasons");
        this.width = $("#width");
        this.widthSlider = $("#width-slider");
        this.fontSize = $("#font-size");
        this.from = $("#from");
        this.to = $("#to");
        this.focusYear = $("#focus-year");
        this.lastN = $("#last-n");
        this.lastNToggle = $("#enable-last-n");
        this.padFocusToggle = $("#pad-focus");
        this.heatmapSelect = $("#heatmap-select");
        this.listKind = $("#list-kind");
        this.animeFormat = $("#anime-format");
        this.mangaFormat = $("#manga-format");
        this.filterKind = $("#filter-kind");
        // To be poisoned by awesomplete 
        this.titleFilter = document.getElementById("title-filter");
        this.clearFilter = $("#clear-filter");
        this.eventKind = $("#event-kind");
        this.eventKindDescription = $("#event-kind-description");
        this.submitButton = $("#listFormSubmit");
        this.clearButton = $("#clear-form");
    }
    /*------------------------------------------------------------------------------- */
    initParams() {
        const keys = AnimeListTimelineConfigKeys;
        const param = getJsonFromUrl();
        if (param[keys.userName]) {
            this.listField.val(param[keys.userName]);
        }
        if (param[keys.width]) {
            this.width.val(param[keys.width]);
        }
        if (param[keys.minDate]) {
            this.from.val(param[keys.minDate]);
        }
        if (param[keys.maxDate]) {
            this.to.val(param[keys.maxDate]);
        }
        if (param[keys.lang]) {
            this.language.val(param[keys.lang]);
        }
        if (param[keys.seasons]) {
            this.seasonsToggle[0].checked = "true" == param[keys.seasons];
        }
        if (param[keys.listKind]) {
            this.listKind.val(param[keys.listKind]);
        }
        if (param[keys.fontSize]) {
            this.fontSize.val(param[keys.fontSize]);
        }
    }
    /*------------------------------------------------------------------------------- */
    initFilterList() {
        const input = this;
        const ul = document.getElementById("filter-list");
        const awesomplete = new Awesomplete(input.titleFilter, {
            list: [],
            replace: function (suggestion) {
                this.input.value = "";
            },
            sort: false,
        });
        function unfilter(id, lang) {
            activeFilter.delete(id);
            // Move the item back into the dropdown
            filterList.push({ label: knownAnime.get(id).preferred(lang), value: id });
        }
        ;
        function addToFilter(data) {
            if (typeof data.value === "string") {
                const all = filterList.filter((elm) => elm.label.toLowerCase().includes(data.value.toLowerCase()));
                for (let it of all) {
                    addToFilter(it);
                }
            }
            else {
                const li = document.createElement("li");
                const x = document.createElement("button");
                const label = document.createElement("span");
                x.textContent = "X";
                x.classList.add("smallClose");
                x.classList.add("danger");
                x.dataID = data.value;
                label.textContent = data.label;
                li.appendChild(x);
                li.appendChild(label);
                ul.appendChild(li);
                //
                activeFilter.add(data.value);
                //
                x.addEventListener("click", function (e) {
                    const id = this.dataID;
                    const lang = input.language.val();
                    unfilter(id, lang);
                    // console.log(id);
                    // Remove the li
                    x.parentElement.remove();
                });
                // Move the item out of the dropdown
                const i = filterList.findIndex(x => x.value === data.value);
                filterList.splice(i, 1);
            }
        }
        input.titleFilter.addEventListener("awesomplete-selectcomplete", function (e) {
            const data = e.text;
            console.log(e.text);
            // console.log(text) 
            //
            addToFilter(data);
        });
        addEventListener("input", (event) => {
            const inputText = event.target.value.trim();
            const all = { label: `All "${inputText}"`, value: inputText };
            awesomplete.list = [all].concat(filterList);
        });
        // input.titleFilter.addEventListener("keydown", function(event){
        //     if (event.key== "Enter"){
        //         console.log("filter::enter", new Date())
        //     }
        // });
        //
        function clearFilter() {
            // console.log("clear filter called")
            const lang = input.language.val();
            const ul = document.getElementById("filter-list");
            ul.textContent = '';
            const filter = Array.from(activeFilter);
            for (let id of filter) {
                unfilter(id, lang);
            }
        }
        ;
        input.clearFilter.on("click", clearFilter);
        // Start disabled until data is loaded
        input.titleFilter.disabled = true;
    }
    /*------------------------------------------------------------------------------- */
    initListeners() {
        const input = this;
        // The clear filter button is in hte middle of the form.
        // The browser would love to activate it for us whenever we press enter.
        // But I wouldn't love that. 
        // Also entering a username and submitting before setting dates was a bad experience.
        // Let's try preventing it from happening.
        // https://stackoverflow.com/a/1977126/1993919
        //
        // BUT, it seems a workaround without an event listener is to just put a hidden button first in the form.
        if (false) {
            $(document).on("keydown", "form", function (event) {
                const entered = event.key == "Enter";
                const shouldIgnore = event.target.type !== "date";
                if (entered && shouldIgnore) {
                    console.log("prevented enter submit");
                    return false;
                }
                return true;
            });
        }
        //
        //
        //
        function showMediaKinds(kind) {
            switch (kind) {
                case "ANIME":
                    input.animeFormat.show();
                    input.mangaFormat.hide();
                    break;
                case "MANGA":
                    input.animeFormat.hide();
                    input.mangaFormat.show();
                    break;
                default:
                    console.error("Unexpected list-kind:", kind);
            }
        }
        ;
        showMediaKinds(input.listKind.val());
        input.listKind.on("change", function (e) {
            if (input.advancedToggle[0].checked) {
                showMediaKinds(e.target.value);
            }
        });
        //
        //
        //
        function describeEvent() {
            const event = input.eventKind.val();
            input.eventKindDescription.text(ATL.EventPreferenceDescriptions[event]);
        }
        describeEvent();
        // There's no way to trigger except for when the value changes???
        // Would be nice to show info while picking / highlighting an option.
        // Saw hacky solutions for mouse hover, but keyboard was left out :(
        input.eventKind.on("change", (e) => {
            // console.debug(e);
            describeEvent();
        });
        //
        // FocusYear
        //
        // Use jquery-ui for negative step
        input.focusYear.spinner({
            step: -1,
        });
        // Default focus to be cleared. No state to be preserved.
        input.focusYear.val("");
        // Center to and from around this year
        function setFocusYear(value) {
            const y = parseInt(value);
            // console.debug("Year Focus:", y)
            const y0 = (y - 1).toString();
            const y1 = (y + 1).toString();
            if (input.padFocusToggle[0].checked) {
                input.from.val(`${y0}-12-01`);
                input.to.val(`${y1}-02-01`);
            }
            else {
                input.from.val(`${y}-01-01`);
                input.to.val(`${y}-12-31`);
            }
        }
        input.focusYear.on("spin", function (event, ui) {
            if (ui.value < 1990) {
                this.value = new Date().getFullYear().toString();
                setFocusYear(this.value);
                return false;
            }
            setFocusYear(ui.value);
        });
        // Snap to the current year when first focused
        input.focusYear.on("click", function (e) {
            if (this.value.length != 4) {
                this.value = new Date().getFullYear().toString();
                setFocusYear(this.value);
            }
        });
        // Invalidate focus if dates are otherwise modified
        input.to.on("change", function (e) {
            input.focusYear.val("");
        });
        input.from.on("change", function (e) {
            input.focusYear.val("");
        });
        //
        // Last n
        //
        function enableLastN(value) {
            input.from.prop('disabled', value);
            input.lastN.prop('disabled', !value);
            input.padFocusToggle.prop('disabled', value);
            if (value) {
                input.focusYear.spinner("disable");
            }
            else {
                input.focusYear.spinner("enable");
            }
        }
        input.lastNToggle.on("change", function (e) {
            // console.log(this.checked);
            enableLastN(this.checked);
        });
        //
        function heatClick(d0, d1) {
            input.from[0].valueAsDate = d0;
            input.to[0].valueAsDate = d1;
        }
        input.heatmapSelect.prop("disabled", true);
        input.heatmapSelect.on("change", () => {
            const value = input.heatmapSelect.val();
            console.log(`Focusing heatmap on ${value}`);
            const container = document.getElementById("heatmap-container");
            container.replaceChildren();
            if (value == "@hide") {
                return;
            }
            const config = {
                userName: value,
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
            };
            const fullList = userAnimeCache.get(value);
            let allTime = new ATL.AnimeListTimeline(fullList, config);
            let heat = new Heat.WatchHeatMap(allTime, heatClick);
            container.append(heat.render());
        });
        //
        // Width
        //
        // Use jquery-ui to make number input with steps that aren't validated
        input.width.spinner({
            step: 100,
        });
        //
        function widthChange() {
            const slider = input.widthSlider[0];
            let val = parseInt(slider.value) / 100 * input.widthSlider.width();
            val = Math.ceil(val);
            // $("#width-disp").text(val);
            input.width.val(val);
        }
        input.widthSlider.on("change", widthChange);
        input.width.on("spin", function (event, ui) {
            const percentWidth = Math.floor(parseInt(ui.value) / input.widthSlider.width() * 100);
            input.widthSlider.val(percentWidth.toString());
        });
        function resetUI() {
            const percentWidth = Math.floor(parseInt(input.width.val()) / input.widthSlider.width() * 100);
            input.widthSlider.val(percentWidth.toString());
            enableLastN(input.lastNToggle[0].checked);
            input.listField.select();
        }
        //
        //
        //
        window.addEventListener('resize', function () {
            // console.log("width val: ", input.width.val())
            // console.log("width slider width: ", input.widthSlider.width())
            widthChange();
        });
        //
        //
        input.initFilterList();
        //buttons
        input.submitButton[0].addEventListener("click", listFormSubmit);
        input.clearButton.on("click", function () {
            input.inputForm[0].reset();
            resetUI();
        });
        //
        //
        //
        function hideAdvanced() {
            // console.log("Hide advanced.")
            $(".advanced").hide();
            input.lastNToggle[0].checked = true;
            enableLastN(true);
        }
        function showAdvanced() {
            // console.log("Show advanced.")
            $(".advanced").show();
            showMediaKinds(input.listKind.val());
        }
        function enableAdvanced(value) {
            if (value) {
                showAdvanced();
            }
            else {
                hideAdvanced();
            }
        }
        input.advancedToggle.on("change", function () {
            enableAdvanced(this.checked);
        });
        enableAdvanced(input.advancedToggle[0].checked);
        //
        resetUI();
    } // END initListeners
    /*------------------------------------------------------------------------------- */
    validateHTML() {
        const input = this;
        //
        for (let option of input.eventKind.children()) {
            const eventPreference = option.value;
            if (!Object.values(ATL.EventPreference).includes(eventPreference)) {
                console.error("Bad value property", option);
                alert("Bad HTML value");
            }
        }
    }
} // END InputForm
export const input = new InputForm();
function init() {
    if (usingTestData) {
        const warn = document.createElement("h1");
        warn.textContent = "Using test data !!!";
        warn.setAttribute("style", "color: red");
        document.getElementById("top").prepend(warn);
    }
    // 
    input.initParams();
    input.initListeners();
    input.validateHTML();
    //
    //
    const removeAll = document.getElementById("clearAllTimelines");
    removeAll.disabled = true;
    removeAll.addEventListener("click", clearAllTimelines);
    //
    if (location.hostname === "127.0.0.1") {
        const favicon = document.getElementById("favicon");
        favicon.href = "favicon_localhost.png";
    }
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
        console.warn("Using test data.");
        giveFeedback("Using test data");
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
                        format
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
        console.warn("Using test manga list data.");
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
                        format
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
function listFormSubmit(e) {
    // validate?
    const width = $("#width");
    // 
    beforeAjax().then();
    return;
}
// main II
// Form api requests and call
async function beforeAjax() {
    const username = $("#listName").val().trim();
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
                        reportBadUser(username);
                    }
                    else {
                        preparePlot(data);
                    }
                    return;
                }
                const aniList = await getAniList(username);
                debugData["aniList"] = aniList;
                if (aniList instanceof MAL.BadUsernameError) {
                    reportBadUser(username);
                    userAnimeCache.set(username, aniList);
                    return;
                }
                const animeList = MAL.animeListFromAniList(aniList, username);
                debugData["list"] = animeList;
                userAnimeCache.set(username, animeList);
                // Add new user to select
                if (input.heatmapSelect.val() == "") {
                    input.heatmapSelect.prop("disabled", false);
                    input.heatmapSelect.empty();
                    {
                        const userOpt = document.createElement("option");
                        userOpt.value = "@hide";
                        userOpt.textContent = "[HIDE]";
                        input.heatmapSelect.append(userOpt);
                    }
                }
                {
                    const userOpt = document.createElement("option");
                    userOpt.value = username;
                    userOpt.textContent = username;
                    input.heatmapSelect.append(userOpt);
                    input.heatmapSelect.val(username);
                    input.heatmapSelect.trigger("change");
                }
                for (let anime of animeList.anime) {
                    knownAnime.set(anime.myId, anime.seriesTitle);
                }
                fillFilterList();
                preparePlot(animeList);
            }
            break;
        case "MANGA":
            {
                const data = userMangaCache.get(username);
                if (data) {
                    console.info([username, "'s data loaded from cache."].join(""));
                    if (data instanceof MAL.BadUsernameError) {
                        reportBadUser(username);
                    }
                    else {
                        preparePlot(data);
                    }
                    return;
                }
                const aniList = await getMangaList(username);
                debugData["aniList"] = aniList;
                if (aniList instanceof MAL.BadUsernameError) {
                    reportBadUser(username);
                    userMangaCache.set(username, aniList);
                    return;
                }
                const mangaList = MAL.mangaListFromAniList(aniList, username);
                debugData["list"] = mangaList;
                userMangaCache.set(username, mangaList);
                preparePlot(mangaList);
            }
            break;
        default:
            console.error("Unexpected list-kind:", listKind);
    }
}
// main V
// Use doc to build timeline
function preparePlot(mal) {
    const listKind = input.listKind.val();
    let startDate = input.from.val().trim();
    let endDate = input.to.val().trim();
    let lastN = 0;
    if (input.lastNToggle[0].checked) {
        lastN = input.lastN.val();
        // Ignore start date if using lastN filter
        startDate = MAL.rawNullDate;
    }
    startDate = fixDate(startDate, -1);
    endDate = fixDate(endDate, 1);
    const widthStr = input.width.val().trim();
    const language = input.language.val();
    const username = input.listField.val().trim();
    const plotKind = document.querySelector('input[name="plot"]:checked').id;
    let width;
    if (isPositiveInteger(widthStr)) {
        width = parseInt(widthStr);
    }
    else { //default
        width = 1000;
    }
    const showSeasons = input.seasonsToggle[0].checked;
    const fontSize = input.fontSize.val();
    const includeFilter = input.filterKind.val() === "include";
    const filter = { include: includeFilter, entrySet: activeFilter };
    const eventPreference = input.eventKind.val();
    //
    const tlConfig = {
        userName: username,
        minDate: startDate,
        maxDate: endDate,
        lastN: lastN,
        lang: language,
        seasons: showSeasons,
        fontSize: fontSize,
        width: width,
        listKind: listKind,
        filter: filter,
        eventPreference: eventPreference,
    };
    const getVal = function (id) {
        const el = $(`#format-${id}`)[0];
        return el.checked;
    };
    switch (listKind) {
        case "ANIME":
            const aFormats = {
                tv: getVal("tv"),
                short: getVal("short"),
                movie: getVal("movie"),
                special: getVal("special"),
                ova: getVal("ova"),
                ona: getVal("ona"),
                music: getVal("music"),
            };
            tlConfig.animeFormat = aFormats;
            break;
        case "MANGA":
            const mFormats = {
                manga: getVal("manga"),
                novel: getVal("novel"),
                oneShot: getVal("one-shot")
            };
            tlConfig.mangaFormat = mFormats;
            break;
    }
    updateUri(tlConfig);
    if (plotKind === "timeline") {
        try {
            //global
            const tln = new AnimeListTimeline(mal, tlConfig); // can throw NoDatedAnimeError
            // This feels kinda wrong
            if (tlConfig.lastN) {
                // Update from date to match the filter of lastN
                tlConfig.minDate = tln.firstDate.fixedDateStr;
                updateUri(tlConfig);
                input.from.val(tlConfig.minDate);
            }
            debugData["lastAnimeTimeline"] = tln;
            displayTimeline(tlConfig, tln);
            return;
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
    }
    else {
        drawHoursWatched(tlConfig, mal);
    }
}
//
function sortByDuration(mediaList) {
    const val = (media) => media.seriesEpisodes * media.seriesEpisodesDuration;
    mediaList.sort((a, b) => val(a) - val(b));
}
export function dispDurations() {
    const list = debugData["list"].anime;
    sortByDuration(list);
    const nl = [];
    for (let media of list) {
        const mediaMin = media.seriesEpisodes * media.seriesEpisodesDuration;
        if (media.myStatus == MAL.Status.Completed)
            nl.push([mediaMin, media.seriesTitle.preferredEnglish()]);
    }
    return nl;
}
function calculateStats(otln, listKind) {
    let tln;
    { // dumb hacky way to make sure stats work despite the way displayed events are filtered
        const config = Object.assign({}, otln.config);
        config.eventPreference = ATL.EventPreference.all;
        config.lastN = undefined;
        config.maxDate = otln.lastDate.fixedDateStr;
        tln = new AnimeListTimeline(otln.mal, config);
    }
    const elapsedDays = daysBetween(tln.firstDate.date, tln.lastDate.date);
    //
    let boundedMinutes = null;
    if (ATL.isAnimeList(tln.boundedSet, listKind)) {
        boundedMinutes = 0;
        for (let media of tln.boundedSet) {
            if (media.seriesEpisodes && media.seriesEpisodesDuration) {
                const mediaMin = media.seriesEpisodes * media.seriesEpisodesDuration;
                boundedMinutes += mediaMin;
            }
        }
    }
    //
    const milestones = [];
    const finishedAnime = [];
    for (let anime of tln.mediaSet) {
        if (!anime.myFinishDate.isNullDate()) {
            finishedAnime.push(anime);
        }
    }
    finishedAnime.sort((a, b) => a.myFinishDate.fixedDateStr.localeCompare(b.myFinishDate.fixedDateStr));
    function pushit(i) {
        const anime = finishedAnime[i - 1];
        milestones.push([i, anime.seriesTitle.preferred(tln.config.lang), anime.myFinishDate.fixedDateStr]);
    }
    ;
    if (finishedAnime.length >= 1) {
        pushit(1);
    }
    if (finishedAnime.length >= 5) {
        pushit(5);
    }
    if (finishedAnime.length >= 10) {
        pushit(10);
    }
    for (let i = 25; i <= finishedAnime.length; i += 25) {
        pushit(i);
    }
    //
    return {
        boundedCount: tln.boundedSet.length,
        totalCount: tln.mediaSet.length,
        elapsedDays: elapsedDays,
        boundedMinutes: boundedMinutes,
        milestones: milestones,
    };
}
function statsElement(listKind, stats) {
    const statsDetails = document.createElement("details");
    const statsSummary = document.createElement("summary");
    statsDetails.appendChild(statsSummary);
    statsSummary.textContent = "Stats";
    const statsDiv = document.createElement("div");
    statsDetails.appendChild(statsDiv);
    const statsList = document.createElement("ul");
    statsDiv.appendChild(statsList);
    let statsLi = document.createElement("li");
    statsList.appendChild(statsLi);
    statsLi.textContent = `${stats.totalCount} titles seen`;
    statsLi = document.createElement("li");
    statsList.appendChild(statsLi);
    statsLi.textContent = `${stats.boundedCount} titles completed`;
    statsLi = document.createElement("li");
    statsList.appendChild(statsLi);
    statsLi.textContent = `${stats.elapsedDays} days elapsed`;
    if (stats.boundedMinutes) {
        statsLi = document.createElement("li");
        statsList.appendChild(statsLi);
        statsLi.textContent = `${minutesToString(stats.boundedMinutes)} watched`;
    }
    //
    const milestoneDiv = document.createElement("div");
    statsDetails.appendChild(milestoneDiv);
    const milestoneLabel = document.createElement("p");
    milestoneDiv.appendChild(milestoneLabel);
    milestoneLabel.textContent = `Anime milestones since ${stats.milestones[0][2]}`;
    const milestoneList = document.createElement("ul");
    milestoneDiv.appendChild(milestoneList);
    milestoneList.classList.add("nlist");
    for (let it of stats.milestones) {
        const itDiv = document.createElement("li");
        milestoneList.appendChild(itDiv);
        // itDiv.value = it[0];
        // itDiv.textContent = `${it[2]}: Finished ${it[1]}`;
        const itLabel = document.createElement("span");
        itDiv.appendChild(itLabel);
        itLabel.classList.add("nlist-label");
        itLabel.textContent = `${it[0]}. `;
        const itTxt = document.createElement("span");
        itDiv.appendChild(itTxt);
        itTxt.textContent = `${it[2]}: Finished ${it[1]}`;
    }
    //
    return statsDetails;
}
// ██████╗ ██████╗  █████╗ ██╗    ██╗
// ██╔══██╗██╔══██╗██╔══██╗██║    ██║
// ██║  ██║██████╔╝███████║██║ █╗ ██║
// ██║  ██║██╔══██╗██╔══██║██║███╗██║
// ██████╔╝██║  ██║██║  ██║╚███╔███╔╝
// ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝ ╚══╝╚══╝ 
// main VI
// write the timeline to the document
// pre: tln is a valid AnimeListTimeline object
function displayTimeline(tlConfig, tln) {
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
    //Always add new timeline on top
    const tlArea = document.createElement("div");
    $("#tls").prepend(tlArea);
    // Label
    const label = document.createElement("h3");
    // I don't think this is an xss risk? 
    label.textContent = `${tlConfig.userName}'s ${tlConfig.listKind.toLowerCase()} list`;
    //make buttons
    const removeButton = document.createElement("button");
    removeButton.textContent = "X";
    removeButton.classList.add("danger");
    removeButton.setAttribute("title", "Remove timeline from the page");
    removeButton.addEventListener("click", removeTl);
    const svgButton = document.createElement("button");
    svgButton.textContent = "Save SVG";
    svgButton.setAttribute("title", "Save as svg");
    svgButton.addEventListener("click", exportTimeline);
    svgButton.kind = exportType.Svg;
    const pngButton = document.createElement("button");
    pngButton.textContent = "Save PNG";
    pngButton.setAttribute("title", "Save as PNG image");
    pngButton.addEventListener("click", exportTimeline);
    pngButton.kind = exportType.Png;
    const jsonButton = document.createElement("button");
    jsonButton.textContent = "Save JSON";
    jsonButton.setAttribute("title", "Debug: Save tln json");
    jsonButton.addEventListener("click", exportTimeline);
    jsonButton.kind = exportType.Json;
    //make list
    const controls = document.createElement("ul");
    controls.className = "buttonList";
    controls.appendChild(wrapListItem(pngButton));
    controls.appendChild(wrapListItem(svgButton));
    if (debug) {
        controls.appendChild(wrapListItem(jsonButton));
    }
    controls.appendChild(wrapListItem(removeButton));
    // stats
    const stats = calculateStats(tln, tlConfig.listKind);
    const statsDetails = statsElement(tlConfig.listKind, stats);
    //make timeline container
    const tl = document.createElement("div");
    tl.className = "timeline";
    tl.id = "tl_" + timelineCount;
    timelineCount++;
    tl.meta = tln;
    // add to dom
    tlArea.appendChild(label);
    tlArea.appendChild(controls);
    tlArea.appendChild(tl);
    tlArea.appendChild(statsDetails);
    //make timeline after it has a valid anchor in the doc
    // console.time()
    const svg = new Timeline(tln.data, tl.id);
    svg.build();
    // console.timeEnd()
    const removeAll = document.getElementById("clearAllTimelines");
    removeAll.disabled = false;
    debugData["lastTimelineSvg"] = svg;
}
// ***
// End main chain
// ***
function drawHoursWatched(tlConfig, mal) {
    const dateFormat = (date) => strftime.utc()("%Y-%m-%d", date);
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 500; // Uhhhh
    const tlArea = document.createElement("div");
    const label = document.createElement("h3");
    label.textContent = `${tlConfig.userName}'s hours watched`;
    const removeButton = document.createElement("button");
    removeButton.textContent = "X";
    removeButton.classList.add("danger");
    removeButton.setAttribute("title", "Remove graph from the page");
    removeButton.addEventListener("click", removeTl);
    const controls = document.createElement("ul");
    controls.className = "buttonList";
    controls.appendChild(wrapListItem(removeButton));
    tlArea.appendChild(label);
    tlArea.appendChild(controls);
    tlArea.appendChild(canvas);
    document.getElementById("tls").prepend(tlArea);
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
        const before = new Date(entry.myStartDate.date);
        const after = new Date(entry.myFinishDate.date);
        before.setDate(before.getDate() - 1);
        after.setDate(after.getDate() + 1);
        dateSet.add(dateFormat(before));
        // dateSet.add(dateFormat(after));
    }
    anime.sort((a, b) => a.myStartDate.fixedDateStr.localeCompare(b.myStartDate.fixedDateStr));
    const dates = Array.from(dateSet);
    dates.sort(); // Probably fine on date strings
    // const watchTime:number[] = [];
    const watchTime = new Map();
    for (let d of dates) {
        // watchTime.push(0);
        watchTime.set(d, 0);
    }
    // Dump all the minutes into the start day
    // for (let entry of anime) {
    //     const duration = entry.seriesEpisodes * entry.seriesEpisodesDuration;
    //     watchTime.set(entry.myStartDate.fixedDateStr, watchTime.get(entry.myStartDate.fixedDateStr) + duration);
    // }
    // Average out time by day?
    for (let entry of anime) {
        const duration = entry.seriesEpisodes * entry.seriesEpisodesDuration;
        // let entryDays = daysBetween(entry.myStartDate.date, entry.myFinishDate.date);
        let entryDays = daysBetween(entry.myStartDate.date, entry.myFinishDate.date) + 1;
        // if (entryDays < 1) entryDays = 1;
        const minPerDay = duration / entryDays;
        // let prevDay = entry.myStartDate.fixedDateStr;
        let prevDay = dates[0];
        let deb = false;
        const debugName = entry.seriesTitle.preferredEnglish();
        if (debugName === "Steins;Gate") {
            // console.debug(debugName);
            // console.debug("start: ", entry.myStartDate.fixedDateStr)
            // console.debug("finish:", entry.myFinishDate.fixedDateStr)
            deb = true;
        }
        // const sortedKeys = Array.from(watchTime.keys()).sort();
        if (entry.myStartDate.fixedDateStr === entry.myFinishDate.fixedDateStr) {
            const value = duration / 60;
            updateKey(watchTime, entry.myFinishDate.fixedDateStr, value);
        }
        else
            for (let keyDate of dates) {
                if (entry.myStartDate.compare(keyDate) > 0) {
                    prevDay = keyDate;
                    continue;
                }
                else if (entry.myFinishDate.compare(keyDate) < 0) {
                    break;
                }
                // let days = daysBetween(prevDay, keyDate) + 1;
                let days = daysBetween(prevDay, keyDate);
                if (deb) {
                    // console.debug("Prev:", prevDay)
                    // console.debug("now: ", keyDate)
                    // console.debug("change:", days)
                }
                let value = 0;
                if (days != 0) {
                    value = minPerDay / 60;
                    // value = days * minPerDay / 60;
                    // value = days / entryDays * minPerDay / 60;
                    // value = entryDays / days * minPerDay / 60;
                }
                updateKey(watchTime, keyDate, value);
                prevDay = keyDate;
            }
    }
    let chartData = [];
    const sortedEntries = Array.from(watchTime.entries());
    sortedEntries.sort((a, b) => a[0].localeCompare(b[0]));
    for (let i = 0; i < sortedEntries.length; ++i) {
        const [date, mins] = sortedEntries[i];
        const t = new Date(date);
        t.setMinutes(t.getMinutes() + t.getTimezoneOffset());
        chartData.push({ t: t, y: mins });
        const t2 = new Date(t);
        t2.setHours(t2.getHours() + 23);
        chartData.push({ t: t2, y: mins });
        if (i < sortedEntries.length - 1) {
            // const dayAfter = new Date(date);
            // dayAfter.setDate(dayAfter.getDate() + 1);
            const next = sortedEntries[i + 1];
            // if (next[0] !== dateFormat(dayAfter)) {
            //     chartData.push({ t: dayAfter, y: next[1] });
            // }
            const t3 = new Date(t2);
            t3.setMinutes(t3.getMinutes() + 30);
            chartData.push({ t: t3, y: next[1] });
        }
    }
    // chartData = [{t: new Date("2016-01-01"), y:1},{t: new Date("2016-01-02"), y:0},{t: new Date("2016-01-03"), y:2},]
    // const maxDay = [...watchTime.entries()]
    //     .reduce((a, e) => e[1] > a[1] ? e : a);
    // console.log(maxDay);
    const chart = new Chart(canvas, {
        type: 'line',
        // label: 'Watch time',
        data: {
            datasets: [{
                    label: 'Anime',
                    data: chartData,
                    lineTension: 0,
                    pointRadius: 0,
                }]
        },
        options: {
            scales: {
                xAxes: [{
                        type: 'time',
                        time: {
                            minUnit: 'day',
                            // parser: function (date: Date) {
                            //     return new Date(date).setMinutes(date.getMinutes() + date.getTimezoneOffset());
                            // }
                        },
                        ticks: {
                            min: $("#from").val(),
                            max: $("#to").val(),
                        },
                    }],
                yAxes: [{
                        ticks: {
                        // max: 18,
                        }
                    }],
            },
            tooltips: {
                intersect: false,
                callbacks: {
                    title: function (tooltipItem, data) {
                        const index = tooltipItem[0].index;
                        const point = data.datasets[0].data[index];
                        const date = point.t || point.x;
                        return date.toDateString();
                    },
                    label: function (tooltipItem, data) {
                        let label = data.datasets[tooltipItem.datasetIndex].label || '';
                        if (label) {
                            label += ': ';
                        }
                        // label += Math.round(tooltipItem.yLabel * 100) / 100;
                        label += minutesToString(tooltipItem.yLabel * 60);
                        return label;
                    },
                },
            },
        }
    });
    console.log("made plot?");
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
    input.listField.select();
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
export function savePNG(elm, filename, transparent = false) {
    const svgdata = new XMLSerializer().serializeToString(elm);
    {
        // See https://github.com/Linkviii/js-animelist-timeline/issues/3
        const img = document.createElement("img");
        img.setAttribute("src", "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgdata))));
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const svgSize = elm.getBoundingClientRect();
        // With 8pt font, at 1x scale the text is blurry 
        const scale = 2;
        canvas.width = svgSize.width * scale;
        canvas.height = svgSize.height * scale;
        if (!transparent) {
            ctx.fillStyle = "white";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        img.onload = function () {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            canvas.toBlob(function (blob) {
                saveAs(blob, filename);
            });
        };
    }
}
export function saveSVG(elm, filename) {
    const svgdata = new XMLSerializer().serializeToString(elm);
    const blob = new Blob([svgdata], { type: "image/svg+xml" });
    saveAs(blob, filename);
}
// "P" | "S" button
function exportTimeline() {
    //div = ../../.. → div {ul, div#tl_}
    //svg = div/div#tl_/svg
    const div = this.parentElement.parentElement.parentElement;
    const container = div.getElementsByClassName("timeline")[0];
    const svg = container.firstElementChild;
    const fileName = container.meta.getDescriptor();
    switch (this.kind) {
        //
        case exportType.Png:
            savePNG(svg, fileName + ".png");
            break;
        //
        case exportType.Svg:
            saveSVG(svg, fileName + ".svg");
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
export function wrapListItem(elm) {
    const li = document.createElement("li");
    li.appendChild(elm);
    return li;
}
export function minutesToString(min) {
    min = Math.round(min);
    let h = Math.floor(min / 60);
    const d = Math.floor(h / 24);
    h = h % 24;
    const m = min % 60;
    if (h > 0 || d > 0) {
        if (d > 0)
            return `${d}D ${h}H ${m}M`;
        else
            return `${h}H ${m}M`;
    }
    return `${m} minutes`;
}
export function updateKey(map, key, value) {
    map.set(key, map.get(key) + value);
}
export function daysBetween(first, second) {
    if (typeof first === 'string') {
        first = new Date(first);
    }
    if (typeof second === 'string') {
        second = new Date(second);
    }
    // Take the difference between the dates and divide by milliseconds per day.
    // Round to nearest whole number to deal with DST.
    const diff = (second.valueOf() - first.valueOf());
    const milliInDay = (1000 * 60 * 60 * 24);
    return Math.abs(Math.round(diff / milliInDay));
}
//
// Data cleaning
//
// I don't remember why I wanted this, but I might of had a good reason.
// Could probably find this on SO
/**
 * Returns if the string represents a non negative integer.
 * @param str
 * @returns {boolean}
 */
export function isNormalInteger(str) {
    const n = ~~Number(str);
    return (String(n) === str) && (n >= 0);
}
/**
 * Returns if the string represents a non negative integer.
 * @param str
 * @returns {boolean}
 */
export function isPositiveInteger(str) {
    const n = ~~Number(str);
    return (String(n) === str) && (n > 0);
}
//make user input suitable for anime timeline
/**
 * Clamps date into a useful value
 * @param date May be rawNullDate
 * @param minmax -1: clamp min; 1 clamp max
 * @returns YYYY-MM-DD str
 */
export function fixDate(date, minmax) {
    const minYear = 1980; //Nerds can change this in the future
    const maxYear = 2030; //For now its sane
    const test = dateRegex.test(date);
    if (!test) {
        // Maybe should return or throw an error?
        if (null !== date && "" !== date)
            console.error("Unexpected date format from:", date);
        // Pretend all invalid input is equivalent to null date
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
export function getJsonFromUrl(hashBased) {
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
export function replaceQueryParam(param, newval, search) {
    // Could default but probably not intended.
    //search = search || window.location.search;
    const regex = new RegExp("([?;&])" + param + "[^&;]*[;&]?");
    const query = search.replace(regex, "$1").replace(/&$/, '');
    return (query.length > 2 ? query + "&" : "?") + (newval ? param + "=" + newval : '');
}
export function updateUri(param) {
    // Why were these read from dom instead of `param`?
    // Was it because param squeezes the dates? (Does it?)
    let startDate = input.from.val().trim();
    if (startDate === "") {
        startDate = "";
    }
    let endDate = input.to.val().trim();
    if (endDate === "") {
        endDate = "";
    }
    const kind = input.listKind.val();
    const keys = AnimeListTimelineConfigKeys;
    let str = window.location.search;
    str = replaceQueryParam(keys.userName, param.userName, str);
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
// stuff
//
//
// Logo
//
/**
 * Create a simple logo timeline.
 * I'm choosing to save this to a file and load that file instead of calling this.
 */
export function createLogo() {
    const dates = [
        "2020-01-01",
        "2020-01-04",
        "2020-01-09",
    ];
    const logoData = {
        apiVersion: 2,
        width: 300,
        fontSize: 15,
        // Don't show dates
        tickFormat: " ",
        callouts: [
            { backgroundColor: "transparent", date: dates[0], description: "Anime", color: ATL.startColor1, },
            { backgroundColor: "transparent", date: dates[1], description: "List", color: ATL.bingeColor, },
            { backgroundColor: "transparent", date: dates[2], description: "Timeline", color: ATL.endColor },
        ],
        startDate: dates[0],
        endDate: dates[2],
    };
    const logoTimeline = new Timeline(logoData, "logo");
    logoTimeline.build();
}
//
// test(ing) stuff
//
//# sourceMappingURL=main.js.map