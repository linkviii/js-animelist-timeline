/**
 * Abstraction of MAL's XML
 */
/**
 *
 * @param parentTag
 * @param childName
 * @returns {string}
 */
function findText(parentTag, childName) {
    return parentTag.getElementsByTagName(childName)[0].textContent;
}
const rawNullDate = "0000-00-00";
const STATUSES = {
    watching: "Watching",
    completed: "Completed",
    onHold: "On-Hold",
    dropped: "Dropped",
    planToWatch: "Plan to Watch"
};
class MALAnimeList {
    constructor(MALXML) {
        let animeList = MALXML.getElementsByTagName('anime');
        let userInfo = MALXML.getElementsByTagName('myinfo')[0];
        this.user = new MALUser(userInfo);
        this.anime = [];
        for (let anime of animeList) {
            this.anime.push(new MALAnime(anime));
        }
    }
}
class MALUser {
    constructor(myinfo) {
        this.userId = parseInt(findText(myinfo, "user_id"));
        this.userName = findText(myinfo, "user_name");
        this.userExportType = parseInt(findText(myinfo, "user_export_type"));
        this.userTotalAnime = parseInt(findText(myinfo, "user_total_anime"));
        this.userTotalWatching = parseInt(findText(myinfo, "user_total_watching"));
        this.userTotalCompleted = parseInt(findText(myinfo, "user_total_completed"));
        this.userTotalOnhold = parseInt(findText(myinfo, "user_total_onhold"));
        this.userTotalDropped = parseInt(findText(myinfo, "user_total_dropped"));
        this.userTotalPlantowatch = parseInt(findText(myinfo, "user_total_plantowatch"));
    }
}
class MALAnime {
    constructor(anime) {
        this.seriesAnimedbId = parseInt(findText(anime, "series_animedb_id"));
        this.seriesTitle = findText(anime, "series_title");
        this.seriesType = findText(anime, "series_type");
        this.seriesEpisodes = parseInt(findText(anime, "series_episodes"));
        this.myId = parseInt(findText(anime, "my_id"));
        this.myWatchedEpisodes = parseInt(findText(anime, "my_watched_episodes"));
        this.myStartDate = new MALDate(findText(anime, "my_start_date"));
        this.myFinishDate = new MALDate(findText(anime, "my_finish_date"));
        this.myRated = findText(anime, "my_rated");
        this.myScore = parseInt(findText(anime, "my_score"));
        this.myDvd = findText(anime, "my_dvd");
        this.myStorage = findText(anime, "my_storage");
        this.myStatus = findText(anime, "my_status");
        this.myComments = findText(anime, "my_comments");
        this.myTimesWatched = parseInt(findText(anime, "my_times_watched"));
        this.myRewatchValue = findText(anime, "my_rewatch_value");
        this.myDownloadedEps = parseInt(findText(anime, "my_downloaded_eps"));
        this.myTags = findText(anime, "my_tags");
        this.myRewatching = parseInt(findText(anime, "my_rewatching"));
        this.myRewatchingEp = parseInt(findText(anime, "my_rewatching_ep"));
        this.updateOnImport = parseInt(findText(anime, "update_on_import"));
    }
    isDated() {
        return !this.myStartDate.isNullDate() || !this.myFinishDate.isNullDate();
    }
    adjustDates(minDate, maxDate) {
        if (this.myStartDate.extremeOfDates(minDate)) {
            this.myStartDate = nullDate;
        }
        //TODO
    }
    /**
     * Returns the single date if there is only one or false.
     * @returns {string|boolean}
     */
    hasOneDate() {
        const one = this.myStartDate.fixedDateStr == this.myFinishDate.fixedDateStr
            || this.myStartDate.isNullDate() || this.myFinishDate.isNullDate();
        if (!one) {
            return false;
        }
        if (this.myStartDate.isNullDate()) {
            return this.myFinishDate.fixedDateStr;
        }
        //this.myFinishDate.isNullDate()
        return this.myStartDate.fixedDateStr;
    }
}
class MALDate {
    //public date:Date;
    constructor(date) {
        this.rawDateStr = date;
        this.fixedDateStr = MALDate.fixDate(date);
    }
    isNullDate() {
        return this.rawDateStr == rawNullDate;
    }
    static fixDate(dateStr) {
        //console.log(dateStr)
        // const dateStr:string = this.rawDateStr;
        if (dateStr == rawNullDate) {
            return rawNullDate;
        }
        let m = dateStr.slice(5, 7);
        if (m == '00')
            m = '01';
        let d = dateStr.slice(8);
        if (d == '00')
            d = '01';
        return dateStr.slice(0, 5) + m + '-' + d;
    }
    /**
     *  this > other -> +
     *  this < other -> -
     * @param other
     * @returns {number}
     */
    compare(other) {
        let d1 = this.rawDateStr;
        let d2;
        if (typeof other === "string") {
            d2 = other;
        }
        else {
            d2 = other.rawDateStr;
        }
        /* -- selecting not null here was not working for extremeOfDates
         // if (d1 == rawNullDate && d2 == rawNullDate) {
         //    p(0)
         //     return 0;
         // } else if (d1 == rawNullDate) {
         //     p(-1)
         //     return -1;
         // } else if (d2 == rawNullDate) {
         //     p(1)
         //     return 1;
         // }
         */
        d1 = MALDate.fixDate(d1);
        d2 = MALDate.fixDate(d2);
        if (d1 == d2) {
            return 0;
        }
        const dt1 = new Date(d1);
        const dt2 = new Date(d2);
        return dt1.valueOf() - dt2.valueOf();
    }
    /**
     * Compare date strings that could be null
     * @param d2 string
     * @param findMax bool
     * @returns string
     */
    extremeOfDates(d2, findMax = true) {
        if (this.rawDateStr == rawNullDate && d2 == rawNullDate) {
            return rawNullDate;
        }
        else if (this.rawDateStr == rawNullDate) {
            return MALDate.fixDate(d2);
        }
        else if (d2 == rawNullDate) {
            return this.fixedDateStr;
        }
        //console.log(d2)
        let val = this.compare(d2);
        if (val == 0) {
            return this.fixedDateStr;
        }
        if (!findMax) {
            val = -val;
        }
        if (val > 0) {
            return this.fixedDateStr;
        }
        else {
            return MALDate.fixDate(d2);
        }
    }
}
const nullDate = new MALDate(rawNullDate);
//# sourceMappingURL=MAL.js.map