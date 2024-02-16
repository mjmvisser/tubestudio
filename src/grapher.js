import { range } from './utils.js';
import simplify from 'simplify-js';
import { intersectCharacteristicWithLoadLineV } from "@/models.js";

class TriodeGrapher {
  constructor(model, dcLoadLine, acLoadLine, cathodeLoadLine, minVg, maxVg, gridStep, maxVp, maxPp) {
    console.assert(gridStep > 0);
    console.assert(minVg < maxVg);
    console.assert(maxVp > 0);

    this.model = model;
    this.dcLoadLine = dcLoadLine;
    this.acLoadLine = acLoadLine;
    this.cathodeLoadLine = cathodeLoadLine;
    this.minVg = minVg;
    this.maxVg = maxVg;
    this.gridStep = gridStep;
    this.maxVp = maxVp;
    this.maxPp = maxPp;
  }

  graphVpIp(Vg) {
    if (this.model !== null) {
      return simplify(range(0, this.maxVp, 1).map(Vp => ({x: Vp, y: this.model.Ip(Vg, Vp)})), 0.00001, true);
    } else {
      return [];
    }
  }

  graphVgbVpIp() {
    return range(this.minVg, this.maxVg, this.gridStep).map(Vg => ({
      'Vg': Vg,
      'VpIp': this.graphVpIp(Vg)
    }));
  }

  graphPp() {
    return simplify(range(0, this.maxVp, 1).map(Vp => ({x: Vp, y: this.maxPp / Vp})), 0.00001, true);
  }
 
  graphCathodeLoadLine(cathodeLoadLine, Rk) {
    if (cathodeLoadLine !== null && this.cathodeLoadLine !== null && this.model !== null) {
      return simplify(range(this.minVg, this.maxVg, this.gridStep/10).map(Vg => {
        const I = this.cathodeLoadLine.I(Vg);
        const V = this.model.Vp(Vg, I);
        return {x: V, y: I};
      }), 0.00001, true);
    } else {
      return [];
    }
  }
  
  graphOperatingPoint(Vq) {
    if (this.dcLoadLine !== null) {
      return [{x: Vq, y: this.dcLoadLine.I(Vq)}];
    } else {
      return [];
    }
  }

  graphHeadroom(Vg, inputHeadroom) {
    if (this.dcLoadLine !== null && this.model !== null) {
      const minVg = Vg - inputHeadroom;
      const maxVg = Vg + inputHeadroom;
      const minVp = intersectCharacteristicWithLoadLineV(this.model, minVg, this.dcLoadLine);
      const maxVp = intersectCharacteristicWithLoadLineV(this.model, maxVg, this.dcLoadLine);
      return [{x: minVp, y: this.dcLoadLine.I(minVp)}, {x: maxVp, y: this.dcLoadLine.I(maxVp)}];
    } else {
      return [];
    }
  }
}

// TBD: Andrei Frolov's extensions to Koren's models
// https://www.diyaudio.com/community/threads/vacuum-tube-modeling-software-beta-testers-wanted.56327/post-631401
// also see curvecaptor/tubefit.c

// TBD: Ayumi's models
// https://ayumi.cava.jp/audio/appendix/node6.html#SECTION00214000000000000000
// also see R implementation

export { TriodeGrapher };