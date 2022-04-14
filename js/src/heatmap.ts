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

export class WatchHeatMap {
    data = new Map<number, Datagram[]>();
    minYear: number;
    maxYear: number;

    maxMonthCount: Datagram = { startCount: 0, finishCount: 0 };
    maxSeasonCount: Datagram = { startCount: 0, finishCount: 0 };
    maxYearCount: Datagram = { startCount: 0, finishCount: 0 };

    constructor(tln: ATL.AnimeListTimeline) {
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
            let date = anime.myStartDate;
            if (!date.isNullDate()) {
                let y = date.year();
                let m = date.month();
                const year = this.data.get(y);

                const season = seasonQ(date);

                year[FULL_YEAR].startCount++;
                year[m].startCount++;
                year[season].startCount++;
            }
            date = anime.myFinishDate;
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

        // ------

        function returnDateSpan(d0: Date, d1: Date) {
            return () => {
                console.log(d0);
                console.log(d1);
            };
        };


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

                box.classList.add("heat-table");
                box.textContent = gram.finishCount.toString();

                box.onclick = returnDateSpan(new Date(y, m - 1, 1), new Date(y, m, 0));

                if (year[m].finishCount === 0) {
                    box.style.backgroundColor = "black";
                } else {
                    let trans = Math.floor(0xFF * (gram.finishCount / this.maxMonthCount.finishCount)).toString(16);
                    box.style.backgroundColor = ATL.endColor + trans;
                }

            }


        }

        return table;
    }
}

