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
    public readonly user: User;
    public readonly anime: Anime[];

    constructor(MALXML: Element) {

        //An invalid username's document will be `<myanimelist/>`
        if (MALXML.childNodes[0].childNodes.length == 0) {
            throw new BadUsernameError();
        }

        let animeList: any = MALXML.getElementsByTagName('anime');
        let userInfo = MALXML.getElementsByTagName('myinfo')[0];

        this.user = new User(userInfo);
        this.anime = [];

        for (let anime of animeList) {
            this.anime.push(new Anime(anime));
        }

    }
}

export class User {
    public userId: number;
    public userName: string;
    // public userExportType:number;
    // public userTotalAnime:number;
    // public userTotalWatching:number;
    // public userTotalCompleted:number;
    // public userTotalOnhold:number;
    // public userTotalDropped:number;
    // public userTotalPlantowatch:number;

    constructor(myinfo: Element) {

        this.userId = parseInt(findText(myinfo, "user_id"));
        this.userName = findText(myinfo, "user_name");
        // this.userExportType = parseInt(findText(myinfo, "user_export_type"));
        // this.userTotalAnime = parseInt(findText(myinfo, "user_total_anime"));
        // this.userTotalWatching = parseInt(findText(myinfo, "user_total_watching"));
        // this.userTotalCompleted = parseInt(findText(myinfo, "user_total_completed"));
        // this.userTotalOnhold = parseInt(findText(myinfo, "user_total_onhold"));
        // this.userTotalDropped = parseInt(findText(myinfo, "user_total_dropped"));
        // this.userTotalPlantowatch = parseInt(findText(myinfo, "user_total_plantowatch"));

    }

}

//immutable
export class Anime {

    public readonly seriesAnimedbId: number;
    public readonly seriesTitle: string;
    public readonly seriesType: string;
    public readonly seriesEpisodes: number;
    public readonly myId: number;
    public readonly myWatchedEpisodes: number;
    public readonly myStartDate: Mdate;
    public readonly myFinishDate: Mdate;
    public readonly myScore: number;
    public readonly myTags: string;
    public readonly myRewatching: number;
    public readonly myRewatchingEp: number;
    public readonly myStatus: number;

    constructor(anime: Element) {
        this.seriesAnimedbId = parseInt(findText(anime, "series_animedb_id"));
        this.seriesTitle = findText(anime, "series_title");
        this.seriesType = findText(anime, "series_type");
        this.seriesEpisodes = parseInt(findText(anime, "series_episodes"));
        this.myId = parseInt(findText(anime, "my_id"));
        this.myWatchedEpisodes = parseInt(findText(anime, "my_watched_episodes"));
        this.myStartDate = new Mdate(findText(anime, "my_start_date"));
        this.myFinishDate = new Mdate(findText(anime, "my_finish_date"));
        this.myScore = parseInt(findText(anime, "my_score"));
        this.myStatus = parseInt(findText(anime, "my_status"));
        this.myTags = findText(anime, "my_tags");
        this.myRewatching = parseInt(findText(anime, "my_rewatching"));
        this.myRewatchingEp = parseInt(findText(anime, "my_rewatching_ep"));
    }

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
    compare(other: string|Mdate): number {
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

export const rawNullDate:string = "0000-00-00";
export const nullDate: Mdate = new Mdate(rawNullDate);

