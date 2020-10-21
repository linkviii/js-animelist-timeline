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
        if (data.apiVersion == 2) {
            this.data = data;
        }
        else {
            this.data = TimelineConverter.convertTimelineDataV1ToV2(data);
        }
        this.width = this.data.width;
        this.deadWidth = 0;
        this.drawing = SVG().addTo('#' + id);
        this.axisGroup = this.drawing.group();
        this.startDate = new Date(this.data.startDate);
        this.endDate = new Date(this.data.endDate);
        const delta = (this.endDate.valueOf() - this.startDate.valueOf());
        const padding = (new Date(delta * 0.1)).valueOf();
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
        let minX = Infinity;
        for (let callout of this.data.callouts) {
            const calloutDate = new Date(callout.date);
            const x = this.dateToX(calloutDate);
            if (x instanceof OoBDate) {
                console.warn([callout, calloutDate, OoBDate]);
                continue;
            }
            const leftBoundary = Timeline.calculateEventLeftBoundary(callout.description, x);
            minX = Math.min(minX, leftBoundary);
        }
        // clamp to a positive value
        minX = Math.max(0, -minX);
        // this.deadWidth = minX;
        this.extraWidth = minX;
    }
    createMainAxis() {
        //# draw main line
        this.axisGroup.add(this.drawing.line(0, 0, this.width, 0)
            .stroke({ color: Colors.black, width: 3 }));
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
            label = strftime(this.tickFormat, dt);
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
            const line = this.drawing.line(x, -tickHeight, x, tickHeight)
                .stroke({ color: stroke, width: 2 });
            this.axisGroup.add(line);
        }
        // # add label
        // Offset to center the text on the tick
        const bar = 1.2 * Timeline.fontSize;
        // Distance between the x axis and text
        const foo = 2 * tickHeight;
        const txt = this.drawing.text(label);
        txt.font({ family: Timeline.fontFamily, size: `${Timeline.fontSize}pt`, anchor: 'end' });
        txt.transform({ rotate: 270, ox: x, oy: 0 });
        txt.dx(x - foo).dy(-bar);
        txt.fill(fill);
        this.axisGroup.add(txt);
        const h = Timeline.getTextWidth(Timeline.fontFamily, Timeline.fontSize, label) + foo;
        this.maxLabelHeight = Math.max(this.maxLabelHeight, h);
    }
    ///
    // Callout generating functions
    ///
    sortCallouts() {
        this.data.callouts.sort(function (a, b) {
            const tmpA = a.date;
            const eventDateA = (new Date(tmpA)).valueOf();
            const tmpB = b.date;
            const eventDateB = (new Date(tmpB)).valueOf();
            return eventDateA - eventDateB;
        });
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
    static calculateEventLeftBoundary(event, eventEndpoint) {
        const textWidth = Timeline.getTextWidth(Timeline.fontFamily, Timeline.fontSize, event);
        const extraFudge = 4; // Why is this needed?
        const leftBoundary = eventEndpoint - (textWidth + Timeline.calloutProperties.width + Timeline.textFudge + extraFudge);
        return leftBoundary;
    }
    // not pure fn
    // modifies prev*
    static calculateCalloutHeight(eventEndpoint, prevEndpoints, prevLevels, event) {
        // ensure text does not overlap with previous entries
        const leftBoundary = Timeline.calculateEventLeftBoundary(event, eventEndpoint);
        let level = Timeline.calculateCalloutLevel(leftBoundary, prevEndpoints, prevLevels);
        const bif = Timeline.bifurcateString(event);
        if (bif) {
            //longest of 2 stings
            const bifEvent = max(bif[0], bif[1], val => Timeline.getTextWidth(Timeline.fontFamily, Timeline.fontSize, val));
            const bifBoundary = Timeline.calculateEventLeftBoundary(bifEvent, eventEndpoint);
            // occupying 2 lines → +1
            const bifLevel = Timeline.calculateCalloutLevel(bifBoundary, prevEndpoints, prevLevels) + 1;
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
    createCallouts() {
        if (!('callouts' in this.data)) {
            return 0;
        }
        this.sortCallouts();
        //# add callouts, one by one, making sure they don't overlap
        let prevX = [-Infinity];
        let prevLevel = [-1];
        //vertical drawing up is negative ~= max height
        let minY = Infinity;
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
            //# figure out what 'level" to make the callout on
            const [calloutHeight, event] = Timeline.calculateCalloutHeight(x, prevX, prevLevel, callout.description);
            const y = 0 - Timeline.calloutProperties.height - calloutHeight;
            minY = Math.min(minY, y);
            //svg elements
            const pathData = ['M', x, ',', 0, ' L', x, ',', y, ' L',
                (x - Timeline.calloutProperties.width), ',', y].join("");
            const pth = this.drawing.path(pathData).stroke({ color: eventColor, width: 1, fill: "none" });
            pth.fill("none", 0);
            this.axisGroup.add(pth);
            const bar = Timeline.fontSize * 1.5;
            const txt = this.drawing.text(event);
            txt.dx(x - Timeline.calloutProperties.width - Timeline.textFudge);
            // TODO wut
            txt.dy(y - bar);
            txt.font({ family: Timeline.fontFamily, size: `${Timeline.fontSize}pt`, anchor: 'end' });
            txt.fill(eventColor);
            this.axisGroup.add(txt);
            if (x - lastLabelX > Timeline.fontSize) {
                lastLabelX = x;
                this.addAxisLabel(calloutDate, { tick: false, fill: Colors.black });
            }
            const circ = this.drawing.circle(8).attr({ fill: 'white', cx: x, cy: 0, stroke: eventColor });
            this.axisGroup.add(circ);
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
    createEras(yEra, yAxis, height) {
        if (!('eras' in this.data)) {
            return;
        }
        //# create eras
        for (let era of this.data.eras) {
            //# extract era data
            const name = era.name;
            const fill = era.color || Colors.gray;
            const [startMarker, endMarker] = this.getMarkers(fill);
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
            this.drawing.add(rect);
            // Boundary lines
            const line0 = this.drawing.add(this.drawing.line(x0, 0, x0, yAxis)
                .stroke({ color: fill, width: 0.5 }));
            //TODO line0 line1 dash
            //http://svgwrite.readthedocs.io/en/latest/classes/mixins.html#svgwrite.mixins.Presentation.dasharray
            //line0.dasharray([5, 5])
            //what the svgjs equiv?
            const line1 = this.drawing.add(this.drawing.line(x1, 0, x1, yAxis)
                .stroke({ color: fill, width: 0.5 }));
            //line1.dasharray([5, 5])
            //# create horizontal arrows and text
            const horz = this.drawing.add(this.drawing.line(x0, yEra, x1, yEra)
                .stroke({ color: fill, width: 0.75 }));
            // Era title
            const txt = this.drawing.text(name);
            txt.font({ family: Timeline.fontFamily, size: `${Timeline.fontSize}pt`, anchor: 'middle' });
            txt.dx(0.5 * (x0 + x1)).dy(yEra - Timeline.fontSize * 2);
            txt.fill(fill);
            this.drawing.add(txt);
            // axis dates
            this.addAxisLabel(t0);
            this.addAxisLabel(t1);
        } //end era loop
    }
    // Generates svg document
    build() {
        //# MAGIC NUMBER: y_era
        //# draw era label and markers at this height
        const yEra = 5 + Timeline.fontSize;
        //# create main axis and callouts,
        //# keeping track of how high the callouts are
        this.createMainAxis();
        const yCallouts = this.createCallouts();
        this.createDateTicks();
        //# determine axis position so that axis + callouts don't overlap with eras
        const yAxis = yEra + Timeline.calloutProperties.height - yCallouts;
        //# determine height so that eras, callouts, axis, and labels just fit
        const height = yAxis + this.maxLabelHeight + Timeline.fontSize;
        //# create eras and labels using axis height and overall height
        this.createEras(yEra, yAxis, height);
        //# translate the axis group and add it to the drawing
        // this.axisGroup.translate(0, yAxis);
        this.axisGroup.translate(this.extraWidth, yAxis);
        this.drawing.add(this.axisGroup);
        // this.drawing.size(this.width, height);
        this.drawing.size(this.width + this.extraWidth, height);
    }
    static getTextWidth(family, size, text) {
        //use canvas to measure text width
        const ctx = Timeline.canvas.getContext("2d");
        ctx.font = size + "pt " + family;
        const w = ctx.measureText(text).width;
        return w;
    }
}
Timeline.fontSize = 8;
Timeline.fontFamily = 'Helvetica';
Timeline.calloutProperties = {
    width: 10,
    height: 15,
    increment: Timeline.fontSize * 1.75
};
// x,y of adjustment of callout text
Timeline.textFudge = 3;
//
//
//
Timeline.canvas = document.createElement('canvas');
//# sourceMappingURL=timeline.js.map