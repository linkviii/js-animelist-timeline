//http://myanimelist.net/malappinfo.php?u=linkviii&status=all&type=anime


let nullDate = "0000-00-00";
let svgWidth = 1000;
let startColor = "#C0C0FF";//blueish
let endColor = "#CD3F85";//redish

//let testing = false;
let testing = true;

let testData = "nowork.xml";

function getApiUrl(name) {
    return "http://myanimelist.net/malappinfo.php?u="
        + name + "&status=all&type=anime";
}

/**
 *
 * @param dateStr
 * @returns string
 */
function fixDate(dateStr) {
    //console.log(dateStr)
    if (dateStr == nullDate) {
        return nullDate;
    }
    let m = dateStr.slice(5, 7);
    if (m == '00') m = '01';
    let d = dateStr.slice(8);
    if (d == '00') d = '01';

    return dateStr.slice(0, 5) + m + '-' + d;
};

/**
 * Compare date strings that could be null
 * @param d1 string
 * @param d2 string
 * @param findMax bool
 * @returns string
 */
function compareDate(d1, d2, findMax = true) {
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
    let dt1 = new Date(d1);
    let dt2 = new Date(d2);

    let v = dt1 > dt2;

    if ((findMax && v) || (!findMax && !v)) {
        return d1;
    } else {
        return d2;
    }

};

function findText(parentTag, childName) {
    return parentTag.getElementsByTagName(childName)[0].textContent;
};

class AnimeList {
    //
    constructor(filename) {


        console.log("before")

        let yqlURL = [
            "http://query.yahooapis.com/v1/public/yql",
            "?q=" + encodeURIComponent("select * from xml where url='" + filename + "'"),
            "&format=xml&callback=?"
        ].join("");

        let xmlContent;

        // filename = "http://api.duckduckgo.com/?q=StackOverflow&format=xml";

        // $.ajax({
        //     url: yqlURL,
        //     dataType: 'json',
        //     async: false,
        //     //data: myData,
        //     success: function(data) {
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

        //console.log(xmlData)

        this.xmlData = (function () {
            let xml = null;
            $.ajax({
                async: false,

                crossDomain: true,

                global: false,
                url: filename,
                dataType: "xml",
                success: function (data) {
                    xml = data;
                }
            });
            return xml;
        })();

        console.log("after")

        this.foo = "foo";

        console.log("use")
        let animeList = this.xmlData.getElementsByTagName('anime');
        console.log("rip")
        this.firstDate = nullDate;
        this.lastDate = nullDate;
        this.datedAnime = [];
        this.notDatedAnime = [];

        for (let anime of animeList) {
            let status = findText(anime, 'my_status');
            if (status != 'Completed') {
                continue;
            }

            let start = fixDate(findText(anime, 'my_start_date'));
            let end = fixDate(findText(anime, 'my_finish_date'));
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
            let start = findText(anime, 'my_start_date');
            let end = findText(anime, 'my_finish_date');
            let name = findText(anime, 'series_title');

            start = fixDate(start);
            end = fixDate(end);

            if (start == end || start == nullDate || end == nullDate) {
                //one date
                let date;
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
                let startLabel = "Started " + name;
                let finishLabel = "finished " + name;

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


let name;
let list;

function getListName() {
    name = document.getElementById("listName").value.trim();
    document.getElementById("inputOut").innerHTML = getApiUrl(name);

    let url;
    if (testing) {
        url = testData;
    } else {
        url = getApiUrl(name)
    }

    list = new AnimeList(url);

    document.getElementById("json").innerHTML = list.getJson();

}