/*
 * Generate a svg timeline with javascript.
 * Based on https://github.com/jasonreisman/Timeline written in python.
 * Slightly documented: https://github.com/linkviii/Timeline
 *
 * Usage: `new Timeline(tlData, "timelineID").build();`
 *
 * v 2017-1-25
 *   (Try to change with new features. Not strict.)
 * 
 * MIT licenced
 */


/**
 *color constant
 */
let Colors: {black: string, gray: string} = {black: '#000000', gray: '#C0C0C0'};


function p(o: any): void {
    console.log(o);
}

/*
 * Interface of controlling json
 * start/end YYYY-MM-DD (currently `new Date(str);`)
 */
//Base interface is useless
type TimelineData = TimelineDataV1 | TimelineDataV2;

//v1
type TimelineCalloutV1 = [string, string]|[string, string, string];
type TimelineEraV1 = [string, string, string]|[string, string, string, string];
interface TimelineDataV1 {
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
interface TimelineCalloutV2 {
    description: string;
    date: string;
    color?: string;
}

interface TimelineEraV2 {
    name: string;
    startDate: string;
    endDate: string;
    color?: string;
}

interface TimelineDataV2 {
    apiVersion: number; //2
    width: number;
    startDate: string;
    endDate: string;
    numTicks?: number;
    tickFormat?: string;
    callouts?: TimelineCalloutV2[];
    eras?: TimelineEraV2[];
}

function convertTimelineDataV1ToV2(oldData: TimelineDataV1): TimelineDataV2 {

    function convertCallouts(oldCallouts: TimelineCalloutV1[]): TimelineCalloutV2[] {
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

    function convertEras(oldEras: TimelineEraV1[]): TimelineEraV2[] {
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
        newData.callouts = convertCallouts(oldData.callouts);
    }
    if ('eras' in oldData) {
        newData.eras = convertEras(oldData.eras);
    }

    return newData;
}

/**
 * addAxisLabel kw
 */
interface LabelKW {
    tick?: boolean;
    stroke?: string;
    fill?: string;
}


//
//
//

type Info = [string, string];// event, color

class Timeline {

    public readonly data: TimelineDataV2;

    public readonly startDate: Date;
    public readonly endDate: Date;

    public readonly date0: number;
    public readonly date1: number;
    public readonly totalSeconds: number;

    //public callout_size: [number, number, number];
    public readonly calloutProperties: {width: number, height: number, increment: number};


    public readonly textFudge: [number, number];
    public readonly tickFormat: string;
    public readonly markers;

    //public fonts;

    public maxLabelHeight: number;

    public readonly width: number;

    public readonly drawing;
    public readonly axisGroup;

    // initializes data for timeline
    constructor(data: TimelineData, id: string) {

        if ((<TimelineDataV2>data).apiVersion == 2) {
            this.data = <TimelineDataV2>data;
        } else {
            this.data = convertTimelineDataV1ToV2(<TimelineDataV1>data);
        }


        this.width = this.data.width;

        this.drawing = SVG(id);
        this.axisGroup = this.drawing.group();

        this.startDate = new Date(this.data.startDate);
        this.endDate = new Date(this.data.endDate);

        const delta: number = (this.endDate.valueOf() - this.startDate.valueOf());
        const padding: number = (new Date(delta * 0.1)).valueOf();

        this.date0 = this.startDate.valueOf() - padding;
        this.date1 = this.endDate.valueOf() + padding;
        this.totalSeconds = (this.date1 - this.date0) / 1000;

        // # set up some params
        //TODO Cleanup / factor
        //this.callout_size = [10, 15, 10]; // width, height, increment


        this.calloutProperties = {width: 10, height: 15, increment: 10};

        this.textFudge = [3, 1.5]; //w, h?
        // TODO use
        this.tickFormat = this.data.tickFormat;

        this.markers = {};


        //# maxLabelHeight stores the max height of all axis labels
        //# and is used in the final height computation in build(self)
        this.maxLabelHeight = 0;
    }

    // Generates svg document
    build(): void {
        //# MAGIC NUMBER: y_era
        //# draw era label and markers at this height
        const yEra: number = 10;

        //# create main axis and callouts,
        //# keeping track of how high the callouts are
        this.createMainAxis();
        const yCallouts = this.createCallouts();

        //# determine axis position so that axis + callouts don't overlap with eras
        const yAxis: number = yEra + this.calloutProperties.height - yCallouts;

        //# determine height so that eras, callouts, axis, and labels just fit
        const height: number = yAxis + this.maxLabelHeight + 4 * this.textFudge[1];

        //# create eras and labels using axis height and overall height
        this.createEras(yEra, yAxis, height);
        this.createEraAxisLabels();

        //# translate the axis group and add it to the drawing
        this.axisGroup.translate(0, yAxis);
        this.drawing.add(this.axisGroup);

        this.drawing.size(this.width, height);

    }


    createEras(yEra: number, yAxis: number, height: number): void {
        if (!('eras' in this.data)) {
            return;
        }

        //# create eras
        let erasData: TimelineEraV2[] = this.data.eras;
        //let markers = {};

        for (let era of erasData) {
            //# extract era data

            const name: string = era.name;

            const t0: number = (new Date(era.startDate)).valueOf();
            const t1: number = (new Date(era.endDate)).valueOf();

            const fill: string = era.color || Colors.gray;


            const [startMarker, endMarker] = this.getMarkers(fill);


            //# create boundary lines
            const percentWidth0: number = (t0 - this.date0) / 1000 / this.totalSeconds;
            const percentWidth1: number = (t1 - this.date0) / 1000 / this.totalSeconds;

            const x0: number = Math.trunc(percentWidth0 * this.width + 0.5);
            const x1: number = Math.trunc(percentWidth1 * this.width + 0.5);


            const rect = this.drawing.rect(x1 - x0, height);
            rect.x(x0);
            rect.fill({color: fill, opacity: 0.15});

            this.drawing.add(rect);

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

            //TODO markers?
            /*
             horz['marker-start'] = start_marker.get_funciri()
             horz['marker-end'] = end_marker.get_funciri()
             self.drawing.add(self.drawing.text(name, insert=(0.5*(x0 + x1), y_era - self.textFudge[1]), stroke='none', fill=fill, font_family="Helevetica", font_size="6pt", text_anchor="middle"))
             */
            const txt = this.drawing.text(name);
            txt.font({family: 'Helevetica', size: '6pt', anchor: 'middle'});
            txt.dx(0.5 * (x0 + x1)).dy(yEra - this.textFudge[1]);
            txt.fill(fill);

            this.drawing.add(txt);
        }//end era loop
    }

    /**
     * @param {String} color
     * @return {Array<marker, marker>}
     */
    getMarkers(color: string): [any, any] {

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


    createMainAxis() {
        //# draw main line
        this.axisGroup.add(this.drawing.line(0, 0, this.width, 0)
            .stroke({color: Colors.black, width: 3}));

        //# add tickmarks
        //self.addAxisLabel(self.startDate, str(self.startDate[0]), tick=True)
        this.addAxisLabel(this.startDate, this.startDate.toDateString(), {tick: true});
        this.addAxisLabel(this.endDate, this.endDate.toDateString(), {tick: true});

        if ('numTicks' in this.data) {
            const delta = this.endDate.valueOf() - this.startDate.valueOf();
            //let secs = delta / 1000
            const numTicks = this.data.numTicks;
            //needs more?
            for (let j = 1; j < numTicks; j++) {
                const tickDelta = /*new Date*/(j * delta / numTicks);
                const tickmarkDate = new Date(this.startDate.valueOf() + tickDelta);
                this.addAxisLabel(tickmarkDate, tickmarkDate.toDateString())
            }
        }
    }


    createEraAxisLabels(): void {
        if (!('eras' in this.data)) {
            return;
        }

        const erasData: TimelineEraV2[] = this.data.eras;

        for (let era of erasData) {
            let t0 = new Date(era.startDate);
            let t1 = new Date(era.endDate);
            this.addAxisLabel(t0, t0.toDateString());
            this.addAxisLabel(t1, t1.toDateString());
        }
    }


    //def addAxisLabel(self, dt, label, **kwargs):
    addAxisLabel(dt: Date, label: string, kw?: LabelKW) {
        //date, string?
        kw = kw || {};

        if (this.tickFormat) {
            //##label = dt[0].strftime(self.tickFormat)
            // label = dt
            //TODO tick format
        }
        const percentWidth: number = (dt.valueOf() - this.date0) / 1000 / this.totalSeconds;
        if (percentWidth < 0 || percentWidth > 1) {
            //error? Log?
            console.log(dt);
            return;
        }

        const x: number = Math.trunc(percentWidth * this.width + 0.5);
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
        const fill: string = kw.fill || Colors.gray;


        /*
         #self.drawing.text(label, insert=(x, -2 * dy), stroke='none', fill=fill, font_family='Helevetica',
         ##font_size='6pt', text_anchor='end', writing_mode='tb', transform=transform))
         */
        //writing mode?

        const txt = this.drawing.text(label);
        txt.font({family: 'Helevetica', size: '6pt', anchor: 'end'});
        txt.transform({rotation: 270, cx: x, cy: 0});
        txt.dx(x - 7).dy((-2 * dy) + 5);

        txt.fill(fill);

        this.axisGroup.add(txt);

        const h = Timeline.getTextWidth('Helevetica', 6, label) + 2 * dy;
        this.maxLabelHeight = Math.max(this.maxLabelHeight, h);

    }

    //

    //pure fn
    //sub fn createCallouts()
    static sortCallouts(calloutsData: TimelineCalloutV2[]): [number[], Map<number, Info[]>] {

        const sortedDates: number[] = [];
        const eventsByDate: Map<number, Info[]> = new Map();
        for (let callout of calloutsData) {

            const tmp: string = callout.date;
            const eventDate: number = (new Date(tmp)).valueOf();

            const event: string = callout.description;
            const eventColor: string = callout.color || Colors.black;

            sortedDates.push(eventDate);
            if (!( eventsByDate.has(eventDate))) {
                eventsByDate.set(eventDate, []);// [event_date] = []
            }
            const newInfo: Info = [event, eventColor];
            const events: Array<Info> = eventsByDate.get(eventDate);
            events.push(newInfo);

        }
        sortedDates.sort();

        return [sortedDates, eventsByDate];
    }

    //not pure fn
    //sub fn createCallouts()
    //modifies prev~
    calculateCalloutHeight(x: number, prevX: number[], prevLevel: number[], event: string): number {
        let level: number = 0;
        //let i: number = prevX.length - 1;

        //ensure text does not overlap with previous entries
        const adjustment: number = 0; //XXX
        const textWidth: number = Timeline.getTextWidth('Helevetica', 6, event) - adjustment;
        const left: number = x - (textWidth + this.calloutProperties.width + this.textFudge[0]);

        for (let i = prevX.length - 1; left < prevX[i] && i >= 0; i--) {
            if (i < 0) console.log(event)
            level = Math.max(level, prevLevel[i] + 1);
        }

        // while (left < prevX[i] && i >= 0) {
        //     level = Math.max(level, prevLevel[i] + 1);
        //     i -= 1;
        // }

        const calloutHeight = level * this.calloutProperties.increment;

        prevX.push(x);
        prevLevel.push(level);

        return calloutHeight;
    }

    //

    /**
     *
     * @returns {number} min_y ?
     */
    createCallouts(): number {
        if (!('callouts' in this.data)) {
            return;//undefined
        }
        //type Info = [string, string];// event, color

        //# sort callouts
        const [sortedDates, eventsByDate]:
            [number[], Map<number, Info[]>] = Timeline.sortCallouts(this.data.callouts);

        //# add callouts, one by one, making sure they don't overlap
        let prevX: number[] = [-Infinity];
        let prevLevel: number[] = [-1];
        let minY = Infinity;

        // for each callout
        for (let eventDate of sortedDates) {

            const numSeconds: number = (eventDate - this.date0) / 1000;
            const percentWidth: number = numSeconds / this.totalSeconds;
            if (percentWidth < 0 || percentWidth > 1) {
                continue;
            }

            const [event, eventColor]:Info = eventsByDate.get(eventDate).pop();

            // positioning
            const x: number = Math.trunc(percentWidth * this.width + 0.5);
            //# figure out what 'level" to make the callout on
            const calloutHeight: number = this.calculateCalloutHeight(x, prevX, prevLevel, event);
            const y: number = 0 - this.calloutProperties.height - calloutHeight;
            minY = Math.min(minY, y);

            //svg elements
            const pathData: string = ['M', x, ',', 0, ' L', x, ',', y, ' L',
                (x - this.calloutProperties.width), ',', y].join("");
            const pth = this.drawing.path(pathData).stroke({color: eventColor, width: 1});//fill none?
            pth.fill("white", 0);//nothing

            this.axisGroup.add(pth);

            const txt = this.drawing.text(event);
            txt.dx(x - this.calloutProperties.width - this.textFudge[0]);
            txt.dy(y - 4 * this.textFudge[1]);
            txt.font({family: 'Helevetica', size: '6pt', anchor: 'end'});
            txt.fill(eventColor);

            this.axisGroup.add(txt);

            const eDate: Date = new Date(eventDate);
            this.addAxisLabel(eDate, eDate.toLocaleString(),
                {tick: false, fill: Colors.black});

            //XXX white is transparent?
            const circ = this.drawing.circle(8).attr({fill: 'white', cx: x, cy: 0, stroke: eventColor});//this.drawing.circle(8);

            this.axisGroup.add(circ);

        }

        return minY;

    }


    static getTextWidth(family: string, size: number, text: string): number {
        //use canvas to measure text width
        const c: any = document.getElementById("dummyCanvas");
        const ctx = c.getContext("2d");
        ctx.font = size + "pt " + family;
        const w = ctx.measureText(text).width;

        return w;
    }


}





