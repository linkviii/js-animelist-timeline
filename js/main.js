/**
 * MIT licenced
 *
 * v0.1.1
 * 2017-04-06
 */
define(["require", "exports", "./src/animelistTL", "./src/animelistTL", "./src/MAL", "./lib/timeline", "jquery", "./lib/FileSaver"], function (require, exports, animelistTL_1, animelistTL_2, MAL, timeline_1, $, FileSaver) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    console.info("init FileSaver???");
    console.info(FileSaver);
    console.info(saveAs);
    //
    // Global data
    //
    exports.usingTestData = false;
    // export const usingTestData: boolean = true
    const testData = "res/malappinfo.xml";
    const siteUrl = "https://linkviii.github.io/js-animelist-timeline/";
    const repoUrl = "https://github.com/linkviii/js-animelist-timeline";
    const issueUrl = "https://github.com/linkviii/js-animelist-timeline/issues";
    const dateRegex = /^\d\d\d\d[\-\/.]\d\d[\-\/\.]\d\d$|^\d\d\d\d\d\d\d\d$/;
    const userCache = new Map();
    let timelineCount = 0;
    // global for ease of testing. Used as globals.
    let uname;
    let tln;
    //
    // Page load
    //
    function init() {
        // form fields
        const param = getJsonFromUrl();
        const listField = $("#listName");
        listField.select();
        if (param["uname"]) {
            listField.val(param["uname"]);
        }
        if (param["width"]) {
            $("#width").val(param["width"]);
        }
        if (param["minDate"]) {
            $("#from").val(param["minDate"]);
        }
        if (param["maxDate"]) {
            $("#to").val(param["maxDate"]);
        }
        //buttons
        $("#listFormSubmit")[0].addEventListener("click", listFormSubmit);
        const removeAll = document.getElementById("clearAllTimelines");
        removeAll.disabled = true;
        removeAll.addEventListener("click", clearAllTimelines);
    }
    $(document).ready(init);
    //
    // main chain
    //
    // main I
    // Entry point from html form
    function listFormSubmit() {
        beforeAjax();
        return;
    }
    // main II
    // Form api requests and call
    function beforeAjax() {
        uname = $("#listName").val().trim();
        if (exports.usingTestData) {
            console.info("Using test data");
            let doc = loadTestData(testData); //ajax
            afterAjax(doc);
            return;
        }
        if (uname == "") {
            reportNoUser();
            return;
        }
        // check cache for name
        // to skip ajax
        const data = userCache.get(uname);
        if (data) {
            console.info([uname, "'s data loaded from cache."].join(""));
            if (data instanceof MAL.AnimeList) {
                prepareTimeline(data);
            }
            else {
                reportBadUser();
            }
            return;
        }
        const malUrl = getMalApiUrl(uname);
        //document.getElementById("inputOut").innerHTML = malUrl;//debug
        const yqlURL = getYqlUrl(malUrl);
        $.getJSON(yqlURL, ajaxData);
    }
    // main III
    // Transform yql response into an xml document
    function ajaxData(data) {
        const thing = $.parseXML(data.results[0]);
        afterAjax(thing);
    }
    // main IV
    // Wrapper to handle errors in MAL response.
    // Currently only a bad username is expected
    function afterAjax(doc) {
        let mal;
        try {
            mal = new MAL.AnimeList(doc); // can throw BadUsernameError
            userCache.set(uname, mal);
        }
        catch (err) {
            if (err instanceof MAL.BadUsernameError) {
                userCache.set(uname, err);
                reportBadUser();
                return;
            }
            else {
                throw err;
            }
        }
        prepareTimeline(mal);
    }
    // main V
    // Use doc to build timeline
    function prepareTimeline(mal) {
        let startDate = $("#from").val().trim();
        let endDate = $("#to").val().trim();
        startDate = fixDate(startDate, -1);
        endDate = fixDate(endDate, 1);
        const widthStr = $("#width").val().trim();
        let width;
        if (isNormalInteger(widthStr)) {
            width = parseInt(widthStr);
        }
        else {
            width = 1000;
        }
        const tlConfig = {
            width: width, minDate: startDate, maxDate: endDate
        };
        updateUri(tlConfig);
        try {
            //global
            tln = new animelistTL_1.AnimeListTimeline(mal, tlConfig); // can throw NoDatedAnimeError
        }
        catch (err) {
            if (err instanceof animelistTL_2.NoDatedAnimeError) {
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
        //make list
        const controls = document.createElement("ul");
        controls.className = "buttonList";
        controls.appendChild(wrapListItem(removeButton));
        controls.appendChild(wrapListItem(svgButton));
        controls.appendChild(wrapListItem(pngButton));
        //make timeline container
        const tl = document.createElement("div");
        tl.className = "timeline";
        tl.id = "tl_" + timelineCount;
        timelineCount++;
        tl.meta = [uname, tln.firstDate.rawDateStr, tln.lastDate.rawDateStr];
        // add to dom
        tlArea.appendChild(controls);
        tlArea.appendChild(tl);
        //make timeline after it has a valid anchor in the doc
        const svg = new timeline_1.Timeline(tln.data, tl.id);
        svg.build();
        const removeAll = document.getElementById("clearAllTimelines");
        removeAll.disabled = false;
    }
    // ***
    // End main chain
    // ***
    //
    // feedback
    //
    function reportNoUser() {
        usernameFeedback("No username given.");
    }
    function reportBadUser() {
        usernameFeedback(uname + " is not a valid MAL username.");
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
    })(exportType || (exportType = {}));
    class MyButton extends HTMLButtonElement {
    }
    class MyContainer extends HTMLDivElement {
    }
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
        const fileName = container.meta.join("_");
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
            //
            default: {
                console.error("unhandled export case");
            }
        }
    }
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
    //make user input suitible for anime timeline
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
            else
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
        let startDate = $("#from").val().trim();
        if (startDate == "") {
            startDate = "";
        }
        let endDate = $("#to").val().trim();
        if (endDate == "") {
            endDate = "";
        }
        let str = window.location.search;
        str = replaceQueryParam("uname", uname, str);
        str = replaceQueryParam("width", param.width.toString(), str);
        str = replaceQueryParam("minDate", startDate, str);
        str = replaceQueryParam("maxDate", endDate, str);
        window.history.replaceState(null, null, str);
    }
    //
    // API urls
    //
    /**
     * Forms MAL API URL based on username.
     * @param name
     * @returns {string}
     */
    function getMalApiUrl(name) {
        const malUrlBase = "http://myanimelist.net/malappinfo.php?u=";
        const malUrlFilter = "&status=all&type=anime";
        return malUrlBase + name + malUrlFilter;
    }
    /**
     * Forms YQL URL based on MAL URL.
     * YQL is used to proxy the xml request as json.
     * @param malUrl
     * @returns {string}
     */
    function getYqlUrl(malUrl) {
        const yqlUrlBase = "https://query.yahooapis.com/v1/public/yql";
        const q = "?q=";
        const query = "select * from xml where url='" + malUrl + "'";
        const encodedQuery = encodeURIComponent(query);
        const yqlUrlFilter = "&format=xml&callback=?";
        const yqlUrl = [yqlUrlBase, q, encodedQuery, yqlUrlFilter].join("");
        return yqlUrl;
    }
    //
    // test(ing) stuff
    //
    // load xml not async
    function loadTestData(url) {
        return (function () {
            let xml = null;
            $.ajax({
                async: false,
                crossDomain: true,
                global: false,
                url: url,
                dataType: "xml",
                success: function (data) {
                    xml = data;
                }
            });
            return xml;
        })();
    }
});
//# sourceMappingURL=main.js.map