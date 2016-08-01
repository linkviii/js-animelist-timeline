/**
 *
 */
//const testing:boolean = false;
const testing = true;
const testData = "res/nowork.xml";
const dateRegex = /^\d\d[-\/\.]\d\d[-\/\.]\d\d\d\d$|^\d\d\d\d\d\d\d\d$/;
//const dateRegex = /\d\d\d\d\d\d\d\d/;
function getApiUrl(name) {
    return "http://myanimelist.net/malappinfo.php?u="
        + name + "&status=all&type=anime";
}
function yqlTest() {
    //http://stackoverflow.com/questions/24377804/cross-domain-jsonp-xml-response/24399484#24399484
    // find some demo xml - DuckDuckGo is great for this
    var xmlSource = "http://api.duckduckgo.com/?q=StackOverflow&format=xml";
    // build the yql query. Could be just a string - I think join makes easier reading
    var yqlURL = [
        "http://query.yahooapis.com/v1/public/yql",
        "?q=", encodeURIComponent("select * from xml where url='" + xmlSource + "'"),
        "&format=xml&callback=?"
    ].join("");
    let xmlContent;
    console.log("before");
    // Now do the AJAX heavy lifting
    $.getJSON(yqlURL, doA);
    console.log("after");
    console.log(xmlContent);
}
function doA(data) {
    var xmlContent = $(data.results[0]);
    var Abstract = $(xmlContent).find("Abstract").text();
    console.log("in ajax");
    console.log(xmlContent);
}
let uname;
let tln;
///TODO
function getListName() {
    //yqlTest()
    beforeAjax();
    return;
}
function beforeAjax() {
    //
    uname = $("#listName").val().trim();
    document.getElementById("inputOut").innerHTML = getApiUrl(uname);
    let url;
    if (testing) {
        url = testData;
    }
    else {
        url = getApiUrl(uname);
    }
    let doc = loadData(url); //ajax
    afterAjax(doc);
}
function afterAjax(doc) {
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
function loadData(url) {
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
function deadCode() {
    // let yqlURL:string = [
    //     "http://query.yahooapis.com/v1/public/yql",
    //     "?q=" + encodeURIComponent("select * from xml where url='" + filename + "'"),
    //     "&format=xml&callback=?"
    // ].join("");
    // let xmlContent;
    //
    // // filename = "http://api.duckduckgo.com/?q=StackOverflow&format=xml";
    //
    // $.ajax({
    //     url: yqlURL,
    //     dataType: 'json',
    //     async: false,
    //     //data: myData,
    //     success: function (data) {
    //         xmlContent = $(data.results[0]);
    //         let Abstract = $(xmlContent).find("Abstract").text();
    //         console.log(Abstract);
    //     }
    // });
    // $.getJSON(yqlURL, function(data){
    //     xmlContent = $(data.results[0]);
    //     let Abstract = $(xmlContent).find("Abstract").text();
    //     console.log(Abstract);
    // });
    //this.xmlData = xmlContent[0];
}
//# sourceMappingURL=main.js.map