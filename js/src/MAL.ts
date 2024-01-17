/**

 *
 */

import { assertUnreachable } from "./util.js";

type BaseObject = Record<string, string>;


type ValuesAsKeys<T extends BaseObject> = {
    [K in keyof T as T[K]]: number;
};

type Values<T> = T[keyof T];


/**
 *Exported list gave status as a string.
 */
export const STATUSES = {

    watching: "Watching",
    completed: "Completed",
    onHold: "On-Hold",
    dropped: "Dropped",
    planToWatch: "Plan to Watch"

} as const;

/**
 * MAL API gives a number. What ever happened to 5?
 */
export enum Status {
    Watching = 1,
    Completed = 2,
    OnHold = 3,
    Dropped = 4,
    PlanToWatch = 6
}

function statusFromAniList(status: string): Status {
    switch (status) {
        case "CURRENT": return Status.Watching;
        case "PLANNING": return Status.PlanToWatch;
        case "COMPLETED": return Status.Completed;
        case "DROPPED": return Status.Dropped;
        case "PAUSED": return Status.OnHold;
        // Idk
        case "REPEATING": return Status.Completed;

    }
    return null;
}
function statusFromMALExport(status: Values<typeof STATUSES>): Status {
    switch (status) {
        case STATUSES.watching: return Status.Watching;
        case STATUSES.planToWatch: return Status.PlanToWatch;
        case STATUSES.completed: return Status.Completed;
        case STATUSES.dropped: return Status.Dropped;
        case STATUSES.onHold: return Status.OnHold;
        default:
            console.warn(`Unexpected MAL status ${status}`);
            assertUnreachable(status);
    }
}

export class BadUsernameError extends Error {
}

export class AnimeList {

    cached = false;

    constructor(
        public user: User,
        public anime: Anime[],
        public namedLists: Record<string, number[]>
    ) {

    }
}

export class MangaList {
    cached = false;
    constructor(
        public user: User,
        public anime: Manga[],
    ) { }
}





export function mangaListFromAniList(obj, userName: string): MangaList {
    const user = userFromAniList(obj.user, userName);

    const userLists = obj.lists;
    const allAnime = [];

    for (let list of userLists) {
        const status = statusFromAniList(list.status);
        for (let anime of list.entries) {
            allAnime.push(mangaFromAniList(anime, status));
        }
    }
    return new MangaList(user, allAnime);
}

function tagTxt(parent: Element, tag: string): string {
    return parent.getElementsByTagName(tag)[0].textContent;
}

function userFromMALExport(myinfo: Element): User {
    return {
        userName: tagTxt(myinfo, "user_name"),
        userId: parseInt(tagTxt(myinfo, "user_id"))
    };
}
function animeFromMALExport(tag: Element): Anime {
    const title = new Title({ userPreferred: tagTxt(tag, "series_title") });
    const status = statusFromMALExport(tagTxt(tag, "my_status") as any);
    return {
        id: parseInt(tagTxt(tag, "series_animedb_id")),
        seriesTitle: title,
        seriesType: tagTxt(tag, "series_type"),
        seriesEpisodes: parseInt(tagTxt(tag, "series_episodes")),
        seriesEpisodesDuration: 0,
        seriesStart: nullDate,
        seriesEnd: nullDate,
        userStartDate: new Mdate(tagTxt(tag, "my_start_date")),
        userFinishDate: new Mdate(tagTxt(tag, "my_finish_date")),
        userScore: parseInt(tagTxt(tag, "my_score")),
        userWatchedEpisodes: parseInt(tagTxt(tag, "my_watched_episodes")),
        userStatus: status

    };
}

export function animeListFromMALExport(xml: Document): AnimeList {
    const user = userFromMALExport(xml.getElementsByTagName("myinfo")[0]);
    const animeList = [];
    for (const animeTag of xml.getElementsByTagName("anime")) {
        const anime = animeFromMALExport(animeTag);
        animeList.push(anime);
    }
    const namedLists = {};

    return new AnimeList(user, animeList, namedLists);
}

export function animeListFromAniList(obj, userName: string): AnimeList {


    const user = userFromAniList(obj.user, userName);

    const userLists = obj.lists;
    const allAnime = [];

    const otherLists = {};

    for (let list of userLists) {
        const status = statusFromAniList(list.status);
        if (null != status) {
            for (let anime of list.entries) {
                allAnime.push(animeFromAniList(anime, status));
            }
        } else {
            const tmp = [];
            for (let anime of list.entries) {
                tmp.push(anime.mediaId);
            }
            otherLists[list.name] = tmp;

        }
    }
    return new AnimeList(user, allAnime, otherLists);
}

export interface User {
    userId: number;
    userName: string;
}



function userFromAniList(obj, name: string): User {
    return { userId: obj.id, userName: name, };
}

interface ITitle {
    english?: string;
    userPreferred?: string;
    romaji?: string;
    native?: string;
}

export class Title implements ITitle {
    public english?: string;
    public userPreferred?: string;
    public romaji?: string;
    public native?: string;

    constructor(it: ITitle) {
        this.english = it.english;
        this.userPreferred = it.userPreferred;
        this.romaji = it.romaji;
        this.native = it.native;
    }

    preferredEnglish(): string {
        const order = [this.english, this.userPreferred, this.romaji, this.native];
        return order.filter(x => x)[0];
    }

    preferredRomaji(): string {
        const order = [this.romaji, this.userPreferred, this.english, this.native];
        return order.filter(x => x)[0];
    }

    preferredNative(): string {
        const order = [this.native, this.romaji, this.userPreferred, this.english];
        return order.filter(x => x)[0];
    }

    preferred(key: string | "english" | "romaji" | "native"): string {
        switch (key) {
            case "english": return this.preferredEnglish();
            case "romaji": return this.preferredRomaji();
            case "native": return this.preferredNative();
            default: throw "Key error";
        }
    }

}

interface IMedia {
    seriesTitle: Title;
    seriesType: string;
    id: number;
    seriesStart: Mdate;
    seriesEnd: Mdate;

    userStartDate: Mdate;
    userFinishDate: Mdate;
    userStatus: number;
}

export interface Anime extends IMedia {

    seriesEpisodes: number;
    seriesEpisodesDuration: number;

    userWatchedEpisodes: number;
    userScore: number;

}

export interface Manga extends IMedia {


}

type GraphMedia = any;

function mediaFromAniList(obj: GraphMedia, status: Status): IMedia {
    const titleObj = new Title(obj.media.title);


    return {
        seriesTitle: titleObj,
        seriesType: obj.media.format,
        seriesStart: dateFromAniList(obj.media.startDate),
        seriesEnd: dateFromAniList(obj.media.endDate),
        id: obj.mediaId,

        userStartDate: dateFromAniList(obj.startedAt),
        userFinishDate: dateFromAniList(obj.completedAt),
        userStatus: status,
    };
}

function mangaFromAniList(obj: GraphMedia, status: Status): Manga {
    const base = mediaFromAniList(obj, status);
    return base;
}

function animeFromAniList(anime: GraphMedia, status: Status): Anime {

    const base = mediaFromAniList(anime, status);

    const tmp: Omit<Anime, keyof IMedia> = {
        seriesEpisodes: anime.media.episodes,
        seriesEpisodesDuration: anime.media.duration,

        userScore: anime.score,
        userWatchedEpisodes: anime.progress,

    };

    const it: Anime = { ...base, ...tmp };

    if (it.userStartDate.isNullDate() && it.seriesEpisodes == 1 && !it.userFinishDate.isNullDate()) {
        it.userStartDate = it.userFinishDate;
    }

    return it;
}



export function dateFromYMD(year: null | number, month: null | number, day: null | number): Mdate {
    const fmt = x => x ? x.toString().padStart(2, "0") : "00";
    const ys = year || "0000";
    const dstring = `${ys}-${fmt(month)}-${fmt(day)}`;
    return new Mdate(dstring);
}

function dateFromAniList(obj): Mdate {
    return dateFromYMD(obj.year, obj.month, obj.day);
}

export class Mdate {
    /*
     * YYYY-MM-DD
     * MM and DD can be 00 but YYYY must be a year
     */


    public readonly rawDateStr: string;
    public readonly fixedDateStr: string;

    /**
     * Available only if not nullDate
     */
    public readonly date: Date;

    constructor(date: string) {

        //@assume valid string

        this.rawDateStr = date;
        this.fixedDateStr = Mdate.fixDate(date);
        if (this.rawDateStr != rawNullDate) {
            this.date = new Date(this.fixedDateStr);
        }
    }

    isNullDate(): boolean {
        return this.rawDateStr == rawNullDate;
    }

    static fixDate(dateStr: string): string {
        if (dateStr == rawNullDate) {
            return rawNullDate;
        }

        let m: string = dateStr.slice(5, 7);
        if (m == '00') m = '01';
        let d: string = dateStr.slice(8);
        if (d == '00') d = '01';

        return dateStr.slice(0, 5) + m + '-' + d;
    }

    year(): number {
        // return this.date.getFullYear();
        return parseInt(this.fixedDateStr.slice(0, 4));
    }

    month(): number {
        return parseInt(this.fixedDateStr.slice(5, 7));
    }

    /**
     *  this > other → +
     *  this < other → -
     *
     *  can't use on null dates (?)
     *
     * @param other
     * @returns {number}
     */
    compare(other: string | Mdate): number {
        let d2: Mdate;
        if (typeof other === "string") {
            d2 = new Mdate(other);
        } else {
            d2 = other;
        }

        //assert not null?
        if (this.isNullDate() || d2.isNullDate()) {
            throw "Can't compare null dates";
        }


        if (this.fixedDateStr == d2.fixedDateStr) {
            return 0;
        }

        return this.date.valueOf() - d2.date.valueOf();

    }


    // Select max/min of possibly null dates
    extremeOfDates(d2: Mdate, findMax: boolean = true): Mdate {

        if (this.isNullDate() && d2.isNullDate()) {
            return nullDate;
        } else if (this.isNullDate()) {
            return d2;
        } else if (d2.isNullDate()) {
            return this;
        }

        let val: number = this.compare(d2);

        if (val == 0) {
            return this;
        }

        if (!findMax) {
            val = -val;
        }

        if (val > 0) {
            return this;
        } else {//if (val < 0){
            return d2;
        }

    }

    inBounds(lb: Mdate, rb: Mdate): boolean {
        const date = this;
        if (date.isNullDate())
            return false;
        return date.compare(lb) >= 0 && date.compare(rb) <= 0;
    }

}

export const rawNullDate: string = "0000-00-00";
export const nullDate: Mdate = new Mdate(rawNullDate);


export type Media = Anime | Manga;
export type MediaArray = Anime[] | Manga[];
export type MediaList = AnimeList | MangaList;