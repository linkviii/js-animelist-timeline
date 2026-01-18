/*
 *
 */
import * as MAL from "./MAL.js";
// ----------------------------------------------------------------------------
export function assertUnreachable(x) { }
// ----------------------------------------------------------------------------
/** Object.keys returns string[] because typescript cannot know all the keys at runtime.
 * This is unsound if keys of obj differ at runtime from as they were annotated.
 *
 * const tmp = keysFromObject({ "ONE": 1, "TWO": 2, "THREE": 3 });
 * :: tmp: ("ONE" | "TWO" | "THREE")[]
 *
 */
export const keysFromObject = Object.keys;
// export const keysFromObject = Object.keys as <T extends Record<string, any>>(obj: T) => Array<keyof T >;
// const tmp = keysFromObject({ "ONE": 1, "TWO": 2, "THREE": 3 });
function _makeMapToSelf_1(vec) {
    return Object.fromEntries(vec.map(it => [it, it]));
}
function _makeMapToSelf_2(vec) {
    return Object.fromEntries(vec.map(it => [it, it]));
}
/**
 * {k: k for k in vec}
 *
 * Example:
 * `makeMapToSelf(["ONE", "TWO", "THREE"] as const);`
 * is the same as
 * `{ONE:"ONE", TWO:"TWO", THREE:"THREE"} as const;`
 *
 */
export const makeMapToSelf = _makeMapToSelf_1;
export function makeSelfMappingFromRecordKeys(obj) {
    return makeMapToSelf(keysFromObject(obj));
}
// const tmp = makeSelfMappingFromRecordKeys({ "ONE": 1, "TWO": 2, "THREE": 3 } as const);
// ----------------------------------------------------------------------------
const dateRegex = /^\d\d\d\d[\-\/.]\d\d[\-\/\.]\d\d$|^\d\d\d\d\d\d\d\d$/;
// ----------------------------------------------------------------------------
export function wrapListItem(elm) {
    const li = document.createElement("li");
    li.appendChild(elm);
    return li;
}
export function textNode(tag, txt, classes) {
    const elm = document.createElement(tag);
    elm.textContent = txt;
    if (classes) {
        elm.className = classes;
    }
    return elm;
}
// ----------------------------------------------------------------------------
export function minutesToString(min) {
    min = Math.round(min);
    let h = Math.floor(min / 60);
    const d = Math.floor(h / 24);
    h = h % 24;
    const m = min % 60;
    if (h > 0 || d > 0) {
        if (d > 0)
            return `${d}D ${h}H ${m}M`;
        else
            return `${h}H ${m}M`;
    }
    return `${m} minutes`;
}
export function daysToYMD(n) {
    let s = "";
    if (n >= 365) {
        const y = Math.floor(n / 365);
        n = n % 365;
        s += `${y}Y `;
    }
    if (n >= 30) {
        const m = Math.floor(n / 30);
        n = n % 30;
        s += `${m}M `;
    }
    if (n !== 0) {
        s += `${n}D`;
    }
    return s;
}
export function daysToYWD(n) {
    let s = "";
    if (n >= 365) {
        const y = Math.floor(n / 365);
        n = n % 365;
        s += `${y}Y `;
    }
    if (n >= 7) {
        const w = Math.floor(n / 7);
        n = n % 7;
        s += `${w}W `;
    }
    if (true || n !== 0) {
        s += `${n}D`;
    }
    return s;
}
// ----------------------------------------------------------------------------
export function updateKey(map, key, value) {
    map.set(key, map.get(key) + value);
}
// ----------------------------------------------------------------------------
/** second - first
 * Positive count if first comes before second.
 */
export function daysBetween(first, second) {
    if (typeof first === 'string') {
        first = new Date(first);
    }
    if (typeof second === 'string') {
        second = new Date(second);
    }
    // Take the difference between the dates and divide by milliseconds per day.
    // Round to nearest whole number to deal with DST.
    const diff = (second.valueOf() - first.valueOf());
    const milliInDay = (1000 * 60 * 60 * 24);
    return (Math.round(diff / milliInDay));
}
export function daysBetween_abs(first, second) {
    return Math.abs(daysBetween(first, second));
}
// ----------------------------------------------------------------------------
//
// Data cleaning
//
// I don't remember why I wanted this, but I might of had a good reason.
// Could probably find this on SO
/**
 * Returns if the string represents a non negative integer.
 * @param str
 * @returns {boolean}
 */
export function isNormalInteger(str) {
    const n = ~~Number(str);
    return (String(n) === str) && (n >= 0);
}
/**
 * Returns if the string represents a non negative integer.
 * @param str
 * @returns {boolean}
 */
export function isPositiveInteger(str) {
    const n = ~~Number(str);
    return (String(n) === str) && (n > 0);
}
// ----------------------------------------------------------------------------
//make user input suitable for anime timeline
/**
 * Clamps date into a useful value
 * @param date May be rawNullDate
 * @param minmax -1: clamp min; 1 clamp max
 * @returns YYYY-MM-DD str
 */
export function fixDate(date, minmax) {
    const minYear = 1980; //Nerds can change this in the future
    const maxYear = 2030; //For now its sane
    const test = dateRegex.test(date);
    if (!test) {
        // Maybe should return or throw an error?
        if (null !== date && "" !== date)
            console.error("Unexpected date format from:", date);
        // Pretend all invalid input is equivalent to null date
        date = MAL.rawNullDate;
    }
    let ys;
    let ms;
    let ds;
    if (/^\d\d\d\d\d\d\d\d$/.test(date)) {
        ys = date.slice(0, 4);
        ms = date.slice(4, 6);
        ds = date.slice(6, 8);
    }
    else {
        ys = date.slice(0, 4);
        ms = date.slice(5, 7);
        ds = date.slice(8, 10);
    }
    const y = parseInt(ys);
    const m = parseInt(ms);
    const d = parseInt(ds);
    //A date needs at least a sane year
    if (y < minYear || y > maxYear) {
        if (minmax == -1)
            ys = minYear.toString();
        else // (minmax == 1)
            ys = maxYear.toString();
    }
    if (m < 0 || m > 12) {
        ms = "00";
    }
    if (d < 0 || d > 32) {
        ds = "00";
    }
    return [ys, ms, ds].join("-");
}
// ----------------------------------------------------------------------------
/*
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set
 */
export function esSetEq(a, b) {
    // Why do I have to write this :( :( :(
    // js sucks
    if (a.size !== b.size)
        return false;
    for (const v of a) {
        if (!b.has(v))
            return false;
    }
    return true;
}
export function esSetIntersection(a, b) {
    const _intersection = new Set();
    for (const elem of b) {
        if (a.has(elem)) {
            _intersection.add(elem);
        }
    }
    return _intersection;
}
export function esSetDifference(a, b) {
    const _difference = new Set(a);
    for (const elem of b) {
        _difference.delete(elem);
    }
    return _difference;
}
/* --------------------------------------------------------------------------- */
export function validateSelect(select, options) {
    const name = select[0].id;
    const htmlValues = new Set(select.children().map((i, opt) => opt.value));
    const jsValues = new Set(options);
    // console.log(name, htmlValues);
    const isGood = esSetEq(htmlValues, jsValues);
    if (!isGood) {
        const fromHTML = esSetDifference(htmlValues, jsValues);
        const fromJS = esSetDifference(jsValues, htmlValues);
        console.warn(`${name}:\tInvalid select`);
        console.log("HTML Extra:", fromHTML);
        console.log("HTML Missing:", fromJS);
    }
}
/* --------------------------------------------------------------------------- */
export class LabelCheckbox_PushButton {
    /* https://stackoverflow.com/a/66550060/1993919 */
    topElm = document.createElement("label");
    inputElm = document.createElement("input");
    textElm = document.createElement("span");
    constructor(parent, text) {
        this.topElm.className = "label-checkbox";
        this.inputElm.type = "checkbox";
        this.textElm.textContent = text;
        this.topElm.append(this.inputElm);
        this.topElm.append(this.textElm);
        parent.append(this.topElm);
    }
}
export function makeTable(desc) {
    const table = document.createElement("table");
    function makeHeaderRow(row, rowElm) {
        /* Body rows use insertCell(), but header rows need createElement("th"). */
        for (let cell of row.content) {
            if (typeof cell === "string") {
                cell = { value: cell };
            }
            const elm = document.createElement("th");
            if (cell.notText) {
                elm.append(cell.value);
            }
            else {
                elm.textContent = cell.value;
            }
            if (cell.attributes) {
                for (const attr in cell.attributes) {
                    elm.setAttribute(attr, cell.attributes[attr]);
                }
            }
            rowElm.append(elm);
        }
    }
    if (desc.header) {
        const head = table.createTHead();
        makeHeaderRow(desc.header, head);
    }
    if (desc.footer) {
        const head = table.createTFoot();
        makeHeaderRow(desc.footer, head);
    }
    const tbody = table.createTBody();
    for (const row of desc.data) {
        const rowElm = tbody.insertRow();
        for (let cell of row.content) {
            if (typeof cell === "string") {
                cell = { value: cell };
            }
            const elm = rowElm.insertCell();
            if (cell.notText) {
                elm.append(cell.value);
            }
            else {
                elm.textContent = cell.value;
            }
            if (cell.attributes) {
                for (const attr in cell.attributes) {
                    elm.setAttribute(attr, cell.attributes[attr]);
                }
            }
            rowElm.append(elm);
        }
    }
    return table;
}
/* --------------------------------------------------------------------------- */
//# sourceMappingURL=util.js.map