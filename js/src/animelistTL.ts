//import timeline.ts
import { param } from "jquery";
import { Timeline, TimelineDataV2, TimelineEraV2 as Era } from "../lib/timeline.js";
import { TimelineCalloutV2 } from "../lib/timeline.js";
//import MAL.ts
import * as MAL from "./MAL.js";
// import {MALAnime} from "./MAL";
// import {MALAnimeList} from "./MAL";
// import {MALStatus} from "./MAL";


export const startColor1: string = "#C0C0FF";//blueish
export const startColor2: string = "#0026FF";//blueish
export const endColor: string = "#CD3F85";//reddish
// const bingeColor = "#FFBE89";  // golddish
export const bingeColor = "#000000";  // just black

export enum Season {
    WINTER = "Winter", SPRING = "Spring", SUMMER = "Summer", FALL = "Fall"
}

export const allSeasons = [Season.WINTER, Season.SPRING, Season.SUMMER, Season.FALL];

export function seasonBounds(season: Season, year: number): [MAL.Mdate, MAL.Mdate] {
    switch (season) {
        // TODO better define
        case Season.WINTER: return [MAL.dateFromYMD(year, 1, 1), MAL.dateFromYMD(year, 3, 31)];
        case Season.SPRING: return [MAL.dateFromYMD(year, 4, 1), MAL.dateFromYMD(year, 6, 30)];
        case Season.SUMMER: return [MAL.dateFromYMD(year, 7, 1), MAL.dateFromYMD(year, 9, 30)];
        case Season.FALL: return [MAL.dateFromYMD(year, 10, 1), MAL.dateFromYMD(year, 12, 31)];
    }
}

export function seasonOf(date: MAL.Mdate): Season {
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

export interface AnimeFormatSelection {
    tv: boolean;
    short: boolean;
    movie: boolean;
    special: boolean;
    ova: boolean;
    ona: boolean;
    music: boolean;
}

export interface MangaFormatSelection {
    manga: boolean;
    novel: boolean;
    oneShot: boolean;
}

function filterFormat(format: string, formatSelection?: AnimeFormatSelection | MangaFormatSelection): boolean {
    if (formatSelection) {
        // Idk how to make types happy.
        const selection = formatSelection as any;
        switch (format) {
            case "TV":
                return selection.tv;
            case "TV_SHORT":
                return selection.short;
            case "MOVIE":
                return selection.movie;
            case "SPECIAL":
                return selection.special;
            case "OVA":
                return selection.ova;
            case "ONA":
                return selection.ona;
            case "MUSIC":
                return selection.music;
            case "MANGA":
                return selection.manga;
            case "NOVEL":
                return selection.novel;
            case "ONE_SHOT":
                return selection.oneShot;
        }
    } else {
        return true;
    }
}

export interface MediaFilter {
    /** 
     * When true, only include items present in the filter. 
     * When false, include everything but things in the filter.
     */
    include: boolean;
    entrySet: Set<number>;
}

// I have no idea how I should be expressing this.
// But this doesn't quite seem correct

export enum EventPreference {
    all = "all",
    preferStart = "prefer start",
    preferFinish = "prefer finish",
    startOnly = "start only",
    finishOnly = "finish only",
    bingedOnly = "binged only",

}

export const EventPreferenceDescriptions = {};
EventPreferenceDescriptions[EventPreference.all] =
    "Display both start and finish watching events. " +
    "When the events are on the same date, it will display as binged.";
EventPreferenceDescriptions[EventPreference.preferStart] =
    "If both start and finish dates are available, show only the start date. " +
    "The finish date will still be shown if there is no available start date. ";
EventPreferenceDescriptions[EventPreference.preferFinish] =
    "If both start and finish dates are available, show only the finish date. " +
    "The start date will still be shown if there is no available finish date. ";
EventPreferenceDescriptions[EventPreference.startOnly] =
    "Ignore finish dates and only show start events. " +
    "Titles without start dates will be ignored";
EventPreferenceDescriptions[EventPreference.finishOnly] =
    "Ignore start dates and only show finish events. " +
    "Titles without finish dates will be ignored";
EventPreferenceDescriptions[EventPreference.bingedOnly] =
    "Show only titles where the start and finish dates are the same. ";

// export const EventPreference = {
//     all             : "all",
//     preferStart     : "prefer start",
//     preferFinish    : "prefer finish",
//     startOnly       : "start only",
//     finishOnly      : "finish only",
//     bingedOnly      : "binged only",
// }


export interface AnimeListTimelineConfig {
    userName: string;
    //YYYY-MM-DD
    //Cannot be rawNullDate
    minDate: string;
    maxDate: string;

    lastN: number;

    lang: string;
    seasons: boolean;
    width: number;
    fontSize: number;
    listKind: string;
    animeFormat?: AnimeFormatSelection;
    mangaFormat?: MangaFormatSelection;

    filter: MediaFilter;
    eventPreference: EventPreference;
}

// Be semi human readable serialization, but use as short of keys as reasonable.
// Do not want the url to be unreasonably long.
// Changing these values will break existing links

export const AnimeListTimelineConfigKeys = {
    userName: "n",
    width: "w",
    minDate: "dtS",
    maxDate: "dtF",
    lang: "lang",
    seasons: "era",
    fontSize: "fs",
    listKind: "kind",
}


interface MediaCallout extends TimelineCalloutV2 {
    media: MAL.Media;
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

    public readonly mal: MAL.MediaList;
    public readonly config: AnimeListTimelineConfig;

    public firstDate: MAL.Mdate;
    public lastDate: MAL.Mdate;


    public readonly data: AnimeListTimelineData;

    public readonly userName: string;

    // All the anime in the timeline
    public mediaSet: Array<MAL.Media>;
    // Start and End date in date range
    public boundedSet: Array<MAL.Media>;
    // Not that
    public unboundedSet: Array<MAL.Media>;


    static dateInBounds(date: MAL.Mdate, lb: MAL.Mdate, rb: MAL.Mdate): boolean {
        if (date.isNullDate())
            return false;
        return date.compare(lb) >= 0 && date.compare(rb) <= 0;
    }

    /** Truth mask for start and end watch dates */
    static filterInbounds(start: MAL.Mdate, finish: MAL.Mdate, lb: MAL.Mdate, rb: MAL.Mdate): [boolean, boolean] {

        return [AnimeListTimeline.dateInBounds(start, lb, rb),
        AnimeListTimeline.dateInBounds(finish, lb, rb)];
    }



    constructor(mal: MAL.MediaList, tlConfig: AnimeListTimelineConfig) {

        // good idea? Bad idea? idk.
        this.mal = mal;
        this.config = tlConfig;

        this.mediaSet = [];
        this.boundedSet = [];
        this.unboundedSet = [];

        this.userName = mal.user.userName;

        this.firstDate = MAL.nullDate;
        this.lastDate = MAL.nullDate;

        const minDate: MAL.Mdate = new MAL.Mdate(tlConfig.minDate);
        const maxDate: MAL.Mdate = new MAL.Mdate(tlConfig.maxDate);
        //assert not null and is valid
        if (minDate.isNullDate() || maxDate.isNullDate() || tlConfig.maxDate.length == 0 || tlConfig.maxDate.length == 0) {
            throw ["Invalid config", tlConfig];
        }


        let callouts: MediaCallout[] = [];

        const startColor = !tlConfig.seasons ? startColor1 : startColor2;


        for (let anime of mal.anime) {

            // Could be nice to have a mutable copy of the anime object .
            // Not doing that now though.

            // Put this first for the sake of debugging.
            const title = anime.seriesTitle.preferred(tlConfig.lang);

            // (Weak) Copy dates so that we may choose to ignore them
            let startDate = anime.userStartDate;
            let finishDate = anime.userFinishDate;

            // Filter to watching and completed
            // Unsure if dropped or hold should exist. For now they don't.
            if (anime.userStatus != MAL.Status.Completed && anime.userStatus != MAL.Status.Watching) {
                continue;
            }

            // Filter for media format
            if (!filterFormat(anime.seriesType, tlConfig.animeFormat) && !filterFormat(anime.seriesType, tlConfig.mangaFormat)) {
                continue;
            }

            // Run the title filter
            if (tlConfig.filter.entrySet.size == 0) {
                // pass
            }
            else if (tlConfig.filter.include) {
                if (!tlConfig.filter.entrySet.has(anime.id)) {
                    continue;
                }
            } else {
                if (tlConfig.filter.entrySet.has(anime.id)) {
                    continue;
                }
            }

            //
            // Filter dates... sigh
            //  and find the extreme of completed anime  


            // Pretend unwanted event's dates don't exist and allow the bounds check to work
            if (tlConfig.eventPreference === EventPreference.startOnly) {
                finishDate = MAL.nullDate;
            }
            if (tlConfig.eventPreference === EventPreference.finishOnly) {
                startDate = MAL.nullDate;
            }

            //
            let binged = false;
            if (!(startDate.isNullDate() || finishDate.isNullDate())) {
                const dateOrdering = startDate.compare(finishDate);
                if (dateOrdering > 0) {
                    console.log(title, ": Finished before start.");

                } else if (dateOrdering === 0) {
                    binged = true;
                }
            }

            if (tlConfig.eventPreference === EventPreference.bingedOnly && !binged) {
                continue;
            }


            let boundsMask = AnimeListTimeline.filterInbounds(startDate, finishDate, minDate, maxDate);
            let boundsCount = boundsMask.filter(x => x).length;

            // Neither event is in range
            if (boundsCount == 0) {
                continue;
            }

            // After finding which event dates are within our time span,
            // Keep only the more interesting ones
            if (boundsCount == 2) {
                if (tlConfig.eventPreference === EventPreference.preferStart) {
                    boundsCount = 1;
                    boundsMask[1] = false;
                }
                if (tlConfig.eventPreference === EventPreference.preferFinish) {
                    boundsCount = 1;
                    boundsMask[0] = false;
                }

            }

            //
            if (boundsMask[0]) {
                this.firstDate = startDate.extremeOfDates(this.firstDate, false);
                this.lastDate = startDate.extremeOfDates(this.lastDate);
            }
            if (boundsMask[1]) {
                this.firstDate = finishDate.extremeOfDates(this.firstDate, false);
                this.lastDate = finishDate.extremeOfDates(this.lastDate);
            }

            this.mediaSet.push(anime);


            if (boundsCount == 2) {
                this.boundedSet.push(anime);
            } else {
                this.unboundedSet.push(anime);
            }


            // 
            if (binged) {
                // const label: string = "Binged " + title;
                const label: string = "[B] " + title;
                const callout: MediaCallout = {
                    description: label,
                    date: anime.userStartDate.fixedDateStr,
                    color: bingeColor,
                    media: anime
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



                const startCallout: MediaCallout = {
                    description: startLabel,
                    date: anime.userStartDate.fixedDateStr,
                    color: startColor,
                    media: anime
                };
                const endCallout: MediaCallout = {
                    description: finishLabel,
                    date: anime.userFinishDate.fixedDateStr,
                    color: endColor,
                    media: anime
                };

                if (boundsMask[0])
                    callouts.push(startCallout);
                if (boundsMask[1])
                    callouts.push(endCallout);

            }

        } // END for (let anime of mal.anime)

        if (callouts.length == 0) {
            throw new NoDatedAnimeError();
        }


        // inb4 terrible bugs
        // 1. cutting off the start date didn't change the boundedness


        // Keep only the last n x
        // Should x be anime or activities
        // Because it should be easier, implementing activities
        if (tlConfig.lastN) {
            Timeline.sortCallouts(callouts);

            let newCallouts: MediaCallout[] = [];

            // Get the last n
            let i = 0;
            for (i = callouts.length - 1; i >= 0 && i >= callouts.length - tlConfig.lastN; i--) {
                newCallouts.push(callouts[i]);
            }
            // `i` is now pointing at the next item
            // Get the rest of the activity on the bounded date
            const day = callouts[i + 1].date;
            this.firstDate = new MAL.Mdate(day);
            while (i >= 0 && callouts[i].date === day) {
                newCallouts.push(callouts[i]);
                i--;
            }

            // Now we need to fix the bounded set
            // .. how...
            const trueSet = new Set();
            for (let callout of newCallouts) {
                trueSet.add(callout.media.id);
            }

            const filter = (x: MAL.Media) => trueSet.has(x.id);

            // Reduce the 'open start date' sets to the last n bounds
            this.mediaSet = this.mediaSet.filter(filter);
            this.boundedSet = this.boundedSet.filter(filter);
            this.unboundedSet = this.unboundedSet.filter(filter);

            // Fix boundedness based on new first date
            // Callout text is not changed...
            for (let i = this.boundedSet.length - 1; i >= 0; --i) {
                const anime = this.boundedSet[i];

                if (anime.userStartDate.compare(this.firstDate) < 0) {
                    this.boundedSet.splice(i, 1);
                }
            }



            // We'll be kind to our sort later and fix our reverse ordering
            newCallouts.reverse();
            callouts = newCallouts;



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

        this.data.fontSize = tlConfig.fontSize;


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

export function isAnimeList(list: MAL.MediaArray, listKind: string): list is MAL.Anime[] {
    return listKind === "ANIME";
}

//
