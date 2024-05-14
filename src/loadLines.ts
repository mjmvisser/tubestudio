import type { Point } from "chart.js";
import { range, findRootWithBisection } from './utils.js';
import { TubeModel } from './tubeModels';
import type { AmpState } from './amp';

import simplify from 'simplify-js';

export interface LoadLine {
    I(V: number) : number;
    V(I: number) : number;
    getLine(): Point[];
    info(): string;
}

export abstract class DCLoadLine implements LoadLine {
    constructor(protected ampState: Readonly<AmpState>) {};

    abstract I(V: number): number;
    abstract V(I: number): number;
    abstract Vq(): number;
    abstract Iq(): number;
    abstract getLine(): Point[];
    abstract info(): string;
}

abstract class DCResistiveLoadLine extends DCLoadLine {
    abstract R() : number;

    I(V: number) {
        return (this.ampState.Bplus - V) / this.R();
    }

    V(I: number) {
        return this.ampState.Bplus - I * this.R();
    }

    Iq() {
        return this.I(this.ampState.Vq);
    }
    
    Vq() {
        return this.V(this.ampState.Iq);
    }

    getLine(): Point[] {
        const p1 = {x: 0, y: this.I(0)};
        const p2 = {x: this.ampState.Bplus, y: this.I(this.ampState.Bplus)};
        return [p1, p2];
    }

    info() : string {
        return this.R().toFixed() + 'Ω';
    }
}

class DCSingleEndedResistiveLoadLine extends DCResistiveLoadLine {
    R() {
        return this.ampState.Rp + (this.ampState.Rk ?? 0);
    }
}

class DCPushPullResistiveLoadLine extends DCResistiveLoadLine {
    R() {
        // each tube sees half the load
        return (this.ampState.Rp + (this.ampState.Rk ?? 0)) / 2;
    }
}

class DCSingleEndedReactiveLoadLine extends DCLoadLine {
    I(V: number) {
        const R = this.ampState.Rp + (this.ampState.Rk ?? 0);
        return (this.ampState.Vq - V) / R + this.ampState.Iq;
    }
    
    V(I: number) {
        const R = this.ampState.Rp + (this.ampState.Rk ?? 0);
        return this.ampState.Vq + R * (this.ampState.Iq - I);
    }
    
    Iq() {
        return this.ampState.Iq;
    }

    Vq() {
        return this.ampState.Vq;
    }

    getLine() : Point[] {
        const p1 = {x: 0, y: this.I(0)};
        const p2 = {x: this.V(0), y: 0}
        return [p1, p2]
    }

    info() : string {
        const R = this.ampState.Rp + (this.ampState.Rk ?? 0);
        return R.toFixed() + 'Ω';
    }
}

class DCPushPullReactiveLoadLine extends DCLoadLine {
    private Rpa() {
        const R = this.ampState.Rp + (this.ampState.Rk ?? 0);
        return R/2;
    }

    private Rpb() {
        const R = this.ampState.Rp + (this.ampState.Rk ?? 0);
        return R/4;
    }

    private Vlim() {
        return this.ampState.Vq - this.ampState.Iq * this.Rpa();
    }

    private Ilim() {
        return 2 * this.ampState.Iq;
    }

    I(V: number): number {
        if (V <= this.Vlim()) {
            // class B operation
            return (this.ampState.Vq - V) / this.Rpb();
        } else {
            // class A operation
            return (this.ampState.Vq - V) / this.Rpa() + this.ampState.Iq;
        }
    }
    
    V(I: number): number {
        if (I >= this.Ilim()) {
            // class B operation
            return this.ampState.Vq - this.Rpb() * I;
        } else {
            // class A operation
            return this.ampState.Vq - this.Rpa() * (I - this.ampState.Iq);
        }
    }
    
    Iq() {
        return this.ampState.Iq;
    }

    Vq() {
        // a reactive load always has Bplus as Vq
        return this.ampState.Vq;
    }

    getLine(): Point[] {
        const p1 = {x: 0, y: this.I(0)};
        const p2 = {x: this.Vlim(), y: this.Ilim()};
        const p3 = {x: this.V(0), y: 0};
        return [p1, p2, p3];
    }

    info() : string {
        return this.Rpb().toFixed()  + 'Ω (Class B) / ' + this.Rpa().toFixed() + 'Ω (Class A)';
    }
}

export class CathodeLoadLine implements LoadLine {
    constructor(private ampState: Readonly<AmpState>) {}
    
    I(Vg: number): number {
        if (this.ampState.biasMethod === 'cathode') {
            const load = this.ampState.topology === 'se' ? this.ampState.Rk! : this.ampState.Rk! * 2;
            return -Vg / load;
        } else {
            return this.ampState.Iq;
        }
    }
    
    Vg(I: number): number {
        if (this.ampState.biasMethod === 'cathode') {
            const load = this.ampState.topology === 'se' ? this.ampState.Rk! : this.ampState.Rk! * 2;
            return -I * load;
        } else {
            return this.ampState.Vq;
        }
    }

    V(I: number): number {
        if (this.ampState.model) {
            return this.ampState.model.Vp(this.Vg(I), I);
        } else {
            return this.ampState.Vq;
        }
    }
    
    Rk() {
        if (this.ampState.model && this.ampState.Vg !== undefined) {
            const load = Math.max(0, -this.ampState.Vg / this.ampState.Iq);
            if (this.ampState.topology === 'se') {
                return load;
            } else {
                // for push-pull topology, the current will be double
                // R = V / I, so V / 2I = 0.5R
                return load / 2;
            }
        } else {
            return 0;
        }
    }

    Iq() {
        if (this.ampState.model && this.ampState.Vg !== undefined) {
            const load = this.ampState.topology === 'se' ? this.ampState.Rk! : this.ampState.Rk! * 2;
            return Math.max(0, -this.ampState.Vg / load);
        } else {
            return this.ampState.Iq;
        }
    }

    getLine(): Point[] {
        return simplify(range(0, 50, 0.5).map(Vg => {
            const I = this.I(Vg);
            const V = this.V(I);
            return {x: V, y: I};
          }), 0.00001, true);
    }

    info() : string {
        return this.Rk().toFixed() + 'Ω';
    }
}

export class ACLoadLine implements LoadLine {
    constructor(private ampState: Readonly<AmpState>) {
    }

    I(V: number): number {
        return (this.ampState.Vq - V) / this.Z + this.ampState.Iq;
    }
    
    V(I: number): number {
        return this.Z * (this.ampState.Iq - I) + this.ampState.Vq;
    }
    
    get Z() {
        const R = this.ampState.Rp + (this.ampState.cathodeBypass ? 0 : (this.ampState.Rk ?? 0));
        return (R * this.ampState.Znext!) / (R + this.ampState.Znext!);
    }

    getLine(): Point[] {
        const p1 = {x: 0, y: this.I(0)};
        const p2 = {x: this.V(0), y: 0};
        return [p1, p2];
    }

    info() : string {
        return this.Z.toFixed() + 'Ω';
    }
}

export const loadLineFactory = {
    createDCLoadLine: (topology: 'pp' | 'se', loadType: 'resistive' | 'reactive', ampState : Readonly<AmpState>) => {
        if (loadType === "reactive") {
            if (topology === 'pp') {
                return new DCPushPullReactiveLoadLine(ampState);
            } else { // if (topology === 'se')
                return new DCSingleEndedReactiveLoadLine(ampState);
            }
        } else { // if (loadType === "resistive")
            if (topology === 'pp') {
                return new DCPushPullResistiveLoadLine(ampState);            
            } else { // if (topology === 'se')
                return new DCSingleEndedResistiveLoadLine(ampState);            
            }
        }
    },
}

export function intersectCharacteristicWithLoadLineV(model: TubeModel, Vg: number, loadLine: LoadLine): number {
    // find intersection of loadline with characteristic curve at Vg and return Vq
    return findRootWithBisection((Vq) => {
        return model.Ip(Vg, Vq) - loadLine.I(Vq);
    }, 0, 1000, 1000, 0.0000001, 0.0000001);        
}

export function intersectLoadLines(loadLine: DCLoadLine, cathodeLoadLine: CathodeLoadLine, tubeModel: TubeModel): number {
    return findRootWithBisection((Vg) => {
        const Ip = cathodeLoadLine.I(Vg);
        return loadLine.V(Ip) - tubeModel.Vp(Vg, Ip);
    }, -200, 0, 1000, 0.0000001, 0.0000001)
}