/*
 * Generate a svg timeline with javascript.
 * Based on https://github.com/jasonreisman/Timeline written in python.
 * Slightly documented: https://github.com/linkviii/Timeline
 *
 * Usage: `new Timeline(tlData, "timelineID").build();`
 *
 * v 8/1/2016
 *   (Try to change with new features. Not strict.)
 * 
 * MIT licenced
 */

//import svg.min.js

/**
 *color constant
 */
let Colors = {black: '#000000', gray: '#C0C0C0'};


function p(o:any):void {
    console.log(o);
}

/**
 * Interface of controlling json
 * start/end YYYY-MM-DD (currently `new Date(str);`)
 */
interface TimelineData {
    width:number;
    start:string;
    end:string;
    num_ticks?:number;
    tick_format?:string;
    //[[description, date, ?color],...]
    callouts?:Array<[string, string]|[string, string, string]>;
    //[[name, start, end, ?color],...]
    eras?:Array<[string, string, string]|[string, string, string, string]>;
}

/**
 * add_axis_label kw
 */
interface LabelKW {
    tick?:boolean;
    stroke?:string;
    fill?:string;
}

class Timeline {

    public data:TimelineData;

    public start_date:Date;
    public end_date:Date;

    public date0:number;
    public date1:number;
    public total_secs:number;

    public callout_size:[number,number,number];
    public text_fudge:[number,number];
    public tick_format:string;
    public markers;

    //public fonts;

    public max_label_height:number;

    public width:number;

    public drawing;
    public g_axis;


    constructor(data:TimelineData, id:string) {

        this.data = data;
        this.width = this.data.width;

        this.drawing = SVG(id);
        this.g_axis = this.drawing.group();

        this.start_date = new Date(this.data.start);
        this.end_date = new Date(this.data.end);

        const delta:number = (this.end_date.valueOf() - this.start_date.valueOf());
        const padding:number = (new Date(delta * 0.1)).valueOf();

        this.date0 = this.start_date.valueOf() - padding;
        this.date1 = this.end_date.valueOf() + padding;
        this.total_secs = (this.date1 - this.date0) / 1000;

        // # set up some params
        //TODO Cleanup / factor
        this.callout_size = [10, 15, 10]; // width, height, increment
        this.text_fudge = [3, 1.5];
        // TODO use
        this.tick_format = this.data.tick_format;

        this.markers = {};


        //# max_label_height stores the max height of all axis labels
        //# and is used in the final height computation in build(self)
        this.max_label_height = 0;
    }


    build():void {
        //# MAGIC NUMBER: y_era
        //# draw era label and markers at this height
        const y_era:number = 10;

        //# create main axis and callouts,
        //# keeping track of how high the callouts are
        this.create_main_axis();
        const y_callouts = this.create_callouts();

        //# determine axis position so that axis + callouts don't overlap with eras
        const y_axis:number = y_era + this.callout_size[1] - y_callouts;

        //# determine height so that eras, callouts, axis, and labels just fit
        const height:number = y_axis + this.max_label_height + 4 * this.text_fudge[1];

        //# create eras and labels using axis height and overall height
        this.create_eras(y_era, y_axis, height);
        this.create_era_axis_labels();

        //# translate the axis group and add it to the drawing
        this.g_axis.translate(0, y_axis);
        this.drawing.add(this.g_axis);

        this.drawing.size(this.width, height);

    }


    create_eras(y_era:number, y_axis:number, height:number):void {
        if (!('eras' in this.data)) {
            return;
        }

        //# create eras
        let eras_data:Array<Array<string>> = this.data.eras;
        //let markers = {};

        for (let era of eras_data) {
            //# extract era data

            const name:string = era[0];

            const t0:number = (new Date(era[1])).valueOf();
            const t1:number = (new Date(era[2])).valueOf();

            const fill:string = (era.length > 3) ? era[3] : Colors.gray;


            const [start_marker, end_marker] = this.get_markers(fill);


            //# create boundary lines
            const percent_width0:number = (t0 - this.date0) / 1000 / this.total_secs;
            const percent_width1:number = (t1 - this.date0) / 1000 / this.total_secs;

            const x0:number = Math.trunc(percent_width0 * this.width + 0.5);
            const x1:number = Math.trunc(percent_width1 * this.width + 0.5);


            const rect = this.drawing.rect(x1 - x0, height);
            rect.x(x0);
            rect.fill({color: fill, opacity: 0.15});

            this.drawing.add(rect);

            const line0 = this.drawing.add(
                this.drawing.line(x0, 0, x0, y_axis)
                    .stroke({color: fill, width: 0.5})
            );

            //TODO line0 line1 dash
            //http://svgwrite.readthedocs.io/en/latest/classes/mixins.html#svgwrite.mixins.Presentation.dasharray
            //line0.dasharray([5, 5])
            //what the svgjs equiv?

            const line1 = this.drawing.add(
                this.drawing.line(x1, 0, x1, y_axis)
                    .stroke({color: fill, width: 0.5})
            );
            //line1.dasharray([5, 5])


            //# create horizontal arrows and text
            const horz = this.drawing.add(
                this.drawing.line(x0, y_era, x1, y_era)
                    .stroke({color: fill, width: 0.75})
            );

            //TODO
            /*
             horz['marker-start'] = start_marker.get_funciri()
             horz['marker-end'] = end_marker.get_funciri()
             self.drawing.add(self.drawing.text(name, insert=(0.5*(x0 + x1), y_era - self.text_fudge[1]), stroke='none', fill=fill, font_family="Helevetica", font_size="6pt", text_anchor="middle"))
             */
            const txt = this.drawing.text(name);
            txt.font({family: 'Helevetica', size: '6pt', anchor: 'middle'});
            txt.dx(0.5 * (x0 + x1)).dy(y_era - this.text_fudge[1]);
            txt.fill(fill);

            this.drawing.add(txt);
        }//end era loop
    }

    /**
     * @param {String} color
     * @return {Array<marker, marker>}
     */
    get_markers(color:string):[any,any] {

        let start_marker;
        let end_marker;

        if (color in this.markers) {
            [start_marker, end_marker] = this.markers[color];
        } else {
            start_marker = this.drawing.marker(10, 10, function (add) {
                add.path("M6,0 L6,7 L0,3 L6,0").fill(color)
            }).ref(0, 3);

            end_marker = this.drawing.marker(10, 10, function (add) {
                add.path("M0,0 L0,7 L6,3 L0,0").fill(color)
            }).ref(6, 3);

            this.markers[color] = [start_marker, end_marker]
        }

        return [start_marker, end_marker]
    };


    create_main_axis() {
        //# draw main line
        this.g_axis.add(this.drawing.line(0, 0, this.width, 0)
            .stroke({color: Colors.black, width: 3}));

        //# add tickmarks
        //self.add_axis_label(self.start_date, str(self.start_date[0]), tick=True)
        this.add_axis_label(this.start_date, this.start_date.toDateString(), {tick: true});
        this.add_axis_label(this.end_date, this.end_date.toDateString(), {tick: true});

        if ('num_ticks' in this.data) {
            const delta = this.end_date.valueOf() - this.start_date.valueOf();
            //let secs = delta / 1000
            const num_ticks = this.data.num_ticks;
            //needs more?
            for (let j = 1; j < num_ticks; j++) {
                const tick_delta = /*new Date*/(j * delta / num_ticks);
                const tickmark_date = new Date(this.start_date.valueOf() + tick_delta);
                this.add_axis_label(tickmark_date, tickmark_date.toDateString())
            }
        }
    }


    create_era_axis_labels():void {
        if (!('eras' in this.data)) {
            return;
        }

        const eras_data:Array<Array<string>> = this.data.eras;

        for (let era of eras_data) {
            let t0 = new Date(era[1]);
            let t1 = new Date(era[2]);
            this.add_axis_label(t0, t0.toDateString());
            this.add_axis_label(t1, t1.toDateString());
        }
    }


    //def add_axis_label(self, dt, label, **kwargs):
    add_axis_label(dt:Date, label:string, kw?:LabelKW) {
        //date, string?
        kw = kw || {};

        if (this.tick_format) {
            //##label = dt[0].strftime(self.tick_format)
            // label = dt
            //TODO tick format
        }
        const percent_width:number = (dt.valueOf() - this.date0) / 1000 / this.total_secs;
        if (percent_width < 0 || percent_width > 1) {
            //error? Log?
            console.log(dt);
            return;
        }

        const x:number = Math.trunc(percent_width * this.width + 0.5);
        const dy:number = 5;

        // # add tick on line
        const add_tick:boolean = kw.tick || true;
        if (add_tick) {
            const stroke:string = kw.stroke || Colors.black;
            const line = this.drawing.line(x, -dy, x, dy)
                .stroke({color: stroke, width: 2});

            this.g_axis.add(line);
        }

        // # add label
        const fill:string = kw.fill || Colors.gray;


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

        this.g_axis.add(txt);

        const h = Timeline.get_text_metrics('Helevetica', 6, label)[0] + 2 * dy;
        this.max_label_height = Math.max(this.max_label_height, h);

    }

    /**
     *
     * @returns {number} min_y ?
     */
    create_callouts():number {

        type Info = [string, string];

        let min_y = Infinity;
        if (!('callouts' in this.data)) {
            return;//undefined
        }
        const callouts_data:Array<Array<string>> = this.data.callouts;

        //# sort callouts
        const sorted_dates:Array<number> = [];
        const inv_callouts:Map<number, Array<Info>> = new Map();

        for (let callout of callouts_data) {

            const tmp:string = callout[1];
            const event_date:number = (new Date(tmp)).valueOf();

            const event:string = callout[0];
            const event_color:string = callout[2] || Colors.black;

            sorted_dates.push(event_date);
            if (!( inv_callouts.has(event_date))) {
                inv_callouts.set(event_date, []);// [event_date] = []
            }
            const newInfo:Info = [event, event_color];
            const events:Array<Info> = inv_callouts.get(event_date);
            events.push(newInfo);

        }
        sorted_dates.sort();


        //# add callouts, one by one, making sure they don't overlap
        let prev_x = [-Infinity];
        let prev_level = [-1];
        for (let event_date of sorted_dates) {
            const [event, event_color]:Info = inv_callouts.get(event_date).pop();


            const num_sec:number = (event_date - this.date0) / 1000;
            const percent_width:number = num_sec / this.total_secs;
            if (percent_width < 0 || percent_width > 1) {
                continue;
            }

            const x:number = Math.trunc(percent_width * this.width + 0.5);

            //# figure out what 'level" to make the callout on
            let k:number = 0;
            let i:number = prev_x.length - 1;

            const left:number = x - (Timeline.get_text_metrics('Helevetica', 6, event)[0]
                + this.callout_size[0] + this.text_fudge[0]);

            while (left < prev_x[i] && i >= 0) {
                k = Math.max(k, prev_level[i] + 1);
                i -= 1;
            }

            const y:number = 0 - this.callout_size[1] - k * this.callout_size[2];
            min_y = Math.min(min_y, y);

            //path_data = 'M%i,%i L%i,%i L%i,%i'
            // % (x, 0, x, y, x - self.callout_size[0], y)
            const path_data:string = 'M' + x + ',' + 0 + ' L' + x + ',' + y + ' L'
                + (x - this.callout_size[0]) + ',' + y;

            const pth = this.drawing.path(path_data).stroke({color: event_color, width: 1});//fill none?
            pth.fill("white", 0);//nothing
            this.g_axis.add(pth);

            const txt = this.drawing.text(event);
            txt.dx(x - this.callout_size[0] - this.text_fudge[0]);
            txt.dy(y - 4 * this.text_fudge[1]);
            txt.font({family: 'Helevetica', size: '6pt', anchor: 'end'});
            txt.fill(event_color);

            this.g_axis.add(txt);

            const eDate:Date = new Date(event_date);
            this.add_axis_label(eDate, eDate.toLocaleString(),
                {tick: false, fill: Colors.black});

            //XXX white is transparent?
            const circ = this.drawing.circle(8).attr({fill: 'white', cx: x, cy: 0, stroke: event_color});//this.drawing.circle(8);
            //circ.cx(x).cy(0);
            //circ.fill('#e2e', 0.5);
            //circ.stroke({color: event_color});


            this.g_axis.add(circ);

            prev_x.push(x);
            prev_level.push(k);


        }

        return min_y;

    }

    static get_text_metrics(family:string, size:number, text:string):[number,number] {

        const c:any = document.getElementById("dummyCanvas");
        const ctx = c.getContext("2d");
        ctx.font = size + " " + family;
        const w = ctx.measureText(text).width;
        const h = size; //TODO ?? #font.metrics("linespace")
        return [w, h];
    }

}





