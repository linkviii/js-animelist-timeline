/**
 * MIT licenced
 */
//import animelistTL.ts
//import MAL.ts //rawNullDate
//import jquery
//
// main data
const usingTestData = false;
// const usingTestData:boolean = true;
const testData = "res/malappinfo.xml";
const dateRegex = /^\d\d\d\d[\-\/\.]\d\d[\-\/\.]\d\d$|^\d\d\d\d\d\d\d\d$/;
//const dateRegex = /\d\d\d\d\d\d\d\d/;
let uname;
let tln;
// end main data
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
        let doc = loadTestData(testData); //ajax
        afterAjax(doc);
        return;
    }
    uname = $("#listName").val().trim();
    const malUrl = getApiUrl(uname);
    //document.getElementById("inputOut").innerHTML = malUrl;//debug
    const yqlURL = getYqlUrl(malUrl);
    $.getJSON(yqlURL, ajaxData);
}
// main III
// Transform yql response into an xml document
function ajaxData(data) {
    //console.log(data.results[0])
    const thing = $.parseXML(data.results[0]);
    afterAjax(thing);
}
// main IV
// Wrapper to handle errors in MAL response.
// Currently only a bad username is expected
function afterAjax(doc) {
    try {
        prepareTimeline(doc);
    }
    catch (err) {
        if (err instanceof BadUsernameError) {
            alert(uname + " is not a valid MAL username.");
            return;
        }
        else {
            throw err;
        }
    }
}
// main V
// Use doc to build timeline
function prepareTimeline(doc) {
    //console.log(doc)
    const mal = new MALAnimeList(doc); // can throw BadUsernameError
    let startDate = $("#from").val().trim();
    let endDate = $("#to").val().trim();
    startDate = fixDate(startDate);
    endDate = fixDate(endDate);
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
    try {
        displayTimeline(mal, tlConfig);
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
}
// main VI
// write the timeline to the document
function displayTimeline(mal, tlConfig) {
    tln = new AnimeListTimeline(mal, tlConfig); // can throw NoDatedAnimeError
    //document.getElementById("json").innerHTML = tln.getJson();
    const svg = new Timeline(tln.data, "tl");
    svg.build();
    //console.log(svg);
}
// End main chain
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
function fixDate(date) {
    const test = dateRegex.test(date);
    if (!test) {
        return rawNullDate;
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
    const minYear = 1980; //Nerds can change this in the future
    const maxYear = 2030; //For now its sane
    if (y < minYear || y > maxYear) {
        return rawNullDate; //A date needs at least a sane year
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