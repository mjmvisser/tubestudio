<script setup lang="ts">
import { createApp, ref, reactive, computed, watch } from 'vue';
import Primegue from 'primevue/config';
import { Scatter } from 'vue-chartjs'
import { Chart, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler, Tick } from 'chart.js'
import type { ChartConfiguration } from 'chart.js';
import { tubeDatabase } from "@/tubeDatabase";
import { tubeFactory } from "@/models";
import { loadLineFactory, intersectLoadLines, intersectCharacteristicWithLoadLineV } from "@/loadLines"
import { TriodeGrapher } from '@/grapher';
import { clamp } from '@/utils';
import Dropdown from 'primevue/dropdown';
import InputNumber from 'primevue/inputnumber';
import RadioButton from 'primevue/radiobutton';
//import zoomPlugin from 'chartjs-plugin-zoom';


Chart.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

const ampState = reactive({
  mode: null,
  topology: null,
  Vq: null,
  Iq: null, // amps
  Iq_ma: null, // mA
  Bplus: null,
  biasMethod: null,
  Vg: null,
  loadType: null,
  Rp: null,
  Znext: null,
  Rk: null,
  Vg2: null,
  ultralinearTap: null,
  inputHeadroom: null,
  outputHeadroom: null
});

const tubes = tubeDatabase.map((tube, index) => ({id: index, name: tube.name}));

const modes = [{id: 'triode', name: 'Triode'},
               {id: 'pentode', name: 'Pentode'},
               {id: 'ultralinear', name: 'Ultralinear'}];

const topologies = [{id: 'se', name: 'Single-Ended'},
                   {id: 'pp', name: 'Push-Pull'}];



const models = computed(() => {
  if (selectedTube.value !== null) {
    return tubeDatabase[selectedTube.value].models.map((model, index) => ({name: model.attribution + ' (' + model.type +')', id: index}));
  } else {
    return [];
  }
});

const selectedTube = ref(null);
const tubeParams = ref(null);

watch(selectedTube, (index) => {
  tubeParams.value = tubeDatabase[index];

  // clear the model
  selectedModel.value = null;
  tubeModel.value = null;
 
  // set ampState to defaults
  ampState.mode = tubeParams.value.type === 'triode' ? 'triode' : 'pentode';
  ampState.ultralinearTap = 40;
  ampState.topology = tubeParams.value.type === 'triode' ? 'se' : 'pp';
  ampState.Bplus = tubeParams.value.Bplus;
  ampState.biasMethod = tubeParams.value.type === 'triode' ? 'cathode' : 'fixed';
  ampState.loadType = tubeParams.value.type === 'triode' ? 'resistive' : 'reactive';
  ampState.Rp = tubeParams.value.Rp;
  ampState.Iq = tubeParams.value.Iq;
  ampState.Iq_ma = tubeParams.value.Iq * 1000;
  ampState.Vg2 = ampState.mode === 'triode' ? ampState.Bplus : tubeParams.value.Vg2;
  ampState.Vg = null;
  ampState.Rk = null;
  
  clampAmpState();
});

const selectedModel = ref(null);
const tubeModel = ref(null);
const dcLoadLine = ref(null);
const acLoadLine = ref(null);
const cathodeLoadLine = ref(null);

const resetDCLoadLine = () => {
  dcLoadLine.value = loadLineFactory.createDCLoadLine(ampState.topology, ampState.Bplus,
                                                      ampState.loadType, ampState.Rp,
                                                      ampState.Rk,
                                                      ampState.Iq);
}

const resetACLoadLine = () => {
  acLoadLine.value = loadLineFactory.createACLoadLine(ampState.Rp,
                                                      ampState.Rk,
                                                      ampState.Znext, ampState.Vq, ampState.Iq); 
}

const resetCathodeLoadLine = () => {
  if (ampState.biasMethod === 'cathode') {
    cathodeLoadLine.value = loadLineFactory.createCathodeLoadLine(ampState.Rk, tubeModel.value);
  } else {
    cathodeLoadLine.value = null;
  }
}

const clampAmpState = () => {
  if (tubeParams.value !== null) {
    ampState.Vq = clamp(ampState.Vq, 0, tubeParams.value.maxVp);
    ampState.Vg = clamp(ampState.Vg, tubeParams.value.minVg, tubeParams.value.maxVg);
    ampState.Iq = clamp(ampState.Iq, 0.00001, tubeParams.value.maxIp);
    
    if (ampState.biasMethod === 'cathode') {
      ampState.Rk = clamp(ampState.Rk, 0, 1000000000);
    }

    if (isNaN(ampState.Vq) || isNaN(ampState.Iq) || (isNaN(ampState.Rk) || isNaN(ampState.Vg)) && tubeModel.value !== null) {
      ampState.Iq = tubeParams.value.Iq;
    }

    if (tubeParams.value.type !== 'triode') {
      if (isNaN(ampState.Vg2)) {
        ampState.Vg2 = tubeParams.value.Vg2;
      }
      ampState.Vg2 = clamp(ampState.Vg2, 0, tubeParams.value.maxVg2);
    }
  }
}

watch(selectedModel, (index) => {
  if (index !== null) {
    tubeModel.value = tubeFactory.createTube(tubeParams.value.type, tubeParams.value.models[index], ampState);
    ampState.Vg = tubeModel.value.Vg(ampState.Vq, ampState.Iq);
    clampAmpState();
    console.log("model changed, recalculating Vg=" + ampState.Vg);
  }
});

watch(() => ampState.Bplus, () => {
  resetDCLoadLine();
  resetCathodeLoadLine();
  resetACLoadLine();
  if (ampState.loadType === 'reactive') {
    ampState.Vq = ampState.Bplus;
  } else {
    ampState.Vq = dcLoadLine.value?.V(ampState.Iq);
  }
  ampState.Vg = tubeModel.value?.Vg(ampState.Vq, ampState.Iq);
  
  if (ampState.mode === 'triode') {
    ampState.Vg2 = ampState.Bplus;
  }

  clampAmpState();
  
  console.log("Bplus changed, recalculating Vq=" + ampState.Vq);
});

watch(
  () => {
    // is this really the only way to watch multiple values?!?
    return {
      loadType: ampState.loadType,
      Rp: ampState.Rp,
      Znext: ampState.Znext
    };
  },
  (load, oldLoad) => {
    if (ampState.loadType === 'resistive') {
      // can't have resistive push-pull
      ampState.topology = 'se';
      // reset Vq
    } else { // reactive quiescent voltage is same as B+
      ampState.Vq = ampState.Bplus;
      ampState.Znext = null;
    }

    clampAmpState();
    
    resetDCLoadLine();

    if (load.loadType === 'resistive' && oldLoad.loadType === 'reactive') {
      // if switching from reactive to resistive, reset Iq to default
      ampState.Iq = tubeParams.value.Iq;
      ampState.Vq = dcLoadLine.value.V(ampState.Iq);
    } else {
      ampState.Iq = dcLoadLine.value.I(ampState.Vq);
    }

    if (tubeModel.value !== null) {
      ampState.Vg = tubeModel.value.Vg(ampState.Vq, ampState.Iq);
    }
    
    clampAmpState();

    resetACLoadLine();
    
    console.log("Load changed, recalculating Iq=" + ampState.Iq);
  }
);

watch(() => ampState.biasMethod, () =>{
  console.log("biasMethod updated to " + ampState.biasMethod);
  if (ampState.biasMethod === 'fixed') {
    ampState.Rk = null;
  } else {
    ampState.Rk = Math.max(0, -ampState.Vg / (ampState.Iq));
  }
  clampAmpState();
})

watch(() => ampState.Rk?.toFixed(), () => {
  clampAmpState();
  if (tubeModel.value !== null) {
    resetCathodeLoadLine();
    resetDCLoadLine();
    resetACLoadLine();
    if (ampState.biasMethod === 'cathode') {
      ampState.Vg = intersectLoadLines(dcLoadLine.value, cathodeLoadLine.value, tubeModel.value);
      ampState.Iq = cathodeLoadLine.value.I(ampState.Vg);
      console.log("Rk=" + ampState.Rk + ", recalculating Vg=" + ampState.Vg);
    }
  }
});

watch(
  () => ampState.topology,
  () => {
    resetDCLoadLine();
  }
);

watch(
  () => ampState.Vq?.toFixed(),
  () => {
    clampAmpState();
    if (dcLoadLine.value !== null) {
      ampState.Iq = dcLoadLine.value.I(ampState.Vq);
      clampAmpState();
      console.log("Vq=" + ampState.Vq + ", recalculating Iq=" + ampState.Iq);
    }
  }
);

watch(
  () => ampState.Iq_ma?.toFixed(2),
  () => {
    ampState.Iq = ampState.Iq_ma / 1000;
    console.log("Iq=" + ampState.Iq);
  }
);

watch(
  () => ampState.Iq?.toFixed(6),
  () => {
    ampState.Iq_ma = ampState.Iq * 1000;
    console.log("Iq_ma=" + ampState.Iq_ma + ", Iq=" + ampState.Iq);
    clampAmpState();
    if (dcLoadLine.value !== null && ampState.loadType === 'resistive') {
      ampState.Vq = dcLoadLine.value.V(ampState.Iq);
      clampAmpState();
      console.log("Iq=" + ampState.Iq + ", recalculating Vq=" + ampState.Vq);
    }
    if (tubeModel.value !== null) {
      ampState.Vg = tubeModel.value.Vg(ampState.Vq, ampState.Iq);
      clampAmpState();
      console.log("Iq=" + ampState.Iq + ", recalculating Vg=" + ampState.Vg);
    }
  }
);

watch(
  () => {
    // is this really the only way to watch multiple values?!?
    return {
      Vg: ampState.Vg?.toFixed(2),
      Vg2: ampState.Vg2?.toFixed(2),
      mode: ampState.mode,
      ultralinearTap: ampState.ultralinearTap
    };
  },
  () => {
    clampAmpState();
    if (tubeModel.value !== null) {
      // TODO: must be a better way to handle this
      if (tubeParams.value.type === 'pentode') {
        tubeModel.value.ampState = ampState;
      }
      
      if (ampState.loadType === 'resistive') {
        ampState.Vq = intersectCharacteristicWithLoadLineV(tubeModel.value, ampState.Vg, dcLoadLine.value);
      }
      ampState.Iq = tubeModel.value.Ip(ampState.Vg, ampState.Vq);
      clampAmpState();
      if (ampState.biasMethod === 'cathode') {
        ampState.Rk = Math.max(0, -ampState.Vg / (ampState.Iq));
      } else {
        ampState.Rk = null;
      }
      
      if (ampState.mode === 'triode') {
        ampState.Vg2 = ampState.Bplus;
      }
      
      console.log("Vg=" + ampState.Vg + ", recalculating Iq=" + ampState.Iq + ", Vq=" + ampState.Vq + ", Rk=" + ampState.Rk);
      clampAmpState();
      resetCathodeLoadLine();
      resetDCLoadLine();
    }
  }
);

//watch(
//  () => ampState.inputHeadroom,
//  () => {
//    if (tubeModel.value !== null) {
//      const minVg = ampState.Vg - ampState.inputHeadroom;
//      const maxVg = ampState.Vg + ampState.inputHeadroom;
//      const minVp = intersectCharacteristicWithLoadLineV(model.value, minVg, this.dcLoadLine);
//
//        }
//        maxVp: intersectCharacteristicWithLoadLineV(this.model, maxVg, this.dcLoadLine),
//        
//      };
//    }
//  }
//)

const chartData = computed(() => {
  let datasets = [];
  
  console.log("chartData recomputed");
  
  ampState.Iq;
  ampState.Vq;
  ampState.Vg;
  ampState.Rp;
  ampState.Rk;
  ampState.biasMethod;
  ampState.loadType;
  ampState.Znext;
  ampState.Vg2;
  ampState.mode;
  ampState.ultralinearTap;
  ampState.inputHeadroom;
  
  dcLoadLine.value;
  acLoadLine.value;
  cathodeLoadLine.value;
  
  if (tubeParams.value) {
    const grapher = new TriodeGrapher(tubeModel.value, dcLoadLine.value, acLoadLine.value,
                                      cathodeLoadLine.value, tubeParams.value.minVg, tubeParams.value.maxVg,
                                      tubeParams.value.gridStep, tubeParams.value.maxVp, tubeParams.value.maxPp);

    datasets = datasets.concat(grapher.graphVgbVpIp().map(gridCurve => ({
      label: 'Vg=' + gridCurve.Vg + 'V',
      showLine: true,
      pointStyle: false,
      pointHitRadius: 2,
      borderColor: 'rgb(170,170,170)',
      backgroundColor: 'rgb(170,170,170)',
      borderWidth: 1.5,
      fill: false,
      data: gridCurve.VpIp, 
    })));

    datasets.push({
      label: 'Max Dissipation: ' + tubeParams.value.maxPp + 'W',
      showLine: true,
      pointStyle: false,
      pointHitRadius: 2,
      borderColor: 'rgb(255,0,0)',
      backgroundColor: 'rgb(255,0,0)',
      borderWidth: 1.5,
      borderDash: [ 10, 10 ],
      fill: false,
      data: grapher.graphPp(), 
    });

    datasets.push({
      label: ampState.loadType[0].toUpperCase() + ampState.loadType.slice(1) + ' DC Load: ' + ampState.Rp + 'Ω',
      showLine: true,
      pointStyle: false,
      pointHitRadius: 5,
      borderColor: 'rgb(255,0,0)',
      backgroundColor: 'rgb(255,0,0)',
      borderWidth: 1.5,
      fill: false,
      lineTension: 0,
      data: dcLoadLine.value?.getLine()
    });

    datasets.push({
      label: 'AC Load: ' + acLoadLine.value?.Z?.toFixed() + 'Ω',
      showLine: true,
      pointStyle: false,
      pointHitRadius: 5,
      borderColor: 'rgb(255,255,0)',
      backgroundColor: 'rgb(255,255,0)',
      borderWidth: 2.5,
      fill: false,
      lineTension: 0,
      data: acLoadLine.value?.getLine()
    });
    
//    datasets.push({
//      label: 'Cathode Load: ' + ampState.Rk?.toFixed() + 'Ω',
//      showLine: true,
//      pointStyle: false,
//      pointHitRadius: 5,
//      borderColor: 'rgb(255,0,255)',
//      backgroundColor: 'rgb(255,0,255)',
//      borderWidth: 2.5,
//      fill: false,
//      lineTension: 0,
//      data: 
//        grapher.graphCathodeLoadLine(cathodeLoadLine.value, ampState.Rk),
//    });
    
    datasets.push({
      label: 'Operating Point',
      showLine: true,
      pointRadius: 5,
      borderColor: 'rgb(255,0,0)',
      backgroundColor: 'rgb(255,0,0)',
      fill: false,
      data: grapher.graphOperatingPoint(ampState.Vq)
    });

    datasets.push({
      label: 'Vg=' + ampState.Vg?.toFixed(1) + 'V',
      showLine: true,
      pointStyle: false,
      pointHitRadius: 2,
      borderColor: 'rgb(0,0,255)',
      backgroundColor: 'rgb(0,0,255)',
      borderWidth: 1.5,
      fill: false,
      data: grapher.graphVpIp(ampState.Vg),
    });

    const minVg = ampState.Vg - ampState.inputHeadroom;
    
    datasets.push({
      label: 'Vg=' + minVg?.toFixed(1) + 'V',
      showLine: true,
      pointStyle: false,
      pointHitRadius: 2,
      borderColor: 'rgb(0,255,0)',
      backgroundColor: 'rgb(0,255,0)',
      borderWidth: 1.5,
      fill: false,
      data: grapher.graphVpIp(minVg)
    });
   
    datasets.push({
      label: 'Headroom',
      showLine: true,
      pointRadius: 5,
      borderColor: 'rgb(0,255,0)',
      backgroundColor: 'rgb(0,255,0)',
      fill: true,
      data: grapher.graphHeadroom(ampState.Vg, ampState.inputHeadroom)
    });

    const maxVg = ampState.Vg + ampState.inputHeadroom;

    datasets.push({
      label: 'Vg=' + maxVg?.toFixed(1) + 'V',
      showLine: true,
      pointStyle: false,
      pointHitRadius: 2,
      borderColor: 'rgb(0,255,0)',
      backgroundColor: 'rgb(0,255,0)',
      borderWidth: 1.5,
      fill: false,
      data: grapher.graphVpIp(maxVg)
    });
    
  }

  return { 'type': 'scatter', datasets: datasets };
});

const chartOptions = computed((): any => {
  tubeParams.value;
  
  if (selectedTube.value !== null) {
      return {
        animation: false,
        responsive: true,
        hover: {mode: 'index'},
        plugins: {
          title: {
            display: true,
            text:  tubeParams.value.name + ' Average Plate Characteristics'
          },
          legend: {
            display: false,
          },
          tooltip: {
            intersect: false,
            callbacks: {
              label: (context) =>  {
                const itemLabel = context.dataset.label || '';
                const Vp = context.parsed.x.toFixed(2);
                const Ip = (context.parsed.y*1000).toFixed(2);
                return itemLabel + ' (Vp: ' + Vp +'V, Ip: ' + Ip + 'mA)';
              }
            }
          }
        },
        scales: { 
          x: {
            ticks: {
              stepSize: 50
            },
            min: 0,
            max: tubeParams.value.maxVp,
            title: { display: true,text: 'Vp (V)'}
          },
          y: {
            ticks: {
              callback: (value: number, index: number, ticks: Tick[]) => {
                // convert from A to mA
                return (value*1000).toFixed();
              },
              stepSize: tubeParams.value.maxIp/10,
            },
            max: tubeParams.value.maxIp,
            min: 0, 
            title: { display: true,text: 'Ip (mA)'}
          }
        },
      };
  } else {
    return {};
  }
});

</script>

<template>
  <div class="grid align-items-center">
    <div class="col-12 py-2">
      <Scatter id="tube-chart" :options="chartOptions" :data="chartData" />
    </div>

    <div class="grid col-12 align-items-center">
      <div class="col-3 py-2">
        <div class="text-left font-bold">
          <div class="text-left px-2">Tube:&nbsp;
            <Dropdown v-model="selectedTube" :options="tubes" optionLabel="name" optionValue="id" placeholder="Select a Tube" class='w-full md:w-14rem' />
          </div>
        </div>
      </div>
      <div class="col-3 py-2">
        <div class="text-left font-bold">
          <label>Model:</label>&nbsp;
          <Dropdown v-model="selectedModel" :options="models" optionLabel="name" optionValue="id" placeholder="Select a Model" class="w-full md:w-14rem" />
        </div>
      </div>
      <div class="col-6 py-2">
        <div class="text-left">
          <label v-if="selectedTube !== null && selectedModel !== null"><a :href="tubeDatabase[selectedTube].models[selectedModel].source">Source</a></label>    
        </div>
      </div>
    </div>
  
    <div class="grid surface-ground col-12 align-items-center border-y-1 border-400">
      <div class="col-3 py-2">
        <label>Topology:</label>
      </div>
      <div class="col-3 py-2">
        <div v-for="topology in topologies" :key="topology.id" class="flex align-items-center">
          <RadioButton v-model="ampState.topology" :name="topology.id" :value="topology.id" :disabled="tubeParams === null || ampState.loadType !== 'reactive'" />
          <label :for="topology.id" class="ml-2">{{ topology.name }}</label>
        </div>
      </div>
      <div v-if="tubeParams?.type === 'pentode' || tubeParams?.type === 'tetrode'"  class="col-3 py-2">
        <div class="">Operating Mode:</div>
      </div>
      <div v-if="tubeParams?.type === 'pentode' || tubeParams?.type === 'tetrode'"  class="col-3 py-2">
        <div v-for="mode in modes" :key="mode.id" class="flex align-items-center">
          <RadioButton v-model="ampState.mode" :name="mode.id" :value="mode.id" :disabled="tubeParams === null || tubeParams?.type === 'triode'" />
          <label :for="mode.id" class="ml-2">{{ mode.name }}</label>
        </div>
      </div>
    </div>

    <div class="grid col-12 align-items-center">
      <div class="col-3 py-2">
        <label>B+ (V):</label>
      </div>
      <div class="col-3 py-2">
        <InputNumber v-model="ampState.Bplus" :min=0 :max=tubeParams?.maxVp :maxFractionDigits=2 showButtons :disabled="tubeParams === null"/>
      </div>    
      <div class="col-3 py-2">
        <label>Output Power (W):</label>
      </div>
      <div class="col-3 py-2">
        <div class="flex flex-column">
          At max g1: 0.82<br>
          At g1=0: 0.82<br>
          At headroom: [Set output headroom]
        </div>
      </div>
    </div>
  
    <div class="grid surface-ground col-12 align-items-center border-y-1 border-400">
      <div class="col-3 py-2">
        <label>Quiescent Operating Point:</label>
      </div>
      <div class="col-3 py-2">
        <div class="grid">
          <div class="col-12 py-0">Vq (V):</div>
          <div class="col-12 py-0"><InputNumber v-model="ampState.Vq" :min=0 :max=tubeParams?.maxVp :maxFractionDigits=1 :step=1 showButtons :disabled="tubeParams === null || ampState.loadType === 'reactive'" /></div>
          <div class="col-12 py-0">Iq (ma):</div>
          <div class="col-12 py-0"><InputNumber v-model="ampState.Iq_ma" :min=0.001 :max=tubeParams?.maxIp*1000 :maxFractionDigits=2 :step=0.01 showButtons :disabled="tubeParams === null" /></div>
        </div>
      </div>
      <div class="col-2 py-2">
        <label>Grid Bias (V):</label>
      </div>
      <div class="col-1 py-2">
        <div class="flex flex-column align-items-left">
          <div><RadioButton v-model="ampState.biasMethod" value="cathode" :disabled="tubeParams === null || tubeModel === null" /> <label>Cathode</label></div>
          <div><RadioButton v-model="ampState.biasMethod" value="fixed" :disabled="tubeParams === null || tubeModel === null" /> <label>Fixed</label></div>
        </div>
      </div>
      <div class="col-3 py-2">
        <InputNumber v-model="ampState.Vg" :min=tubeParams?.minVg :max=tubeParams?.maxVg :step=0.01 :maxFractionDigits=2 showButtons :disabled="tubeParams === null || tubeModel === null"/>
      </div>
    </div>
  
    <div class="grid col-12 align-items-center">
      <div class="col-1 py-2">
          <label>Plate Load (Ω):</label>
      </div>
      <div class="col-2 py-2">
        <div class="flex flex-column align-items-center">
          <div><RadioButton v-model="ampState.loadType" value="resistive" :disabled="tubeParams === null" /> <label>Resistive</label></div>
          <div><RadioButton v-model="ampState.loadType" value="reactive" :disabled="tubeParams === null" /> <label>Reactive</label></div>
        </div>
      </div>
      <div class="col-3 py-2">
        <InputNumber v-model="ampState.Rp" :min=0 :step=1000 showButtons :disabled="tubeParams === null" />
      </div>
      <div class="col-3 py-2">
        <label>Cathode Load (Ω):</label>
      </div>
      <div class="col-3 py-2">
        <InputNumber v-model="ampState.Rk" :min=0 :step=25 :maxFractionDigits=0 showButtons :disabled="tubeParams === null || tubeModel === null || ampState.biasMethod !== 'cathode'" />
      </div>
    </div>

    <div class="grid surface-ground col-12 align-items-center border-y-1 border-400">
      <div class="col-3 py-2">
        <label>Next Stage Impedance (Ω):</label>
      </div>
      <div class="col-3 py-2">
        <InputNumber v-model="ampState.Znext" :min=0 :step=1000 showButtons :disabled="tubeParams === null || ampState.loadType === 'reactive'"/>
      </div>
    </div>
  
    <div v-if="tubeParams?.type === 'pentode' || tubeParams?.type === 'tetrode'" class="grid col-12 align-items-center">
      <div class="col-3 py-2">
        <label>Screen Voltage (V):</label>
      </div>
      <div class="col-9 py-2">
        <InputNumber v-model="ampState.Vg2" :min=0 :max="tubeParams.maxVg2" :maxFractionDigits=0 :step=1 showButtons :disabled="tubeParams?.type === 'triode' || ampState.mode === 'triode'" />
      </div>
    </div>
      
    <div v-if="tubeParams?.type === 'pentode' || tubeParams?.type === 'tetrode'" class="grid surface-ground col-12 align-items-center border-y-1 border-400">
      <div class="col-3 py-2">
        <label>Ultra-linear tap (%):</label>
      </div>
      <div class="col-9 py-2">
        <InputNumber v-model="ampState.ultralinearTap" :min=10 :max=90 :step=10 showButtons :disabled="ampState?.mode !== 'ultralinear'" />
      </div>
    </div>
      
    <div class="grid col-12 align-items-center">
      <div class="col-3 py-2">
        <label>Input Headroom (±V):</label>
      </div>
      <div class="col-3 py-2">
        <InputNumber v-model="ampState.inputHeadroom" :maxFractionDigits=4 :min=0 :step=0.01 showButtons :disabled="tubeParams === null" />
      </div>
      <div class="col-3 py-2">
        <label>Output Headroom (±V):</label>
      </div>
      <div class="col-3 py-2">
        [Set input headroom]
      </div>
    </div>
  </div>
    
</template>
