// function findText(parentTag:Element, childName:string):string {
//     return parentTag.getElementsByTagName(childName)[0].textContent;
// }

class AnimeList {
    public user:MALUser;
    public anime:MALAnime[];

    constructor(MALXML:Element){
        let animeList:any = MALXML.getElementsByTagName('anime');
        let userInfo = MALXML.getElementsByTagName('myinfo')[0];

        this.user = new MALUser(userInfo);
        for (let anime of animeList){
            this.anime.push(new MALAnime(anime));
        }

    }
}

class MALUser {
    public userId:number;
    public userName:string;
    public userExportType:number;
    public userTotalAnime:number;
    public userTotalWatching:number;
    public userTotalCompleted:number;
    public userTotalOnhold:number;
    public userTotalDropped:number;
    public userTotalPlantowatch:number;

    constructor(myinfo:Element) {

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

    public seriesAnimedbId:number;
    public seriesTitle:string;
    public seriesType:string;
    public seriesEpisodes:number;
    public myId:number;
    public myWatchedEpisodes:number;
    public myStartDate:MALDate;
    public myFinishDate:MALDate;
    public myRated:string;
    public myScore:number;
    public myDvd:string;
    public myStorage:string;
    public myStatus:string;
    public myComments:string;
    public myTimesWatched:number;
    public myRewatchValue:string;
    public myDownloadedEps:number;
    public myTags:string;
    public myRewatching:number;
    public myRewatchingEp:number;
    public updateOnImport:number;

    constructor(anime:Element) {
        this.seriesAnimedbId = parseInt(findText(anime, "series_animedb_id"));
        this.seriesTitle = findText(anime, "series_title");
        this.seriesType = findText(anime, "series_type");
        this.seriesEpisodes = parseInt(findText(anime, "series_episodes"));
        this.myId = parseInt(findText(anime, "my_id"));
        this.myWatchedEpisodes = parseInt(findText(anime, "my_watched_episode"));
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

}

class MALDate {

    public nullDate:string = "0000-00-00";


    public rawDateStr:string;
    public date:Date;

    constructor(date:string) {
        this.rawDateStr = date;

    }

    fixDate(dateStr:string):string {
        //console.log(dateStr)
        if (dateStr == this.nullDate) {
            return this.nullDate;
        }
        let m:string = dateStr.slice(5, 7);
        if (m == '00') m = '01';
        let d:string = dateStr.slice(8);
        if (d == '00') d = '01';

        return dateStr.slice(0, 5) + m + '-' + d;
    }

    /**
     * Compare date strings that could be null
     * @param d2 string
     * @param findMax bool
     * @returns string
     */
    compareRawDate(d2:string, findMax:boolean = true):string {
        let d1:string = this.rawDateStr;

        if (d1 == this.nullDate && d2 == this.nullDate) {
            return this.nullDate;
        } else if (d1 == this.nullDate) {
            return this.fixDate(d2);
        } else if (d2 == nullDate) {
            return this.fixDate(d1);
        }

        d1 = this.fixDate(d1);
        d2 = this.fixDate(d2);
        if (d1 == d2) {
            return d1;
        }
        const dt1:Date = new Date(d1);
        const dt2:Date = new Date(d2);

        const v:boolean = dt1 > dt2;

        if ((findMax && v) || (!findMax && !v)) {
            return d1;
        } else {
            return d2;
        }
    }

}

