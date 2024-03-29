import * as MAL from "./MAL.js";
import * as ATL from "./animelistTL.js";


declare function strftime(format: string, date: Date): string;

const monthNames = new Map<number, string>();
for (let i = 0; i < 12; i++) {
    let name = strftime("%b", new Date(2020, i, 5));
    monthNames.set(i + 1, name);
}

interface Datagram {
    startCount: number;
    finishCount: number;
}
const FULL_YEAR = 0;
const Q1 = 13;
const Q2 = 14;
const Q3 = 15;
const Q4 = 16;
const LAST = Q4;

function seasonQ(date: MAL.Mdate): number {
    const season = ATL.seasonOf(date);
    switch (season) {
        case ATL.allSeasons[0]: return Q1;
        case ATL.allSeasons[1]: return Q2;
        case ATL.allSeasons[2]: return Q3;
        case ATL.allSeasons[3]: return Q4;
    }
}

type SpanHandler = (d1: Date, d2: Date) => void;

export class WatchHeatMap {
    data = new Map<number, Datagram[]>();
    minYear: number;
    maxYear: number;

    maxMonthCount: Datagram = { startCount: 0, finishCount: 0 };
    maxSeasonCount: Datagram = { startCount: 0, finishCount: 0 };
    maxYearCount: Datagram = { startCount: 0, finishCount: 0 };

    // spanHandler: SpanHandler;

    constructor(tln: ATL.AnimeListTimeline, public spanHandler: SpanHandler) {
        this.minYear = tln.firstDate.year();
        this.maxYear = tln.lastDate.year();

        for (let y = this.minYear; y <= this.maxYear; y++) {
            const year: Datagram[] = [];
            for (let i = 0; i <= LAST; ++i) {
                year.push({ startCount: 0, finishCount: 0 });
            }
            this.data.set(y, year);
        }
        for (let anime of tln.mediaSet) {
            let date = anime.userStartDate;
            if (!date.isNullDate()) {
                let y = date.year();
                let m = date.month();
                const year = this.data.get(y);

                const season = seasonQ(date);

                year[FULL_YEAR].startCount++;
                year[m].startCount++;
                year[season].startCount++;
            }
            date = anime.userFinishDate;
            if (!date.isNullDate()) {
                let y = date.year();
                let m = date.month();
                const year = this.data.get(y);

                const season = seasonQ(date);

                year[FULL_YEAR].finishCount++;
                year[m].finishCount++;
                year[season].finishCount++;
            }
        }
        //---
        const maxGram = (a: Datagram, b: Datagram) => {
            return {
                startCount: Math.max(a.startCount, b.startCount),
                finishCount: Math.max(a.finishCount, b.finishCount)
            };
        };

        for (let y = this.minYear; y <= this.maxYear; y++) {
            const year = this.data.get(y);
            for (let m = 1; m <= 12; ++m) {
                const gram = year[m];
                this.maxMonthCount = maxGram(this.maxMonthCount, gram);
            }
            for (let s = Q1; s <= Q4; s++) {
                const gram = year[s];
                this.maxSeasonCount = maxGram(this.maxSeasonCount, gram);

            }
            this.maxYearCount = maxGram(this.maxYearCount, year[FULL_YEAR]);

        }
    }

    render(): HTMLElement {
        const table = document.createElement("table");

        const head = document.createElement("thead");
        table.append(head);

        const headRow = document.createElement("tr");
        head.append(headRow);

        // ------
        {   // Spacer cell
            const cell = document.createElement("th");
            headRow.append(cell);
        }
        for (let m = 1; m <= 12; ++m) {
            const cell = document.createElement("th");
            headRow.append(cell);
            cell.textContent = monthNames.get(m);
        }
        for (let s = Q1; s <= Q4; s++) {
            const cell = document.createElement("th");
            headRow.append(cell);
            cell.textContent = ATL.allSeasons[s - Q1];
        }
        {
            const cell = document.createElement("th");
            headRow.append(cell);
            cell.textContent = "Year";
        }

        // ------

        const returnDateSpan = (d0: Date, d1: Date) => {
            return () => {
                // console.log(d0);
                // console.log(d1);
                this.spanHandler(d0, d1);
            };
        };

        function fill(percent: number) {
            // const value =0xff * percent;

            const scaleMax = 0xEE;
            const value = (scaleMax * percent) + (0xff - scaleMax);

            return Math.floor(value).toString(16);
        }

        function styleBox(box0: HTMLElement, gram: Datagram, maxgram: Datagram) {
            const box = document.createElement("span");
            box0.append(box);


            box.classList.add("heat-table-cell");
            if (gram.startCount === 0 && gram.finishCount === 0) {
                box.style.backgroundColor = "black";
                box.textContent = "____";
            } else {
                const tooltip = `Started ${gram.startCount} and Finished ${gram.finishCount}`;
                // box.title = tooltip;
                // https://stackoverflow.com/a/25813336/1993919
                box.setAttribute("data-tooltip", tooltip);
                {
                    let span = document.createElement("span");
                    box.append(span);

                    // span.textContent = gram.startCount.toString();
                    span.textContent = "__";
                    let trans = fill(gram.startCount / maxgram.startCount);
                    span.style.backgroundColor = ATL.startColor1 + trans;
                }
                {
                    let span = document.createElement("span");
                    box.append(span);

                    span.textContent = "__";
                    // span.textContent = gram.finishCount.toString();
                    let trans = fill(gram.finishCount / maxgram.finishCount);
                    span.style.backgroundColor = ATL.endColor + trans;
                }
            }
        }


        for (let y = this.minYear; y <= this.maxYear; y++) {
            const row = document.createElement("tr");
            table.append(row);
            const box = document.createElement("th");
            row.append(box);
            box.textContent = y.toString();

            const year = this.data.get(y);

            for (let m = 1; m <= 12; ++m) {
                let gram = year[m];
                const box = document.createElement("td");
                row.append(box);


                box.onclick = returnDateSpan(new Date(y, m - 1, 1), new Date(y, m, 0));

                styleBox(box, gram, this.maxMonthCount);

            }
            //
            for (let s = Q1; s <= Q4; s++) {
                const gram = year[s];
                const box = document.createElement("td");
                row.append(box);

                let dates = ATL.seasonBounds(ATL.allSeasons[s - Q1], y);
                box.onclick = returnDateSpan(dates[0].date, dates[1].date);

                styleBox(box, gram, this.maxSeasonCount);

            }
            {
                const gram = year[FULL_YEAR];
                const box = document.createElement("td");
                box.onclick = returnDateSpan(new Date(y, 0, 1), new Date(y + 1, 0, 0));

                row.append(box);

                styleBox(box, gram, this.maxYearCount);

            }


        }

        return table;
    }
}

