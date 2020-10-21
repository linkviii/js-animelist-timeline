//import timeline.ts
import { param } from "jquery";
import { Timeline, TimelineDataV2, TimelineEraV2 as Era } from "../lib/timeline.js";
import { TimelineCalloutV2 } from "../lib/timeline.js";
//import MAL.ts
import * as MAL from "./MAL.js";
// import {MALAnime} from "./MAL";
// import {MALAnimeList} from "./MAL";
// import {MALStatus} from "./MAL";


const startColor: string = "#C0C0FF";//blueish
const endColor: string = "#CD3F85";//reddish
// const bingeColor = "#FFBE89";  // golddish
const bingeColor = "#000000";  // just black

enum Season {
    WINTER = "Winter", SPRING = "Spring", SUMMER = "Summer", FALL = "Fall"
}

const allSeasons = [Season.WINTER, Season.SPRING, Season.SUMMER, Season.FALL];

function seasonBounds(season: Season, year: number): [MAL.Mdate, MAL.Mdate] {
    switch (season) {
        // TODO better define
        case Season.WINTER: return [MAL.dateFromYMD(year, 1, 1), MAL.dateFromYMD(year, 3, 31)];
        case Season.SPRING: return [MAL.dateFromYMD(year, 4, 1), MAL.dateFromYMD(year, 6, 30)];
        case Season.SUMMER: return [MAL.dateFromYMD(year, 7, 1), MAL.dateFromYMD(year, 9, 30)];
        case Season.FALL: return [MAL.dateFromYMD(year, 10, 1), MAL.dateFromYMD(year, 12, 31)];
    }
}

function seasonOf(date: MAL.Mdate): Season {
    const year = date.year();
    for (let season of allSeasons) {
        const bounds = seasonBounds(season, year);
        if (date.compare(bounds[1]) <= 0) {
            return season;
        }
    }
    console.log("Unexpected");
    return Season.WINTER;
}

// function nextSeason(season: Season): Season {
//     const i = (allSeasons.indexOf(season) + 1) % allSeasons.length;
//     return allSeasons[i];
// }
function nextSeason(season: Season, year: number): [Season, number] {
    const i = (allSeasons.indexOf(season) + 1);
    if (i == allSeasons.length) {
        return [allSeasons[0], year + 1];
    } else {
        return [allSeasons[i], year];
    }
}

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
    lang: string;
    seasons: boolean;
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


    static dateInBounds(date: MAL.Mdate, lb: MAL.Mdate, rb: MAL.Mdate): boolean {
        if (date.isNullDate())
            return false;
        return date.compare(lb) >= 0 && date.compare(rb) <= 0;
    }

    static filterInbounds(anime: MAL.Anime, lb: MAL.Mdate, rb: MAL.Mdate): [boolean, boolean] {

        return [AnimeListTimeline.dateInBounds(anime.myStartDate, lb, rb),
        AnimeListTimeline.dateInBounds(anime.myFinishDate, lb, rb)];
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

            const title = anime.seriesTitle.preferred(tlConfig.lang);

            // Filter dates and find the extreme of completed anime
            if (anime.myStatus != MAL.Status.Completed) {
                continue;
            }

            const bounds = AnimeListTimeline.filterInbounds(anime, minDate, maxDate);
            const boundsCount = bounds.filter(x => x).length;


            if (boundsCount == 0) {
                continue;
            }

            if (bounds[0]) {
                this.firstDate = anime.myStartDate.extremeOfDates(this.firstDate, false);
                this.lastDate = anime.myStartDate.extremeOfDates(this.lastDate);
            }
            if (bounds[1]) {
                this.firstDate = anime.myFinishDate.extremeOfDates(this.firstDate, false);
                this.lastDate = anime.myFinishDate.extremeOfDates(this.lastDate);
            }



            let binged = false;
            if (boundsCount == 2) {
                const cmp = anime.myStartDate.compare(anime.myFinishDate);

                if (cmp > 0) {
                    console.log(title, ": Finished before start.");
                }

                if (cmp === 0) { binged = true; }
            }


            // Todo: Figure out how to deal with known start/stop but out of range

            if (binged) {
                // const label: string = "Binged " + title;
                const label: string = "[B] " + title;
                const callout: TimelineCalloutV2 = {
                    description: label,
                    date: anime.myStartDate.fixedDateStr,
                    color: bingeColor
                };
                callouts.push(callout);
            }
            else {

                // Put an asterisk when one of the dates is not shown.
                const oobStar = boundsCount == 1 ? "*" : "";

                // const startLabel: string = oobStar + "Started " + title;
                const startLabel: string = oobStar + "[S] " + title;
                // const finishLabel: string = oobStar + "finished " + title;
                const finishLabel: string = oobStar + "[F] " + title;

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

                if (bounds[0])
                    callouts.push(startCallout);
                if (bounds[1])
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

        if (tlConfig.seasons) {
            const eras: Era[] = [];

            let season = seasonOf(this.firstDate);
            let year = this.firstDate.year();
            let span: [Season, number] = [season, year];
            let bounds = seasonBounds(season, year);

            eras.push({
                name: season,
                startDate: this.firstDate.fixedDateStr,
                endDate: bounds[1].extremeOfDates(this.lastDate, false).fixedDateStr
            });
            while (bounds[1].compare(this.lastDate) < 0) {
                span = nextSeason(...span);
                bounds = seasonBounds(...span);
                eras.push({
                    name: span[0],
                    startDate: bounds[0].fixedDateStr,
                    endDate: bounds[1].extremeOfDates(this.lastDate, false).fixedDateStr
                });
            }
            this.data.eras = eras;
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
