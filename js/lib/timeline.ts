/*
 * Generate a svg timeline with javascript.
 * Based on https://github.com/jasonreisman/Timeline written in python.
 * Slightly documented: https://github.com/linkviii/Timeline
 *
 * See README.md
 *
 * v 2017-10-9
 *   (Try to change with new features. Not strict.)
 * 
 * MIT licenced
 */


/// - <reference path="../lib/svgjs.d.ts"/>
// import * as SVG from "../lib/svgjs.js";

declare function SVG();


declare function strftime(format: string, date: Date);

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

function maxString(a: string, b: string): string {
    return max(a, b, function (val) {
        return val.length;
    });
}

//

export const Colors: { black: string, gray: string } = {black: '#000000', gray: '#C0C0C0'};

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


    public static readonly calloutProperties: { width: number, height: number, increment: number } = {
        width: 10,
        height: 15,
        increment: 10
    };
    public static readonly textFudge: [number, number] = [3, 1.5]; //factor? [?, ?]


    public readonly data: TimelineDataV2;

    public readonly startDate: Date;
    public readonly endDate: Date;

    public readonly date0: number;
    public readonly date1: number;
    public readonly totalSeconds: number;


    public readonly tickFormat: string;
    public readonly markers;

    public maxLabelHeight: number;

    public readonly width: number;
    /** Width that is "dead" to accommodate long text on the far left */
    public deadWidth: number;

    public readonly drawing;
    public readonly axisGroup;

    // initializes data for timeline
    // Call `build` to generate svg
    constructor(data: TimelineData, id: string) {

        if ((<TimelineDataV2>data).apiVersion == 2) {
            this.data = <TimelineDataV2>data;
        } else {
            this.data = TimelineConverter.convertTimelineDataV1ToV2(<TimelineDataV1>data);

        }


        this.width = this.data.width;
        this.deadWidth = 0;

        this.drawing = SVG().addTo('#' + id);
        this.axisGroup = this.drawing.group();

        this.startDate = new Date(this.data.startDate);
        this.endDate = new Date(this.data.endDate);

        const delta: number = (this.endDate.valueOf() - this.startDate.valueOf());
        const padding: number = (new Date(delta * 0.1)).valueOf();

        this.date0 = this.startDate.valueOf() - padding;
        this.date1 = this.endDate.valueOf() + padding;
        this.totalSeconds = (this.date1 - this.date0) / 1000;


        this.tickFormat = this.data.tickFormat;

        //TODO use a map instead
        this.markers = {};


        //# maxLabelHeight stores the max height of all axis labels
        //# and is used in the final height computation in build(self)
        this.maxLabelHeight = 0;

        // Calculate how far oob callout text can go
        // leftBoundary < 0 → oob
        let minX: number = Infinity;
        for (let callout of this.data.callouts) {
            const calloutDate: Date = new Date(callout.date);
            const x: number | OoBDate = this.dateToX(calloutDate);
            if (x instanceof OoBDate) {
                console.warn([callout, calloutDate, OoBDate]);
                continue;
            }

            const leftBoundary: number = Timeline.calculateEventLeftBondary(callout.description, x);
            minX = Math.min(minX, leftBoundary);
        }

        // clamp to a positive value
        minX = Math.max(0, -minX);

        this.deadWidth = minX;
    }


    private createMainAxis(): void {
        //# draw main line
        this.axisGroup.add(this.drawing.line(0, 0, this.width, 0)
            .stroke({color: Colors.black, width: 3}));

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
            label = strftime(this.tickFormat, dt);
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

        const dy: number = 5;

        // # add tick on line
        const addTick: boolean = kw.tick || true;
        if (addTick) {
            const stroke: string = kw.stroke || Colors.black;
            const line = this.drawing.line(x, -dy, x, dy)
                .stroke({color: stroke, width: 2});

            this.axisGroup.add(line);
        }

        // # add label
        /*
         #self.drawing.text(label, insert=(x, -2 * dy), stroke='none', fill=fill, font_family='Helevetica',
         ##font_size='6pt', text_anchor='end', writing_mode='tb', transform=transform))
         */
        //writing mode?

        const txt = this.drawing.text(label);
        txt.font({family: 'Helevetica', size: '6pt', anchor: 'end'});
        txt.transform({rotate: 270, ox: x, oy: 0});
        txt.dx(x - 7).dy((-2 * dy) + 5);

        txt.fill(fill);

        this.axisGroup.add(txt);

        const h = Timeline.getTextWidth('Helevetica', 6, label) + 2 * dy;
        this.maxLabelHeight = Math.max(this.maxLabelHeight, h);

    }


    ///
    // Callout generating functions
    ///


    private sortCallouts(): void {
        this.data.callouts.sort(function (a, b) {
            const tmpA: string = a.date;
            const eventDateA: number = (new Date(tmpA)).valueOf();

            const tmpB: string = b.date;
            const eventDateB: number = (new Date(tmpB)).valueOf();

            return eventDateA - eventDateB;

        });

    }

    // Approximates a place to break a string into two
    // pure fn
    // Returns two strings if a split is found, else null.
    private static bifercateString(str: string): [string, string] | null {
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

    private static calculateEventLeftBondary(event: string, eventEndpoint: number): number {
        const textWidth: number = Timeline.getTextWidth('Helevetica', 6, event);
        const leftBoundary: number = eventEndpoint - (textWidth + Timeline.calloutProperties.width + Timeline.textFudge[0]);

        return leftBoundary;
    }

    //not pure fn
    //modifies prev*
    private static calculateCalloutHeight(eventEndpoint: number, prevEndpoints: number[], prevLevels: number[], event: string): [number, string] {


        //ensure text does not overlap with previous entries

        const leftBoundary: number = Timeline.calculateEventLeftBondary(event, eventEndpoint);

        let level: number = Timeline.calculateCalloutLevel(leftBoundary, prevEndpoints, prevLevels);


        const bif = Timeline.bifercateString(event);
        if (bif) {

            //longest of 2 stings
            const bifEvent: string = maxString(bif[0], bif[1]);
            const bifBoundary: number = Timeline.calculateEventLeftBondary(bifEvent, eventEndpoint);
            // occupying 2 lines → +1
            const bifLevel: number = Timeline.calculateCalloutLevel(bifBoundary, prevEndpoints, prevLevels) + 1;
            //compare levels somehow

            if (bifLevel < level) {
                level = bifLevel;
                event = bif.join("\n");
            }
        }


        const calloutHeight = level * Timeline.calloutProperties.increment;

        prevEndpoints.push(eventEndpoint);
        prevLevels.push(level);

        return [calloutHeight, event];
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
        //vertical drawing up is negative ~= max height
        let minY = Infinity;


        for (let callout of this.data.callouts) {

            const eventColor: string = callout.color || Colors.black;

            const calloutDate: Date = new Date(callout.date);

            const x: number | OoBDate = this.dateToX(calloutDate);
            if (x instanceof OoBDate) {
                // console.warn([callout, calloutDate, OoBDate]);
                continue;
            }


            //# figure out what 'level" to make the callout on
            const [calloutHeight, event]: [number, string] = Timeline.calculateCalloutHeight(x, prevX, prevLevel, callout.description);
            const y: number = 0 - Timeline.calloutProperties.height - calloutHeight;
            minY = Math.min(minY, y);

            //svg elements
            const pathData: string = ['M', x, ',', 0, ' L', x, ',', y, ' L',
                (x - Timeline.calloutProperties.width), ',', y].join("");
            const pth = this.drawing.path(pathData).stroke({color: eventColor, width: 1, fill: "none"});
            pth.fill("none", 0);

            this.axisGroup.add(pth);

            const foo = 6;

            const txt = this.drawing.text(event);
            txt.dx(x - Timeline.calloutProperties.width - Timeline.textFudge[0]);
            txt.dy(y - 4 * Timeline.textFudge[1] - foo);
            txt.font({family: 'Helevetica', size: '6pt', anchor: 'end'});
            txt.fill(eventColor);

            this.axisGroup.add(txt);


            this.addAxisLabel(calloutDate, {tick: false, fill: Colors.black});

            const circ = this.drawing.circle(8).attr({fill: 'white', cx: x, cy: 0, stroke: eventColor});

            this.axisGroup.add(circ);


        }

        return minY;

    }

    ///
    // END Callout generating functions
    ///

    private createDateTicks(): void {
        this.addAxisLabel(this.startDate, {tick: true});
        this.addAxisLabel(this.endDate, {tick: true});

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


    private createEras(yEra: number, yAxis: number, height: number): void {
        if (!('eras' in this.data)) {
            return;
        }

        //# create eras
        for (let era of this.data.eras) {
            //# extract era data

            const name: string = era.name;
            const fill: string = era.color || Colors.gray;


            const [startMarker, endMarker] = this.getMarkers(fill);

            //# create boundary lines
            //if date isn't in bounds, something interesting will happen
            //But that shouldn't be possible?
            let t0 = new Date(era.startDate);
            let t1 = new Date(era.endDate);
            const x0: number = <number> this.dateToX(t0);
            const x1: number = <number> this.dateToX(t1);


            // Shaded area
            const rect = this.drawing.rect(x1 - x0, height);
            rect.x(x0);
            rect.fill({color: fill, opacity: 0.15});

            this.drawing.add(rect);

            // Boundary lines
            const line0 = this.drawing.add(
                this.drawing.line(x0, 0, x0, yAxis)
                    .stroke({color: fill, width: 0.5})
            );

            //TODO line0 line1 dash
            //http://svgwrite.readthedocs.io/en/latest/classes/mixins.html#svgwrite.mixins.Presentation.dasharray
            //line0.dasharray([5, 5])
            //what the svgjs equiv?

            const line1 = this.drawing.add(
                this.drawing.line(x1, 0, x1, yAxis)
                    .stroke({color: fill, width: 0.5})
            );
            //line1.dasharray([5, 5])


            //# create horizontal arrows and text
            const horz = this.drawing.add(
                this.drawing.line(x0, yEra, x1, yEra)
                    .stroke({color: fill, width: 0.75})
            );

            // Era title
            const txt = this.drawing.text(name);
            txt.font({family: 'Helevetica', size: '6pt', anchor: 'middle'});
            txt.dx(0.5 * (x0 + x1)).dy(yEra - Timeline.textFudge[1] - 9);
            txt.fill(fill);

            this.drawing.add(txt);

            // axis dates
            this.addAxisLabel(t0);
            this.addAxisLabel(t1);

        }//end era loop
    }


    // Generates svg document
    public build(): void {
        //# MAGIC NUMBER: y_era
        //# draw era label and markers at this height
        const yEra: number = 10;

        //# create main axis and callouts,
        //# keeping track of how high the callouts are
        this.createMainAxis();
        const yCallouts: number = this.createCallouts();

        this.createDateTicks();

        //# determine axis position so that axis + callouts don't overlap with eras
        const yAxis: number = yEra + Timeline.calloutProperties.height - yCallouts;

        //# determine height so that eras, callouts, axis, and labels just fit
        const height: number = yAxis + this.maxLabelHeight + 4 * Timeline.textFudge[1];

        //# create eras and labels using axis height and overall height
        this.createEras(yEra, yAxis, height);

        //# translate the axis group and add it to the drawing
        this.axisGroup.translate(0, yAxis);
        this.drawing.add(this.axisGroup);

        this.drawing.size(this.width, height);

    }


    //
    //
    //

    private static readonly canvas = document.createElement('canvas');

    private static getTextWidth(family: string, size: number, text: string): number {
        //use canvas to measure text width

        const ctx = Timeline.canvas.getContext("2d");
        ctx.font = size + "pt " + family;
        const w = ctx.measureText(text).width;

        return w;
    }


}





