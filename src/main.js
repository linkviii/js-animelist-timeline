/**
 * MIT licenced
 */
//import animelistTL.ts
//import MAL.ts //rawNullDate
//import jquery
const usingTestData = false;
// const usingTestData:boolean = true;
const testData = "res/malappinfo.xml";
const dateRegex = /^\d\d\d\d[\-\/\.]\d\d[\-\/\.]\d\d$|^\d\d\d\d\d\d\d\d$/;
//const dateRegex = /\d\d\d\d\d\d\d\d/;
function getApiUrl(name) {
    return "http://myanimelist.net/malappinfo.php?u="
        + name + "&status=all&type=anime";
}
let uname;
let tln;
///TODO
function listFormSubmit() {
    // yqlTest()
    beforeAjax();
    return;
}
function beforeAjax() {
    if (usingTestData) {
        let doc = loadTestData(testData); //ajax
        afterAjax(doc);
        return;
    }
    uname = $("#listName").val().trim();
    const malUrl = getApiUrl(uname);
    document.getElementById("inputOut").innerHTML = malUrl;
    const yqlURL = [
        "https://query.yahooapis.com/v1/public/yql", "?q=",
        encodeURIComponent("select * from xml where url='" + malUrl + "'"),
        "&format=xml&callback=?"
    ].join("");
    $.getJSON(yqlURL, ajaxData);
}
function ajaxData(data) {
    //console.log(data.results[0])
    const thing = $.parseXML(data.results[0]);
    afterAjax(thing);
}
function afterAjax(doc) {
    //console.log(doc)
    const mal = new MALAnimeList(doc);
    let startDate = $("#from").val().trim();
    let endDate = $("#to").val().trim();
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
    // let testF = dateRegex.test(startDate);
    // let testT = dateRegex.test(endDate);
    // p(startDate + " " + testF)
    // p(endDate + " " + testT)
    startDate = fixDate(startDate);
    endDate = fixDate(endDate);
    const widthStr = $("#width").val().trim();
    function isNormalInteger(str) {
        var n = ~~Number(str);
        return String(n) === str && n >= 0;
    }
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
    tln = new AnimeListTimeline(mal, tlConfig);
    //document.getElementById("json").innerHTML = tln.getJson();
    const svg = new Timeline(tln.data, "tl");
    svg.build();
    //console.log(svg);
}
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