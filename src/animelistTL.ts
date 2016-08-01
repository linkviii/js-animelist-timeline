//http://myanimelist.net/malappinfo.php?u=linkviii&status=all&type=anime


const svgWidth:number = 1000;
const startColor:string = "#C0C0FF";//blueish
const endColor:string = "#CD3F85";//redish



interface AnimeListTimelineData extends TimelineData{
    callouts:Array<Array<string>>;
}


interface AnimeListTimelineConfig{
    width:number;
    minDate:string;//YYYY-MM-DD
    maxDate:string;
}

class AnimeListTimeline {
    //

    public firstDate:string;
    public lastDate:string;

    public dated:MALAnime[];
    public notDated:MALAnime[];

    public data:AnimeListTimelineData;


    constructor(mal:MALAnimeList, tlConfig:AnimeListTimelineConfig) {

        this.firstDate = rawNullDate;
        this.lastDate = rawNullDate;
        const minDate:MALDate = new MALDate(tlConfig.minDate);
        const maxDate:MALDate = new MALDate(tlConfig.maxDate);


        this.dated = [];
        this.notDated = [];


        function dateInBounds(){}

        for (let anime of mal.anime) {
            if (anime.myStatus != STATUSES.completed) {
                continue;
            }

            anime.adjustDates(minDate, maxDate);

            if (anime.isDated()) {
                this.dated.push(anime);

                this.firstDate = anime.myStartDate.extremeOfDates(this.firstDate, false);
                this.lastDate = anime.myFinishDate.extremeOfDates(this.lastDate);
            } else {
                this.notDated.push(anime);
            }

            //console.log("b: " + this.lastDate)

            //p("a: "+this.lastDate)
        }
        //XXX remove
        if(!minDate.isNullDate() &&minDate.compare(this.firstDate)>0){
            this.firstDate = minDate.fixedDateStr;
        }


        // console.log(this.firstDate)
        // console.log(this.lastDate)

        // this.data = <AnimeListTimelineData> {};
        // this.data.tick_format = "%Y-%m-%d";
        // this.data.width = width;
        // this.data.start = this.firstDate;
        // this.data.end = this.lastDate;
        
        const callouts:Array<Array<string>> = [];

        //make callouts

        for (let anime of this.dated) {
            const c = [];
            const d = [];

            const oneDate:string|boolean = anime.hasOneDate();

            if (oneDate) {
                c.push(anime.seriesTitle);
                c.push(oneDate);
                callouts.push(c);

            } else {

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
        //this.data.callouts = callouts;




        this.data = {
            width:tlConfig.width,
            start: this.firstDate,
            end: this.lastDate,
            callouts: callouts,
            tick_format:"%Y-%m-%d"
        }


        

    }


    getJson() {
        return JSON.stringify(this.data);
    }

    //
}

//
