import { range } from './utils.js';
import simplify from 'simplify-js';
import { intersectCharacteristicWithLoadLineV } from "@/loadLines";
import type { LoadLine } from "@/loadLines";
import { TubeModel } from "@/models";
import type { Point } from 'chart.js';

class TriodeGrapher {
  constructor(private model: TubeModel, private dcLoadLine: LoadLine, private acLoadLine: LoadLine, private cathodeLoadLine: LoadLine, private minVg: number, private maxVg: number, private gridStep: number, private maxVp: number, private maxPp: number) {
    console.assert(gridStep > 0);
    console.assert(minVg < maxVg);
    console.assert(maxVp > 0);
  }

  graphVpIp(Vg: number): Point[]  {
    if (this.model !== null) {
      return simplify(range(0, this.maxVp, 1).map(Vp => ({x: Vp, y: this.model.Ip(Vg, Vp)})), 0.00001, true);
    } else {
      return [];
    }
  }

  graphVgbVpIp(): {Vg: number, VpIp: Point[]}[] {
    return range(this.minVg, this.maxVg, this.gridStep).map(Vg => ({
      'Vg': Vg,
      'VpIp': this.graphVpIp(Vg)
    }));
  }

  graphPp(): Point[] {
    return simplify(range(0, this.maxVp, 1).map(Vp => ({x: Vp, y: this.maxPp / Vp})), 0.00001, true);
  }
 
  graphCathodeLoadLine(Rk: number): Point[] {
    if (this.cathodeLoadLine !== null && this.model !== null) {
      return simplify(range(this.minVg, this.maxVg, this.gridStep/10).map(Vg => {
        const I = this.cathodeLoadLine.I(Vg);
        const V = this.model.Vp(Vg, I);
        return {x: V, y: I};
      }), 0.00001, true);
    } else {
      return [];
    }
  }
  
  graphOperatingPoint(Vq: number): Point[] {
    if (this.dcLoadLine !== null) {
      return [{x: Vq, y: this.dcLoadLine.I(Vq)}];
    } else {
      return [];
    }
  }

  graphHeadroom(Vg: number, inputHeadroom: number): Point[] {
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