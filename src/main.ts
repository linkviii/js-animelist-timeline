/**
 * MIT licenced
 */

//import animelistTL.ts
//import MAL.ts //rawNullDate
//import jquery

//
// main data


const usingTestData: boolean = false;
// const usingTestData:boolean = true;


const testData: string = "res/malappinfo.xml";

const dateRegex = /^\d\d\d\d[\-\/\.]\d\d[\-\/\.]\d\d$|^\d\d\d\d\d\d\d\d$/;
//const dateRegex = /\d\d\d\d\d\d\d\d/;


let uname: string;
let tln: AnimeListTimeline;

// end main data

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
// Use doc to build timeline
function afterAjax(doc): void {
    //console.log(doc)

    const mal: MALAnimeList = new MALAnimeList(doc);

    let startDate: string = $("#from").val().trim();
    let endDate: string = $("#to").val().trim();

    //keep scope reduced
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

    tln = new AnimeListTimeline(mal, tlConfig);

    //document.getElementById("json").innerHTML = tln.getJson();
    const svg: Timeline = new Timeline(tln.data, "tl");
    svg.build();
    //console.log(svg);
}

// End main chain

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


/**
 * Returns if the string represents a non negative integer.
 * @param str
 * @returns {boolean}
 */
function isNormalInteger(str: string): boolean {
    const n: number = ~~Number(str);
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