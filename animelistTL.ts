//http://myanimelist.net/malappinfo.php?u=linkviii&status=all&type=anime


const nullDate:string = "0000-00-00";
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


function fixDate(dateStr:string):string {
    //console.log(dateStr)
    if (dateStr == nullDate) {
        return nullDate;
    }
    let m:string = dateStr.slice(5, 7);
    if (m == '00') m = '01';
    let d:string = dateStr.slice(8);
    if (d == '00') d = '01';

    return dateStr.slice(0, 5) + m + '-' + d;
}

/**
 * Compare date strings that could be null
 * @param d1 string
 * @param d2 string
 * @param findMax bool
 * @returns string
 */
function compareDate(d1:string, d2:string, findMax:boolean = true):string {
    if (d1 == nullDate && d2 == nullDate) {
        return nullDate;
    } else if (d1 == nullDate) {
        return fixDate(d2);
    } else if (d2 == nullDate) {
        return fixDate(d1);
    }

    d1 = fixDate(d1);
    d2 = fixDate(d2);
    if (d1 == d2) {
        return d1;
    }
    const dt1:Date = new Date(d1);
    const dt2:Date = new Date(d2);

    const v:boolean = dt1 > dt2;

    if ((findMax && v) || (!findMax && !v)) {
        return d1;
    } else {
        return d2;
    }

}

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

    public data:Object;

    loadData(url:string) {
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

    constructor(filename) {

        console.log("before")

        let yqlURL:string = [
            "http://query.yahooapis.com/v1/public/yql",
            "?q=" + encodeURIComponent("select * from xml where url='" + filename + "'"),
            "&format=xml&callback=?"
        ].join("");

        let xmlContent;

        // filename = "http://api.duckduckgo.com/?q=StackOverflow&format=xml";

        $.ajax({
            url: yqlURL,
            dataType: 'json',
            async: false,
            //data: myData,
            success: function (data) {
                xmlContent = $(data.results[0]);
                let Abstract = $(xmlContent).find("Abstract").text();
                console.log(Abstract);
            }
        });

        // $.getJSON(yqlURL, function(data){
        //     xmlContent = $(data.results[0]);
        //     let Abstract = $(xmlContent).find("Abstract").text();
        //     console.log(Abstract);
        // });

        //this.xmlData = xmlContent[0];

        //console.log(xmlData)

        this.xmlData = this.loadData(filename);

        console.log("after")

        this.foo = "foo";

        console.log("use")
        let animeList = this.xmlData.getElementsByTagName('anime');
        console.log()
        console.log("rip")
        this.firstDate = nullDate;
        this.lastDate = nullDate;
        this.datedAnime = [];
        this.notDatedAnime = [];

        for (let anime of animeList) {
            const status:string = findText(anime, 'my_status');
            if (status != 'Completed') {
                continue;
            }

            const start:string = fixDate(findText(anime, 'my_start_date'));
            const end:string = fixDate(findText(anime, 'my_finish_date'));
            if (start == nullDate && end == nullDate) {
                this.notDatedAnime.push(anime);
            } else {
                this.datedAnime.push(anime);
            }

            //console.log(anime);
            this.firstDate = compareDate(this.firstDate, start, false);
            this.lastDate = compareDate(this.lastDate, end);


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
        for (let anime of this.datedAnime) {
            let c = [];
            let d = [];
            let start:string = findText(anime, 'my_start_date');
            let end:string = findText(anime, 'my_finish_date');
            const name:string = findText(anime, 'series_title');

            start = fixDate(start);
            end = fixDate(end);

            if (start == end || start == nullDate || end == nullDate) {
                //one date
                let date:string;
                if (start != nullDate) {
                    date = start;
                } else {
                    date = end;
                }
                date = fixDate(date);

                c.push(name);
                c.push(date);

                callouts.push(c);

            } else {
                //two dates
                const startLabel:string = "Started " + name;
                const finishLabel:string = "finished " + name;

                c.push(startLabel);
                c.push(start);
                c.push(startColor);

                d.push(finishLabel);
                d.push(end);
                d.push(endColor);

                callouts.push(c);
                callouts.push(d);
            }

            this.data['callouts'] = callouts;
        }

    }

    getJson() {
        return JSON.stringify(this.data);
    }
    //
}

class MAL{
    constructor(){

    }
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

function doA(data){
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

function fooofof(){
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



