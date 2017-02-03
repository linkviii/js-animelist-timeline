/**
 * MIT licenced
 */
//import animelistTL.ts
//import MAL.ts //rawNullDate
//import jquery
//
const usingTestData: boolean = false;
//const usingTestData = true;
const testData = "res/malappinfo.xml";
// main data
const dateRegex = /^\d\d\d\d[\-\/\.]\d\d[\-\/\.]\d\d$|^\d\d\d\d\d\d\d\d$/;
//const dateRegex = /\d\d\d\d\d\d\d\d/;
const userCache = new Map();
let timelineCount = 0;
// global for testing
let uname;
let tln;
// end main data
function initFields() {
    const param = getJsonFromUrl();
    if (param["uname"]) {
        $("#listName").val(param["uname"]);
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
}
$(document).ready(initFields);
//Remove all button
function clearAllTimelines() {
    $("#tls").empty();
}
// main I
// Entry point from html form
function listFormSubmit() {
    // yqlTest()
    beforeAjax();
    return;
}
// main II
// Form api requests and call
function beforeAjax() {
    if (usingTestData) {
        console.info("Using test data");
        let doc = loadTestData(testData); //ajax
        afterAjax(doc);
        return;
    }
    uname = $("#listName").val().trim();
    // check cache for name
    // to skip ajax
    const data = userCache.get(uname);
    if (data) {
        console.info([uname, "'s data loaded from cache."].join(""));
        if (data instanceof MALAnimeList) {
            prepareTimeline(data);
        }
        else {
            respondToBadUser();
        }
        return;
    }
    const malUrl = getApiUrl(uname);
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
        mal = new MALAnimeList(doc); // can throw BadUsernameError
        userCache.set(uname, mal);
    }
    catch (err) {
        if (err instanceof BadUsernameError) {
            userCache.set(uname, err);
            respondToBadUser();
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
        tln = new AnimeListTimeline(mal, tlConfig); // can throw NoDatedAnimeError
    }
    catch (err) {
        if (err instanceof NoDatedAnimeError) {
            alert("None of the anime in the list contained watched dates.");
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
     div #tls
     ``div
     ````ul buttonlist
     ``````li ``button
     ````div #tl_*
     ``````svg
     */
    //Allways add new timeline on top
    const tlArea = document.createElement("div");
    $("#tls").prepend(tlArea);
    //make buttons
    const removeButton = document.createElement("button");
    const removeText = document.createTextNode("X");
    removeButton.appendChild(removeText);
    removeButton.addEventListener("click", removeTl);
    //TODO implement and enable
    const svgButton = document.createElement("button");
    const svgText = document.createTextNode("S");
    svgButton.appendChild(svgText);
    svgButton.addEventListener("click", exportSvg);
    svgButton.disabled = true;
    const pngButton = document.createElement("button");
    const pngText = document.createTextNode("P");
    pngButton.appendChild(pngText);
    pngButton.addEventListener("click", exportPng);
    pngButton.disabled = true;
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
    // add to doc
    tlArea.appendChild(controls);
    tlArea.appendChild(tl);
    //make timeline after it has a valid anchor in the doc
    const svg = new Timeline(tln.data, tl.id);
    svg.build();
}
// End main chain
function respondToBadUser() {
    alert(uname + " is not a valid MAL username.");
}
function wrapListItem(elm) {
    const li = document.createElement("li");
    li.appendChild(elm);
    return li;
}
//listener
function removeTl() {
    //rm ../../.. → div#tl_
    this.parentElement.parentElement.parentElement.remove();
}
function exportSvg() {
    console.error("Not implemented");
}
function exportPng() {
    console.error("Not implemented");
}
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
// Util
/**
 * Forms MAL API URL based on username.
 * @param name
 * @returns {string}
 */
function getApiUrl(name) {
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
//make user input suitible for anime timeline
//must not be null
function fixDate(date, minmax) {
    const minYear = 1980; //Nerds can change this in the future
    const maxYear = 2030; //For now its sane
    const test = dateRegex.test(date);
    if (!test) {
        date = rawNullDate;
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
/**
 * Returns if the string represents a non negative integer.
 * @param str
 * @returns {boolean}
 */
function isNormalInteger(str) {
    const n = ~~Number(str);
    return (String(n) === str) && (n >= 0);
}
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
/*
 function yqlTest() {
 //http://stackoverflow.com/questions/24377804/cross-domain-jsonp-xml-response/24399484#24399484
 // find some demo xml - DuckDuckGo is great for this
 var xmlSource = "http://api.duckduckgo.com/?q=StackOverflow&format=xml"

 // build the yql query. Could be just a string - I think join makes easier reading
 var yqlURL = [
 "http://query.yahooapis.com/v1/public/yql",
 "?q=", encodeURIComponent("select * from xml where url='" + xmlSource + "'"),
 "&format=xml&callback=?"
 ].join("");


 // let xmlContent;
 // console.log("before")
 $.getJSON(yqlURL, yqlTestAfter);
 // console.log("after")
 // console.log(xmlContent)

 }

 function yqlTestAfter(data) {
 console.log("in ajax");
 console.log(data)

 console.log(data.results[0])

 console.log($.parseXML(data.results[0]))

 var xmlContent = $(data.results[0]);
 console.log(xmlContent)
 console.log(xmlContent[0])

 var Abstract = $(xmlContent).find("Abstract").text();

 console.log(Abstract)
 }
 */ 
//# sourceMappingURL=main.js.map
