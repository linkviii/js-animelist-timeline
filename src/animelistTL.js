//http://myanimelist.net/malappinfo.php?u=linkviii&status=all&type=anime
//const testing:boolean = false;
var testing = true;
var testData = "res/nowork.xml";
var svgWidth = 1000;
var startColor = "#C0C0FF"; //blueish
var endColor = "#CD3F85"; //redish
function getApiUrl(name) {
    return "http://myanimelist.net/malappinfo.php?u="
        + name + "&status=all&type=anime";
}
var AnimeListTL = (function () {
    function AnimeListTL(mal) {
        this.firstDate = nullDate;
        this.lastDate = nullDate;
        this.dated = [];
        this.notDated = [];
        for (var _i = 0, _a = mal.anime; _i < _a.length; _i++) {
            var anime = _a[_i];
            if (anime.myStatus != STATUSES.completed) {
                continue;
            }
            if (anime.isDated()) {
                this.dated.push(anime);
            }
            else {
                this.notDated.push(anime);
            }
            this.firstDate = anime.myStartDate.compareRawDate(this.firstDate, false);
            this.lastDate = anime.myFinishDate.compareRawDate(this.lastDate);
        }
        // console.log(this.firstDate)
        // console.log(this.lastDate)
        this.data = {};
        this.data['tick_format'] = "%Y-%m-%d";
        this.data['width'] = svgWidth;
        this.data['start'] = this.firstDate;
        this.data['end'] = this.lastDate;
        var callouts = [];
        //make callouts
        for (var _b = 0, _c = this.dated; _b < _c.length; _b++) {
            var anime = _c[_b];
            var c = [];
            var d = [];
            var oneDate = anime.hasOneDate();
            if (oneDate) {
                c.push(anime.seriesTitle);
                c.push(oneDate);
                callouts.push(c);
            }
            else {
                var startLabel = "Started " + anime.seriesTitle;
                var finishLabel = "finished " + anime.seriesTitle;
                c.push(startLabel);
                c.push(anime.myStartDate.fixedDateStr);
                c.push(startColor);
                d.push(finishLabel);
                d.push(anime.myFinishDate.fixedDateStr);
                d.push(endColor);
                callouts.push(c);
                callouts.push(d);
            }
        }
        this.data['callouts'] = callouts;
    }
    AnimeListTL.prototype.deadCode = function () {
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
    };
    AnimeListTL.prototype.getJson = function () {
        return JSON.stringify(this.data);
    };
    return AnimeListTL;
}());
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
    var xmlContent;
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
var uname;
var list;
///TODO
function getListName() {
    //yqlTest()
    higs();
    return;
}
function higs() {
    //
    uname = document.getElementById("listName").value.trim();
    document.getElementById("inputOut").innerHTML = getApiUrl(uname);
    var url;
    if (testing) {
        url = testData;
    }
    else {
        url = getApiUrl(uname);
    }
    var doc = loadData(url);
    var mal = new MALAnimeList(doc);
    //console.log(url)
    //console.log(doc)
    list = new AnimeListTL(mal);
    document.getElementById("json").innerHTML = list.getJson();
}
function loadData(url) {
    return (function () {
        var xml = null;
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
//# sourceMappingURL=animelistTL.js.map