import { findRootWithBisection } from './utils';
import type { AmpState } from './amp';

export abstract class TubeModel {
    type?: 'triode' | 'pentode';
    abstract Ip(Vg: number, Vp: number): number;

    constructor(public ampState: AmpState) {};

    Vg(Vp: number, Ip: number): number {
        return findRootWithBisection((Vg) => {
            return this.Ip(Vg, Vp) - Ip;
        }, -500, 0, 1000, 0.0000001, 0.0000001);
    }
    
    Vp(Vg: number, Ip: number): number {
        return findRootWithBisection((Vp) => {
            return this.Ip(Vg, Vp) - Ip;
        }, 0, 5000, 1000, 0.0000001, 0.0000001);
    }
}

abstract class Triode extends TubeModel {
    type: 'triode' = 'triode'; 
}

interface KorenParams {
    type: 'koren',
    mu: number;
    ex: number;
    Kg1: number;
    Kg2?: number;
    Kp: number;
    Kvb: number;
    Vct: number;
}

class KorenTriode extends Triode {
    constructor(ampState: AmpState, private params: KorenParams) {
        super(ampState);
    }

    Ip(Vg: number, Vp: number): number {
        // https://www.normankoren.com/Audio/Tubemodspice_article.html
        // https://www.normankoren.com/Audio/Tubemodspice_article_2.html
        const V1 = Vp * Math.log(1 + Math.exp(this.params.Kp * ((1 / this.params.mu) + (Vg + this.params.Vct) / Math.sqrt(this.params.Kvb + Vp * Vp)))) / this.params.Kp;
        return Math.pow(V1, this.params.ex) * (1 + Math.sign(V1)) / this.params.Kg1;

        // https://www.dmitrynizh.com/tubeparams_image.htm#my_own_models
        //return 2 * Math.pow(Vp * Math.log(1 + Math.exp(this.Kp * (1 / this.mu + (Vg + this.Vct) / Math.sqrt(this.Kvb + Vp*Vp)))) / this.Kp, this.ex) / this.Kg1;
    }
    
//    Vg(Vp, Ip) {
//        // https://www.dmitrynizh.com/tubeparams_image.htm#my_own_models
//        return Math.sqrt(this.Kvb + Vp*Vp) * Math.log(Math.exp((this.Kp / Vp) * Math.pow(Ip * this.Kg1 / 2, 1 / this.ex)) - 1) / this.Kp - Math.sqrt(this.Kvb + Vp * Vp) / this.mu - this.Vct;
//    }
}

interface AyumiParams {
    type: 'ayumi',
    G: number;
    muc: number;
    alpha: number;
    Vgo: number;    
    Glim?: number;
    Xg?: number;
}

interface AyumiParamsFullySpecified extends AyumiParams {
    Glim: number;
    Xg: number;
}

class AyumiTriode extends Triode {
    private a: number;
    private b: number;
    private c: number;

    private Gp: number;
    private mum: number;

    private params: AyumiParamsFullySpecified;

    constructor(ampState: AmpState, params: AyumiParams) {
        super(ampState);
        this.params = params as AyumiParamsFullySpecified;

        this.a = (params.alpha === 1) ? Infinity : 1/(1 - params.alpha); // B.24
        this.b = 1.5 - this.a;                                           // B.25
        this.c = 3 * params.alpha - 1;                                   // B.26
        
        this.Gp = params.G * Math.pow(this.c * this.a / 3, this.b);      // B.27
        
        this.mum = this.a / 1.5 * params.muc  // B.6

        this.params = {
            type: 'ayumi',
            G: params.G,
            muc: params.muc,
            alpha: params.alpha,
            Vgo: params.Vgo,
            Glim: (params.Glim === undefined) ? this.Gp * Math.pow(1 + 1/this.mum, 1.5) : params.Glim, // B.21
            Xg: (params.Xg === undefined) ? 0.5 / Math.pow(1 + 1/this.mum, 1.5) : params.Xg,           // B.20
        };
    }
    
    Ip(Vg: number, Vp: number): number {
        console.assert(Vp >= 0);
        
        const Vgg = Vg + this.params.Vgo;  // B.23
        
        // Cathode current // B.28
        let Ik = 0;
        if (Vgg <= 0) {
            if (Vp > 0) {
                const estm = Math.max(Vgg + Vp/this.params.muc, 0);
                Ik = this.params.G * Math.pow(this.c / 2 / this.params.muc * Vp, this.b) * Math.pow(1.5 / this.a * estm, this.a);
            } else {
                Ik = 0;
            }
        } else {  // Vgg > 0
            const estp = Math.max(Vgg + Vp / this.mum, 0);
            Ik = this.Gp * Math.pow(estp, 1.5);
        }

        // Grid current // B.29
        let Ig = 0;
        if (Vg > 0) {
            Ig = this.params.Xg * this.params.Glim * Math.pow(Vg, 1.5) * (1.2 * (Vg / (Vp + Vg)) + 0.4);
        }

        const Iplim = (1 - this.params.Xg) * this.params.Glim * Math.pow(Vp, 1.5);  // B.30
        
        return Math.max(Math.min(Ik - Ig, Iplim), 0);       // B.31
    }
}

abstract class Pentode extends TubeModel {
    type : 'pentode' = 'pentode';
}

class KorenPentode extends Pentode {
    constructor(ampState: AmpState, private params: KorenParams) {
        super(ampState);
    }
    
    Ip(Vg: number, Vp: number) {
        // https://www.normankoren.com/Audio/Tubemodspice_article.html
        if (this.ampState.mode === 'triode') {
            const V1 = Vp * Math.log(1 + Math.exp(this.params.Kp * ((1 / this.params.mu) + (Vg + this.params.Vct) / Math.sqrt(this.params.Kvb + Vp * Vp)))) / this.params.Kp;
            return Math.pow(V1, this.params.ex) * (1 + Math.sign(V1)) / this.params.Kg1;
        } else {
            console.assert(this.ampState.Vg2 !== undefined);
            const t = this.ampState.mode === 'ultralinear' ? this.ampState.ultralinearTap/100 : this.ampState.mode === 'pentode' ? 0 : 1; 
            const Vg2 = this.ampState.Vg2! * (1 - t) + Vp * t;
            const V1 = Vg2 * Math.log(1 + Math.exp((1/this.params.mu + Vg/Vg2)*this.params.Kp)) / this.params.Kp;
            return (Math.pow(V1, this.params.ex) + Math.sign(V1) * Math.pow(V1, this.params.ex)) * Math.atan(Vp / this.params.Kvb) / this.params.Kg1;
        }
    }
}

class AyumiPentode extends TubeModel {
    constructor(public ampState: AmpState, private params: AyumiParams) {
        super(ampState);
    }

    Ip(Vg: number, Vp: number) {
        console.assert(false);
        return 0;
    }
}

export const tubeFactory = {
    createTube: (type: 'triode' | 'tetrode' | 'pentode', ampState: AmpState, params: KorenParams | AyumiParams) => {
        switch (type) {
            case 'triode':
                switch (params.type) {
                    case 'koren':
                        return new KorenTriode(ampState, params);
                    case 'ayumi':
                        return new AyumiTriode(ampState, params);
                }
                break;
            case 'pentode':
                switch (params.type) {
                    case 'koren':
                        return new KorenPentode(ampState, params);
                    case 'ayumi':
                        return new AyumiPentode(ampState, params);
                }
        }
        
        throw "No such model: " + type + ", " + params.type;
    }
}


export type TubeModelParams = (AyumiParams | KorenParams) & {type: string; attribution: string; source: string};