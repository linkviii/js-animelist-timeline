//import timeline.ts
//import MAL.ts
const startColor = "#C0C0FF"; //blueish
const endColor = "#CD3F85"; //redish
class AnimeListTimeline {
    constructor(mal, tlConfig) {
        this.firstDate = rawNullDate;
        this.lastDate = rawNullDate;
        const minDate = new MALDate(tlConfig.minDate);
        const maxDate = new MALDate(tlConfig.maxDate);
        this.dated = [];
        this.notDated = [];
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
            }
            else {
                this.notDated.push(anime);
            }
        }
        // console.log("end")
        // console.log(this.firstDate)
        // console.log(this.lastDate)
        const callouts = [];
        //make callouts
        for (let anime of this.dated) {
            //date str or false
            const oneDate = anime.hasOneDate();
            if (oneDate) {
                const c = [anime.seriesTitle, oneDate];
                callouts.push(c);
            }
            else {
                const startLabel = "Started " + anime.seriesTitle;
                const finishLabel = "finished " + anime.seriesTitle;
                const tmps = anime.myStartDate.fixedDateStr;
                const tmpe = anime.myFinishDate.fixedDateStr;
                const c = [startLabel, tmps, startColor];
                const d = [finishLabel, tmpe, endColor];
                callouts.push(c);
                callouts.push(d);
            }
        }
        this.data = {
            width: tlConfig.width,
            start: this.firstDate,
            end: this.lastDate,
            callouts: callouts,
            tick_format: "%Y-%m-%d"
        };
    }
    getJson() {
        return JSON.stringify(this.data);
    }
}
//
//# sourceMappingURL=animelistTL.js.map