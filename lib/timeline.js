/*
 * Generate a svg timeline with javascript.
 * Based on https://github.com/jasonreisman/Timeline written in python.
 * Slightly documented: https://github.com/linkviii/Timeline
 *
 * Usage: `new Timeline(tlData, "timelineID").build();`
 *
 * v 2017-1-26*
 *   (Try to change with new features. Not strict.)
 *
 * MIT licenced
 */
//Util
function max(x, y, fn) {
    if (fn(x) > fn(y)) {
        return x;
    }
    else {
        return y;
    }
}
//
/**
 *color constant
 */
let Colors = { black: '#000000', gray: '#C0C0C0' };
function p(o) {
    console.log(o);
}
class TimelineConverter {
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
class Timeline {
    // initializes data for timeline
    constructor(data, id) {
        if (data.apiVersion == 2) {
            this.data = data;
        }
        else {
            this.data = TimelineConverter.convertTimelineDataV1ToV2(data);
        }
        this.width = this.data.width;
        this.drawing = SVG(id);
        this.axisGroup = this.drawing.group();
        this.startDate = new Date(this.data.startDate);
        this.endDate = new Date(this.data.endDate);
        const delta = (this.endDate.valueOf() - this.startDate.valueOf());
        const padding = (new Date(delta * 0.1)).valueOf();
        this.date0 = this.startDate.valueOf() - padding;
        this.date1 = this.endDate.valueOf() + padding;
        this.totalSeconds = (this.date1 - this.date0) / 1000;
        // TODO use
        this.tickFormat = this.data.tickFormat;
        this.markers = {};
        //# maxLabelHeight stores the max height of all axis labels
        //# and is used in the final height computation in build(self)
        this.maxLabelHeight = 0;
    }
    // Generates svg document
    build() {
        //# MAGIC NUMBER: y_era
        //# draw era label and markers at this height
        const yEra = 10;
        //# create main axis and callouts,
        //# keeping track of how high the callouts are
        this.createMainAxis();
        const yCallouts = this.createCallouts();
        //# determine axis position so that axis + callouts don't overlap with eras
        const yAxis = yEra + Timeline.calloutProperties.height - yCallouts;
        //# determine height so that eras, callouts, axis, and labels just fit
        const height = yAxis + this.maxLabelHeight + 4 * Timeline.textFudge[1];
        //# create eras and labels using axis height and overall height
        this.createEras(yEra, yAxis, height);
        this.createEraAxisLabels();
        //# translate the axis group and add it to the drawing
        this.axisGroup.translate(0, yAxis);
        this.drawing.add(this.axisGroup);
        this.drawing.size(this.width, height);
    }
    createEras(yEra, yAxis, height) {
        if (!('eras' in this.data)) {
            return;
        }
        //# create eras
        let erasData = this.data.eras;
        //let markers = {};
        for (let era of erasData) {
            //# extract era data
            const name = era.name;
            const t0 = (new Date(era.startDate)).valueOf();
            const t1 = (new Date(era.endDate)).valueOf();
            const fill = era.color || Colors.gray;
            const [startMarker, endMarker] = this.getMarkers(fill);
            //# create boundary lines
            const percentWidth0 = (t0 - this.date0) / 1000 / this.totalSeconds;
            const percentWidth1 = (t1 - this.date0) / 1000 / this.totalSeconds;
            const x0 = Math.trunc(percentWidth0 * this.width + 0.5);
            const x1 = Math.trunc(percentWidth1 * this.width + 0.5);
            const rect = this.drawing.rect(x1 - x0, height);
            rect.x(x0);
            rect.fill({ color: fill, opacity: 0.15 });
            this.drawing.add(rect);
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
            //TODO markers?
            /*
             horz['marker-start'] = start_marker.get_funciri()
             horz['marker-end'] = end_marker.get_funciri()
             self.drawing.add(self.drawing.text(name, insert=(0.5*(x0 + x1), y_era - self.textFudge[1]), stroke='none',
             ````fill=fill, font_family="Helevetica", font_size="6pt", text_anchor="middle"))
             */
            const txt = this.drawing.text(name);
            txt.font({ family: 'Helevetica', size: '6pt', anchor: 'middle' });
            txt.dx(0.5 * (x0 + x1)).dy(yEra - Timeline.textFudge[1]);
            txt.fill(fill);
            this.drawing.add(txt);
        } //end era loop
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
    createMainAxis() {
        //# draw main line
        this.axisGroup.add(this.drawing.line(0, 0, this.width, 0)
            .stroke({ color: Colors.black, width: 3 }));
        //# add tickmarks
        //self.addAxisLabel(self.startDate, str(self.startDate[0]), tick=True)
        this.addAxisLabel(this.startDate, this.startDate.toDateString(), { tick: true });
        this.addAxisLabel(this.endDate, this.endDate.toDateString(), { tick: true });
        if ('numTicks' in this.data) {
            const delta = this.endDate.valueOf() - this.startDate.valueOf();
            //let secs = delta / 1000
            const numTicks = this.data.numTicks;
            //needs more?
            for (let j = 1; j < numTicks; j++) {
                const tickDelta = (j * delta / numTicks);
                const tickmarkDate = new Date(this.startDate.valueOf() + tickDelta);
                this.addAxisLabel(tickmarkDate, tickmarkDate.toDateString());
            }
        }
    }
    createEraAxisLabels() {
        if (!('eras' in this.data)) {
            return;
        }
        const erasData = this.data.eras;
        for (let era of erasData) {
            let t0 = new Date(era.startDate);
            let t1 = new Date(era.endDate);
            this.addAxisLabel(t0, t0.toDateString());
            this.addAxisLabel(t1, t1.toDateString());
        }
    }
    //def addAxisLabel(self, dt, label, **kwargs):
    addAxisLabel(dt, label, kw) {
        //date, string?
        kw = kw || {};
        if (this.tickFormat) {
        }
        const percentWidth = (dt.valueOf() - this.date0) / 1000 / this.totalSeconds;
        if (percentWidth < 0 || percentWidth > 1) {
            //error? Log?
            console.log(dt);
            return;
        }
        const x = Math.trunc(percentWidth * this.width + 0.5);
        const dy = 5;
        // # add tick on line
        const addTick = kw.tick || true;
        if (addTick) {
            const stroke = kw.stroke || Colors.black;
            const line = this.drawing.line(x, -dy, x, dy)
                .stroke({ color: stroke, width: 2 });
            this.axisGroup.add(line);
        }
        // # add label
        const fill = kw.fill || Colors.gray;
        /*
         #self.drawing.text(label, insert=(x, -2 * dy), stroke='none', fill=fill, font_family='Helevetica',
         ##font_size='6pt', text_anchor='end', writing_mode='tb', transform=transform))
         */
        //writing mode?
        const txt = this.drawing.text(label);
        txt.font({ family: 'Helevetica', size: '6pt', anchor: 'end' });
        txt.transform({ rotation: 270, cx: x, cy: 0 });
        txt.dx(x - 7).dy((-2 * dy) + 5);
        txt.fill(fill);
        this.axisGroup.add(txt);
        const h = Timeline.getTextWidth('Helevetica', 6, label) + 2 * dy;
        this.maxLabelHeight = Math.max(this.maxLabelHeight, h);
    }
    //
    //pure fn
    //sub fn createCallouts()
    static sortCallouts(calloutsData) {
        const sortedDates = [];
        const eventsByDate = new Map();
        for (let callout of calloutsData) {
            const tmp = callout.date;
            const eventDate = (new Date(tmp)).valueOf();
            const event = callout.description;
            const eventColor = callout.color || Colors.black;
            sortedDates.push(eventDate);
            if (!(eventsByDate.has(eventDate))) {
                eventsByDate.set(eventDate, []); // [event_date] = []
            }
            const newInfo = [event, eventColor];
            const events = eventsByDate.get(eventDate);
            events.push(newInfo);
        }
        sortedDates.sort();
        return [sortedDates, eventsByDate];
    }
    /**
     *
     * @param str
     * @returns {any}
     */
    static bifercateString(str) {
        const cuttingRangeStart = Math.floor(str.length * 0.33);
        const cuttingRangeEnd = str.length * 0.66;
        let maxCutPoint = 0;
        for (let i = cuttingRangeStart; i < cuttingRangeEnd; i++) {
            if (str[i] == " ") {
                maxCutPoint = i;
            }
        }
        if (maxCutPoint != 0) {
            return [str.slice(0, maxCutPoint), str.slice(maxCutPoint + 1, str.length - 1)];
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
    static calculateEventLeftBondary(event, eventEndpoint) {
        //const adjustment: number = 0; //XXX
        const textWidth = Timeline.getTextWidth('Helevetica', 6, event); // - adjustment;
        //const leftBoundary: number =
        return eventEndpoint - (textWidth + Timeline.calloutProperties.width + Timeline.textFudge[0]);
    }
    //not pure fn
    //sub fn createCallouts()
    //modifies prev*
    static calculateCalloutHeight(eventEndpoint, prevEndpoints, prevLevels, event) {
        //ensure text does not overlap with previous entries
        const leftBoundary = Timeline.calculateEventLeftBondary(event, eventEndpoint);
        let level = Timeline.calculateCalloutLevel(leftBoundary, prevEndpoints, prevLevels);
        //TODO Compare against bifracated areas
        const bif = Timeline.bifercateString(event);
        if (bif) {
            //longest of 2 stings
            const bifEvent = max(bif[0], bif[1], function (val) {
                return val.length;
            });
            const bifBondary = Timeline.calculateEventLeftBondary(bifEvent, eventEndpoint);
            // occupying 2 lines → +1
            const bifLevel = Timeline.calculateCalloutLevel(bifBondary, prevEndpoints, prevLevels) + 1;
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
    //
    /**
     *
     * @returns {number} min_y ?
     */
    createCallouts() {
        if (!('callouts' in this.data)) {
            return; //undefined
        }
        //type Info = [string, string];// event, color
        //# sort callouts
        const [sortedDates, eventsByDate] = Timeline.sortCallouts(this.data.callouts);
        //# add callouts, one by one, making sure they don't overlap
        let prevX = [-Infinity];
        let prevLevel = [-1];
        //vertical drawing up is negative ~= max height
        let minY = Infinity;
        // for each callout
        for (let eventDate of sortedDates) {
            const [rawEvent, eventColor] = eventsByDate.get(eventDate).pop();
            const numSeconds = (eventDate - this.date0) / 1000;
            const percentWidth = numSeconds / this.totalSeconds;
            if (percentWidth < 0 || percentWidth > 1) {
                const w = ["Skipped callout: ", rawEvent, ". percentWidth: ", percentWidth,
                    ". Date not in range?"].join("");
                console.warn(w);
                continue;
            }
            // positioning
            const x = Math.trunc(percentWidth * this.width + 0.5);
            //# figure out what 'level" to make the callout on
            const [calloutHeight, event] = Timeline.calculateCalloutHeight(x, prevX, prevLevel, rawEvent);
            const y = 0 - Timeline.calloutProperties.height - calloutHeight;
            minY = Math.min(minY, y);
            //svg elements
            const pathData = ['M', x, ',', 0, ' L', x, ',', y, ' L',
                (x - Timeline.calloutProperties.width), ',', y].join("");
            const pth = this.drawing.path(pathData).stroke({ color: eventColor, width: 1 }); //fill none?
            pth.fill("white", 0); //nothing
            this.axisGroup.add(pth);
            const txt = this.drawing.text(event);
            txt.dx(x - Timeline.calloutProperties.width - Timeline.textFudge[0]);
            txt.dy(y - 4 * Timeline.textFudge[1]);
            txt.font({ family: 'Helevetica', size: '6pt', anchor: 'end' });
            txt.fill(eventColor);
            this.axisGroup.add(txt);
            const eDate = new Date(eventDate);
            this.addAxisLabel(eDate, eDate.toLocaleString(), { tick: false, fill: Colors.black });
            //XXX white is transparent?
            const circ = this.drawing.circle(8).attr({ fill: 'white', cx: x, cy: 0, stroke: eventColor });
            this.axisGroup.add(circ);
        }
        return minY;
    }
    static getTextWidth(family, size, text) {
        //use canvas to measure text width
        const ctx = Timeline.canvas.getContext("2d");
        ctx.font = size + "pt " + family;
        const w = ctx.measureText(text).width;
        return w;
    }
}
Timeline.calloutProperties = {
    width: 10,
    height: 15,
    increment: 10
};
Timeline.textFudge = [3, 1.5]; //factor? [?, ?]
Timeline.canvas = document.createElement('canvas');
//# sourceMappingURL=timeline.js.map