// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/from#sequence_generator_range
// Sequence generator function 
// (commonly referred to as "range", e.g. Clojure, PHP etc)
const range = (start: number, stop: number, step: number): number[] =>
    Array.from({ length: (stop - start) / step + 1 }, (_, i) => start + (i * step))

// https://stackoverflow.com/questions/55564508/pie-chart-js-display-a-no-data-held-message
// const emptyChartPlugin = {
//   id: 'emptyChart',
//   afterDraw(chart, args, options) {
//     const { datasets } = chart.data;
//     let hasData = false;

//     for (let dataset of datasets) {
//       //set this condition according to your needs
//       if (dataset.data.length > 0 && dataset.data.some(item => item !== 0)) {
//         hasData = true;
//         break;
//       }
//     }

//     if (!hasData) {
//       //type of ctx is CanvasRenderingContext2D
//       //https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D
//       //modify it to your liking
//       const { chartArea: { left, top, right, bottom }, ctx } = chart;
//       const centerX = (left + right) / 2;
//       const centerY = (top + bottom) / 2;

//       chart.clear();
//       ctx.save();
//       ctx.textAlign = 'center';
//       ctx.textBaseline = 'middle';
//       ctx.fillText('No data to display', centerX, centerY);
//       ctx.restore();
//     }
//   }
// };

// const newtonRaphson = (f, fp, x0) => {
//   const tolerance = 1e-7;
//   const epsilon = 2.220446049250313e-16;
//   const maxIterations = 20;
//   const h = 1e-4;

//   const hInv = 1/h;

//   let x1 = x0;
//   let iter = 0;
//   var yp;
//   for (let iter = 0; iter < maxIterations; iter++) {
//     const y = f(x0);

//     if (fp !== null) {
//       // use the provided derivative
//       yp = fp(x0);
//     } else {
//       // estimate derivative
//       const yph = f(x0 + h);
//       const ymh = f(x0 - h);
//       const yp2h = f(x0 + 2 * h);
//       const ym2h = f(x0 - 2 * h);

//       yp = ((ym2h - yp2h) + 8 * (yph - ymh)) * hInv / 12;
//     }

//     if (Math.abs(yp) <= epsilon * Math.abs(y)) {
//       throw 'failed to converge due to nearly zero first derivative';
//     }

//     // update the guess
//     x1 = x0 - y / yp;

//     if (Math.abs(x1 - x0) <= tolerance * Math.abs(x1)) {
//       return x1;
//     }

//     x0 = x1;
//   }

//   throw "failed to converge, max iterations reached";
// }

const clamp = (x: number, min: number | undefined, max: number | undefined): number => {
    let result = x;
    if (min !== undefined) {
        result = Math.max(result, min);
    }
    if (max !== undefined) {
        result = Math.min(result, max);
    }
    return result;
};

type F = (x: number) => number;
const findRootWithBisection = (f: F, x0: number, x1: number, iter: number, tol: number, eps: number): number => {
    let a: number = x0;
    let b: number = x1;

    for (let i = 0; i < iter; i++) {
        let c: number = (a + b) / 2; // new midpoint
        let y: number = f(c);
        let ya: number = f(a);
        if (Math.abs(y) < eps || (b - a) / 2 < tol) {
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

export { range, clamp, findRootWithBisection };
