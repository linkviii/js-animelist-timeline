/*
 * Generate a svg timeline with javascript.
 * Based on https://github.com/jasonreisman/Timeline written in python.
 * Slightly documented: https://github.com/linkviii/Timeline
 *
 * See README.md
 *
 * v 2021-04-16
 *   (Try to change with new features. Not strict.)
 * 
 * MIT licensed
 */


/// - <reference path="../lib/svgjs.d.ts"/>
// import * as SVG from "../lib/svgjs.js";

// declare function SVG();
declare var SVG;


// declare function strftime(format: string, date: Date);
declare namespace strftime {
    function utc(): (format: string, date: Date) => string;
}

// console.info("init strftime");
// console.info(strftime);


//Util
function max<T>(x: T, y: T, fn: (val: T) => number): T {
    if (fn(x) > fn(y)) {
        return x;
    } else {
        return y;
    }
}

// This is not equal to longest display length
// for non monospaced fonts
function maxStringChars(a: string, b: string): string {
    return max(a, b, val => val.length);
}

function compareDateStr(a: string, b: string): number {
    return new Date(a).valueOf() - new Date(b).valueOf();
}


function intersect<T>(start: T, end: T, other: T, evaler?: (T) => any): boolean {
    evaler = evaler || (x => x);
    const otherVal = evaler(other);
    return evaler(start) <= otherVal && otherVal <= evaler(end);
}

//
//
//

export const Colors: { black: string, gray: string } = { black: '#000000', gray: '#C0C0C0' };

//

/*
 * Interfaces of controlling json
 * start/end YYYY-MM-DD (currently `new Date(str);`)
 * V2 is prefered
 */

export type TimelineData = TimelineDataV1 | TimelineDataV2;

//v1
export type TimelineCalloutV1 = [string, string] | [string, string, string];
export type TimelineEraV1 = [string, string, string] | [string, string, string, string];

export interface TimelineDataV1 {
    width: number;
    start: string;
    end: string;
    num_ticks?: number;
    tick_format?: string;
    //[[description, date, ?color],...]
    callouts?: TimelineCalloutV1[];
    //[[name, startDate, endDate, ?color],...]
    eras?: TimelineEraV1[];
}

//v2
export interface TimelineCalloutV2 {
    description: string;
    date: string;
    color?: string;
}

export interface TimelineEraV2 {
    name: string;
    startDate: string;
    endDate: string;
    color?: string;
}

export interface TimelineDataV2 {
    apiVersion: 2;
    width: number;
    fontSize?: number;
    fontFamily?: string;
    startDate: string;
    endDate: string;
    numTicks?: number;
    tickFormat?: string;
    callouts?: TimelineCalloutV2[];
    eras?: TimelineEraV2[];
}

//probably "shouldn't" be a class but whatever. converter namespace
export class TimelineConverter {
    public static convertCallouts(oldCallouts: TimelineCalloutV1[]): TimelineCalloutV2[] {
        const callouts: TimelineCalloutV2[] = [];

        for (let oldCallout of oldCallouts) {
            const newCallout: TimelineCalloutV2 = {
                description: oldCallout[0],
                date: oldCallout[1]
            };
            if (oldCallout.length == 3) {
                newCallout.color = oldCallout[2]
            }
            callouts.push(newCallout);
        }
        return callouts;
    }

    public static convertEras(oldEras: TimelineEraV1[]): TimelineEraV2[] {
        const eras: TimelineEraV2[] = [];
        for (let oldEra of oldEras) {
            const newEra: TimelineEraV2 = {
                name: oldEra[0],
                startDate: oldEra[1],
                endDate: oldEra[2]
            };
            if (oldEra.length == 4) {
                newEra.color = oldEra[3];
            }
            eras.push(newEra);
        }
        return eras;
    }

    static convertTimelineDataV1ToV2(oldData: TimelineDataV1): TimelineDataV2 {

        const newData: TimelineDataV2 = {
            apiVersion: 2,
            width: oldData.width,
            startDate: oldData.start,
            endDate: oldData.end
        };

        // camelCase names
        if ('num_ticks' in oldData) {
            newData.numTicks = oldData.num_ticks;
        }
        if ('tick_format' in oldData) {
            newData.tickFormat = oldData.tick_format;
        }

        // Convert tuples to objects
        if ('callouts' in oldData) {
            newData.callouts = TimelineConverter.convertCallouts(oldData.callouts);
        }
        if ('eras' in oldData) {
            newData.eras = TimelineConverter.convertEras(oldData.eras);
        }

        return newData;
    }
}


//
//
//


/**
 * addAxisLabel kw
 */
interface LabelKW {
    tick?: boolean;
    stroke?: string;
    fill?: string;
}

/**
 * For when a `!(0 <= percentWidth <= 100)`.
 * Shouldn't be possible though?
 */
class OoBDate extends Error {
}


export class Timeline {

    public readonly fontSize;
    public readonly fontFamily;
    readonly fontHeight: number;

    public readonly calloutProperties: { width: number, height: number, increment: number };
    // x,y of adjustment of callout text
    public static readonly textFudge: number = 3;




    public readonly data: TimelineDataV2;

    public readonly startDate: Date;
    public readonly endDate: Date;

    /** 
     * The very beginning and end of the axis.
     * date0 -> x = 0
     * date1 -> x = width
     */
    public readonly date0: number;
    public readonly date1: number;

    public readonly totalSeconds: number;


    public readonly tickFormat: string;
    public readonly markers;

    public maxLabelHeight: number;

    public readonly width: number;
    /** Width that is "dead" to accommodate long text on the far left */
    public deadWidth: number;
    public extraWidth: number;

    public readonly drawing;
    public readonly axisGroup;

    //
    private strfutc = strftime.utc();

    // initializes data for timeline
    // Call `build` to generate svg
    constructor(data: TimelineData, id: string) {

        if ((<TimelineDataV2>data).apiVersion == 2) {
            this.data = <TimelineDataV2>data;
        } else {
            this.data = TimelineConverter.convertTimelineDataV1ToV2(<TimelineDataV1>data);

        }

        this.fontSize = this.data.fontSize || 8;
        this.fontFamily = this.data.fontFamily || 'Helvetica';


        this.width = this.data.width;
        this.deadWidth = 0;

        this.drawing = SVG().addTo('#' + id);
        this.axisGroup = this.drawing.group();

        this.startDate = new Date(this.data.startDate);
        this.endDate = new Date(this.data.endDate);

        // Create space if otherwise there would be none.
        if (this.startDate.valueOf() === this.endDate.valueOf()) {
            this.startDate = new Date(this.startDate.valueOf() - 10000);
            this.endDate = new Date(this.endDate.valueOf() + 10000);
        }

        if (this.endDate.valueOf() < this.startDate.valueOf()) {
            throw new Error("startDate is ahead of endDate");
        }

        const timeWindowSpan: number = (this.endDate.valueOf() - this.startDate.valueOf());

        // Use the same number of pixels regardless of how wide the timeline is
        const paddingScale = 1000 / this.width;
        const timeScale = 0.1;
        const padding: number = (new Date(timeWindowSpan * timeScale * paddingScale)).valueOf();

        this.date0 = this.startDate.valueOf() - padding;
        this.date1 = this.endDate.valueOf() + padding;
        this.totalSeconds = (this.date1 - this.date0) / 1000;


        this.tickFormat = this.data.tickFormat;

        //TODO use a map instead
        // Also what are these
        this.markers = {};

        //
        // Needs to happen after initializing drawing
        const tmpTxt = this.drawing.text("|").font({ family: this.fontFamily, size: `${this.fontSize}pt`, anchor: 'end' });
        const tmpBox = tmpTxt.bbox();

        tmpTxt.remove();

        this.fontHeight = Math.ceil(tmpBox.height);

        this.calloutProperties = {
            width: 10,
            height: 15,
            increment: this.fontHeight * 1.2
        };

        //
        //
        //

        if (this.data.eras) {
            this.data.eras.sort((a, b) => compareDateStr(a.endDate, b.endDate));
        }


        //# maxLabelHeight stores the max height of all axis labels
        //# and is used in the final height computation in build(self)
        this.maxLabelHeight = 0;

        this.data.callouts = this.data.callouts || [];

        // Calculate how far oob callout text can go
        // leftBoundary < 0 → oob
        // let minX: number = Infinity;
        for (let callout of this.data.callouts) {
            const calloutDate: Date = new Date(callout.date);
            const x: number | OoBDate = this.dateToX(calloutDate);
            if (x instanceof OoBDate) {
                console.warn([callout, calloutDate, OoBDate]);
                continue;
            }

            // const leftBoundary: number = this.calculateEventLeftBoundary(callout.description, x);
            // minX = Math.min(minX, leftBoundary);
        }

        // clamp to a positive value
        // minX = Math.max(0, -minX);

        // this.deadWidth = minX;
        // this.extraWidth = minX;
        this.extraWidth = 0;
    }


    private createMainAxis(): void {
        //# draw main line
        this.axisGroup.line(0, 0, this.width, 0)
            .stroke({ color: Colors.black, width: 3 });

    }


    private dateToX(date: Date): number | OoBDate {

        const percentWidth: number = (date.valueOf() - this.date0) / 1000 / this.totalSeconds;

        if (percentWidth < 0 || percentWidth > 1) {
            // console.log(percentWidth)
            // Assert not possible ?
            return new OoBDate("" + percentWidth);
        }

        const foo = 1.25;
        return Math.trunc(percentWidth * (this.width - this.deadWidth * foo) + 0.5) + this.deadWidth * foo;
    }


    private addAxisLabel(dt: Date, kw?: LabelKW): void {

        kw = kw || {};
        const fill: string = kw.fill || Colors.gray;
        let label: string;
        if (this.tickFormat) {
            label = this.strfutc(this.tickFormat, dt);
        } else {
            label = dt.toDateString();
        }

        const x: number | OoBDate = this.dateToX(dt);

        if (x instanceof OoBDate) {
            //error? Log?
            console.warn("Out of bounds label.");
            console.warn([dt, label, x]);
            return;
        }

        const tickHeight: number = 5;

        // # add tick on line
        const addTick: boolean = kw.tick || true;
        if (addTick) {
            const stroke: string = kw.stroke || Colors.black;
            const line = this.axisGroup.line(x, -tickHeight, x, tickHeight)
                .stroke({ color: stroke, width: 2 });

        }

        // # add label
        // Offset to center the text on the tick
        const bar = this.fontHeight;

        // Distance between the x axis and text
        const foo = 2 * tickHeight;

        const txt = this.axisGroup.text(label);
        txt.font({ family: this.fontFamily, size: `${this.fontSize}pt`, anchor: 'end' });
        txt.transform({ rotate: 270, ox: x, oy: 0 });
        txt.dx(x - foo).dy(-bar);

        txt.fill(fill);


        const h = txt.bbox().width + foo;
        this.maxLabelHeight = Math.max(this.maxLabelHeight, h);

    }


    ///
    // Callout generating functions
    ///


    private sortCallouts(): void {
        this.data.callouts.sort((a, b) => compareDateStr(a.date, b.date));


    }

    eraOfDate(date: Date): TimelineEraV2 | null {
        if (this.data.eras) {
            for (let era of this.data.eras) {
                if (intersect(new Date(era.startDate), new Date(era.endDate), date, x => x.valueOf())) {
                    return era;
                }
            }
        }
        return null;
    }

    // Approximates a place to break a string into two
    // pure fn
    // Returns two strings if a split is found, else null.
    private static bifurcateString(str: string): [string, string] | null {
        const cuttingRangeStart = Math.floor(str.length * 0.33);
        const cuttingRangeEnd = str.length * 0.66;

        const half = Math.floor(str.length / 2);

        //TO-DO better? idk. good enough I guess
        //split at closest space to the center of the word
        let bestSplitPoint: number = 0;
        let splitValue: number = Infinity;

        for (let i = cuttingRangeStart; i < cuttingRangeEnd; i++) {
            if (str[i] == " ") {

                const v = Math.abs(i - half);
                if (v < splitValue) {
                    bestSplitPoint = i;
                    splitValue = v;
                }
            }
        }


        if (bestSplitPoint != 0) {
            return [str.slice(0, bestSplitPoint), str.slice(bestSplitPoint + 1, str.length)];
        } else {
            return null;
        }

    }


    //pure fn
    private static calculateCalloutLevel(leftBoundary: number, prevEndpoints: number[], prevLevels: number[]): number {

        let i: number = prevEndpoints.length - 1;
        let level: number = 0;


        // Given previous endpoints within the span of event's bounds,
        // find the highest level needed to not overlap,
        // starting with the closest endpoints.
        //~`for i = prevEndpoints.length - 1; i--`
        //left boundary < a prev endpoint → intersection
        //    → higher level needed than the level of intersected endpoint
        while (leftBoundary < prevEndpoints[i] && i >= 0) {
            level = Math.max(level, prevLevels[i] + 1);
            i -= 1;
        }

        return level;
    }

    private calculateEventLeftBoundary(event: string, eventEndpoint: number): number {
        const textWidth: number = this.getTextWidth2(event);
        const extraFudge = 0; // Why is this needed?
        const leftBoundary: number = eventEndpoint - (textWidth + this.calloutProperties.width + Timeline.textFudge + extraFudge);

        return leftBoundary;
    }

    // not pure fn
    // modifies prev*
    /** Layout callouts so that text will not overlap with vertical lines. */
    private calculateCalloutHeight(eventEndpoint: number, prevEndpoints: number[], prevLevels: number[], event: string): [number, string] {


        // ensure text does not overlap with previous entries

        const leftBoundary: number = this.calculateEventLeftBoundary(event, eventEndpoint);

        let level: number = Timeline.calculateCalloutLevel(leftBoundary, prevEndpoints, prevLevels);


        const bif = Timeline.bifurcateString(event);
        if (bif) {

            //longest of 2 stings
            const bifEvent: string = max(bif[0], bif[1],
                val => this.getTextWidth2(val));

            const bifBoundary: number = this.calculateEventLeftBoundary(bifEvent, eventEndpoint);
            // occupying 2 lines → +1
            const bifLevel: number = Timeline.calculateCalloutLevel(bifBoundary, prevEndpoints, prevLevels) + 1;
            //compare levels somehow

            if (bifLevel < level) {
                level = bifLevel;
                event = bif.join("\n");
            }
        }


        const calloutHeight = level * this.calloutProperties.increment;

        prevEndpoints.push(eventEndpoint);
        prevLevels.push(level);

        return [calloutHeight, event];
    }

    private debugMap = [];

    private putInDebugMap(str, level, point) {
        while (level >= this.debugMap.length) {
            this.debugMap.push({});
        }

        if (this.debugMap[level][point]) {
            console.error("Overwrote ", level, ",", point)
            console.log("Was: ", this.debugMap[level][point])
            console.log("Now: ", str);
        }

        this.debugMap[level][point] = str;

    }

    /* endpointMap (mut): For each level (row), the list of endpoints on that level */
    private calculateCalloutHeight2(eventEndpoint: number, endpointMap: Array<Array<number>>, event: string): [number, number, string] {

        // TODO: Clean this up. It's nasty down here

        // ensure text does not overlap with previous entries

        const leftPad = this.calloutProperties.width;
        const leftBoundary: number = this.calculateEventLeftBoundary(event, eventEndpoint) - leftPad;


        let level: number = 0; // Valid levels start at 1

        // Good if the left boundary of this event does not intersect the nearest event to the left
        const isGood = function (row?: number[]) {
            if (row) {
                if (row.length == 0 || row[row.length - 1] < leftBoundary) {
                    return true;
                } else {
                    return false;
                }
            } else { return true; } // If the row doesn't exist yet, then there are no problems using it
        };

        //
        // Find the first level for which this event will not intersect another.
        // Also make sure that if drawing under an event there is 1 line of space.
        for (let levI = 0; levI < endpointMap.length; levI++) {

            if (isGood(endpointMap[levI]) && isGood(endpointMap[levI + 1])) {
                level = levI + 1;
                break;
            }
        }
        // If space couldn't be found on an existing level, make a new level for it
        if (level == 0) {
            level = endpointMap.length;
        }

        // ---------
        // Do the same checks as above but this time with a bifurcated event

        const bif = Timeline.bifurcateString(event);
        let bifLevel = 0;
        let bifLeftBoundary: number;

        if (bif) {
            const bifEvent: string = max(bif[0], bif[1], val => this.getTextWidth2(val));
            bifLeftBoundary = this.calculateEventLeftBoundary(bifEvent, eventEndpoint) - leftPad;

            const isGood = function (row?: number[]) {
                if (row) {
                    if (row.length == 0 || row[row.length - 1] < bifLeftBoundary) {
                        return true;
                    } else {
                        return false;
                    }
                } else { return true; }
            };

            for (let levI = 1; levI < endpointMap.length; levI++) {

                // Same as above now with bifurcated boundary + the line below.
                // Level is the top line of text.
                if (isGood(endpointMap[levI - 1]) && isGood(endpointMap[levI]) && isGood(endpointMap[levI + 1])) {
                    bifLevel = levI + 1;
                    break;
                }
            }
            if (bifLevel == 0) {
                bifLevel = endpointMap.length + 1;
            }
        }

        // Select level
        //

        const maxEventWidth = 50; // char... Dangerous with unicode?
        let useBifurcated = bifLevel != 0 && (
            bifLevel <= level
            || event.length > maxEventWidth
        );
        // 
        if (useBifurcated) {


            while (bifLevel >= endpointMap.length) {
                endpointMap.push([]);
            }
            endpointMap[bifLevel - 1].push(eventEndpoint);
            this.putInDebugMap(bif[0], bifLevel, eventEndpoint);

            if (bifLevel != 1) {
                endpointMap[bifLevel - 2].push(eventEndpoint);
                this.putInDebugMap(bif[1], bifLevel - 1, eventEndpoint);

            }

            const calloutHeight = bifLevel * this.calloutProperties.increment;
            event = bif.join("\n");


            return [bifLeftBoundary, calloutHeight, event];
        } else {

            while (level >= endpointMap.length) {
                endpointMap.push([]);
            }
            endpointMap[level - 1].push(eventEndpoint);
            this.putInDebugMap(event, level, eventEndpoint);

            const calloutHeight = level * this.calloutProperties.increment;

            return [leftBoundary, calloutHeight, event];
        }
    }

    /**
     * Adds callouts and calculates the height needed.
     *
     * @returns {number} min_y
     */
    private createCallouts(): number {
        if (!('callouts' in this.data)) {
            return 0;
        }

        this.sortCallouts();

        //# add callouts, one by one, making sure they don't overlap
        let prevX: number[] = [-Infinity];
        let prevLevel: number[] = [-1];

        let endpointMap = [[]];

        //vertical drawing up is negative ~= max height
        let minY = Infinity;
        let minX = Infinity;

        // Last place we drew an axis label
        let lastLabelX = 0;

        for (let callout of this.data.callouts) {

            const eventColor: string = callout.color || Colors.black;

            const calloutDate: Date = new Date(callout.date);

            const x: number | OoBDate = this.dateToX(calloutDate);
            if (x instanceof OoBDate) {
                // console.warn([callout, calloutDate, OoBDate]);
                continue;
            }

            const bgEra = this.eraOfDate(calloutDate);
            let bgColor = "white";
            if (bgEra) {
                bgColor = bgEra.color || Colors.gray;
            }
            // const bgFill = { color: bgColor, opacity: 0.15 };
            const bgFill = { color: bgColor, opacity: 1 };


            //# figure out what 'level" to make the callout on
            // const [calloutHeight, event]: [number, string] = this.calculateCalloutHeight(x, prevX, prevLevel, callout.description);
            const [leftBound, calloutHeight, event] = this.calculateCalloutHeight2(x, endpointMap, callout.description);
            const y: number = 0 - this.calloutProperties.height - calloutHeight;
            minY = Math.min(minY, y);
            minX = Math.min(minX, leftBound);

            //svg elements
            const pathData: string = ['M', x, ',', 0, ' L', x, ',', y, ' L',
                (x - this.calloutProperties.width), ',', y].join("");
            const pth = this.axisGroup.path(pathData).stroke({ color: eventColor, width: 1, fill: "none" });
            pth.fill("none", 0);


            const bar = this.fontHeight;

            const txt = this.axisGroup.text(event);
            txt.dx(x - this.calloutProperties.width - Timeline.textFudge);

            // TODO wut
            txt.dy(y - bar);
            txt.font({ family: this.fontFamily, size: `${this.fontSize}pt`, anchor: 'end' });
            txt.fill(eventColor);

            this.giveTxtBackground(txt, bgFill);


            if (x - lastLabelX > this.fontHeight) {
                lastLabelX = x;
                this.addAxisLabel(calloutDate, { tick: false, fill: Colors.black });
            }
            const circ = this.axisGroup.circle(8).attr({ fill: 'white', cx: x, cy: 0, stroke: eventColor });

        }

        if (!isFinite(minY)) {
            minY = 10;
        }
        if (!isFinite(minX)) {
            minX = 0;
        }

        if (minX < 0) {
            this.extraWidth = Math.abs(minX);
        }

        return minY;

    }

    ///
    // END Callout generating functions
    ///

    private createDateTicks(): void {
        this.addAxisLabel(this.startDate, { tick: true });
        this.addAxisLabel(this.endDate, { tick: true });

        if ('numTicks' in this.data) {
            const timeRange = this.endDate.valueOf() - this.startDate.valueOf();

            const numTicks = this.data.numTicks;

            for (let j = 1; j < numTicks; j++) {
                const timeOffset = (j * timeRange / numTicks);
                const tickmarkDate = new Date(this.startDate.valueOf() + timeOffset);
                this.addAxisLabel(tickmarkDate);
            }
        }
    }


    /**
     * @param {String} color
     * @return {Array<marker, marker>}
     */
    private getMarkers(color: string): [any, any] {

        let startMarker;
        let endMarker;

        if (color in this.markers) {
            [startMarker, endMarker] = this.markers[color];
        } else {
            startMarker = this.drawing.marker(10, 10, function (add) {
                add.path("M6,0 L6,7 L0,3 L6,0").fill(color)
            }).ref(0, 3);

            endMarker = this.drawing.marker(10, 10, function (add) {
                add.path("M0,0 L0,7 L6,3 L0,0").fill(color)
            }).ref(6, 3);

            this.markers[color] = [startMarker, endMarker]
        }

        return [startMarker, endMarker]
    };


    giveTxtBackground(txt, fill): any {
        const bbox = txt.bbox();
        let rect = txt.parent().rect(bbox.width, bbox.height).fill(fill);
        rect.move(txt.x(), txt.y());
        rect.backward();

        rect.radius(2);
        return rect;
    }



    private createEras(yEra: number, yAxis: number, height: number): void {
        if (!('eras' in this.data)) {
            return;
        }

        //# create eras
        for (let era of this.data.eras) {
            //# extract era data

            const name: string = era.name;
            const fill: string = era.color || Colors.gray;


            // Don't actually know what this was supposed to do 
            // const [startMarker, endMarker] = this.getMarkers(fill);

            //# create boundary lines
            //if date isn't in bounds, something interesting will happen
            //But that shouldn't be possible?
            let t0 = new Date(era.startDate);
            let t1 = new Date(era.endDate);
            const x0: number = <number>this.dateToX(t0) + this.extraWidth;
            const x1: number = <number>this.dateToX(t1) + this.extraWidth;


            // Shaded area
            const rect = this.drawing.rect(x1 - x0, height);
            rect.x(x0);
            rect.fill({ color: fill, opacity: 0.15 });

            // Keep callout text on top
            rect.back();


            // Boundary lines
            //  line0 
            this.drawing.line(x0, 0, x0, yAxis)
                .stroke({ color: fill, width: 0.5 });


            // line1 
            this.drawing.line(x1, 0, x1, yAxis)
                .stroke({ color: fill, width: 0.5 });

            //# create horizontal arrows and text
            this.drawing.line(x0, yEra, x1, yEra)
                .stroke({ color: fill, width: 0.75 });

            // Era title
            const txt = this.drawing.text(name);
            txt.font({ family: this.fontFamily, size: `${this.fontSize}pt`, anchor: 'middle' });
            txt.dx(0.5 * (x0 + x1)).dy(yEra - this.fontHeight - 2);
            txt.fill(fill);



            // axis dates
            this.addAxisLabel(t0);
            this.addAxisLabel(t1);

        }//end era loop
    }


    // Generates svg document
    public build(): void {
        //# MAGIC NUMBER: y_era
        //# draw era label and markers at this height
        // const yEra: number = 5 + this.fontHeight;
        const yEra: number = 0 + this.fontHeight;

        //# create main axis and callouts,
        //# keeping track of how high the callouts are
        this.createMainAxis();
        const yCallouts: number = this.createCallouts();

        this.createDateTicks();

        //# determine axis position so that axis + callouts don't overlap with eras
        const yAxis: number = yEra + this.calloutProperties.height - yCallouts;

        //# determine height so that eras, callouts, axis, and labels just fit

        const height: number = yAxis + this.maxLabelHeight + this.fontHeight;

        //# create eras and labels using axis height and overall height
        this.createEras(yEra, yAxis, height);

        //# translate the axis group and add it to the drawing
        // this.axisGroup.translate(0, yAxis);
        this.axisGroup.translate(this.extraWidth, yAxis);

        // this.drawing.size(this.width, height);
        this.drawing.size(this.width + this.extraWidth, height);

    }


    //
    //
    //


    getTextWidth_Slow(text: string, anchor?: string): number {
        anchor = anchor || 'end';
        const txt = this.drawing.text(text);
        txt.font({ family: this.fontFamily, size: `${this.fontSize}pt`, anchor: anchor });

        const box = txt.bbox();
        txt.remove();

        // The box seems fuzzy so lets give a small amount of padding.
        return Math.ceil(box.width) + 1;
    }


    private canvas = document.createElement("canvas");
    getTextDim(text: string): TextMetrics {
        /*
         * Using SVG.Text's bbox was a performance bottleneck.
         * Canvas performs faster, at least when you don't need the actual text object.
         * When using `pt` as the font unit, you get the same result.
         */

        const canvas = this.canvas;
        const context = canvas.getContext("2d");
        context.font = `${this.fontSize}pt ${this.fontFamily}`;
        const metrics = context.measureText(text);
        return metrics;
    };

    getTextWidth2(text: string): number {

        const metrics = this.getTextDim(text);
        return Math.ceil(metrics.width);


    }



}


// Test linear spacing of callouts
export function makeTestPattern1(width: number): TimelineDataV2 {
    const testPattern_1: TimelineDataV2 = {
        apiVersion: 2,
        width: width,
        tickFormat: "%Y-%m-%d ",
        startDate: "2019-01-01",
        endDate: "2019-01-10",
        callouts: function () {
            const alpha = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
            const callouts: TimelineCalloutV2[] = [];
            for (let i = 0; i < 8; ++i) {
                callouts.push({
                    description: alpha[i],
                    date: `2019-01-${(i + 2).toString().padStart(2, "0")}`,
                });
            }
            return callouts;
        }(),

    };
    return testPattern_1;

}

// Test no callouts
export function makeTestPattern2(): TimelineDataV2 {
    const tln: TimelineDataV2 = {
        apiVersion: 2,
        width: 1000,
        tickFormat: "%Y-%m-%d ",
        startDate: "2019-01-01",
        endDate: "2019-01-03",
    };

    return tln;
}


export function makeTestPattern3(): TimelineDataV2 {
    const tln: TimelineDataV2 = {
        apiVersion: 2,
        width: 1000,
        tickFormat: "%Y-%m-%d ",
        startDate: "2019-01-01",
        endDate: "2019-01-01",
        callouts: [{ description: "ahh", date: "2019-01-01" }],
    };

    return tln;
}

