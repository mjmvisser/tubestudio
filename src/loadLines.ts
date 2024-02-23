import type { Point } from "chart.js";
import { range, findRootWithBisection } from './utils.js';
import { TubeModel } from "./models"

import simplify from 'simplify-js';

export interface LoadLine {
    I(V: number): number;
    V(I: number): number;
    getLine(): Point[];
}

class DCResistiveLoadLine implements LoadLine {
    private Bplus: number;
    private R: number;

    constructor(Bplus: number, Rp: number, Rk: number) {
        this.Bplus = Bplus;
        this.R = Rp + Rk;
    }
    
    I(V: number): number {
        return (this.Bplus - V) / this.R;
    }

    V(I: number): number {
        return this.Bplus - I * this.R;
    }
    
    getLine(): Point[] {
        const p1 = {x: 0, y: this.I(0)};
        const p2 = {x: this.Bplus, y: this.I(this.Bplus)};
        return [p1, p2];
    }
}

class DCSingleEndedReactiveLoadLine implements LoadLine {
    private Bplus: number;
    private Zp: number;
    private Iq: number;
    constructor(Bplus: number, Z: number, Iq: number) {
        this.Bplus = Bplus;
        this.Zp = Z;
        this.Iq = Iq;
    }
    
    I(V: number): number {
        return (this.Bplus - V) / this.Zp + this.Iq;
    }
    
    V(I: number): number {
        return this.Bplus + this.Zp * (this.Iq - I);
    }
    
    getLine() : Point[] {
        const p1 = {x: 0, y: this.I(0)};
        const p2 = {x: this.V(0), y: 0}
        return [p1, p2]
    }
}

class DCPushPullReactiveLoadLine implements LoadLine {
    private Bplus: number;
    private Zpa: number;
    private Zpb: number;
    private Iq: number;
    private Vlim: number;
    private Ilim: number;

    constructor(Bplus: number, Z: number, Iq: number) {
        this.Bplus = Bplus;
        this.Zpa = Z/2;
        this.Zpb = Z/4;
        this.Iq = Iq;

        this.Vlim = this.Bplus - this.Iq * this.Zpa;
        this.Ilim = 2 * this.Iq;
    }
    
    I(V: number): number {
        if (V <= this.Vlim) {
            // class B operation
            return (this.Bplus - V) / this.Zpb;
        } else {
            // class A operation
            return (this.Bplus - V) / this.Zpa + this.Iq;
        }
    }
    
    V(I: number): number {
        if (I >= this.Ilim) {
            // class B operation
            return this.Bplus - this.Zpb * I;
        } else {
            // class A operation
            return this.Bplus - this.Zpa * (I - this.Iq);
        }
    }
    
    getLine(): Point[] {
        const p1 = {x: 0, y: this.I(0)};
        const p2 = {x: this.Vlim, y: this.Ilim};
        const p3 = {x: this.V(0), y: 0};
        return [p1, p2, p3];
    }
}

class CathodeLoadLine implements LoadLine {
    private Rk: number;
    private model: TubeModel;
    constructor(Rk: number, model: TubeModel) {
        this.Rk = Rk;
        this.model = model;
    }
    
    I(Vg: number): number {
        return -Vg / this.Rk;
    }
    
    Vg(I: number): number {
        return -I * this.Rk;
    }

    V(I: number): number {
        return this.model.Vp(this.Vg(I), I);
    }
    
    static Rk(Vg: number, I: number) {
        return Math.max(0, -Vg / I);
    }

    getLine(): Point[] {
        return simplify(range(0, 50, 0.5).map(Vg => {
            const I = this.I(Vg);
            const V = this.V(I);
            return {x: V, y: I};
          }), 0.00001, true);
    }
}

class ACLoadLine implements LoadLine {
    private R: number;
    private Znext: number;
    private Vq: number;
    private Iq: number;
    private Z: number;

    constructor(Rp: number, Rk: number, Znext: number, Vq: number, Iq: number) {
        this.R = Rp + Rk;
        this.Znext = Znext;
        this.Vq = Vq;
        this.Iq = Iq;
        
        this.Z = (this.R * this.Znext) / (this.R + this.Znext);
    }

    I(V: number): number {
        return (this.Vq - V) / this.Z + this.Iq;
    }
    
    V(I: number): number {
        return this.Z * (this.Iq - I) + this.Vq;
    }
    
    getLine(): Point[] {
        const p1 = {x: 0, y: this.I(0)};
        const p2 = {x: this.V(0), y: 0};
        return [p1, p2];
    }
}

const loadLineFactory = {
    createDCLoadLine: (topology: 'pp' | 'se', Bplus: number, loadType: 'resistive' | 'reactive', Rp: number, Rk: number, Iq: number) => {
        if (loadType === "resistive" && Bplus >= 0 && Rp >= 0) {
            return new DCResistiveLoadLine(Bplus, Rp, Rk || 0);
        } else if (loadType === "reactive" && Bplus >= 0 && Rp >= 0 && Iq !== null) {
            if (topology === 'pp') {
                return new DCPushPullReactiveLoadLine(Bplus, Rp, Iq);
            } else if (topology === 'se') {
                return new DCSingleEndedReactiveLoadLine(Bplus, Rp, Iq);
            }
        }

        return null;
    },
    
    createACLoadLine: (Rp: number, Rk: number, Znext: number, Vq: number, Iq: number) => {
        if (Rp >= 0 && Znext !== null && Znext >= 0 && Vq !== null && Iq !== null) {
            return new ACLoadLine(Rp, Rk || 0, Znext, Vq, Iq);
        } else {
            return null;
        }
    },
    
    createCathodeLoadLine: (Rk: number, model: TubeModel) => {
        if (Rk !== null) {
            return new CathodeLoadLine(Rk, model);
        } else {
            return null;
        }
    }
}

const intersectCharacteristicWithLoadLineV = (model: TubeModel, Vg: number, loadLine: LoadLine): number => {
    // find intersection of loadline with characteristic curve at Vg and return Vq
    return findRootWithBisection((Vq) => {
        return model.Ip(Vg, Vq) - loadLine.I(Vq);
    }, 0, 5000, 1000, 0.0000001, 0.0000001);        
}

const intersectLoadLines = (loadLine: LoadLine, cathodeLoadLine: CathodeLoadLine, tubeModel: TubeModel): number => {
    return findRootWithBisection((Vg) => {
        const Ip = cathodeLoadLine.I(Vg);
        return loadLine.V(Ip) - tubeModel.Vp(Vg, Ip);
    }, -200, 0, 1000, 0.0000001, 0.0000001)
}

export { loadLineFactory, intersectLoadLines, intersectCharacteristicWithLoadLineV }