//import timeline.ts
//import MAL.ts
const startColor = "#C0C0FF"; //blueish
const endColor = "#CD3F85"; //redish
class NoDatedAnimeError extends Error {
}
class AnimeListTimeline {
    constructor(mal, tlConfig) {
        this.firstDate = rawNullDate;
        this.lastDate = rawNullDate;
        const minDate = new MALDate(tlConfig.minDate);
        const maxDate = new MALDate(tlConfig.maxDate);
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
            }
            else {
                this.notDated.push(anime);
            }
        }
        if (this.dated.length == 0) {
            throw new NoDatedAnimeError();
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
                const callout = {
                    description: anime.seriesTitle,
                    date: oneDate
                };
                callouts.push(callout);
            }
            else {
                const startLabel = "Started " + anime.seriesTitle;
                const finishLabel = "finished " + anime.seriesTitle;
                const startCallout = {
                    description: startLabel,
                    date: anime.myStartDate.fixedDateStr,
                    color: startColor
                };
                const endCallout = {
                    description: finishLabel,
                    date: anime.myFinishDate.fixedDateStr,
                    color: endColor
                };
                callouts.push(startCallout);
                callouts.push(endCallout);
            }
        }
        // Object to make an svg timeline
        this.data = {
            apiVersion: 2,
            width: tlConfig.width,
            startDate: this.firstDate,
            endDate: this.lastDate,
            callouts: callouts,
            tickFormat: "%Y-%m-%d"
        };
    }
    //End constructor
    getJson() {
        return JSON.stringify(this.data);
    }
}
//
//# sourceMappingURL=animelistTL.js.map