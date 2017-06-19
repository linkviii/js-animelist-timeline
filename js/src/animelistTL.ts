//import timeline.ts
import {TimelineDataV2} from "../lib/timeline";
import {TimelineCalloutV2} from "../lib/timeline";
//import MAL.ts
import * as MAL from "./MAL";
// import {MALAnime} from "./MAL";
// import {MALAnimeList} from "./MAL";
// import {MALStatus} from "./MAL";


const startColor: string = "#C0C0FF";//blueish
const endColor: string = "#CD3F85";//redish

export class NoDatedAnimeError extends Error {
}

// Formalize the need for callouts.
export interface AnimeListTimelineData extends TimelineDataV2 {
    callouts: TimelineCalloutV2[];
}

export interface AnimeListTimelineConfig {
    width: number;
    //YYYY-MM-DD
    //Cannot be rawNullDate
    minDate: string;
    maxDate: string;
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
    //

    public firstDate: MAL.Mdate;
    public lastDate: MAL.Mdate;


    public readonly data: AnimeListTimelineData;

    public readonly userName: string;


    static filterInbounds(anime: MAL.Anime, lb: MAL.Mdate, rb: MAL.Mdate): MAL.Mdate[] {
        let dates: MAL.Mdate[] = [anime.myStartDate, anime.myFinishDate];

        dates = dates.filter(
            //dateInBounds(date: MALDate, lb: MALDate, rb: MALDate)
            function (date: MAL.Mdate) {
                if (date.isNullDate())
                    return false;
                return date.compare(lb) >= 0 && date.compare(rb) <= 0
            });

        // Make sure unique
        if (dates.length && dates[0] == dates[1]) {
            dates = [dates[0]];
        }

        return dates;
    }

    constructor(mal: MAL.AnimeList, tlConfig: AnimeListTimelineConfig) {

        this.userName = mal.user.userName;

        this.firstDate = MAL.nullDate;
        this.lastDate = MAL.nullDate;

        const minDate: MAL.Mdate = new MAL.Mdate(tlConfig.minDate);
        const maxDate: MAL.Mdate = new MAL.Mdate(tlConfig.maxDate);
        //assert not null and is valid
        if (minDate.isNullDate() || maxDate.isNullDate() || tlConfig.maxDate.length == 0 || tlConfig.maxDate.length == 0) {
            throw ["Invalid config", tlConfig];
        }


        const callouts: TimelineCalloutV2[] = [];


        for (let anime of mal.anime) {

            // Filter dates and find the extreme of completed anime

            if (anime.myStatus != MAL.Status.Completed) {
                continue;
            }

            const dates: MAL.Mdate[] = AnimeListTimeline.filterInbounds(anime, minDate, maxDate);


            if (dates.length == 0) {
                continue;
            }

            for (let date of dates) { // 1 or 2 iterations
                this.firstDate = date.extremeOfDates(this.firstDate, false);
                this.lastDate = date.extremeOfDates(this.lastDate);
            }


            //make callout
            if (dates.length == 1) {
                const callout: TimelineCalloutV2 = {
                    description: anime.seriesTitle,
                    date: dates[0].fixedDateStr
                };
                callouts.push(callout);
            } else {

                const startLabel: string = "Started " + anime.seriesTitle;
                const finishLabel: string = "finished " + anime.seriesTitle;

                const startCallout: TimelineCalloutV2 = {
                    description: startLabel,
                    date: anime.myStartDate.fixedDateStr,
                    color: startColor
                };
                const endCallout: TimelineCalloutV2 = {
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
        }


    }//End constructor

    //Debug utility
    public getJson() {
        return JSON.stringify(this.data);
    }

    public getDescriptor(): string {
        return [this.userName, this.firstDate.fixedDateStr, this.lastDate.fixedDateStr].join("_");
    }

    //
}

//
