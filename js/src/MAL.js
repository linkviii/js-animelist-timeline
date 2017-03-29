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
define(["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    // XML parsing util
    function findText(parentTag, childName) {
        return parentTag.getElementsByTagName(childName)[0].textContent;
    }
    /**
     *Exported list gave status as a string.
     */
    exports.STATUSES = {
        watching: "Watching",
        completed: "Completed",
        onHold: "On-Hold",
        dropped: "Dropped",
        planToWatch: "Plan to Watch"
    };
    /**
     * The API gives a number. What ever happened to 5?
     */
    var Status;
    (function (Status) {
        Status[Status["Watching"] = 1] = "Watching";
        Status[Status["Completed"] = 2] = "Completed";
        Status[Status["OnHold"] = 3] = "OnHold";
        Status[Status["Dropped"] = 4] = "Dropped";
        Status[Status["PlanToWatch"] = 6] = "PlanToWatch";
    })(Status = exports.Status || (exports.Status = {}));
    class BadUsernameError extends Error {
    }
    exports.BadUsernameError = BadUsernameError;
    class AnimeList {
        constructor(MALXML) {
            //An invalid username's document will be `<myanimelist/>`
            if (MALXML.childNodes[0].childNodes.length == 0) {
                throw new BadUsernameError();
            }
            let animeList = MALXML.getElementsByTagName('anime');
            let userInfo = MALXML.getElementsByTagName('myinfo')[0];
            this.user = new User(userInfo);
            this.anime = [];
            for (let anime of animeList) {
                this.anime.push(new Anime(anime));
            }
        }
    }
    exports.AnimeList = AnimeList;
    class User {
        // public userExportType:number;
        // public userTotalAnime:number;
        // public userTotalWatching:number;
        // public userTotalCompleted:number;
        // public userTotalOnhold:number;
        // public userTotalDropped:number;
        // public userTotalPlantowatch:number;
        constructor(myinfo) {
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
    exports.User = User;
    //immutable
    class Anime {
        constructor(anime) {
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
    exports.Anime = Anime;
    class Mdate {
        constructor(date) {
            //@assume valid string
            this.rawDateStr = date;
            this.fixedDateStr = Mdate.fixDate(date);
            if (this.rawDateStr != exports.rawNullDate) {
                this.date = new Date(this.fixedDateStr);
            }
        }
        isNullDate() {
            return this.rawDateStr == exports.rawNullDate;
        }
        static fixDate(dateStr) {
            if (dateStr == exports.rawNullDate) {
                return exports.rawNullDate;
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
         *  this > other → +
         *  this < other → -
         *
         *  can't use on null dates (?)
         *
         * @param other
         * @returns {number}
         */
        compare(other) {
            let d2;
            if (typeof other === "string") {
                d2 = new Mdate(other);
            }
            else {
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
        extremeOfDates(d2, findMax = true) {
            if (this.isNullDate() && d2.isNullDate()) {
                return exports.nullDate;
            }
            else if (this.isNullDate()) {
                return d2;
            }
            else if (d2.isNullDate()) {
                return this;
            }
            let val = this.compare(d2);
            if (val == 0) {
                return this;
            }
            if (!findMax) {
                val = -val;
            }
            if (val > 0) {
                return this;
            }
            else {
                return d2;
            }
        }
    }
    exports.Mdate = Mdate;
    exports.rawNullDate = "0000-00-00";
    exports.nullDate = new Mdate(exports.rawNullDate);
});
//# sourceMappingURL=MAL.js.map