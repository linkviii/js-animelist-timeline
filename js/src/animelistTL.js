import { Timeline } from "../lib/timeline.js";
//import MAL.ts
import * as MAL from "./MAL.js";
// import {MALAnime} from "./MAL";
// import {MALAnimeList} from "./MAL";
// import {MALStatus} from "./MAL";
export const startColor1 = "#C0C0FF"; //blueish
export const startColor2 = "#0026FF"; //blueish
export const endColor = "#CD3F85"; //reddish
// const bingeColor = "#FFBE89";  // golddish
export const bingeColor = "#000000"; // just black
export var Season;
(function (Season) {
    Season["WINTER"] = "Winter";
    Season["SPRING"] = "Spring";
    Season["SUMMER"] = "Summer";
    Season["FALL"] = "Fall";
})(Season || (Season = {}));
export const allSeasons = [Season.WINTER, Season.SPRING, Season.SUMMER, Season.FALL];
export function seasonBounds(season, year) {
    switch (season) {
        // TODO better define
        case Season.WINTER: return [MAL.dateFromYMD(year, 1, 1), MAL.dateFromYMD(year, 3, 31)];
        case Season.SPRING: return [MAL.dateFromYMD(year, 4, 1), MAL.dateFromYMD(year, 6, 30)];
        case Season.SUMMER: return [MAL.dateFromYMD(year, 7, 1), MAL.dateFromYMD(year, 9, 30)];
        case Season.FALL: return [MAL.dateFromYMD(year, 10, 1), MAL.dateFromYMD(year, 12, 31)];
    }
}
export function seasonOf(date) {
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
function nextSeason(season, year) {
    const i = (allSeasons.indexOf(season) + 1);
    if (i == allSeasons.length) {
        return [allSeasons[0], year + 1];
    }
    else {
        return [allSeasons[i], year];
    }
}
export class NoDatedAnimeError extends Error {
}
function filterFormat(format, formatSelection) {
    if (formatSelection) {
        // Idk how to make types happy.
        const selection = formatSelection;
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
    }
    else {
        return false;
    }
}
// I have no idea how I should be expressing this.
// But this doesn't quite seem correct
export var EventPreference;
(function (EventPreference) {
    EventPreference["all"] = "all";
    EventPreference["preferStart"] = "prefer start";
    EventPreference["preferFinish"] = "prefer finish";
    EventPreference["startOnly"] = "start only";
    EventPreference["finishOnly"] = "finish only";
    EventPreference["bingedOnly"] = "binged only";
})(EventPreference || (EventPreference = {}));
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
};
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
        // good idea? Bad idea? idk.
        this.mal = mal;
        this.config = tlConfig;
        this.mediaSet = [];
        this.boundedSet = [];
        this.unboundedSet = [];
        this.userName = mal.user.userName;
        this.firstDate = MAL.nullDate;
        this.lastDate = MAL.nullDate;
        const minDate = new MAL.Mdate(tlConfig.minDate);
        const maxDate = new MAL.Mdate(tlConfig.maxDate);
        //assert not null and is valid
        if (minDate.isNullDate() || maxDate.isNullDate() || tlConfig.maxDate.length == 0 || tlConfig.maxDate.length == 0) {
            throw ["Invalid config", tlConfig];
        }
        let callouts = [];
        const startColor = !tlConfig.seasons ? startColor1 : startColor2;
        for (let anime of mal.anime) {
            // Could be nice to have a mutable copy of the anime object .
            // Not doing that now though.
            // Put this first for the sake of debugging.
            const title = anime.seriesTitle.preferred(tlConfig.lang);
            // (Weak) Copy dates so that we may choose to ignore them
            let startDate = anime.myStartDate;
            let finishDate = anime.myFinishDate;
            // Filter to watching and completed
            // Unsure if dropped or hold should exist. For now they don't.
            if (anime.myStatus != MAL.Status.Completed && anime.myStatus != MAL.Status.Watching) {
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
                if (!tlConfig.filter.entrySet.has(anime.myId)) {
                    continue;
                }
            }
            else {
                if (tlConfig.filter.entrySet.has(anime.myId)) {
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
                }
                else if (dateOrdering === 0) {
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
            }
            else {
                this.unboundedSet.push(anime);
            }
            // 
            if (binged) {
                // const label: string = "Binged " + title;
                const label = "[B] " + title;
                const callout = {
                    description: label,
                    date: anime.myStartDate.fixedDateStr,
                    color: bingeColor,
                    media: anime
                };
                callouts.push(callout);
            }
            else {
                // Put an asterisk when one of the dates is not shown.
                const oobStar = boundsCount == 1 ? "*" : "";
                // const startLabel: string = oobStar + "Started " + title;
                const startLabel = oobStar + "[S] " + title;
                // const finishLabel: string = oobStar + "finished " + title;
                const finishLabel = oobStar + "[F] " + title;
                const startCallout = {
                    description: startLabel,
                    date: anime.myStartDate.fixedDateStr,
                    color: startColor,
                    media: anime
                };
                const endCallout = {
                    description: finishLabel,
                    date: anime.myFinishDate.fixedDateStr,
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
            let newCallouts = [];
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
                trueSet.add(callout.media.myId);
            }
            const filter = (x) => trueSet.has(x.myId);
            // Reduce the 'open start date' sets to the last n bounds
            this.mediaSet = this.mediaSet.filter(filter);
            this.boundedSet = this.boundedSet.filter(filter);
            this.unboundedSet = this.unboundedSet.filter(filter);
            // Fix boundedness based on new first date
            // Callout text is not changed...
            for (let i = this.boundedSet.length - 1; i >= 0; --i) {
                const anime = this.boundedSet[i];
                if (anime.myStartDate.compare(this.firstDate) < 0) {
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
        };
        if (tlConfig.seasons) {
            const eras = [];
            let season = seasonOf(this.firstDate);
            let year = this.firstDate.year();
            let span = [season, year];
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
    } //End constructor
    static dateInBounds(date, lb, rb) {
        if (date.isNullDate())
            return false;
        return date.compare(lb) >= 0 && date.compare(rb) <= 0;
    }
    /** Truth mask for start and end watch dates */
    static filterInbounds(start, finish, lb, rb) {
        return [AnimeListTimeline.dateInBounds(start, lb, rb),
            AnimeListTimeline.dateInBounds(finish, lb, rb)];
    }
    //Debug utility
    getJson() {
        return JSON.stringify(this.data);
    }
    getDescriptor() {
        return [this.userName, this.firstDate.fixedDateStr, this.lastDate.fixedDateStr].join("_");
    }
}
export function isAnimeList(list, listKind) {
    return listKind === "ANIME";
}
//
//# sourceMappingURL=animelistTL.js.map