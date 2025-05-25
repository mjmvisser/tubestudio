import type { TubeModel } from './tubeModels';
import type { TubeDefaults, TubeLimits } from './tube';
import { range, clamp } from './utils.js';
import simplify from 'simplify-js';
import { loadLineFactory, ACLoadLine, CathodeLoadLine, intersectCharacteristicWithLoadLineV, intersectLoadLines } from "@/loadLines";
import type { DCLoadLine } from "@/loadLines";

export interface CharacteristicPoint {
    x: number;
    y: number;
    Vg?: number;
}

export interface OutputSample {
    x: number,
    y: number,
    Ip: number,
    Vp: number,
    Vp_inv?: number,
    Ip_inv?: number,
}

export interface CharacteristicCurve {
    Vg: number;
    VpIp: CharacteristicPoint[];
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
    Rk?: number;
    cathodeBypass: boolean;
    Znext?: number;
    ultralinearTap?: number;
    inputHeadroom?: number;
    model?: TubeModel;
}

type Guard<T> = {
    [Property in keyof T]?: boolean;
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
    private _Rk?: number;
    private _Znext?: number;
    private _ultralinearTap?: number;
    private _model?: TubeModel;
    private _dcLoadLine: DCLoadLine;
    private _acLoadLine: ACLoadLine;
    private _cathodeLoadLine: CathodeLoadLine;
    private _guard: Guard<AmpState> = {};

    constructor(public name: string, public type: 'triode' | 'tetrode' | 'pentode', public defaults: TubeDefaults, public limits: TubeLimits) {
        this._Vq = 0;
        this._topology = type === 'triode' ? 'se' : 'pp';
        if (this.type !== 'triode') {
            this._mode = 'pentode';
        }
        this._Bplus = defaults.Bplus;
        this._Iq = defaults.Iq;
        this._biasMethod = type === 'triode' ? 'cathode' : 'fixed';
        this._loadType = type === 'triode' ? 'resistive' : 'reactive';
        this._Rp = defaults.Rp;
        
        this._dcLoadLine = loadLineFactory.createDCLoadLine(this.topology, this.loadType, this as Readonly<AmpState>);
        this._acLoadLine = new ACLoadLine(this as Readonly<AmpState>);
        this._cathodeLoadLine = new CathodeLoadLine(this as Readonly<AmpState>);
    }

    public init() {
        this.Vq = 0;
        this.topology = this.type === 'triode' ? 'se' : 'pp';
        this.ultralinearTap = 40;
        this.Bplus = this.defaults.Bplus;
        this.Iq = this.defaults.Iq;
        this.Vg2 = this.defaults.Vg2;
        this.biasMethod = this.type === 'triode' ? 'cathode' : 'fixed';
        this.loadType = this.type === 'triode' ? 'resistive' : 'reactive';
        this.Rp = this.defaults.Rp;
        this.Znext = 0;
        
        this._dcLoadLine = loadLineFactory.createDCLoadLine(this.topology, this.loadType, this as Readonly<AmpState>);
        this._acLoadLine = new ACLoadLine(this as Readonly<AmpState>);
        this._cathodeLoadLine = new CathodeLoadLine(this as Readonly<AmpState>);

        this.Vq = this._dcLoadLine.Vq();
    }

    private setVq(Vq: number) {
        if (this.loadType === 'resistive') {
            this._Vq = clamp(Vq, 0, this.limits.maxVp0);
            //console.log(`Vq=${this._Vq}`);
        }
    }

    private setIq(Iq: number) {
        this._Iq = clamp(Iq, 0, Math.min(this._dcLoadLine.I(0), this.limits.maxIp));
        //console.log(`Iq=${this._Iq}`);
    }

    private setVg(Vg: number) {
        this._Vg = clamp(Vg, this.limits.minVg, this.limits.maxVg);        
        //console.log(`Vg=${this._Vg}`);
    }

    private setVg2(Vg2: number) {
        this._Vg2 = clamp(Vg2, 0, this.limits.maxVg2);
        //console.log(`Vg2=${this._Vg2}`);
    }

    private setRp(Rp: number) {
        this._Rp = Math.max(0, Rp);
        //console.log(`Rp=${this._Rp}`);
    }

    private setRk(Rk: number) {
        this._Rk = Math.max(0, Rk);
        //console.log(`Rk=${this._Rk}`);
    }

    private recalculateVg() {
        if (this.model) {
            // if (this.biasMethod === 'cathode' && this.Rk !== undefined) {
            //     this.setVg(intersectLoadLines(this._dcLoadLine, this._cathodeLoadLine, this.model));
            // } else {
                this.setVg(this.model.Vg(this.Vq, this.Iq, this.Vg2));
            // }
        }
    }

    private recalculateVgFromRk() {
        if (this.model && this.biasMethod === 'cathode' && this.Rk !== undefined) {
            this.setVg(intersectLoadLines(this._dcLoadLine, this._cathodeLoadLine, this.model, this.Vg2));
        }
    }

    private recalculateVq() {
        if (this.model && this.Vg !== undefined) {
            this.setVq(intersectCharacteristicWithLoadLineV(this.model, this.Vg, this._dcLoadLine, this.Vg2));
        } else {
            this.setVq(this._dcLoadLine.Vq());
        }
    }

    private recalculateIq() {
        if (this.model && this.Vg !== undefined) {
            if (this.loadType === 'resistive') {
                this.setIq(this._dcLoadLine.Iq());
            } else {
                if (this.model && this.Vg !== undefined) {
                    this.setIq(this.model.Ip(this.Vg, this.Vq, this.Vg2));
                }
            }        
        } else {
            this.setIq(this._dcLoadLine.Iq());
        }
    }

    private recalculateRk() {
        if (this.model && this.Vg !== undefined) {
            this.setRk(this._cathodeLoadLine.Rk());
        }
    }

    private guard(prop: keyof AmpState, f: () => void) {
        if (!this._guard[prop]) {
            this._guard[prop] = true;
            f();
            this._guard[prop] = false;
        }
    }

    get topology() { return this._topology; }
    set topology(topology) {
        if (topology !== this._topology) {
            this._topology = topology;
            this._dcLoadLine = loadLineFactory.createDCLoadLine(this.topology, this.loadType, this as Readonly<AmpState>);

            this.guard('topology', () => {
                this.recalculateVq();
                this.recalculateIq();
                this.recalculateVg();
                this.recalculateRk();
            });

            //     if (this.model && this.Vg !== undefined) {
            //         if (this.loadType === 'resistive') {
            //             this.setVq(intersectCharacteristicWithLoadLineV(this.model, this.Vg, this._dcLoadLine, this.Vg2));
            //             this.setIq(this._dcLoadLine.I(this.Vq));
            //         } else {
            //             this.setIq(this.model.Ip(this.Vg, this.Vq, this.Vg2));
            //         }        
            //         this.setRk(this._cathodeLoadLine.Rk());
            //     }
        }
    }

    get model() { return this._model; }
    set model(model) {
        this._model = model;

        this.guard('model', () => {
            this.recalculateVg();
            this.recalculateRk();
        });
    }

    get mode() { return this._mode; }
    set mode(mode) {
        if (this.model) {
            this._mode = mode;
            this.guard('mode', () => {
                this.recalculateRk();
                this.recalculateVg();
                this.recalculateIq();
            });
            // if (this.mode === 'triode') {
            //     this.setRk(this._cathodeLoadLine.Rk());
            // }
            // if (this._model) {
            //     this.setVg(this._model.Vg(this.Vq, this.Iq, this.Vg2));
            //     this.setRk(this._cathodeLoadLine.Rk());
            // }
            // if (this.loadType === 'resistive') {
            //     this.setIq(this._dcLoadLine.I(this.Vq));
            // }
        }
    }

    get Bplus() { return this._Bplus; }
    set Bplus(Bplus) { 
        this._Bplus = Bplus;
        this.guard('Bplus', () => {
            this.setVq(this._dcLoadLine.Vq());
            if (this.model) {
                this.setVg(this.model.Vg(this.Vq, this.Iq, this.Vg2));
            }
        });
    }

    get Vq() { 
        if (this.loadType === 'resistive') {
            return this._Vq;
        } else {
            if (this.biasMethod === 'cathode' && this._Vg !== undefined) {
                return this._Bplus + this._Vg;
            } else {
                return this._Bplus;
            }
        }
    }
    set Vq(Vq) {
        this.setVq(Vq);
        this.guard('Vq', () => {
            this.recalculateIq();
            this.recalculateVg();
            this.recalculateRk();
        });
        // this.setIq(this._dcLoadLine.Iq());
        // if (this.model) {
        //     this.setVg(this.model.Vg(this.Vq, this.Iq, this.Vg2));
        //     if (this.biasMethod === 'cathode') {
        //         this.setRk(this._cathodeLoadLine.Rk());
        //     }
        // }
    }

    get Iq() { return this._Iq; }
    set Iq(Iq) {
        this.setIq(Iq);
        this.guard('Iq', () => {
        this.setVq(this._dcLoadLine.Vq());
            if (this.model) {
                this.setVg(this.model.Vg(this.Vq, this.Iq, this.Vg2));
                if (this.biasMethod === 'cathode') {
                    this.setRk(this._cathodeLoadLine.Rk());
                }
            }
    });
    }
    
    get Vg() { return this._Vg; }
    set Vg(Vg) {
        if (Vg !== undefined) {
            this.setVg(Vg);
            this.guard('Vg', () => {
                // this.recalculateVq();
                // this.recalculateIq();
                // this.recalculateRk();
                if (this.model && this.Vg !== undefined) {
                    // TODO: move this into the loadline
                    if (this.loadType === 'resistive') {
                        this.setVq(intersectCharacteristicWithLoadLineV(this.model, this.Vg, this._dcLoadLine, this.Vg2));
                        this.setIq(this._dcLoadLine.I(this.Vq));
                    } else {
                        this.setIq(this.model.Ip(this.Vg, this.Vq, this.Vg2));
                    }
                    this.setRk(this._cathodeLoadLine.Rk());
                }

            });
        }
    }
   
    get Vg2() { return this._mode === 'triode' ? this._Bplus : this._Vg2; }
    set Vg2(Vg2) {
        if (Vg2 !== undefined) {
            this.setVg2(Vg2);
            this.guard('Vg2', () => {
                this.recalculateVq();
                this.recalculateVg();
                this.recalculateRk();
            });
            // if (this.model && this.Vg !== undefined) {
            //     // TODO: move this to loadline
            //     if (this.loadType === 'resistive') {
            //         this.setVq(intersectCharacteristicWithLoadLineV(this.model, this.Vg, this._dcLoadLine, this.Vg2));
            //     }
            //     this.setVg(this.model.Vg(this.Vq, this.Iq, this.Vg2));
            //     this.setRk(this._cathodeLoadLine.Rk());
            // }
        }
    }

    get biasMethod() { return this._biasMethod; }
    set biasMethod(biasMethod) {
        const previousBiasMethod = this._biasMethod;
        this._biasMethod = biasMethod;
        this.guard('biasMethod', () => {
            if (biasMethod === 'cathode' && previousBiasMethod === 'fixed') {
                // switching from fixed to cathode, reset Rk
                this.recalculateRk();
            }
            this.recalculateVg();
            this.recalculateIq();
        });
        // if (biasMethod === 'cathode' && previousBiasMethod === 'fixed') {
        //     // switching from fixed to cathode, reset Rk
        //     if (this.model) {
        //         this.setRk(this._cathodeLoadLine.Rk());
        //     }
        // }
        // if (this.model) {
        //     this.setVg(this.model.Vg(this.Vq, this.Iq, this.Vg2));
        // }
        // this.setIq(this._dcLoadLine.Iq());
    }

    get loadType() { return this._loadType; }
    set loadType(loadType) {
        const previousLoadType = this._loadType;
        this._loadType = loadType;

        if (loadType !== previousLoadType) {
            this._dcLoadLine = loadLineFactory.createDCLoadLine(this.topology, this.loadType, this as Readonly<AmpState>);
        }

        this.guard('loadType', () => {
            if (loadType === 'resistive' && previousLoadType === 'reactive') {
                this.recalculateIq();
            }
            this.recalculateVg();
            this.recalculateRk();
            this.recalculateIq();
        });
        // if (this.model) {
        //     this.setVg(this.model.Vg(this.Vq, this.Iq, this.Vg2));
        //     this.setRk(this._cathodeLoadLine.Rk());
        // }
    }

    get Rp() { return this._Rp; }
    set Rp(Rp) {
        this.setRp(Rp);
        this.guard('Rp', () => {
            this.recalculateIq();
            this.recalculateVq();
            this.recalculateVg();
            this.recalculateRk();
        });
        // this.setIq(this._dcLoadLine.Iq());
        // this.setVq(this._dcLoadLine.Vq());
        // if (this.model) { 
        //     this.setVg(this.model.Vg(this.Vq, this.Iq, this.Vg2));
        //     this.setRk(this._cathodeLoadLine.Rk());
        // }
    }

    get Rk() { return this.biasMethod === 'cathode' ? this._Rk : undefined; }
    set Rk(Rk) {
        if (Rk !== undefined) {
            this.setRk(Rk);
            this.guard('Rk', () => {
                this.recalculateVgFromRk();
                this.recalculateVq();
                this.recalculateIq();
            });
            // if (this.model && this.Vg !== undefined) {
            //     this.setVg(intersectLoadLines(this._dcLoadLine, this._cathodeLoadLine, this.model, this.Vg2));
            //     if (this.loadType === 'resistive') {
            //         this.setVq(intersectCharacteristicWithLoadLineV(this.model, this.Vg, this._dcLoadLine, this.Vg2));
            // }
            // this.setIq(this._cathodeLoadLine.Iq());
            // }
        }
    }

    get Znext() { return this.loadType === 'resistive' ? this._Znext : undefined; }
    set Znext(Znext) {
        this._Znext = Znext;
    }

    get ultralinearTap() { 
        switch (this.mode) {
            case 'ultralinear':
                return this._ultralinearTap;
            case 'triode':
                return 100;
            default:
                return 0;
        }
    }
    set ultralinearTap(ultralinearTap: number) { this._ultralinearTap = ultralinearTap; }

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
            const maxVp = intersectCharacteristicWithLoadLineV(this.model, minVg, loadLine, this.Vg2) - this.Vq;
            const minVp = intersectCharacteristicWithLoadLineV(this.model, maxVg, loadLine, this.Vg2) - this.Vq;

            if (this.topology === 'pp') {
                return [minVp - maxVp, maxVp - minVp]
            } else {
                return [minVp, maxVp];
            }
        } else {
            return [];
        }
    }

    outputVoltageRMS() : number {
        const sineWave = this.graphAmplifiedSineWave();
        return Math.sqrt(sineWave.reduce((accumulator, value) => (accumulator + value.y*value.y), 0)/sineWave.length);
    }

    averageOutputPowerRMS() : number {
        const sineWave = this.graphAmplifiedSineWave();
        if (this.topology === 'pp') {
            return Math.sqrt(sineWave.reduce((accumulator, value) => (accumulator + Math.pow(Math.abs(value.Vp) * value.Ip! + Math.abs(value.Vp_inv!) * value.Ip_inv!, 2)), 0)/sineWave.length);
        } else {
            return Math.sqrt(sineWave.reduce((accumulator, value) => (accumulator + Math.pow(Math.abs(value.Vp) * value.Ip!, 2)), 0)/sineWave.length);            
        }
    }

    maxOutputPowerRMS() : number | undefined {
        if (this._dcLoadLine && this.model) {
            const loadLine = (this.Znext && this.topology === 'se') ? this._acLoadLine : this._dcLoadLine;
            const minVp = intersectCharacteristicWithLoadLineV(this.model, 0, loadLine, this.Vg2);
            const maxIp = this.model.Ip(0, minVp, this.Vg2);

            return (this.Vq - minVp) * maxIp / (2*Math.sqrt(2));
        }   
    }

    effectiveAmplificationFactor() : number {
        if (this._dcLoadLine && this.model && this.Vg !== undefined && this.inputHeadroom !== undefined) {
            const loadLine = (this.Znext && this.topology === 'se') ? this._acLoadLine : this._dcLoadLine;
            const minVp = intersectCharacteristicWithLoadLineV(this.model, this.Vg!+this.inputHeadroom!, loadLine, this.Vg2);
            const maxVp = intersectCharacteristicWithLoadLineV(this.model, this.Vg!-this.inputHeadroom!, loadLine, this.Vg2);


            return (maxVp - minVp) / (this.inputHeadroom! * 2);
        } else { 
            return 0;
        }
    }

    graphDCLoadLine() : CharacteristicPoint[] {
        return this._dcLoadLine.getLine();
    }

    graphACLoadLine() : CharacteristicPoint[] {
        return this._acLoadLine.getLine();
    }

    graphCathodeLoadLine(): CharacteristicPoint[] {
        if (this._cathodeLoadLine && this.model) {
            return simplify(range(this.limits.minVg, this.limits.maxVg, this.limits.gridStep / 10).map(Vg => {
                const I = this._cathodeLoadLine.I(Vg);
                const V = this.model!.Vp(Vg, I, this.Vg2);
                return {x: V, y: I, Vg: Vg};
            }), 0.00001, true);
        } else {
            return [];
        }
    }

    graphVpIp(Vg: number): CharacteristicPoint[]  {
        if (this.model) {
            return simplify(range(0, this.limits.maxVp0, 1).map(Vp => ({x: Vp, y: this.model!.Ip(Vg, Vp, this.Vg2)})), 0.000005, true);
        } else {
            return [];
        }
    }
    
    graphVgVpIp(): {Vg: number, VpIp: CharacteristicPoint[]}[] {
        return range(this.limits.minVg, this.limits.maxVg, this.limits.gridStep).map(Vg => ({
            'Vg': Vg,
            'VpIp': this.graphVpIp(Vg)
        }));
    }

    graphPp(): CharacteristicPoint[] {
        return simplify(range(0, this.limits.maxVp0, 1).map(Vp => ({x: Vp, y: this.limits.maxPp / Vp})), 0.00001, true);
    }

    graphOperatingPoint(): CharacteristicPoint[] {
        if (this._dcLoadLine) {
            return [{x: this.Vq, y: this.Iq, Vg: this.Vg}];
        } else {
            return [];
        }
    }
    
    graphHeadroom(): CharacteristicPoint[] {
        if (this._dcLoadLine && this.model && this.inputHeadroom !== undefined && this.Vg !== undefined) {
            const minVg = this.Vg - this.inputHeadroom;
            const maxVg = this.Vg + this.inputHeadroom;
            const loadLine = (this.Znext && this._topology === 'se') ? this._acLoadLine : this._dcLoadLine;
            const maxVp = intersectCharacteristicWithLoadLineV(this.model, minVg, loadLine, this.Vg2);
            const minVp = intersectCharacteristicWithLoadLineV(this.model, maxVg, loadLine, this.Vg2);

            let data = [];
            let loadLineData = loadLine.getLine();
            data.push({x: minVp, y: loadLine.I(minVp), Vg: maxVg});

            // if the loadline has a bend, make sure we take it into account
            loadLineData.forEach(point => {
                if (point.x > minVp && point.x < maxVp) {
                    data.push({x: point.x, y: point.y, Vg: this.model!.Vg(point.x, point.y, this.Vg2)});
                }
            });

            data.push({x: maxVp, y: loadLine.I(maxVp), Vg: minVg});

            return data;
        } else {
            return [];
        }
    }

    graphAmplifiedSineWave() : OutputSample[] {
        // simulate amplification of a sine wave
        if (this.model && this.Vg !== undefined && this.inputHeadroom !== undefined) {
            const loadLine = (this.Znext && this._topology === 'se') ? this._acLoadLine : this._dcLoadLine;
            return range(0, 2*Math.PI, 2*Math.PI/90).map(t => {
                const Vg = this.Vg! + this.inputHeadroom! * Math.sin(t);
                const Vp = intersectCharacteristicWithLoadLineV(this.model!, Vg, loadLine, this.Vg2);
                const Ip = this.model!.Ip(Vg, Vp, this.Vg2);
                if (this.topology === 'pp') {
                    const Vg_inv = this.Vg! - this.inputHeadroom! * Math.sin(t);
                    const Vp_inv = intersectCharacteristicWithLoadLineV(this.model!, Vg_inv, loadLine, this.Vg2);
                    const Ip_inv = this.model!.Ip(Vg_inv, Vp_inv, this.Vg2);
                    return {x: t, y: Vp - Vp_inv, Ip: Ip, Vp: Vp, Ip_inv: Ip_inv, Vp_inv: Vp_inv};
                } else {
                    return {x: t, y: Vp - this.Vq, Ip: Ip, Vp: Vp};
                }
            });
        } else {
            return [];
        }
    }
}