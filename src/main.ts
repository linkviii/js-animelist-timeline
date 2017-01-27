/**
 * MIT licenced
 */

//import animelistTL.ts
//import MAL.ts //rawNullDate
//import jquery

//
// main data


const usingTestData: boolean = false;
// const usingTestData: boolean = true;

const testData: string = "res/malappinfo.xml";


const dateRegex = /^\d\d\d\d[\-\/\.]\d\d[\-\/\.]\d\d$|^\d\d\d\d\d\d\d\d$/;
//const dateRegex = /\d\d\d\d\d\d\d\d/;


const userCache: Map<string, MALAnimeList|BadUsernameError> = new Map();


// global for testing
let uname: string;
let tln: AnimeListTimeline;

// end main data

function initFields(): void {

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
function clearAllTimelines():void{
    $("#tl").empty();
}


// main I
// Entry point from html form
function listFormSubmit(): void {
    // yqlTest()
    beforeAjax();
    return;
}

// main II
// Form api requests and call
function beforeAjax(): void {
    if (usingTestData) {
        let doc = loadTestData(testData);//ajax
        afterAjax(doc);
        return
    }

    uname = $("#listName").val().trim();

    // check cache for name
    // to skip ajax
    const data: MALAnimeList|BadUsernameError = userCache.get(uname);
    if (data) {
        console.log([uname, "'s data loaded from cache."].join(""));
        if (data instanceof MALAnimeList) {
            prepareTimeline(data);
        } else {
            respondToBadUser();
        }
        return;
    }


    const malUrl: string = getApiUrl(uname);
    //document.getElementById("inputOut").innerHTML = malUrl;//debug

    const yqlURL: string = getYqlUrl(malUrl);

    $.getJSON(yqlURL, ajaxData);

}

// main III
// Transform yql response into an xml document
function ajaxData(data): void {
    //console.log(data.results[0])
    const thing = $.parseXML(data.results[0]);
    afterAjax(thing);
}

// main IV
// Wrapper to handle errors in MAL response.
// Currently only a bad username is expected
function afterAjax(doc): void {
    let mal: MALAnimeList;

    try {
        mal = new MALAnimeList(doc); // can throw BadUsernameError
        userCache.set(uname, mal);

    } catch (err) {
        if (err instanceof BadUsernameError) {
            userCache.set(uname, err);
            respondToBadUser();
            return;
        } else {
            throw err;
        }
    }

    prepareTimeline(mal);
}

// main V
// Use doc to build timeline
function prepareTimeline(mal: MALAnimeList): void {
    //console.log(doc)

    let startDate: string = $("#from").val().trim();
    let endDate: string = $("#to").val().trim();

    startDate = fixDate(startDate);
    endDate = fixDate(endDate);

    const widthStr: string = $("#width").val().trim();

    let width: number;
    if (isNormalInteger(widthStr)) {
        width = parseInt(widthStr);
    } else {//default
        width = 1000;
    }

    const tlConfig: AnimeListTimelineConfig = {
        width: width, minDate: startDate, maxDate: endDate
    };

    updateUri(tlConfig);

    try {
        tln = new AnimeListTimeline(mal, tlConfig); // can throw NoDatedAnimeError


    } catch (err) {
        if (err instanceof NoDatedAnimeError) {
            alert("None of the anime in the list contained watched dates.");
            return;
        } else {
            throw err;
        }
    }

    displayTimeline();
}

// main VI
// write the timeline to the document
// pre: tln is a valid AnimeListTimeline object
function displayTimeline(): void {

    //document.getElementById("json").innerHTML = tln.getJson();
    const svg: Timeline = new Timeline(tln.data, "tl");
    svg.build();
    //console.log(svg);
}

// End main chain


function respondToBadUser(): void {
    alert(uname + " is not a valid MAL username.");
}


// load xml not async
function loadTestData(url: string): any /*xml*/ {
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
function getApiUrl(name: string): string {
    const malUrlBase: string = "http://myanimelist.net/malappinfo.php?u=";
    const malUrlFilter: string = "&status=all&type=anime";

    return malUrlBase + name + malUrlFilter;
}


/**
 * Forms YQL URL based on MAL URL.
 * YQL is used to proxy the xml request as json.
 * @param malUrl
 * @returns {string}
 */
function getYqlUrl(malUrl: string): string {
    const yqlUrlBase: string = "https://query.yahooapis.com/v1/public/yql";
    const q: string = "?q=";
    const query: string = "select * from xml where url='" + malUrl + "'";
    const encodedQuery = encodeURIComponent(query);
    const yqlUrlFilter: string = "&format=xml&callback=?";

    const yqlUrl: string = [yqlUrlBase, q, encodedQuery, yqlUrlFilter].join("");

    return yqlUrl;
}


function fixDate(date: string): string {
    const test: boolean = dateRegex.test(date);
    if (!test) {
        return rawNullDate;
    }
    let ys: string;
    let ms: string;
    let ds: string;
    if (/^\d\d\d\d\d\d\d\d$/.test(date)) {
        ys = date.slice(0, 4);
        ms = date.slice(4, 6);
        ds = date.slice(6, 8);
    } else {
        ys = date.slice(0, 4);
        ms = date.slice(5, 7);
        ds = date.slice(8, 10);
    }
    const y: number = parseInt(ys);
    const m: number = parseInt(ms);
    const d: number = parseInt(ds);

    const minYear = 1980;//Nerds can change this in the future
    const maxYear = 2030;//For now its sane
    if (y < minYear || y > maxYear) {
        return rawNullDate;//A date needs at least a sane year
    }
    if (m < 0 || m > 12) {
        ms = "00";
    }
    if (d < 0 || d > 32) {
        ds = "00";
    }

    return [ys, ms, ds].join("-")
}


/**
 * Returns if the string represents a non negative integer.
 * @param str
 * @returns {boolean}
 */
function isNormalInteger(str: string): boolean {
    const n: number = ~~Number(str);
    return (String(n) === str) && (n >= 0);
}

//http://stackoverflow.com/a/8486188/1993919
function getJsonFromUrl(hashBased?): any {
    let query;
    if (hashBased) {
        let pos = location.href.indexOf("?");
        if (pos == -1) return [];
        query = location.href.substr(pos + 1);
    } else {
        query = location.search.substr(1);
    }
    const result = {};
    query.split("&").forEach(function (part) {
        if (!part) return;
        part = part.split("+").join(" "); // replace every + with space, regexp-free version
        const eq = part.indexOf("=");
        let key = eq > -1 ? part.substr(0, eq) : part;
        const val = eq > -1 ? decodeURIComponent(part.substr(eq + 1)) : "";
        const from = key.indexOf("[");
        if (from == -1) result[decodeURIComponent(key)] = val;
        else {
            const to = key.indexOf("]");
            const index = decodeURIComponent(key.substring(from + 1, to));
            key = decodeURIComponent(key.substring(0, from));
            if (!result[key]) result[key] = [];
            if (!index) result[key].push(val);
            else result[key][index] = val;
        }
    });
    return result;
}

//http://stackoverflow.com/a/19472410/1993919
function replaceQueryParam(param: string, newval: string, search: string): string {
    // Could default but probably not intended.
    //search = search || window.location.search;

    const regex = new RegExp("([?;&])" + param + "[^&;]*[;&]?");
    const query = search.replace(regex, "$1").replace(/&$/, '');

    return (query.length > 2 ? query + "&" : "?") + (newval ? param + "=" + newval : '');
}

function updateUri(param: AnimeListTimelineConfig): void {

    const startDate: string = $("#from").val().trim();
    if (startDate == "") {
        param.minDate = "";
    }
    const endDate: string = $("#to").val().trim();
    if (endDate == "") {
        param.maxDate = "";
    }

    let str = window.location.search;

    str = replaceQueryParam("uname", uname, str);
    str = replaceQueryParam("width", param.width.toString(), str);
    str = replaceQueryParam("minDate", param.minDate, str);
    str = replaceQueryParam("maxDate", param.maxDate, str);

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