//import timeline.ts
//import MAL.ts


const startColor: string = "#C0C0FF";//blueish
const endColor: string = "#CD3F85";//redish

type CalloutType = [string, string]|[string, string, string];
type CalloutListType = Array<CalloutType>;

// Formalize the need for callouts.
interface AnimeListTimelineData extends TimelineDataV1 {
    callouts: CalloutListType;
}


interface AnimeListTimelineConfig {
    width: number;
    minDate: string;//YYYY-MM-DD
    maxDate: string;
}

class AnimeListTimeline {
    //

    public firstDate: string;
    public lastDate: string;

    public dated: MALAnime[];
    public notDated: MALAnime[];

    public data: AnimeListTimelineData;


    constructor(mal: MALAnimeList, tlConfig: AnimeListTimelineConfig) {

        this.firstDate = rawNullDate;
        this.lastDate = rawNullDate;
        const minDate: MALDate = new MALDate(tlConfig.minDate);
        const maxDate: MALDate = new MALDate(tlConfig.maxDate);


        this.dated = [];
        this.notDated = [];

        // Filter dates and find the extreme of completed anime
        for (let anime of mal.anime) {
            // p(anime.myStatus)
            if (anime.myStatus != MALStatus.Completed) {
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
            // console.log("b: " + this.lastDate)
            // p("a: "+this.lastDate)
        }


        // console.log("end")
        // console.log(this.firstDate)
        // console.log(this.lastDate)


        const callouts: CalloutListType = [];

        //make callouts
        for (let anime of this.dated) {
            //date str or false
            const oneDate: string|boolean = anime.hasOneDate();

            if (oneDate) {
                const c: CalloutType = [anime.seriesTitle, <string>oneDate];
                callouts.push(c);

            } else {

                const startLabel: string = "Started " + anime.seriesTitle;
                const finishLabel: string = "finished " + anime.seriesTitle;

                const tmps: string = anime.myStartDate.fixedDateStr;
                const tmpe: string = anime.myFinishDate.fixedDateStr;

                const c: CalloutType = [startLabel, tmps, startColor];
                const d: CalloutType = [finishLabel, tmpe, endColor];

                callouts.push(c);
                callouts.push(d);

            }

        }

        // Object to make an svg timeline
        this.data = {
            width: tlConfig.width,
            start: this.firstDate,
            end: this.lastDate,
            callouts: callouts,
            tick_format: "%Y-%m-%d"
        }


    }


    //End constructor

    getJson() {
        return JSON.stringify(this.data);
    }

    //
}

//
