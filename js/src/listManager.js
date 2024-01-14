import { usingTestData } from "../env.js";
import * as MAL from "./MAL.js";
export async function getAnilistAnimeList(userName) {
    if (usingTestData) {
        const url = "res/anilist_example.json";
        let job = await fetch(url).then(response => response.json());
        return job;
    }
    const query = `
    query ($userName: String) { 
        MediaListCollection(userName: $userName, type: ANIME) {
            hasNextChunk
            user {
                id
            }
            lists {
                name
                status
                entries {
                    mediaId
                    score
                    progress
                    startedAt { year month day } 
                    completedAt { year month day }
                    media {
                        duration
                        episodes
                        format
                        title {
                            romaji english native userPreferred
                        }
                    }
                }
            }
        }
    }
    `; // Could probably munch the whitespace with a regex but no real need to
    const variables = {
        userName: userName
    };
    // Define the config we'll need for our Api request
    const url = 'https://graphql.anilist.co', options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
        body: JSON.stringify({
            query: query,
            variables: variables
        })
    };
    const response = await fetch(url, options);
    const foo = await response.json();
    if (foo.errors) {
        console.error(foo.errors);
        return new MAL.BadUsernameError();
    }
    const data = foo.data.MediaListCollection;
    if (data.hasNextChunk) {
        console.warn("TODO: next chunk not implemented yet.");
    }
    return data;
}
export async function getAnilistMangaList(userName) {
    if (usingTestData) {
        console.warn("Using test manga list data.");
        const url = "res/TODO.json";
        let job = await fetch(url).then(response => response.json());
        return job;
    }
    const query = `
    query ($userName: String) { 
        MediaListCollection(userName: $userName, type: MANGA) {
            hasNextChunk
            user {
                id
            }
            lists {
                name
                status
                entries {
                    mediaId
                    score
                    progress
                    startedAt { year month day } 
                    completedAt { year month day }
                    media {
                        duration
                        episodes
                        format
                        title {
                            romaji english native userPreferred
                        }
                    }
                }
            }
        }
    }
    `; // Could probably munch the whitespace with a regex but no real need to
    const variables = {
        userName: userName
    };
    // Define the config we'll need for our Api request
    const url = 'https://graphql.anilist.co', options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
        body: JSON.stringify({
            query: query,
            variables: variables
        })
    };
    const response = await fetch(url, options);
    const foo = await response.json();
    if (foo.errors) {
        console.error(foo.errors);
        return new MAL.BadUsernameError();
    }
    const data = foo.data.MediaListCollection;
    if (data.hasNextChunk) {
        console.warn("TODO: next chunk not implemented yet.");
    }
    return data;
}
export class ListManager {
    constructor() {
        this.userAnimeCache = new Map();
        this.userMangaCache = new Map();
    }
    async getAnimeList(username) {
        const data = this.userAnimeCache.get(username);
        if (data) {
            if (!(data instanceof MAL.BadUsernameError)) {
                console.info([username, "'s data loaded from cache."].join(""));
                data.cached = true;
            }
            return data;
        }
        const aniList = await getAnilistAnimeList(username);
        if (aniList instanceof MAL.BadUsernameError) {
            this.userAnimeCache.set(username, aniList);
            return aniList;
        }
        const animeList = MAL.animeListFromAniList(aniList, username);
        this.userAnimeCache.set(username, animeList);
        return animeList;
    }
    async getMangaList(username) {
        const data = this.userAnimeCache.get(username);
        if (data) {
            if (!(data instanceof MAL.BadUsernameError)) {
                console.info([username, "'s data loaded from cache."].join(""));
                data.cached = true;
            }
            return data;
        }
        const aniList = await getAnilistMangaList(username);
        if (aniList instanceof MAL.BadUsernameError) {
            this.userAnimeCache.set(username, aniList);
            return aniList;
        }
        const animeList = MAL.mangaListFromAniList(aniList, username);
        this.userMangaCache.set(username, animeList);
        return animeList;
    }
}
//# sourceMappingURL=listManager.js.map