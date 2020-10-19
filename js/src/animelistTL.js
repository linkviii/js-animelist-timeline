//import MAL.ts
import * as MAL from "./MAL.js";
// import {MALAnime} from "./MAL";
// import {MALAnimeList} from "./MAL";
// import {MALStatus} from "./MAL";
const startColor = "#C0C0FF"; //blueish
const endColor = "#CD3F85"; //redish
export class NoDatedAnimeError extends Error {
}
/**
 * Data to be used for a js-timeline
 * ```
 * const atl: AnimeListTimeline = ...;
 * const tln: Timeline = new Timeline(atl.data, "id");
 * tln.build();
 * ```
 *
 */
export class AnimeListTimeline {
    constructor(mal, tlConfig) {
        this.userName = mal.user.userName;
        this.firstDate = MAL.nullDate;
        this.lastDate = MAL.nullDate;
        const minDate = new MAL.Mdate(tlConfig.minDate);
        const maxDate = new MAL.Mdate(tlConfig.maxDate);
        //assert not null and is valid
        if (minDate.isNullDate() || maxDate.isNullDate() || tlConfig.maxDate.length == 0 || tlConfig.maxDate.length == 0) {
            throw ["Invalid config", tlConfig];
        }
        const callouts = [];
        for (let anime of mal.anime) {
            // Filter dates and find the extreme of completed anime
            if (anime.myStatus != MAL.Status.Completed) {
                continue;
            }
            const dates = AnimeListTimeline.filterInbounds(anime, minDate, maxDate)
                .filter(x => x).filter(x => !x.isNullDate());
            if (dates.length == 0) {
                continue;
            }
            for (let date of dates) { // 1 or 2 iterations
                this.firstDate = date.extremeOfDates(this.firstDate, false);
                this.lastDate = date.extremeOfDates(this.lastDate);
            }
            if (dates.length == 2) {
                // Don't say started and stopped if it's the same day
                const cmp = dates[0].compare(dates[1]);
                if (cmp > 0) {
                    console.log(anime.seriesTitle, ": Finished before start.");
                }
                if (cmp === 0) {
                    dates.pop();
                }
            }
            //make callout
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
            tickFormat: "%Y-%m-%d "
        };
    } //End constructor
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
    getDescriptor() {
        return [this.userName, this.firstDate.fixedDateStr, this.lastDate.fixedDateStr].join("_");
    }
}
//
//# sourceMappingURL=animelistTL.js.map