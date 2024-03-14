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
    ultralinearTap: number;
    inputHeadroom?: number;
    model?: TubeModel;
}

export class Amp implements AmpState {
    private _topology: 'se' | 'pp';
    private _mode?: 'triode' | 'pentode';
    private _Bplus: number;
    private _Vq: number;
    private _Iq: number;
    private _Vg?: number;
    private _Vg2?: number;
    private _biasMethod: 'fixed' | 'cathode';
    private _loadType: 'resistive' | 'reactive';
    private _Rp: number;
    private _Rk: number;
    private _Znext: number;
    private _model?: TubeModel;
    private _dcLoadLine: DCLoadLine;
    private _acLoadLine: ACLoadLine;
    private _cathodeLoadLine: CathodeLoadLine;

    constructor(public name: string, public type: 'triode' | 'tetrode' | 'pentode', private defaults: TubeDefaults, private limits: TubeLimits) {
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
        if (this.type !== 'triode' && this.mode === 'triode') {
            this._Vg2 = this.Bplus;
        }
    }

    private setVq(Vq: number) {
        this._Vq = clamp(Vq, 0, this.limits.maxVp);
        console.log(`Vq=${Vq}`);
    }

    private setIq(Iq: number) {
        this._Iq = clamp(Iq, 0, this.limits.maxIp);
        console.log(`Iq=${this._Iq}`);
    }

    private setVg(Vg: number) {
        this._Vg = clamp(Vg!, this.limits.minVg, this.limits.maxVg);        
        console.log(`Vg=${Vg}`);
    }

    private setVg2(Vg2: number) {
        this._Vg2 = clamp(Vg2!, 0, this.limits.maxVg2);
        console.log(`Vg2=${Vg2}`);
    }

    private setRp(Rp: number) {
        this._Rp = Math.max(0, Rp);
        console.log(`Rp=${Rp}`);
    }

    private setRk(Rk: number) {
        this._Rk = Math.max(0, Rk);
        console.log(`Rk=${Rk}`);
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
        if (this._model) {
            this.setVg(this._model.Vg(this._Vq, this._Iq));
            this.setRk(this._cathodeLoadLine.Rk());
        }
    }

    get mode() { return this._mode; }
    set mode(mode) {
        if (this._model) {
            this._mode = mode;
            if (this.type !== 'triode' && this._mode === 'triode') {
                this.setVg2(this.Bplus);
                this.setRk(this._cathodeLoadLine.Rk());
            }
            if (this._model) {
                this.setVg(this._model.Vg(this._Vq, this._Iq));
                this.setRk(this._cathodeLoadLine.Rk());
            }
        }
    }

    get Bplus() { return this._Bplus; }
    set Bplus(Bplus) { 
        this._Bplus = Bplus;
        this.setVq(this._dcLoadLine.Vq());
        if (this._model) {
            this.setVg(this._model.Vg(this._Vq, this._Iq));
        }
        if (this.type !== 'triode' && this._mode === 'triode') {
            this.setVg2(this.Bplus);
        }
    }

    get Vq() { return this._Vq; }
    set Vq(Vq) {
        this.setVq(Vq);
        this.setIq(this._dcLoadLine.Iq());
        if (this._model) {
            this.setVg(this._model.Vg(this._Vq, this._Iq));
            if (this._biasMethod === 'cathode') {
                this.setRk(this._cathodeLoadLine.Rk());
            }
        }
    }

    get Iq() { return this._Iq; }
    set Iq(Iq) {
        this.setIq(Iq);
        this.setVq(this._dcLoadLine.Vq());
        if (this._model) {
            this.setVg(this._model.Vg(this._Vq, this._Iq));
        }
    }
    
    get Vg() { return this._Vg; }
    set Vg(Vg) {
        console.assert(Vg !== undefined);
        this.setVg(Vg);
        if (this._model) {
            // TODO: move this into the loadline
            if (this._loadType === 'resistive') {
                this.setVq(intersectCharacteristicWithLoadLineV(this._model, this._Vg, this._dcLoadLine));
            }
            this.setIq(this._model.Ip(this._Vg, this._Vq)); 
            this.setRk(this._cathodeLoadLine.Rk());
        }
    }
   
    get Vg2() { return this._Vg2; }
    set Vg2(Vg2) {
        this.setVg2(Vg2);
        if (this._model) {
            // TODO: move this to loadline
            if (this.loadType === 'resistive') {
                this.setVq(intersectCharacteristicWithLoadLineV(this._model, this._Vg, this._dcLoadLine));
            }
            this.setVg(this._model.Vg(this._Vq, this._Iq));
            this.setRk(this._cathodeLoadLine.Rk());
        }
    }

    get biasMethod() { return this._biasMethod; }
    set biasMethod(biasMethod) {
        const previousBiasMethod = this._biasMethod;
        this._biasMethod = biasMethod;

        if (biasMethod === 'cathode' && previousBiasMethod === 'fixed') {
            // switching from fixed to cathode, reset Rk
            if (this._model) {
                this.setRk(this._cathodeLoadLine.Rk());
            }
        }
    }

    get loadType() { return this._loadType; }
    set loadType(loadType) {
        const previousLoadType = this._loadType;
        this._loadType = loadType;

        if (loadType !== previousLoadType) {
            this._dcLoadLine = loadLineFactory.createDCLoadLine(this._topology, this._loadType, this as Readonly<AmpState>);
        }
      
        if (loadType === 'resistive' && previousLoadType === 'reactive') {
            this.setVq(2 * this.defaults.Bplus / 3);
            this.setIq(this._dcLoadLine.Iq());
        } else if (loadType === 'reactive' && previousLoadType === 'resistive') {
            // reactive quiescent voltage is same as B+
            this.setVq(this._Bplus);
        }
        this.setVg(this._model.Vg(this._Vq, this._Iq));
        this.setRk(this._cathodeLoadLine.Rk());
}

    get Rp() { return this._Rp; }
    set Rp(Rp) {
        this.setRp(Rp);
        this.setIq(this._dcLoadLine.Iq());
        this.setVq(this._dcLoadLine.Vq());
        if (this._model) { 
            this.setVg(this._model.Vg(this._Vq, this._Iq));
            this.setRk(this._cathodeLoadLine.Rk());
        }
    }

    get Rk() { return this.biasMethod === 'cathode' ? this._Rk : 0; }
    set Rk(Rk) {
        this.setRk(Rk);
        if (this._model) {
            this.setVg(intersectLoadLines(this._dcLoadLine, this._cathodeLoadLine, this._model));
            if (this._loadType === 'resistive') {
                this.setIq(this._cathodeLoadLine.I(this._Vg));
                this.setVq(this._cathodeLoadLine.V(this._Iq));
            } else {
                this.setIq(this._model.Ip(this._Vg, this._Vq));
            }
        }
    }

    get Znext() { return this.loadType === 'resistive' ? this._Znext : undefined; }
    set Znext(Znext: number) {
        this._Znext = Znext;
    }

    public ultralinearTap: number = null;
    public inputHeadroom: number = null;
    public cathodeBypass: boolean = true;

    public R() { return this._dcLoadLine.R; }
    public Z() { return this._acLoadLine.Z; }
      
    outputHeadroom() : number[] {
        if (this._dcLoadLine && this._model && this.inputHeadroom) {
            const minVg = this._Vg - this.inputHeadroom;
            const maxVg = this._Vg + this.inputHeadroom;
            const loadLine = (this.Znext && this._topology === 'se') ? this._acLoadLine : this._dcLoadLine;
            const maxVp = intersectCharacteristicWithLoadLineV(this._model, minVg, loadLine);
            const minVp = intersectCharacteristicWithLoadLineV(this._model, maxVg, loadLine);
            return [minVp - this.Vq, maxVp - this.Vq];
        }
    }

    graphDCLoadLine() : Point[] {
        return this._dcLoadLine.getLine();
    }

    graphACLoadLine() : Point[] {
        return this._acLoadLine.getLine();
    }

    graphCathodeLoadLine(): Point[] {
        if (this._cathodeLoadLine && this._model) {
            return simplify(range(this.limits.minVg, this.limits.maxVg, this.limits.gridStep / 10).map(Vg => {
                const I = this._cathodeLoadLine.I(Vg);
                const V = this._model!.Vp(Vg, I);
                return {x: V, y: I};
            }), 0.00001, true);
        } else {
            return [];
        }
    }

    graphVpIp(Vg: number): Point[]  {
        if (this._model) {
            return simplify(range(0, this.limits.maxVp, 1).map(Vp => ({x: Vp, y: this._model!.Ip(Vg, Vp)})), 0.000005, true);
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
            const Vg = this._model?.Vg(Vq, Iq);
            return [{x: Vq, y: Iq, Vg: Vg}];
        } else {
            return [];
        }
    }
    
    graphHeadroom(): Point[] {
        if (this._dcLoadLine && this._model && this.inputHeadroom) {
            const minVg = this._Vg - this.inputHeadroom;
            const maxVg = this._Vg + this.inputHeadroom;
            const loadLine = (this.Znext && this._topology === 'se') ? this._acLoadLine : this._dcLoadLine;
            const maxVp = intersectCharacteristicWithLoadLineV(this._model, minVg, loadLine);
            const minVp = intersectCharacteristicWithLoadLineV(this._model, maxVg, loadLine);

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

            return [{x: minVp, y: loadLine.I(minVp), Vg: maxVg}, {x: maxVp, y: loadLine.I(maxVp), Vg: minVg}];
        } else {
            return [];
        }
    }
}