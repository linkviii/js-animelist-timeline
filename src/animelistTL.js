//import timeline.ts
//import MAL.ts
const startColor = "#C0C0FF"; //blueish
const endColor = "#CD3F85"; //redish
class NoDatedAnimeError extends Error {
}
/**
 * Data to be used for a js-timeline
 * ```
 * const atl: AnimeListTimeline = ...;
 * const tln: Timeline = new Timeline(atl.data, "id");
 * ```
 *
 */
class AnimeListTimeline {
    constructor(mal, tlConfig) {
        this.firstDate = nullDate;
        this.lastDate = nullDate;
        const minDate = new MALDate(tlConfig.minDate);
        const maxDate = new MALDate(tlConfig.maxDate);
        //assert not null and is valid
        if (minDate.isNullDate() || maxDate.isNullDate() || tlConfig.maxDate.length == 0 || tlConfig.maxDate.length == 0) {
            throw ["Invalid config", tlConfig];
        }
        const callouts = [];
        for (let anime of mal.anime) {
            // Filter dates and find the extreme of completed anime
            if (anime.myStatus != MALStatus.Completed) {
                continue;
            }
            const dates = AnimeListTimeline.filterInbounds(anime, minDate, maxDate);
            if (dates.length == 0) {
                continue;
            }
            for (let date of dates) {
                this.firstDate = date.extremeOfDates(this.firstDate, false);
                this.lastDate = date.extremeOfDates(this.lastDate);
            }
            //make callouts
            if (dates.length == 1) {
                const callout = {
                    description: anime.seriesTitle,
                    date: dates[0].fixedDateStr
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
        if (callouts.length == 0) {
            throw new NoDatedAnimeError();
        }
        // Object to make an svg timeline
        this.data = {
            apiVersion: 2,
            width: tlConfig.width,
            startDate: this.firstDate.fixedDateStr,
            endDate: this.lastDate.fixedDateStr,
            callouts: callouts,
            tickFormat: "%Y-%m-%d"
        };
    } //End constructor
    // static dateInBounds(lb: MALDate, rb: MALDate, other: MALDate): boolean {
    //
    //     return false;
    // }
    static filterInbounds(anime, lb, rb) {
        let dates = [anime.myStartDate, anime.myFinishDate];
        dates = dates.filter(
        //dateInBounds(date: MALDate, lb: MALDate, rb: MALDate)
        function (date) {
            if (date.isNullDate())
                return false;
            return date.compare(lb) >= 0 && date.compare(rb) <= 0;
        });
        // Make sure unique
        if (dates.length && dates[0] == dates[1]) {
            dates = [dates[0]];
        }
        return dates;
    }
    //Debug utility
    getJson() {
        return JSON.stringify(this.data);
    }
}
//
//# sourceMappingURL=animelistTL.js.map