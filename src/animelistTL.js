//http://myanimelist.net/malappinfo.php?u=linkviii&status=all&type=anime
const svgWidth = 1000;
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
            const c = [];
            const d = [];
            const oneDate = anime.hasOneDate();
            if (oneDate) {
                c.push(anime.seriesTitle);
                c.push(oneDate);
                callouts.push(c);
            }
            else {
                const startLabel = "Started " + anime.seriesTitle;
                const finishLabel = "finished " + anime.seriesTitle;
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