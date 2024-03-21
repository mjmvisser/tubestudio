import type { TubeModel } from './tubeModels';
import type { TubeDefaults, TubeLimits } from './tube';
import { range, clamp } from './utils.js';
import simplify from 'simplify-js';
import { loadLineFactory, ACLoadLine, CathodeLoadLine, intersectCharacteristicWithLoadLineV, intersectLoadLines } from "@/loadLines";
import type { DCLoadLine } from "@/loadLines";

export interface Point {
    x: number;
    y: number;
    Vg?: number;
}

export interface VgVpIp {
    Vg: number;
    VpIp: Point[];
}

export interface AmpState {
    topology: 'se' | 'pp';
    mode?: 'triode' | 'pentode' | 'ultralinear';
    Bplus: number;
    Iq: number;
    Vq: number;
    Vg?: number;
    Vg2?: number;
    biasMethod: 'fixed' | 'cathode',
    loadType: 'resistive' | 'reactive',
    Rp: number;
    Rk: number;
    cathodeBypass: boolean;
    Znext?: number;
    ultralinearTap?: number;
    inputHeadroom?: number;
    model?: TubeModel;
}

export class Amp implements AmpState {
    private _topology: 'se' | 'pp';
    private _mode?: 'triode' | 'pentode' | 'ultralinear';
    private _Bplus: number;
    private _Vq: number;
    private _Iq: number;
    private _Vg?: number;
    private _Vg2?: number;
    private _biasMethod: 'fixed' | 'cathode';
    private _loadType: 'resistive' | 'reactive';
    private _Rp: number;
    private _Rk: number;
    private _Znext?: number;
    private _model?: TubeModel;
    private _dcLoadLine: DCLoadLine;
    private _acLoadLine: ACLoadLine;
    private _cathodeLoadLine: CathodeLoadLine;

    constructor(public name: string, public type: 'triode' | 'tetrode' | 'pentode', public defaults: TubeDefaults, public limits: TubeLimits) {
        this._Vq = 0;
        this._topology = type === 'triode' ? 'se' : 'pp';
        if (type !== 'triode') {
            this._mode = 'pentode';
        }
        this.ultralinearTap = this._mode === 'triode' ? 100 : 40;
        this._Bplus = defaults.Bplus;
        this._Iq = defaults.Iq;
        this._Vg = 0;
        this._Vg2 = defaults.Vg2;
        this._biasMethod = type === 'triode' ? 'cathode' : 'fixed';
        this._loadType = type === 'triode' ? 'resistive' : 'reactive';
        this._Rp = defaults.Rp;
        this._Rk = 0;
        this._Znext = 0;
        
        this._dcLoadLine = loadLineFactory.createDCLoadLine(this.topology, this.loadType, this as Readonly<AmpState>);
        this._acLoadLine = new ACLoadLine(this as Readonly<AmpState>);
        this._cathodeLoadLine = new CathodeLoadLine(this as Readonly<AmpState>);

        this._Vq = this._dcLoadLine.Vq();
    }

    private setVq(Vq: number) {
        if (this.loadType === 'resistive') {
            this._Vq = clamp(Vq, 0, this.limits.maxVp);
            console.log(`Vq=${this._Vq}`);
        }
    }

    private setIq(Iq: number) {
        this._Iq = clamp(Iq, 0, this.limits.maxIp);
        console.log(`Iq=${this._Iq}`);
    }

    private setVg(Vg: number) {
        this._Vg = clamp(Vg, this.limits.minVg, this.limits.maxVg);        
        console.log(`Vg=${this._Vg}`);
    }

    private setVg2(Vg2: number) {
        this._Vg2 = clamp(Vg2, 0, this.limits.maxVg2);
        console.log(`Vg2=${this._Vg2}`);
    }

    private setRp(Rp: number) {
        this._Rp = Math.max(0, Rp);
        console.log(`Rp=${this._Rp}`);
    }

    private setRk(Rk: number) {
        this._Rk = Math.max(0, Rk);
        console.log(`Rk=${this._Rk}`);
    }

    get topology() { return this._topology; }
    set topology(topology) {
        if (topology !== this._topology) {
            this._topology = topology;
            this._dcLoadLine = loadLineFactory.createDCLoadLine(this.topology, this.loadType, this as Readonly<AmpState>);
        }
    }

    get model() { return this._model; }
    set model(model) {
        this._model = model;
        if (this.model) {
            this.setVg(this.model.Vg(this.Vq, this.Iq));
            this.setRk(this._cathodeLoadLine.Rk());
        }
    }

    get mode() { return this._mode; }
    set mode(mode) {
        if (this.model) {
            this._mode = mode;
            if (this.mode === 'triode') {
                this.setRk(this._cathodeLoadLine.Rk());
            }
            if (this._model) {
                this.setVg(this._model.Vg(this.Vq, this.Iq));
                this.setRk(this._cathodeLoadLine.Rk());
            }
        }
    }

    get Bplus() { return this._Bplus; }
    set Bplus(Bplus) { 
        this._Bplus = Bplus;
        this.setVq(this._dcLoadLine.Vq());
        if (this.model) {
            this.setVg(this.model.Vg(this.Vq, this.Iq));
        }
    }

    get Vq() { return this.loadType === 'resistive' ? this._Vq : this._Bplus; }
    set Vq(Vq) {
        this.setVq(Vq);
        this.setIq(this._dcLoadLine.Iq());
        if (this.model) {
            this.setVg(this.model.Vg(this.Vq, this.Iq));
            if (this.biasMethod === 'cathode') {
                this.setRk(this._cathodeLoadLine.Rk());
            }
        }
    }

    get Iq() { return this._Iq; }
    set Iq(Iq) {
        this.setIq(Iq);
        this.setVq(this._dcLoadLine.Vq());
        if (this.model) {
            this.setVg(this.model.Vg(this.Vq, this.Iq));
        }
    }
    
    get Vg() { return this._Vg; }
    set Vg(Vg) {
        if (Vg !== undefined) {
            this.setVg(Vg);
            if (this.model && this.Vg !== undefined) {
                // TODO: move this into the loadline
                if (this.loadType === 'resistive') {
                    this.setVq(intersectCharacteristicWithLoadLineV(this.model, this.Vg, this._dcLoadLine));
                }
                this.setIq(this.model.Ip(this.Vg, this.Vq)); 
                this.setRk(this._cathodeLoadLine.Rk());
            }
        }
    }
   
    get Vg2() { return this._mode === 'triode' ? this._Bplus : this._Vg2; }
    set Vg2(Vg2) {
        if (Vg2 !== undefined) {
            this.setVg2(Vg2);
            if (this.model && this.Vg !== undefined) {
                // TODO: move this to loadline
                if (this.loadType === 'resistive') {
                    this.setVq(intersectCharacteristicWithLoadLineV(this.model, this.Vg, this._dcLoadLine));
                }
                this.setVg(this.model.Vg(this.Vq, this.Iq));
                this.setRk(this._cathodeLoadLine.Rk());
            }
        }
    }

    get biasMethod() { return this._biasMethod; }
    set biasMethod(biasMethod) {
        const previousBiasMethod = this._biasMethod;
        this._biasMethod = biasMethod;

        if (biasMethod === 'cathode' && previousBiasMethod === 'fixed') {
            // switching from fixed to cathode, reset Rk
            if (this.model) {
                this.setRk(this._cathodeLoadLine.Rk());
            }
        }
    }

    get loadType() { return this._loadType; }
    set loadType(loadType) {
        const previousLoadType = this._loadType;
        this._loadType = loadType;

        if (loadType !== previousLoadType) {
            this._dcLoadLine = loadLineFactory.createDCLoadLine(this.topology, this.loadType, this as Readonly<AmpState>);
        }
      
        if (loadType === 'resistive' && previousLoadType === 'reactive') {
            this.setIq(this._dcLoadLine.Iq());
        }
        if (this.model) {
            this.setVg(this.model.Vg(this.Vq, this.Iq));
            this.setRk(this._cathodeLoadLine.Rk());
        }
}

    get Rp() { return this._Rp; }
    set Rp(Rp) {
        this.setRp(Rp);
        this.setIq(this._dcLoadLine.Iq());
        this.setVq(this._dcLoadLine.Vq());
        if (this.model) { 
            this.setVg(this.model.Vg(this.Vq, this.Iq));
            this.setRk(this._cathodeLoadLine.Rk());
        }
    }

    get Rk() { return this.biasMethod === 'cathode' ? this._Rk : 0; }
    set Rk(Rk) {
        this.setRk(Rk);
        if (this.model && this.Vg !== undefined) {
            this.setIq(this._cathodeLoadLine.Iq());
            this.setVg(intersectLoadLines(this._dcLoadLine, this._cathodeLoadLine, this.model));
            if (this.loadType === 'resistive') {
                this.setVq(intersectCharacteristicWithLoadLineV(this.model, this.Vg, this._dcLoadLine));
           }
        }
    }

    get Znext() { return this.loadType === 'resistive' ? this._Znext : undefined; }
    set Znext(Znext) {
        this._Znext = Znext;
    }

    ultralinearTap?: number;
    inputHeadroom?: number;
    cathodeBypass: boolean = true;

    dcLoadLineInfo() : string {
        return this._dcLoadLine.info();
    }

    acLoadLineInfo(): string {
        return this._acLoadLine.info();
    }

    outputHeadroom() : number[] {
        if (this._dcLoadLine && this.model && this.inputHeadroom !== undefined && this.Vg !== undefined ) {
            const minVg = this.Vg - this.inputHeadroom;
            const maxVg = this.Vg + this.inputHeadroom;
            const loadLine = (this.Znext && this.topology === 'se') ? this._acLoadLine : this._dcLoadLine;
            const maxVp = intersectCharacteristicWithLoadLineV(this.model, minVg, loadLine);
            const minVp = intersectCharacteristicWithLoadLineV(this.model, maxVg, loadLine);
            return [minVp - this.Vq, maxVp - this.Vq];
        } else {
            return [];
        }
    }

    outputPeakToPeakRMS() : number {
        const sineWave = this.graphAmplifiedSineWave();
        return Math.sqrt(sineWave.reduce((accumulator, value) => (accumulator + value.y*value.y), 0)/sineWave.length);
    }

    graphDCLoadLine() : Point[] {
        return this._dcLoadLine.getLine();
    }

    graphACLoadLine() : Point[] {
        return this._acLoadLine.getLine();
    }

    graphCathodeLoadLine(): Point[] {
        if (this._cathodeLoadLine && this.model) {
            return simplify(range(this.limits.minVg, this.limits.maxVg, this.limits.gridStep / 10).map(Vg => {
                const I = this._cathodeLoadLine.I(Vg);
                const V = this.model!.Vp(Vg, I);
                return {x: V, y: I};
            }), 0.00001, true);
        } else {
            return [];
        }
    }

    graphVpIp(Vg: number): Point[]  {
        if (this.model) {
            return simplify(range(0, this.limits.maxVp, 1).map(Vp => ({x: Vp, y: this.model!.Ip(Vg, Vp)})), 0.000005, true);
        } else {
            return [];
        }
    }
    
    graphVgVpIp(): {Vg: number, VpIp: Point[]}[] {
        return range(this.limits.minVg, this.limits.maxVg, this.limits.gridStep).map(Vg => ({
            'Vg': Vg,
            'VpIp': this.graphVpIp(Vg)
        }));
    }

    graphPp(): Point[] {
        return simplify(range(0, this.limits.maxVp, 1).map(Vp => ({x: Vp, y: this.limits.maxPp / Vp})), 0.00001, true);
    }

    graphOperatingPoint(): Point[] {
        if (this._dcLoadLine) {
            const Vq = this.Vq;
            const Iq = this._dcLoadLine.I(Vq);
            const Vg = this.model?.Vg(Vq, Iq);
            return [{x: Vq, y: Iq, Vg: Vg}];
        } else {
            return [];
        }
    }
    
    graphHeadroom(): Point[] {
        if (this._dcLoadLine && this.model && this.inputHeadroom !== undefined && this.Vg !== undefined) {
            const minVg = this.Vg - this.inputHeadroom;
            const maxVg = this.Vg + this.inputHeadroom;
            const loadLine = (this.Znext && this._topology === 'se') ? this._acLoadLine : this._dcLoadLine;
            const maxVp = intersectCharacteristicWithLoadLineV(this.model, minVg, loadLine);
            const minVp = intersectCharacteristicWithLoadLineV(this.model, maxVg, loadLine);

            let data = [];
            let loadLineData = loadLine.getLine();
            data.push({x: minVp, y: loadLine.I(minVp)});

            // if the loadline has a bend, make sure we take it into account
            loadLineData.forEach(point => {
                if (point.x > minVp && point.x < maxVp) {
                    data.push(point);
                }
            });

            data.push({x: maxVp, y: loadLine.I(maxVp)});

            return data;
        } else {
            return [];
        }
    }

    graphAmplifiedSineWave() : Point[] {
        // simulate amplification of a sine wave
        if (this.model && this.Vg !== undefined && this.inputHeadroom !== undefined) {
            const loadLine = (this.Znext && this._topology === 'se') ? this._acLoadLine : this._dcLoadLine;
            return simplify(range(0, 2*Math.PI, 2*Math.PI/360).map(t => {
                const Vg = this.Vg! + this.inputHeadroom! * Math.sin(t);
                const Vp = intersectCharacteristicWithLoadLineV(this.model!, Vg, loadLine);
                return {x: t, y: Vp - this.Vq};
            }), 0.001, true);
        } else {
            return [];
        }
    }
}