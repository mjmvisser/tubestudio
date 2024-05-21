#!/usr/bin/env node --loader ts-node/esm

import * as fs from 'fs';

const eps = 0.000001;

function float_equals(a, b) {
    return Math.abs(a - b) < eps;
}

// async function read(stream) {
//     const chunks = [];
//     for await (const chunk of stream) {
//         chunks.push(chunk); 
//     }

//     return Buffer.concat(chunks).toString('utf8');
//   }

class AyumiTriodeSpiceModelParser {
    matches(spice) {
        return spice.includes("Copyright 2003--2008 by Ayumi Nakabayashi, All rights reserved.");
    }

    parse(spice) {
        const BGG_re = /BGG   GG   0 V=V\(G,K\)\+([+-]?(?:[0-9]+[.])?[0-9]+(?:e[+-][1-9][0-9]*)?)/gm;
        const BGG_match = BGG_re.exec(spice);
        if (!BGG_match) {
            throw new Error("AyumiTriodeSpiceModelParser.parse: malformed BGG");
        }
        const Vgo = parseFloat(BGG_match[1]);

        const BM1_re = /BM1   M1   0 V=\(([+-]?(?:[0-9]+[.])?[0-9]+(?:e[+-][1-9][0-9]*)?)\*\(URAMP\(V\(A\,K\)\)\+1e-10\)\)\^([+-]?(?:[0-9]+[.])?[0-9]+(?:e[+-][1-9][0-9]*)?)/gm;
        const BM1_match = BM1_re.exec(spice);
        if (!BM1_match) {
            throw new Error("AyumiTriodeSpiceModelParser.parse: malformed BM1");
        }

        const c_2_muc = parseFloat(BM1_match[1]);
        const b = parseFloat(BM1_match[2]);
        const a = 1.5 - b;
        const alpha = (a - 1) / a;
        const c = 3 * alpha - 1;
        const muc = c / 2 / c_2_muc;        

        const BM2_re = /BM2   M2   0 V=\(([+-]?(?:[0-9]+[.])?[0-9]+(?:e[+-][1-9][0-9]*)?)\*\(URAMP\(V\(GG\)\+URAMP\(V\(A\,K\)\)\/([+-]?(?:[0-9]+[.])?[0-9]+(?:e[+-][1-9][0-9]*)?)\)\+1e-10\)\)\^([+-]?(?:[0-9]+[.])?[0-9]+(?:e[+-][1-9][0-9]*)?)/gm;
        const BM2_match = BM2_re.exec(spice);
        if (!BM2_match) {
            throw new Error("AyumiTriodeSpiceModelParser.parse: malformed BM2");
        }

        const a1 = parseFloat(BM2_match[1]);
        const a_check = 1.5 / a1;
        const muc_check = parseFloat(BM2_match[2]);
        const a_check2 = parseFloat(BM2_match[3]);

        if (!float_equals(a, a_check) || !float_equals(a, a_check2) || !float_equals(muc, muc_check)) {
            throw new Error("AyumiTriodeSpiceModelParser.parse: check failed on BM2");
        }

        const BP_re = /BP    P    0 V=([+-]?(?:[0-9]+[.])?[0-9]+(?:e[+-][1-9][0-9]*)?)\*\(URAMP\(V\(GG\)\+URAMP\(V\(A\,K\)\)\/([+-]?(?:[0-9]+[.])?[0-9]+(?:e[+-][1-9][0-9]*)?)\)\+1e-10\)\^1\.5/gm;
        const BP_match = BP_re.exec(spice);
        if (!BP_match) {
            throw new Error("AyumiTriodeSpiceModelParser.parse: malformed BP");
        }
        
        const Gp = parseFloat(BP_match[1]);
        const mum = parseFloat(BP_match[2]);

        if (!float_equals(mum, a / 1.5 * muc)) {
            throw new Error("AyumiTriodeSpiceModelParser.parse: check failed on BP");
        }

        const BIK_re = /BIK   IK   0 V=U\(V\(GG\)\)\*V\(P\)\+\(1-U\(V\(GG\)\)\)\*([+-]?(?:[0-9]+[.])?[0-9]+(?:e[+-][1-9][0-9]*)?)\*V\(M1\)\*V\(M2\)/gm;
        const BIK_match = BIK_re.exec(spice);
        if (!BIK_match) {
            throw new Error("AyumiTriodeSpiceModelParser.parse: malformed BIK");
        }

        const G = parseFloat(BIK_match[1]);

        if (!float_equals(Gp, G * Math.pow((c * a / 3), b))) {
            throw new Error("AyumiTriodeSpiceModelParser.parse: check failed on BIK");
        }

        const BIG_re = /BIG   IG   0 V=([+-]?(?:[0-9]+[.])?[0-9]+(?:e[+-][1-9][0-9]*)?)\*URAMP\(V\(G\,K\)\)\^1.5\*\(URAMP\(V\(G\,K\)\)\/\(URAMP\(V\(A\,K\)\)\+URAMP\(V\(G\,K\)\)\)\*1\.2\+0\.4\)/gm;
        const BIG_match = BIG_re.exec(spice);
        if (!BIG_match) {
            throw new Error("AyumiTriodeSpiceModelParser.parse: malformed BIG");
        }

        const m = parseFloat(BIG_match[1]); // m = Xg * Glim

        const BIAK_re = /BIAK  A    K I=URAMP\(V\(IK\,IG\)-URAMP\(V\(IK\,IG\)-\(([+-]?(?:[0-9]+[.])?[0-9]+(?:e[+-][1-9][0-9]*)?)\*URAMP\(V\(A\,K\)\)\^1\.5\)\)\)\+1e-10\*V\(A\,K\)/gm;
        const BIAK_match = BIAK_re.exec(spice);
        if (!BIAK_match) {
            throw new Error("AyumiTriodeSpiceModelParser.parse: malformed BIAK");
        }

        const n = parseFloat(BIAK_match[1]); // n = (1 - Xg) * Glim

        const Xg = m / (m + n);
        const Glim = m + n;

        return {
            type: 'ayumi',
            attribution: 'ayumi',
            source: 'https://ayumi.cava.jp/audio/pctube/node48.html',
            G: G,
            muc: muc,
            alpha: alpha,
            Vgo: Vgo,    
            Glim: Glim,
            Xg: Xg,   
        }
    }
}

const inputText = fs.readFileSync(0, 'utf-8');

const ayumiTriodeSpiceModelParser = new AyumiTriodeSpiceModelParser();

if (ayumiTriodeSpiceModelParser.matches(inputText)) {
    console.log(JSON.stringify(ayumiTriodeSpiceModelParser.parse(inputText)));
}


const exports = {};