/**

 *
 */
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
 * MAL API gives a number. What ever happened to 5?
 */
export var Status;
(function (Status) {
    Status[Status["Watching"] = 1] = "Watching";
    Status[Status["Completed"] = 2] = "Completed";
    Status[Status["OnHold"] = 3] = "OnHold";
    Status[Status["Dropped"] = 4] = "Dropped";
    Status[Status["PlanToWatch"] = 6] = "PlanToWatch";
})(Status || (Status = {}));
function statusFromAniList(status) {
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
export class BadUsernameError extends Error {
}
export class AnimeList {
    constructor(user, anime) {
        this.user = user;
        this.anime = anime;
    }
}
export class MangaList {
}
export function mangaListFromAniList(obj, userName) {
    const user = userFromAniList(obj.user, userName);
    const userLists = obj.lists;
    const allAnime = [];
    for (let list of userLists) {
        const status = statusFromAniList(list.status);
        for (let anime of list.entries) {
            allAnime.push(mangaFromAniList(anime, status));
        }
    }
    return { user: user, anime: allAnime };
}
export function animeListFromAniList(obj, userName) {
    //
    // FIX THIS ugh
    //
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
        }
        else {
            const tmp = [];
            for (let anime of list.entries) {
                tmp.push(anime.mediaId);
            }
            otherLists[list.name] = tmp;
        }
    }
    return new AnimeList(user, allAnime);
}
function userFromAniList(obj, name) {
    return { userId: obj.id, userName: name, };
}
export class Title {
    constructor(it) {
        this.english = it.english;
        this.userPreferred = it.userPreferred;
        this.romaji = it.romaji;
        this.native = it.native;
    }
    preferredEnglish() {
        const order = [this.english, this.userPreferred, this.romaji, this.native];
        return order.filter(x => x)[0];
    }
    preferredRomaji() {
        const order = [this.romaji, this.userPreferred, this.english, this.native];
        return order.filter(x => x)[0];
    }
    preferredNative() {
        const order = [this.native, this.romaji, this.userPreferred, this.english];
        return order.filter(x => x)[0];
    }
    preferred(key) {
        switch (key) {
            case "english": return this.preferredEnglish();
            case "romaji": return this.preferredRomaji();
            case "native": return this.preferredNative();
            default: throw "Key error";
        }
    }
}
function mediaFromAniList(obj, status) {
    const titleObj = new Title(obj.media.title);
    return {
        seriesTitle: titleObj,
        seriesType: obj.media.format,
        id: obj.mediaId,
        userStartDate: dateFromAniList(obj.startedAt),
        userFinishDate: dateFromAniList(obj.completedAt),
        userStatus: status,
    };
}
function mangaFromAniList(obj, status) {
    const base = mediaFromAniList(obj, status);
    return base;
}
function animeFromAniList(anime, status) {
    const base = mediaFromAniList(anime, status);
    const tmp = {
        seriesEpisodes: anime.media.episodes,
        seriesEpisodesDuration: anime.media.duration,
        userScore: anime.score,
        userWatchedEpisodes: anime.progress,
    };
    const it = { ...base, ...tmp };
    if (it.userStartDate.isNullDate() && it.seriesEpisodes == 1 && !it.userFinishDate.isNullDate()) {
        it.userStartDate = it.userFinishDate;
    }
    return it;
}
export function dateFromYMD(year, month, day) {
    const fmt = x => x ? x.toString().padStart(2, "0") : "00";
    const ys = year || "0000";
    const dstring = `${ys}-${fmt(month)}-${fmt(day)}`;
    return new Mdate(dstring);
}
function dateFromAniList(obj) {
    return dateFromYMD(obj.year, obj.month, obj.day);
}
export class Mdate {
    constructor(date) {
        //@assume valid string
        this.rawDateStr = date;
        this.fixedDateStr = Mdate.fixDate(date);
        if (this.rawDateStr != rawNullDate) {
            this.date = new Date(this.fixedDateStr);
        }
    }
    isNullDate() {
        return this.rawDateStr == rawNullDate;
    }
    static fixDate(dateStr) {
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
    year() {
        // return this.date.getFullYear();
        return parseInt(this.fixedDateStr.slice(0, 4));
    }
    month() {
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
            return nullDate;
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
        else { //if (val < 0){
            return d2;
        }
    }
}
export const rawNullDate = "0000-00-00";
export const nullDate = new Mdate(rawNullDate);
//# sourceMappingURL=MAL.js.map