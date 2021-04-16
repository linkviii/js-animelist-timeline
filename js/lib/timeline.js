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
// console.info("init strftime");
// console.info(strftime);
//Util
function max(x, y, fn) {
    if (fn(x) > fn(y)) {
        return x;
    }
    else {
        return y;
    }
}
// This is not equal to longest display length
// for non monospaced fonts
function maxStringChars(a, b) {
    return max(a, b, val => val.length);
}
function compareDateStr(a, b) {
    return new Date(a).valueOf() - new Date(b).valueOf();
}
function intersect(start, end, other, evaler) {
    evaler = evaler || (x => x);
    const otherVal = evaler(other);
    return evaler(start) <= otherVal && otherVal <= evaler(end);
}
//
//
//
export const Colors = { black: '#000000', gray: '#C0C0C0' };
//probably "shouldn't" be a class but whatever. converter namespace
export class TimelineConverter {
    static convertCallouts(oldCallouts) {
        const callouts = [];
        for (let oldCallout of oldCallouts) {
            const newCallout = {
                description: oldCallout[0],
                date: oldCallout[1]
            };
            if (oldCallout.length == 3) {
                newCallout.color = oldCallout[2];
            }
            callouts.push(newCallout);
        }
        return callouts;
    }
    static convertEras(oldEras) {
        const eras = [];
        for (let oldEra of oldEras) {
            const newEra = {
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
    static convertTimelineDataV1ToV2(oldData) {
        const newData = {
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
/**
 * For when a `!(0 <= percentWidth <= 100)`.
 * Shouldn't be possible though?
 */
class OoBDate extends Error {
}
export class Timeline {
    // initializes data for timeline
    // Call `build` to generate svg
    constructor(data, id) {
        //
        this.strfutc = strftime.utc();
        this.debugMap = [];
        this.canvas = document.createElement("canvas");
        if (data.apiVersion == 2) {
            this.data = data;
        }
        else {
            this.data = TimelineConverter.convertTimelineDataV1ToV2(data);
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
        const timeWindowSpan = (this.endDate.valueOf() - this.startDate.valueOf());
        // Use the same number of pixels regardless of how wide the timeline is
        const paddingScale = 1000 / this.width;
        const timeScale = 0.1;
        const padding = (new Date(timeWindowSpan * timeScale * paddingScale)).valueOf();
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
            const calloutDate = new Date(callout.date);
            const x = this.dateToX(calloutDate);
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
    createMainAxis() {
        //# draw main line
        this.axisGroup.line(0, 0, this.width, 0)
            .stroke({ color: Colors.black, width: 3 });
    }
    dateToX(date) {
        const percentWidth = (date.valueOf() - this.date0) / 1000 / this.totalSeconds;
        if (percentWidth < 0 || percentWidth > 1) {
            // console.log(percentWidth)
            // Assert not possible ?
            return new OoBDate("" + percentWidth);
        }
        const foo = 1.25;
        return Math.trunc(percentWidth * (this.width - this.deadWidth * foo) + 0.5) + this.deadWidth * foo;
    }
    addAxisLabel(dt, kw) {
        kw = kw || {};
        const fill = kw.fill || Colors.gray;
        let label;
        if (this.tickFormat) {
            label = this.strfutc(this.tickFormat, dt);
        }
        else {
            label = dt.toDateString();
        }
        const x = this.dateToX(dt);
        if (x instanceof OoBDate) {
            //error? Log?
            console.warn("Out of bounds label.");
            console.warn([dt, label, x]);
            return;
        }
        const tickHeight = 5;
        // # add tick on line
        const addTick = kw.tick || true;
        if (addTick) {
            const stroke = kw.stroke || Colors.black;
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
    sortCallouts() {
        this.data.callouts.sort((a, b) => compareDateStr(a.date, b.date));
    }
    eraOfDate(date) {
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
    static bifurcateString(str) {
        const cuttingRangeStart = Math.floor(str.length * 0.33);
        const cuttingRangeEnd = str.length * 0.66;
        const half = Math.floor(str.length / 2);
        //TO-DO better? idk. good enough I guess
        //split at closest space to the center of the word
        let bestSplitPoint = 0;
        let splitValue = Infinity;
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
        }
        else {
            return null;
        }
    }
    //pure fn
    static calculateCalloutLevel(leftBoundary, prevEndpoints, prevLevels) {
        let i = prevEndpoints.length - 1;
        let level = 0;
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
    calculateEventLeftBoundary(event, eventEndpoint) {
        const textWidth = this.getTextWidth2(event);
        const extraFudge = 0; // Why is this needed?
        const leftBoundary = eventEndpoint - (textWidth + this.calloutProperties.width + Timeline.textFudge + extraFudge);
        return leftBoundary;
    }
    // not pure fn
    // modifies prev*
    /** Layout callouts so that text will not overlap with vertical lines. */
    calculateCalloutHeight(eventEndpoint, prevEndpoints, prevLevels, event) {
        // ensure text does not overlap with previous entries
        const leftBoundary = this.calculateEventLeftBoundary(event, eventEndpoint);
        let level = Timeline.calculateCalloutLevel(leftBoundary, prevEndpoints, prevLevels);
        const bif = Timeline.bifurcateString(event);
        if (bif) {
            //longest of 2 stings
            const bifEvent = max(bif[0], bif[1], val => this.getTextWidth2(val));
            const bifBoundary = this.calculateEventLeftBoundary(bifEvent, eventEndpoint);
            // occupying 2 lines → +1
            const bifLevel = Timeline.calculateCalloutLevel(bifBoundary, prevEndpoints, prevLevels) + 1;
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
    putInDebugMap(str, level, point) {
        while (level >= this.debugMap.length) {
            this.debugMap.push({});
        }
        if (this.debugMap[level][point]) {
            console.error("Overwrote ", level, ",", point);
            console.log("Was: ", this.debugMap[level][point]);
            console.log("Now: ", str);
        }
        this.debugMap[level][point] = str;
    }
    /* endpointMap (mut): For each level (row), the list of endpoints on that level */
    calculateCalloutHeight2(eventEndpoint, endpointMap, event) {
        // TODO: Clean this up. It's nasty down here
        // ensure text does not overlap with previous entries
        const leftPad = this.calloutProperties.width;
        const leftBoundary = this.calculateEventLeftBoundary(event, eventEndpoint) - leftPad;
        let level = 0; // Valid levels start at 1
        // Good if the left boundary of this event does not intersect the nearest event to the left
        const isGood = function (row) {
            if (row) {
                if (row.length == 0 || row[row.length - 1] < leftBoundary) {
                    return true;
                }
                else {
                    return false;
                }
            }
            else {
                return true;
            } // If the row doesn't exist yet, then there are no problems using it
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
        let bifLeftBoundary;
        if (bif) {
            const bifEvent = max(bif[0], bif[1], val => this.getTextWidth2(val));
            bifLeftBoundary = this.calculateEventLeftBoundary(bifEvent, eventEndpoint) - leftPad;
            const isGood = function (row) {
                if (row) {
                    if (row.length == 0 || row[row.length - 1] < bifLeftBoundary) {
                        return true;
                    }
                    else {
                        return false;
                    }
                }
                else {
                    return true;
                }
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
        let useBifurcated = bifLevel != 0 && (bifLevel <= level
            || event.length > maxEventWidth);
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
        }
        else {
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
    createCallouts() {
        if (!('callouts' in this.data)) {
            return 0;
        }
        this.sortCallouts();
        //# add callouts, one by one, making sure they don't overlap
        let prevX = [-Infinity];
        let prevLevel = [-1];
        let endpointMap = [[]];
        //vertical drawing up is negative ~= max height
        let minY = Infinity;
        let minX = Infinity;
        // Last place we drew an axis label
        let lastLabelX = 0;
        for (let callout of this.data.callouts) {
            const eventColor = callout.color || Colors.black;
            const calloutDate = new Date(callout.date);
            const x = this.dateToX(calloutDate);
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
            const y = 0 - this.calloutProperties.height - calloutHeight;
            minY = Math.min(minY, y);
            minX = Math.min(minX, leftBound);
            //svg elements
            const pathData = ['M', x, ',', 0, ' L', x, ',', y, ' L',
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
    createDateTicks() {
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
    getMarkers(color) {
        let startMarker;
        let endMarker;
        if (color in this.markers) {
            [startMarker, endMarker] = this.markers[color];
        }
        else {
            startMarker = this.drawing.marker(10, 10, function (add) {
                add.path("M6,0 L6,7 L0,3 L6,0").fill(color);
            }).ref(0, 3);
            endMarker = this.drawing.marker(10, 10, function (add) {
                add.path("M0,0 L0,7 L6,3 L0,0").fill(color);
            }).ref(6, 3);
            this.markers[color] = [startMarker, endMarker];
        }
        return [startMarker, endMarker];
    }
    ;
    giveTxtBackground(txt, fill) {
        const bbox = txt.bbox();
        let rect = txt.parent().rect(bbox.width, bbox.height).fill(fill);
        rect.move(txt.x(), txt.y());
        rect.backward();
        rect.radius(2);
        return rect;
    }
    createEras(yEra, yAxis, height) {
        if (!('eras' in this.data)) {
            return;
        }
        //# create eras
        for (let era of this.data.eras) {
            //# extract era data
            const name = era.name;
            const fill = era.color || Colors.gray;
            // Don't actually know what this was supposed to do 
            // const [startMarker, endMarker] = this.getMarkers(fill);
            //# create boundary lines
            //if date isn't in bounds, something interesting will happen
            //But that shouldn't be possible?
            let t0 = new Date(era.startDate);
            let t1 = new Date(era.endDate);
            const x0 = this.dateToX(t0) + this.extraWidth;
            const x1 = this.dateToX(t1) + this.extraWidth;
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
        } //end era loop
    }
    // Generates svg document
    build() {
        //# MAGIC NUMBER: y_era
        //# draw era label and markers at this height
        // const yEra: number = 5 + this.fontHeight;
        const yEra = 0 + this.fontHeight;
        //# create main axis and callouts,
        //# keeping track of how high the callouts are
        this.createMainAxis();
        const yCallouts = this.createCallouts();
        this.createDateTicks();
        //# determine axis position so that axis + callouts don't overlap with eras
        const yAxis = yEra + this.calloutProperties.height - yCallouts;
        //# determine height so that eras, callouts, axis, and labels just fit
        const height = yAxis + this.maxLabelHeight + this.fontHeight;
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
    getTextWidth_Slow(text, anchor) {
        anchor = anchor || 'end';
        const txt = this.drawing.text(text);
        txt.font({ family: this.fontFamily, size: `${this.fontSize}pt`, anchor: anchor });
        const box = txt.bbox();
        txt.remove();
        // The box seems fuzzy so lets give a small amount of padding.
        return Math.ceil(box.width) + 1;
    }
    getTextDim(text) {
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
    }
    ;
    getTextWidth2(text) {
        const metrics = this.getTextDim(text);
        return Math.ceil(metrics.width);
    }
}
// x,y of adjustment of callout text
Timeline.textFudge = 3;
// Test linear spacing of callouts
export function makeTestPattern1(width) {
    const testPattern_1 = {
        apiVersion: 2,
        width: width,
        tickFormat: "%Y-%m-%d ",
        startDate: "2019-01-01",
        endDate: "2019-01-10",
        callouts: function () {
            const alpha = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
            const callouts = [];
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
export function makeTestPattern2() {
    const tln = {
        apiVersion: 2,
        width: 1000,
        tickFormat: "%Y-%m-%d ",
        startDate: "2019-01-01",
        endDate: "2019-01-03",
    };
    return tln;
}
export function makeTestPattern3() {
    const tln = {
        apiVersion: 2,
        width: 1000,
        tickFormat: "%Y-%m-%d ",
        startDate: "2019-01-01",
        endDate: "2019-01-01",
        callouts: [{ description: "ahh", date: "2019-01-01" }],
    };
    return tln;
}
//# sourceMappingURL=timeline.js.map