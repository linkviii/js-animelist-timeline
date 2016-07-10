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
var nullDate = "0000-00-00";
var STATUSES = {
    watching: "Watching",
    completed: "Completed",
    onHold: "On-Hold",
    dropped: "Dropped",
    planToWatch: "Plan to Watch"
};
var MALAnimeList = (function () {
    function MALAnimeList(MALXML) {
        var animeList = MALXML.getElementsByTagName('anime');
        var userInfo = MALXML.getElementsByTagName('myinfo')[0];
        this.user = new MALUser(userInfo);
        this.anime = [];
        for (var _i = 0, animeList_1 = animeList; _i < animeList_1.length; _i++) {
            var anime = animeList_1[_i];
            this.anime.push(new MALAnime(anime));
        }
    }
    return MALAnimeList;
}());
var MALUser = (function () {
    function MALUser(myinfo) {
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
    return MALUser;
}());
var MALAnime = (function () {
    function MALAnime(anime) {
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
    MALAnime.prototype.isDated = function () {
        return !this.myStartDate.isNullDate() || !this.myFinishDate.isNullDate();
    };
    /**
     * Returns the single date if there is only one or false.
     * @returns {string|boolean}
     */
    MALAnime.prototype.hasOneDate = function () {
        var one = this.myStartDate.fixedDateStr == this.myFinishDate.fixedDateStr
            || this.myStartDate.isNullDate() || this.myFinishDate.isNullDate();
        if (!one) {
            return false;
        }
        if (this.myStartDate.isNullDate()) {
            return this.myFinishDate.fixedDateStr;
        }
        //this.myFinishDate.isNullDate()
        return this.myStartDate.fixedDateStr;
    };
    return MALAnime;
}());
var MALDate = (function () {
    //public date:Date;
    function MALDate(date) {
        this.rawDateStr = date;
        this.fixedDateStr = MALDate.fixDate(date);
    }
    MALDate.prototype.isNullDate = function () {
        return this.rawDateStr == nullDate;
    };
    MALDate.fixDate = function (dateStr) {
        //console.log(dateStr)
        // const dateStr:string = this.rawDateStr;
        if (dateStr == nullDate) {
            return nullDate;
        }
        var m = dateStr.slice(5, 7);
        if (m == '00')
            m = '01';
        var d = dateStr.slice(8);
        if (d == '00')
            d = '01';
        return dateStr.slice(0, 5) + m + '-' + d;
    };
    MALDate.prototype.fixDate = function () {
        var dateStr = this.rawDateStr;
        if (dateStr == nullDate) {
            return nullDate;
        }
        var m = dateStr.slice(5, 7);
        if (m == '00')
            m = '01';
        var d = dateStr.slice(8);
        if (d == '00')
            d = '01';
        return dateStr.slice(0, 5) + m + '-' + d;
    };
    /**
     * Compare date strings that could be null
     * @param d2 string
     * @param findMax bool
     * @returns string
     */
    MALDate.prototype.compareRawDate = function (d2, findMax) {
        if (findMax === void 0) { findMax = true; }
        var d1 = this.rawDateStr;
        if (d1 == nullDate && d2 == nullDate) {
            return nullDate;
        }
        else if (d1 == nullDate) {
            return MALDate.fixDate(d2);
        }
        else if (d2 == nullDate) {
            return MALDate.fixDate(d1);
        }
        d1 = MALDate.fixDate(d1);
        d2 = MALDate.fixDate(d2);
        if (d1 == d2) {
            return d1;
        }
        var dt1 = new Date(d1);
        var dt2 = new Date(d2);
        var v = dt1 > dt2;
        if ((findMax && v) || (!findMax && !v)) {
            return d1;
        }
        else {
            return d2;
        }
    };
    return MALDate;
}());
//# sourceMappingURL=MAL.js.map