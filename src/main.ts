/**
 * 
 */






function yqlTest() {
    //http://stackoverflow.com/questions/24377804/cross-domain-jsonp-xml-response/24399484#24399484
    // find some demo xml - DuckDuckGo is great for this
    var xmlSource = "http://api.duckduckgo.com/?q=StackOverflow&format=xml"

    // build the yql query. Could be just a string - I think join makes easier reading
    var yqlURL = [
        "http://query.yahooapis.com/v1/public/yql",
        "?q=" + encodeURIComponent("select * from xml where url='" + xmlSource + "'"),
        "&format=xml&callback=?"
    ].join("");


    let xmlContent;
    console.log("before")
    // Now do the AJAX heavy lifting
    $.getJSON(yqlURL, doA);
    console.log("after")
    console.log(xmlContent)


}

function doA(data) {
    var xmlContent = $(data.results[0]);
    var Abstract = $(xmlContent).find("Abstract").text();
    console.log("in ajax");
    console.log(xmlContent)
}

let uname:string;
let list:AnimeListTL;

///TODO
function getListName():void {
    //yqlTest()
    higs()
    return;


}

function higs() {
    //
    uname = (<HTMLInputElement>document.getElementById("listName")).value.trim();
    document.getElementById("inputOut").innerHTML = getApiUrl(uname);

    let url:string;
    if (testing) {
        url = testData;
    } else {
        url = getApiUrl(uname)
    }

    let doc = loadData(url);
    let mal:MALAnimeList = new MALAnimeList(doc);

    //console.log(url)
    //console.log(doc)

    list = new AnimeListTL(mal);

    document.getElementById("json").innerHTML = list.getJson();
}


function  loadData(url:string):any /*xml*/ {
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


