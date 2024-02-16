class DCResistiveLoadLine {
    constructor(Bplus, Rp, Rk) {
        this.Bplus = Bplus;
        this.R = Rp + Rk;
    }
    
    I(V) {
        return (this.Bplus - V) / this.R;
    }

    V(I) {
        return this.Bplus - I * this.R;
    }
    
    getLine() {
        const p1 = {x: 0, y: this.I(0)};
        const p2 = {x: this.Bplus, y: this.I(this.Bplus)};
        return [p1, p2];
    }
}

class DCSingleEndedReactiveLoadLine {
    constructor(Bplus, Z, Iq) {
        this.Bplus = Bplus;
        this.Zp = Z;
        this.Iq = Iq;
    }
    
    I(V) {
        return (this.Bplus - V) / this.Zp + this.Iq;
    }
    
    V(I) {
        return this.Bplus + this.Zp * (this.Iq - I);
    }
    
    getLine() {
        const p1 = {x: 0, y: this.I(0)};
        const p2 = {x: this.V(0), y: 0}
        return [p1, p2]
    }
}

class DCPushPullReactiveLoadLine {
    constructor(Bplus, Z, Iq) {
        this.Bplus = Bplus;
        this.Zpa = Z/2;
        this.Zpb = Z/4;
        this.Iq = Iq;

        this.Vlim = this.Bplus - this.Iq * this.Zpa;
        this.Ilim = 2 * this.Iq;
    }
    
    I(V) {
        if (V <= this.Vlim) {
            // class B operation
            return (this.Bplus - V) / this.Zpb;
        } else {
            // class A operation
            return (this.Bplus - V) / this.Zpa + this.Iq;
        }
    }
    
    V(I) {
        if (I >= this.Ilim) {
            // class B operation
            return this.Bplus - this.Zpb * I;
        } else {
            // class A operation
            return this.Bplus - this.Zpa * (I - this.Iq);
        }
    }
    
    getLine() {
        const p1 = {x: 0, y: this.I(0)};
        const p2 = {x: this.Vlim, y: this.Ilim};
        const p3 = {x: this.V(0), y: 0};
        return [p1, p2, p3];
    }
}

class CathodeLoadLine {
    constructor(Rk) {
        this.Rk = Rk;
    }
    
    I(Vg) {
        return -Vg / this.Rk;
    }
    
    Vg(I) {
        return -I * this.Rk;
    }
    
    Rk(Vg, I) {
        return Math.max(0, -Vg / I);
    }
}

class ACLoadLine {
    constructor(Rp, Rk, Znext, Vq, Iq) {
        this.R = Rp + Rk;
        this.Znext = Znext;
        this.Vq = Vq;
        this.Iq = Iq;
        
        this.Z = (this.R * this.Znext) / (this.R + this.Znext);
    }
    I(V) {
        return (this.Vq - V) / this.Z + this.Iq;
    }
    
    V(I) {
        return this.Z * (this.Iq - I) + this.Vq;
    }
    
    getLine() {
        const p1 = {x: 0, y: this.I(0)};
        const p2 = {x: this.V(0), y: 0};
        return [p1, p2];
    }
}

const findRootWithBisection = (f, x0, x1, iter, tol, eps) => {
    let a = x0;
    let b = x1;

    for (let i = 0; i < iter; i++) {
        let c = (a+b)/2; // new midpoint
        let y = f(c);
        let ya = f(a);
        if (Math.abs(y) < eps || (b-a) / 2 < tol) {
            // solution found
            return c;
        }

        if (Math.sign(y) === Math.sign(ya)) {
            a = c;
        } else {
            b = c;
        }
    }

    throw "intersection failed";
};

class TubeModel {
    setVg2(Vg2) {
        this.Vg2 = Vg2;
    }
    
    // for pentodes: pentode, ultralinear, triode
    setMode(mode) {
        this.mode = mode;
    }
    
    setUltralinearTap(ultralinearTap) {
        this.ultralinearTap = ultralinearTap;
    }
    
    setBplus(Bplus) {
        this.Bplus = Bplus; 
    }
    
    Ip(Vg, Vp) {
        console.assert(false);
    };
    
    Vg(Vp, Ip) {
        return findRootWithBisection((Vg) => {
            return this.Ip(Vg, Vp) - Ip;
        }, -500, 0, 1000, 0.0000001, 0.0000001);
    }
    
    Vp(Vg, Ip) {
        return findRootWithBisection((Vp) => {
            return this.Ip(Vg, Vp) - Ip;
        }, 0, 5000, 1000, 0.0000001, 0.0000001);
    }
    
}

const intersectCharacteristicWithLoadLineV = (model, Vg, loadLine) => {
    // find intersection of loadline with characteristic curve at Vg and return Vq
    return findRootWithBisection((Vq) => {
        return model.Ip(Vg, Vq) - loadLine.I(Vq);
    }, 0, 5000, 1000, 0.0000001, 0.0000001);        
}

const intersectLoadLines = (loadLine, cathodeLoadLine, tubeModel) => {
    return findRootWithBisection((Vg) => {
        const Ip = cathodeLoadLine.I(Vg);
        return loadLine.V(Ip) - tubeModel.Vp(Vg, Ip);
    }, -200, 0, 1000, 0.0000001, 0.0000001)
}

class KorenTriode extends TubeModel {
    constructor(params) {
        super();
        this.mu = params.mu;
        this.ex = params.ex;
        this.Kg1 = params.Kg1;
        this.Kp = params.Kp;
        this.Kvb = params.Kvb;
        this.Vct = params.Vct;
    }

    Ip(Vg, Vp) {
        // https://www.normankoren.com/Audio/Tubemodspice_article.html
        // https://www.normankoren.com/Audio/Tubemodspice_article_2.html
        const V1 = Vp * Math.log(1 + Math.exp(this.Kp * ((1 / this.mu) + (Vg + this.Vct) / Math.sqrt(this.Kvb + Vp * Vp)))) / this.Kp;
        return Math.pow(V1, this.ex) * (1 + Math.sign(V1)) / this.Kg1;

        // https://www.dmitrynizh.com/tubeparams_image.htm#my_own_models
        //return 2 * Math.pow(Vp * Math.log(1 + Math.exp(this.Kp * (1 / this.mu + (Vg + this.Vct) / Math.sqrt(this.Kvb + Vp*Vp)))) / this.Kp, this.ex) / this.Kg1;
    
        
    }
    
//    Vg(Vp, Ip) {
//        // https://www.dmitrynizh.com/tubeparams_image.htm#my_own_models
//        return Math.sqrt(this.Kvb + Vp*Vp) * Math.log(Math.exp((this.Kp / Vp) * Math.pow(Ip * this.Kg1 / 2, 1 / this.ex)) - 1) / this.Kp - Math.sqrt(this.Kvb + Vp * Vp) / this.mu - this.Vct;
//    }
}

class AyumiTriode extends TubeModel {
    constructor(params) {
        super();
        this.G = params.G;
        this.muc = params.muc;
        this.alpha = params.alpha;
        this.Vgo = params.Vgo;

        this.a = (this.alpha === 1) ? Infinity : 1/(1 - this.alpha); // B.24
        this.b = 1.5 - this.a;                                       // B.25
        this.c = 3 * this.alpha - 1;                                 // B.26
        
        this.Gp = this.G * Math.pow(this.c * this.a / 3, this.b); // B.27
        
        this.mum = this.a / 1.5 * this.muc  // B.6
        
        // if grid current parameters do not exist, use estimated values
        this.Glim = (params.Glim === null) ? this.Gp * Math.pow(1 + 1/this.mum, 1.5) : params.Glim; // B.21
        this.Xg = (params.Xg === null) ? 0.5 / Math.pow(1 + 1/this.mum, 1.5) : params.Xg;           // B.20
    }
    
    Ip(Vg, Vp) {
        console.assert(Vp >= 0);
        
        const Vgg = Vg + this.Vgo;  // B.23
        
        // Cathode current // B.28
        let Ik = 0;
        if (Vgg <= 0) {
            if (Vp > 0) {
                const estm = Math.max(Vgg + Vp/this.muc, 0);
                Ik = this.G * Math.pow(this.c / 2 / this.muc * Vp, this.b) * Math.pow(1.5 / this.a * estm, this.a);
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
            Ig = this.Xg * this.Glim * Math.pow(Vg, 1.5) * (1.2 * (Vg / (Vp + Vg)) + 0.4);
        }

        const Iplim = (1 - this.Xg) * this.Glim * Math.pow(Vp, 1.5);      // B.30
        
        return Math.max(Math.min(Ik - Ig, Iplim), 0);       // B.31
    }
}

class KorenPentode extends TubeModel {
    constructor(params, ampState) {
        super();
        this.setVg2(ampState.Vg2);
        this.setMode(ampState.mode);
        this.setUltralinearTap(ampState.ultralinearTap);
        this.setBplus(ampState.Bplus);
        this.mu = params.mu;
        this.ex = params.ex;
        this.Kg1 = params.Kg1;
        this.Kg2 = params.Kg2;
        this.Kp = params.Kp;
        this.Kvb = params.Kvb;
        this.Vct = params.Vct;
    }
    
    Ip(Vg, Vp) {
        // https://www.normankoren.com/Audio/Tubemodspice_article.html
        if (this.mode === 'triode') {
            const V1 = Vp * Math.log(1 + Math.exp(this.Kp * ((1 / this.mu) + (Vg + this.Vct) / Math.sqrt(this.Kvb + Vp * Vp)))) / this.Kp;
            return Math.pow(V1, this.ex) * (1 + Math.sign(V1)) / this.Kg1;
        } else {
            const t = this.mode === 'ultralinear' ? this.ultralinearTap/100 : this.mode === 'pentode' ? 0 : 1; 
            const Vg2 = this.Vg2 * (1 - t) + Vp * t;
            const V1 = Vg2 * Math.log(1 + Math.exp((1/this.mu + Vg/Vg2)*this.Kp)) / this.Kp;
            return (Math.pow(V1, this.ex) + Math.sign(V1) * Math.pow(V1, this.ex)) * Math.atan(Vp / this.Kvb) / this.Kg1;
        }
    }
}

class AyumiPentode extends TubeModel {
    constructor(params, ampState) {
        super();
        this.setVg2(ampState.Vg2);
        
    }
}

const loadLineFactory = {
    createDCLoadLine: (topology, Bplus, loadType, Rp, Rk, Iq) => {
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
    
    createACLoadLine: (Rp, Rk, Znext, Vq, Iq) => {
        if (Rp >= 0 && Znext !== null && Znext >= 0 && Vq !== null && Iq !== null) {
            return new ACLoadLine(Rp, Rk || 0, Znext, Vq, Iq);
        } else {
            return null;
        }
    },
    
    createCathodeLoadLine: (Rk) => {
        if (Rk !== null) {
            return new CathodeLoadLine(Rk);
        } else {
            return null;
        }
    }
} 


const tubeFactory = {
    createTube: (type, model, ampState) => {
        // grab the first matching model with the given type and attribution
        switch (type) {
            case 'triode':
                switch (model.type) {
                    case 'koren':
                        return new KorenTriode(model, ampState);
                    case 'ayumi':
                        return new AyumiTriode(model, ampState);
                }
                break;
            case 'pentode':
                switch (model.type) {
                    case 'koren':
                        return new KorenPentode(model, ampState);
                }
        }
        
        throw "No such model: " + type + ", " + model.type;
    }
}

export { tubeFactory, loadLineFactory, intersectLoadLines, intersectCharacteristicWithLoadLineV }