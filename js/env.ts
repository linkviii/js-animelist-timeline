/** Enable extra features that aren't generally useful, Might be able to change in the console. */
export var debug: boolean = false;
// export var debug: boolean = true

/** Use a local file instead of asking anilist's servers */
// export const usingTestData: boolean = false;
export const usingTestData: boolean = true;


// Should probably figure out something to enforce that...
if (debug || usingTestData) {
    console.log("Using debug settings.");
    console.warn("Don't commit debug!");
}
