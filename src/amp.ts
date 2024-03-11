import type { TubeModel } from './tubeModels';
import type { TubeDefaults, TubeLimits } from './tube';
import { range, clamp } from './utils.js';
import simplify from 'simplify-js';
import { loadLineFactory, ACLoadLine, CathodeLoadLine, intersectCharacteristicWithLoadLineV, intersectLoadLines } from "@/loadLines";
import type { DCLoadLine } from "@/loadLines";

export interface Point {
    x: number;
    y: number;
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
    private _Znext?: number;
    private _Rk: number;
    private _ultralinearTap: number;
    private _inputHeadroom?: number;
    private _model?: TubeModel;
    private _dcLoadLine: DCLoadLine;
    private _acLoadLine: ACLoadLine;
    private _cathodeLoadLine: CathodeLoadLine;

    // must be incremented before assigning to AmpState properties and decremented afterwards
    private _updating: {Vq: boolean; Iq: boolean; Vg: boolean; Vg2: boolean; Rp: boolean; Rk: boolean} = {Vq: false, Iq: false, Vg: false, Vg2: false, Rp: false, Rk: false}; 

    constructor(public type: 'triode' | 'tetrode' | 'pentode', private defaults: TubeDefaults, private limits: TubeLimits) {
        this._Vq = 0;
        this._topology = type === 'triode' ? 'se' : 'pp';
        if (type !== 'triode') {
            this._mode = 'pentode';
        }
        this._ultralinearTap = this._mode === 'triode' ? 100 : 40;
        this._Bplus = defaults.Bplus;
        this._Iq = defaults.Iq;
        this._Vg = 0;
        this._Vg2 = defaults.Vg2;
        this._biasMethod = type === 'triode' ? 'cathode' : 'fixed';
        this._loadType = type === 'triode' ? 'resistive' : 'reactive';
        this._Rp = defaults.Rp;
        this._Rk = 0;
        
        this._dcLoadLine = loadLineFactory.createDCLoadLine(this.topology, this.loadType, this as Readonly<AmpState>);
        this._acLoadLine = new ACLoadLine(this as Readonly<AmpState>);
        this._cathodeLoadLine = new CathodeLoadLine(this as Readonly<AmpState>);

        // would be better to use the new "using" and Disposable interface, but it's not yet well-supported
        this.Vq = this._dcLoadLine.Vq();
        if (this.type !== 'triode' && this.mode === 'triode') {
            this.Vg2 = this.Bplus;
        }
    };

    public get topology() { return this._topology; }
    public set topology(topology) {
        if (topology !== this._topology) {
            this._topology = topology;
            this._dcLoadLine = loadLineFactory.createDCLoadLine(this.topology, this.loadType, this as Readonly<AmpState>);
        }
    }

    public get model() { return this._model; }
    public set model(model) {
        this._model = model;
        if (this.model) {
            this.Vg = this.model.Vg(this.Vq, this.Iq);
        }
    }

    public get mode() { return this._mode; }
    public set mode(mode) {
        if (this.model) {
            this._mode = mode;
            if (this.type !== 'triode' && this.mode === 'triode') {
                this.Vg2 = this.Bplus;
            }
        }
    }

    public get Bplus() { return this._Bplus; }
    public set Bplus(Bplus) { 
        this._Bplus = Bplus;
        this.Vq = this._dcLoadLine.Vq();
        if (this.model) {
            this.Vg = this.model.Vg(this.Vq, this.Iq);
        }
        if (this.type !== 'triode' && this.mode === 'triode') {
            this.Vg2 = this.Bplus;
        }
    }

    public get Vq() { return this._Vq; }
    public set Vq(Vq) {
        this._Vq = clamp(Vq, 0, this.limits.maxVp);
        if (!this._updating.Vq) {
            this._updating.Vq = true;
            if (this.loadType === 'resistive') {
                this.Iq = this._dcLoadLine.I(this.Vq);
            }
            if (this.model) {
                this.Vg = this.model.Vg(this.Vq, this.Iq);
                this.Rk = Math.max(0, -this.Vg! / this.Iq);
            }
            this._updating.Vq = false;
        }
    }

    public get Iq() { return this._Iq; }
    public set Iq(Iq) {
        this._Iq = clamp(Iq, 0, this.limits.maxIp);
        if (!this._updating.Iq) {
            this._updating.Iq = true;
            this.Vq = this._dcLoadLine.Vq();
            if (this.model) {
                this.Vg = this.model.Vg(this.Vq, this.Iq);
            }
            this._updating.Iq = false;
        }
    }
    
    public get Vg() { return this._Vg; }
    public set Vg(Vg) {
        console.assert(Vg !== undefined);
        this._Vg = clamp(Vg!, this.limits.minVg, this.limits.maxVg);        
        if (this.model) {
            if (!this._updating.Vg) {
                this._updating.Vg = true;
                // TODO: move this into the loadline
                if (this.loadType === 'resistive') {
                    this.Vq = intersectCharacteristicWithLoadLineV(this.model, this.Vg!, this._dcLoadLine);
                }
                this.Iq = this.model.Ip(this.Vg!, this._dcLoadLine.Vq()); 
                this.Rk = this._cathodeLoadLine.Rk();
                this._updating.Vg = false;
            }
        }
    }
   
    public get Vg2() { return this._Vg2; }
    public set Vg2(Vg2) {
        console.assert(Vg2 !== undefined);
        this._Vg2 = clamp(Vg2!, 0, this.limits.maxVg2);
        if (this.model) {
            if (!this._updating.Vg2) {
                this._updating.Vg2 = true;
                this.Vq = intersectCharacteristicWithLoadLineV(this.model, this.Vg!, this._dcLoadLine);
                this.Vg = this.model.Vg(this.Vq, this.Iq);
                this._updating.Vg2 = false;
            }
        }
    }

    public get biasMethod() { return this._biasMethod; }
    public set biasMethod(biasMethod) {
        const previousBiasMethod = this._biasMethod;
        this._biasMethod = biasMethod;

        if (biasMethod === 'cathode' && previousBiasMethod === 'fixed') {
            // switching from fixed to cathode, reset Rk
            if (this.model) {
                this.Rk = Math.max(0, -this.Vg! / (this.Iq));
            }
        }
    }

    public get loadType() { return this._loadType; }
    public set loadType(loadType) {
        const previousLoadType = this._loadType;
        this._loadType = loadType;

        if (loadType !== previousLoadType) {
            this._dcLoadLine = loadLineFactory.createDCLoadLine(this.topology, this.loadType, this as Readonly<AmpState>);
        }
      
        if (loadType === 'resistive' && previousLoadType === 'reactive') {
            // if switching from reactive to resistive, reset Iq to default
            this.Iq = this.defaults.Iq;
        } else if (loadType === 'reactive' && previousLoadType === 'resistive') {
            // reactive quiescent voltage is same as B+
            this.Vq = this.Bplus;
        }
    }

    public get Rp() { return this._Rp; }
    public set Rp(Rp) {
        this._Rp = Math.max(0, Rp);
        if (this.loadType === 'resistive') {
            if (!this._updating.Rp) {
                this._updating.Rp = true;
                this.Iq = this._dcLoadLine.I(this.Vq);
                this._updating.Rp = false;
            }
        }
    }
    public get Rk() { return this.biasMethod === 'cathode' ? this._Rk : 0; }
    public set Rk(Rk) {
        this._Rk = Math.max(0, Rk);
        if (!this._updating.Rk) {
            this._updating.Rk = true;
            if (this.model) {
                this.Vg = intersectLoadLines(this._dcLoadLine, this._cathodeLoadLine, this.model);
                if (this.loadType === 'resistive') {
                    this.Iq = this._cathodeLoadLine.I(this.Vg!);
                }
            }
            this._updating.Rk = false;
        }
    }

    public get Znext() { return this._Znext; }
    public set Znext(Znext) {
        this._Znext = Znext;
    }

    public get ultralinearTap() { return this._ultralinearTap; }
    public set ultralinearTap(ultralinearTap) {
        this._ultralinearTap = ultralinearTap;
        // update other values
    }

    public get inputHeadroom() { return this._inputHeadroom; }
    public set inputHeadroom(inputHeadroom) {
        this._inputHeadroom = inputHeadroom;
        // update other values
    }

    public get Z() { return this._acLoadLine.Z; }
      
    outputHeadroom() {
        return 0;
    }

    graphDCLoadLine() : Point[] {
        return this._dcLoadLine.getLine();
    }

    graphACLoadLine() : Point[] {
        return this._acLoadLine.getLine();
    }

    graphCathodeLoadLine(): Point[] {
        if (this._cathodeLoadLine && this.model) {
            return simplify(range(this.limits.minVg, this.limits.maxVg, this.limits.gridStep/10).map(Vg => {
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
            return simplify(range(0, this.limits.maxVp, 1).map(Vp => ({x: Vp, y: this.model!.Ip(Vg, Vp)})), 0.000001, true);
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
          return [{x: this.Vq, y: this._dcLoadLine.I(this.Vq)}];
        } else {
          return [];
        }
    }
    
    graphHeadroom(): Point[] {
        if (this._dcLoadLine && this.model && this.inputHeadroom !== undefined) {
            const minVg = this.Vg! - this.inputHeadroom;
            const maxVg = this.Vg! + this.inputHeadroom;
            const minVp = intersectCharacteristicWithLoadLineV(this.model, minVg, this._dcLoadLine);
            const maxVp = intersectCharacteristicWithLoadLineV(this.model, maxVg, this._dcLoadLine);

            let data = [];
            let loadLineData = this.graphDCLoadLine();
            data.push({x: minVp, y: this._dcLoadLine.I(minVp)});

            // if the loadline has a bend, make sure we take it into account
            loadLineData.forEach(point => {
                if (point.x > minVp && point.x < maxVp) {
                    data.push(point);
                }
            });

            data.push({x: maxVp, y: this._dcLoadLine.I(maxVp)});

            return [{x: minVp, y: this._dcLoadLine.I(minVp)}, {x: maxVp, y: this._dcLoadLine.I(maxVp)}];
        } else {
            return [];
        }
    }
}