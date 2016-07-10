//http://myanimelist.net/malappinfo.php?u=linkviii&status=all&type=anime


const svgWidth:number = 1000;
const startColor:string = "#C0C0FF";//blueish
const endColor:string = "#CD3F85";//redish

//let testing = false;
const testing:boolean = true;

const testData:string = "nowork.xml";

function getApiUrl(name:string):string {
    return "http://myanimelist.net/malappinfo.php?u="
        + name + "&status=all&type=anime";
}


// function fixDate(dateStr:string):string {
//     //console.log(dateStr)
//     if (dateStr == nullDate) {
//         return nullDate;
//     }
//     let m:string = dateStr.slice(5, 7);
//     if (m == '00') m = '01';
//     let d:string = dateStr.slice(8);
//     if (d == '00') d = '01';
//
//     return dateStr.slice(0, 5) + m + '-' + d;
// }

// /**
//  * Compare date strings that could be null
//  * @param d1 string
//  * @param d2 string
//  * @param findMax bool
//  * @returns string
//  */
// function compareDate(d1:string, d2:string, findMax:boolean = true):string {
//     if (d1 == nullDate && d2 == nullDate) {
//         return nullDate;
//     } else if (d1 == nullDate) {
//         return fixDate(d2);
//     } else if (d2 == nullDate) {
//         return fixDate(d1);
//     }
//
//     d1 = fixDate(d1);
//     d2 = fixDate(d2);
//     if (d1 == d2) {
//         return d1;
//     }
//     const dt1:Date = new Date(d1);
//     const dt2:Date = new Date(d2);
//
//     const v:boolean = dt1 > dt2;
//
//     if ((findMax && v) || (!findMax && !v)) {
//         return d1;
//     } else {
//         return d2;
//     }
//
// }

function findText(parentTag:Element, childName:string):string {
    return parentTag.getElementsByTagName(childName)[0].textContent;
}

class AnimeListTL {
    //

    public foo:string;
    public xmlData;     // :XMLDocument;

    public firstDate:string;
    public lastDate:string;


    public datedAnime:Element[];// = [];
    public notDatedAnime:Element[];

    public dated:MALAnime[];
    public notDated:MALAnime[];

    public data:Object;

    loadData(url:string):any /*xml*/ {
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


    deadCode() {
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

    constructor(filename) {

        // console.log("before")
        //console.log(xmlData)

        this.xmlData = this.loadData(filename);

        // console.log("after")
        // console.log("use")

        let mal:MALAnimeList = new MALAnimeList(this.xmlData);


        console.log("rip")

        this.firstDate = nullDate;
        this.lastDate = nullDate;


        this.datedAnime = [];
        this.notDatedAnime = [];

        this.dated = [];
        this.notDated = [];

        for (let anime of mal.anime) {
            if (anime.myStatus == STATUSES.completed) {
                continue;
            }

            const start:string = anime.myStartDate.fixDate();
            const end:string = anime.myFinishDate.fixDate();

            if (anime.isDated()) {
                this.dated.push(anime);
            } else {
                this.notDated.push(anime);
            }

            this.firstDate = anime.myStartDate.compareRawDate(this.firstDate, false);
            this.lastDate = anime.myFinishDate.compareRawDate(this.lastDate);
        }

        //console.log(this.firstDate)
        //console.log(this.lastDate)

        this.data = {};
        this.data['tick_format'] = "%Y-%m-%d";
        this.data['width'] = svgWidth;
        this.data['start'] = this.firstDate;
        this.data['end'] = this.lastDate;
        let callouts = [];

        //make callouts
        
        for (let anime of this.dated) {
            let c = [];
            let d = [];

            const oneDate:string|boolean = anime.hasOneDate();

            if (oneDate) {
                c.push(anime.seriesTitle);
                c.push(oneDate);
                callouts.push(c);

            }else{

                const startLabel:string = "Started " + anime.seriesTitle;
                const finishLabel:string = "finished " + anime.seriesTitle;

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

    getJson() {
        return JSON.stringify(this.data);
    }

    //
}




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
    yqlTest()
    return;


}

function fooofof() {
    //
    uname = (<HTMLInputElement>document.getElementById("listName")).value.trim();
    document.getElementById("inputOut").innerHTML = getApiUrl(uname);

    let url;
    if (testing) {
        url = testData;
    } else {
        url = getApiUrl(uname)
    }

    list = new AnimeListTL(url);

    document.getElementById("json").innerHTML = list.getJson();
}



