/**
 * Abstraction of MAL's API XML
 *
 * Note the api produces different XML than the export tool on the site.
 * Commented fields are from the exported format. I wasn't using them anyway.
 *
 * Example api url:
 * http://myanimelist.net/malappinfo.php?u=linkviii&status=all&type=anime
 *
 * Utilities for dealing with the dates are included.
 *
 */


// XML parsing util
function findText(parentTag: Element, childName: string): string {
    return parentTag.getElementsByTagName(childName)[0].textContent;
}


/**
 *Exported list gave status as a string.
 */
export const STATUSES = {

    watching: "Watching",
    completed: "Completed",
    onHold: "On-Hold",
    dropped: "Dropped",
    planToWatch: "Plan to Watch"

};

/**
 * The API gives a number. What ever happened to 5?
 */
export enum Status {
    Watching = 1,
    Completed = 2,
    OnHold = 3,
    Dropped = 4,
    PlanToWatch = 6
}

export class BadUsernameError extends Error {
}

export class AnimeList {
    public user: User;
    public anime: Anime[];


}

export function animeListFromMalElm(MALXML: Element): AnimeList {
    //An invalid username's document will be `<myanimelist/>`
    if (MALXML.childNodes[0].childNodes.length == 0) {
        throw new BadUsernameError();
    }

    const animeList: any = MALXML.getElementsByTagName('anime');
    const userInfo = MALXML.getElementsByTagName('myinfo')[0];

    const user = userFromMalElm(userInfo);
    const anime = [];

    for (let elm of animeList) {
        anime.push(animeFromMalElm(elm));
    }

    return { user: user, anime: anime };


}

export class User {
    public userId: number;
    public userName: string;
}

function userFromMalElm(myinfo: Element): User {
    return {
        userId: parseInt(findText(myinfo, "user_id")),
        userName: findText(myinfo, "user_name"),
    };
}

//immutable
export class Anime {

    public seriesAnimedbId: number;
    public seriesTitle: string;
    public seriesType: string;
    public seriesEpisodes: number;
    public myId: number;
    public myWatchedEpisodes: number;
    public myStartDate: Mdate;
    public myFinishDate: Mdate;
    public myScore: number;
    public myTags: string;
    public myRewatching: number;
    public myRewatchingEp: number;
    public myStatus: number;



}

function animeFromMalElm(anime: Element): Anime {
    return {
        seriesAnimedbId: parseInt(findText(anime, "series_animedb_id")),
        seriesTitle: findText(anime, "series_title"),
        seriesType: findText(anime, "series_type"),
        seriesEpisodes: parseInt(findText(anime, "series_episodes")),
        myId: parseInt(findText(anime, "my_id")),
        myWatchedEpisodes: parseInt(findText(anime, "my_watched_episodes")),
        myStartDate: new Mdate(findText(anime, "my_start_date")),
        myFinishDate: new Mdate(findText(anime, "my_finish_date")),
        myScore: parseInt(findText(anime, "my_score")),
        myStatus: parseInt(findText(anime, "my_status")),
        myTags: findText(anime, "my_tags"),
        myRewatching: parseInt(findText(anime, "my_rewatching")),
        myRewatchingEp: parseInt(findText(anime, "my_rewatching_ep")),
    };

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

}

export const rawNullDate: string = "0000-00-00";
export const nullDate: Mdate = new Mdate(rawNullDate);

