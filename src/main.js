/**
 *
 */
//const testing:boolean = false;
const testing = true;
const testData = "res/nowork.xml";
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
        "?q=" + encodeURIComponent("select * from xml where url='" + xmlSource + "'"),
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
    higs();
    return;
}
function higs() {
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
    postAjax(doc);
}
function postAjax(doc) {
    const mal = new MALAnimeList(doc);
    const widthStr = $("#width").val();
    //check that its valid
    //tdo
    const width = parseInt(widthStr);
    tln = new AnimeListTimeline(mal);
    document.getElementById("json").innerHTML = tln.getJson();
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