<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue';
import type { UnwrapNestedRefs } from 'vue';
import type { Ref } from 'vue';
import { Scatter } from 'vue-chartjs'
import { Chart, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js'
import type { ChartData, ChartDataset, ChartOptions, Tick, TooltipItem } from 'chart.js';
import { tubeDatabase } from '@/tubeDatabase';
import type { TubeInfo } from '@/tubeDatabase';
import { tubeFactory } from '@/tubeModels';
import { Amp } from '@/amp';
import type { OutputSample, CharacteristicPoint, CharacteristicCurve } from '@/amp';
import Dropdown from 'primevue/dropdown';
import InputNumber from 'primevue/inputnumber';
import RadioButton from 'primevue/radiobutton';
import Checkbox from 'primevue/checkbox';
import ContextMenu from 'primevue/contextmenu';
import { useRoute, useRouter } from 'vue-router';
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

const tubes = tubeDatabase.map((tube, index) => ({ id: index, name: tube.name }));

const models = computed(() => {
    if (selectedTube.value !== null) {
        return tubeDatabase[selectedTube.value].models.map((model, index) => ({ name: model.attribution + ' (' + model.type + ')', id: index }));
    } else {
        return [];
    }
});

const selectedTube = ref<number | null>(null);
const tubeParams = ref<TubeInfo | null>(null);
const selectedModel = ref<number | null>(null);

//const Iq_ma : Ref<number | null> = ref(null);

// let amp : any = reactive({
//     topology: 'se',
//     mode: 'triode',
//     Bplus: 300,
//     Iq: 0.0006,
//     Vq: 168,
//     Vg: -2,
//     Vg2: 275,
//     biasMethod: 'cathode',
//     loadType: 'resistive',
//     Rp: 50000,
//     Rk: 3000,
//     Znext: 1000000,
//     ultralinearTap: 100,
//     inputHeadroom: 0.0001
// });

//let amp : UnwrapNestedRefs<Amp> | null = null;
let amp = ref<Amp | null>(null);

watch(selectedTube, (index) => {
    if (index !== null) {
        tubeParams.value = tubeDatabase[index];

        if (selectedTubeChangeIsUserTriggered.value) {
            // clear the model
            selectedModel.value = null;
            selectedTubeChangeIsUserTriggered.value = false;
        }
        
        // hide the cathode load line by default
        showCathodeLoadLine.value = false;

        // create amp with defaults
        amp.value = new Amp(tubeParams.value.name, tubeParams.value.type, tubeParams.value.defaults, tubeParams.value.limits);
        amp.value.init();
        Iq_ma.value = amp.value.Iq * 1000;

        router.push({name: route.name, params: {tubeName: tubeParams.value.name}});
    } else {
        router.push({name: route.name, params: {tubeName: "", model: ""}});
    }
});

watch(selectedModel, (index) => {
    if (amp.value && index !== null && tubeParams.value !== null && index < tubeParams.value.models.length) {
        amp.value.model = tubeFactory.createTube(tubeParams.value.type, amp.value, tubeParams.value.models[index]);

        router.push({name: route.name, params: {model: index.toString()}});
    } else {
        router.push({name: route.name, params: {model: ""}});
    }
});

const route = useRoute();
const router = useRouter();

// Watch the route parameters and update selectedTube and selectedModel
watch(
    () => [route.params.tubeName, route.params.model],
    ([newTubeName, newModel]) => {
        if (newTubeName) {
            selectedTube.value = tubeDatabase.findIndex(tube => tube.name === newTubeName as string) ?? null;
        } else {
            selectedTube.value = null;
        }
        const modelIndex = parseInt(newModel as string);
        if (selectedTube.value !== null && !isNaN(modelIndex) && modelIndex < tubeDatabase[selectedTube.value].models.length) {
            selectedModel.value = modelIndex;
        } else {
            selectedModel.value = null;
        }
    },
    { immediate: true } // Trigger the watcher immediately on component load
);

const selectedTubeChangeIsUserTriggered = ref(false); // Flag to track user-triggered changes

// Handle user-triggered changes from the Dropdown
function onSelectedTubeChange(newValue: number | null) {
    selectedTubeChangeIsUserTriggered.value = true; // Set the flag to indicate user action
    selectedTube.value = newValue; // Update the model
}

const Iq_ma = computed({
    get() {
        // force update when these change 
        selectedTube.value;
        selectedModel.value;

        if (amp.value) {
            return amp.value.Iq * 1000;
        } else {
            return null;
        }
    },
    set(newValue) {
        if (newValue !== null && amp.value) {
            amp.value.Iq = newValue / 1000;
        }
    }
});

function proportionalStep(value: number) {
    const absValue = Math.abs(value);
    if (absValue < 1) {
        return 0.01;
    } else if (absValue < 10) {
        return 0.1;
    } else if (absValue < 100) {
        return 1;
    } else if (absValue < 1000) {
        return 10;
    } else if (absValue < 10000) {
        return 100;
    } else if (absValue < 100000) {
        return 1000;
    } else if (absValue < 1000000) {
        return 10000;
    } else if (absValue < 10000000) {
        return 100000;
    } else {
        return 1000000;
    }
}

const showCathodeLoadLine = ref(false);

const characteristicChartData = computed(() : ChartData<'scatter'> => {
    let datasets : ChartDataset<'scatter'>[] = [];

    tubeParams.value;

    // need this so Vue "knows" chartData depends on these values
    amp.value;
    amp.value?.topology;
    amp.value?.mode;
    amp.value?.Bplus;
    amp.value?.Iq;
    amp.value?.Vq;
    amp.value?.Vg;
    amp.value?.Vg2;
    amp.value?.biasMethod;
    amp.value?.loadType;
    amp.value?.Rp;
    amp.value?.Rk;
    amp.value?.cathodeBypass;
    amp.value?.Znext;
    amp.value?.ultralinearTap;
    amp.value?.inputHeadroom;
    amp.value?.model;
    showCathodeLoadLine.value;

    if (amp.value) {
        datasets = datasets.concat(amp.value.graphVgVpIp().map((gridCurve: CharacteristicCurve) => ({
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
            label: 'Max Dissipation: ' + amp.value.limits.maxPp + 'W',
            showLine: true,
            pointStyle: false,
            pointHitRadius: 2,
            borderColor: 'rgb(255,0,0)',
            backgroundColor: 'rgb(255,0,0)',
            borderWidth: 1.5,
            borderDash: [10, 10],
            fill: false,
            data: amp.value.graphPp(),
        });

        datasets.push({
            label: amp.value.loadType[0].toUpperCase() + amp.value.loadType.slice(1) + ' DC Load: ' + amp.value.dcLoadLineInfo(),
            showLine: true,
            pointStyle: false,
            pointHitRadius: 5,
            borderColor: 'rgb(255,0,0)',
            backgroundColor: 'rgb(255,0,0)',
            borderWidth: 1.5,
            fill: false,
            //lineTension: 0,
            data: amp.value.graphDCLoadLine()
        });

        datasets.push({
            label: 'AC Load: ' + amp.value.acLoadLineInfo(),
            showLine: true,
            pointStyle: false,
            pointHitRadius: 5,
            borderColor: 'rgb(255,255,0)',
            backgroundColor: 'rgb(255,255,0)',
            borderWidth: 2.5,
            fill: false,
            //lineTension: 0,
            data: amp.value.graphACLoadLine()
        });

        if (showCathodeLoadLine.value) {
            datasets.push({
                label: 'Cathode Load: ' + (amp.value.biasMethod === 'fixed' ? 'Fixed' : amp.value.Rk?.toFixed() + 'Ω'),
                showLine: true,
                pointStyle: false,
                pointHitRadius: 5,
                borderColor: 'rgb(255,0,255)',
                backgroundColor: 'rgb(255,0,255)',
                borderWidth: 2.5,
                fill: false,
    //             lineTension: 0,
                data: 
                amp.value.graphCathodeLoadLine(),
            });
        }

        datasets.push({
            label: 'Operating Point',
            showLine: true,
            pointRadius: 5,
            borderColor: 'rgb(255,0,0)',
            backgroundColor: 'rgb(255,0,0)',
            fill: false,
            data: amp.value.graphOperatingPoint()
        });

        if (amp.value.Vg !== undefined) {
            datasets.push({
                label: 'Vg=' + amp.value.Vg?.toFixed(1) + 'V',
                showLine: true,
                pointStyle: false,
                pointHitRadius: 2,
                borderColor: 'rgb(0,0,255)',
                backgroundColor: 'rgb(0,0,255)',
                borderWidth: 1.5,
                fill: false,
                data: amp.value.graphVpIp(amp.value.Vg),
            });
        }

        if (amp.value.Vg !== undefined && amp.value.inputHeadroom !== undefined) {
            // const minVg = amp.Vg - amp.inputHeadroom;

            // datasets.push({
            //     label: 'Vg=' + minVg?.toFixed(1) + 'V',
            //     showLine: true,
            //     pointStyle: false,
            //     pointHitRadius: 2,
            //     borderColor: 'rgb(0,255,0)',
            //     backgroundColor: 'rgb(0,255,0)',
            //     borderWidth: 1.5,
            //     fill: false,
            //     data: amp.graphVpIp(minVg)
            // });

            datasets.push({
                label: 'Headroom',
                showLine: true,
                pointRadius: 5,
                borderColor: 'rgb(0,255,0)',
                backgroundColor: 'rgb(0,255,0)',
                fill: true,
                data: amp.value.graphHeadroom()
            });

            // const maxVg = amp.Vg + amp.inputHeadroom;

            // datasets.push({
            //     label: 'Vg=' + maxVg?.toFixed(1) + 'V',
            //     showLine: true,
            //     pointStyle: false,
            //     pointHitRadius: 2,
            //     borderColor: 'rgb(0,255,0)',
            //     backgroundColor: 'rgb(0,255,0)',
            //     borderWidth: 1.5,
            //     fill: false,
            //     data: amp.graphVpIp(maxVg)
            // });
        }
    }

    return { datasets: datasets };
});

const characteristicChartOptions = computed(() : ChartOptions<'scatter'> => {
    const aspectRatio = 1.75;

    if (tubeParams.value && amp.value) {
        return {
            animation: false,
            aspectRatio: aspectRatio,
            hover: { mode: 'index' },
            plugins: {
                title: {
                    display: true,
                    text: amp.value.name + ' Average Plate Characteristics'
                },
                legend: {
                    display: false,
                },
                tooltip: {
                    intersect: false,
                    callbacks: {
                        label: (item: TooltipItem<'scatter'>) => {
                            const itemLabel = item.dataset.label || '';
                            const Vp = item.parsed.x.toFixed(2);
                            const Ip = (item.parsed.y * 1000).toFixed(2);
                            const Vg = (item.raw as CharacteristicPoint).Vg?.toFixed(2);
                            return itemLabel + ' (Vp: ' + Vp + 'V, Ip: ' + Ip + 'mA' + (Vg !== undefined ? (', Vg: ' + Vg + 'V') : '') + ')';
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
                    max: amp.value.limits.maxVp0,
                    title: { display: true, text: 'Vp (V)' }
                },
                y: {
                    ticks: {
                        callback: (value: number | string, index: number, ticks: Tick[]) => {
                            // convert from A to mA
                            return ((value as number) * 1000).toFixed(1);
                        },
                        stepSize: amp.value.limits.maxIp / 10,
                    },
                    max: amp.value.limits.maxIp,
                    min: 0,
                    title: { display: true, text: 'Ip (mA)' }
                }
            },
        };
    } else {
        return {
            animation: false,
            aspectRatio: aspectRatio,
        };
    }
});

const outputHeadroomChartData = computed(() : ChartData<'scatter'> => {
    tubeParams.value;

    // need this so Vue "knows" chartData depends on these values
    amp.value?.topology;
    amp.value?.mode;
    amp.value?.Bplus;
    amp.value?.Iq;
    amp.value?.Vq;
    amp.value?.Vg;
    amp.value?.Vg2;
    amp.value?.biasMethod;
    amp.value?.loadType;
    amp.value?.Rp;
    amp.value?.Rk;
    amp.value?.cathodeBypass;
    amp.value?.Znext;
    amp.value?.ultralinearTap;
    amp.value?.inputHeadroom;
    amp.value?.model;

    if (amp.value) {
        let datasets : ChartDataset<'scatter'>[] = [];

        // // the V=0 line
        // datasets.push({
        //     showLine: true,
        //     pointStyle: false,
        //     borderColor: '#8080FF',
        //     backgroundColor: '#8080FF',
        //     borderWidth: 1,
        //     borderDash: [10, 10],
        //     fill: false,
        //     data: [{x: 0, y: 0}, {x: 2*Math.PI, y: 0}]
        // });

        const amplifiedSineWave = amp.value.graphAmplifiedSineWave();

        if (amp.value.topology === 'pp') {
            // both tubes
            datasets.push({
                label: 'Tube 1',
                showLine: true,
                pointStyle: false,
                borderColor: '#FF0000',
                backgroundColor: '#FF0000',
                borderWidth: 1,
                fill: false,
                data: amplifiedSineWave.map((value: OutputSample, index: number, array: OutputSample[]) => {
                    return {x: value.x, y: value.Vp! - amp.value!.Vq};
                })
            });

            datasets.push({
                label: 'Tube 2',
                showLine: true,
                pointStyle: false,
                borderColor: '#00FF00',
                backgroundColor: '#00FF00',
                borderWidth: 1,
                fill: false,
                data: amplifiedSineWave.map((value: OutputSample, index: number, array: OutputSample[]) => {
                    return {x: value.x, y: value.Vp_inv! - amp.value!.Vq};
                })
            });

            // the combined waveform
            datasets.push({
                label: 'Combined Output',
                showLine: true,
                pointStyle: false,
                borderColor: '#000000',
                backgroundColor: '#000000',
                borderWidth: 1,
                fill: false,
                data: amplifiedSineWave
            });
        } else {
            datasets.push({
                label: 'Output',
                showLine: true,
                pointStyle: false,
                borderColor: '#000000',
                backgroundColor: '#000000',
                borderWidth: 1,
                fill: false,
                data: amplifiedSineWave
            });
        }

        return { datasets: datasets };
        
    } else {
        return {
            datasets: []
        };
    }
});

const outputHeadroomChartOptions = computed(() : ChartOptions<'scatter'> => {
    tubeParams.value;

    // need this so Vue "knows" chartOptions depends on these values
    amp.value?.topology;
    amp.value?.mode;
    amp.value?.Bplus;
    amp.value?.Iq;
    amp.value?.Vq;
    amp.value?.Vg;
    amp.value?.Vg2;
    amp.value?.biasMethod;
    amp.value?.loadType;
    amp.value?.Rp;
    amp.value?.Rk;
    amp.value?.cathodeBypass;
    amp.value?.Znext;
    amp.value?.ultralinearTap;
    amp.value?.inputHeadroom;
    amp.value?.model;

    if (amp.value) {
        const [min, max] = amp.value.outputHeadroom();
        return {
//            animation: false,
            aspectRatio: 1.25,
            responsive: false,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom',
                    labels: {
                        boxWidth: 10
                    },
                },
                tooltip: {
                    enabled: false
                },
                title: {
                    display: true,
                    text: amp.value.outputVoltageRMS().toFixed(1) + ' V rms'
                }
            },
            scales: {
                x: {
                    display: false,
                    min: 0,
                    max: 2*Math.PI,
                },
                y: {
                    display: true,
                    position: 'left',
                    border: {dash: [10, 10]},
                    grid: {
                        color: (ctx) => { return (ctx.tick.value === 0 ? '#8080FF' : 'transparent') }
                    },
                    min: min,
                    max: max,
                    ticks: {
                        callback: (value: number | string, index: number, ticks: Tick[]) => {
                            if (value == min || value == max) {
                                return (value as number).toFixed(1) + ' V';
                            } else if (value == 0) {
                                return "";
                            } else {
                                return null;
                            }
                        },
                    }
                }
            }
        };
    } else {
        return {};
    }
});

</script>

<template>
    <div class="pl-4 col-12 chart-container">
        <Scatter id="tube-chart" :options="characteristicChartOptions" :data="characteristicChartData" />
    </div>
    <div class="pl-4 grid align-items-center">
        <div class="grid col-12 align-items-center">
            <div class="col-4 py-2">
                <div class="text-left">
                    <div class="text-left">
                        Tube
                        <Dropdown v-model="selectedTube" :options="tubes" optionLabel="name" optionValue="id"
                            placeholder="Select a Tube" class='w-full md:w-14rem' @update:modelValue="onSelectedTubeChange" />

                    </div>
                </div>
            </div>
            <div class="col-2 py-2">
                <div class="text-left">
                    <template v-if="selectedTube !== null && selectedModel !== null">
                        <a :href="tubeDatabase[selectedTube].datasheet">Datasheet</a>
                    </template>
                </div>
            </div>
            <div class="col-4 py-2">
                <div class="text-left">
                    Model
                    <Dropdown v-model="selectedModel" :options="models" optionLabel="name" optionValue="id"
                        placeholder="Select a Model" class="w-full md:w-14rem"/>
                </div>
            </div>
            <div class="col-2 py-2">
                <div class="text-left">
                    <template v-if="selectedTube !== null && selectedModel !== null">
                        <a :href="tubeDatabase[selectedTube].models[selectedModel].source">Source</a>
                    </template>
                </div>
            </div>
        </div>

        <template v-if="amp != null">
            <template v-if="amp.model">
                <div class="grid surface-ground col-12 align-items-center">
                    <div class="col-3 py-2">
                        <label v-tooltip="'A single-ended amplifier uses a single tube operating in class A, while a push-pull amplifier uses a pair of tubes operating in class A, class B, or class AB'">
                            Topology
                        </label>
                    </div>
                    <div class="col-3 py-2">
                        <div class="flex align-items-center">
                            <RadioButton v-model="amp.topology" inputId="single-ended" name="topology" value="se" :disabled="amp == null" />
                            <label for="single-ended" class="ml-2">Single-Ended</label>
                        </div>
                        <div class="flex align-items-center">
                            <RadioButton v-model="amp.topology" inputId="push-pull" name="topology" value="pp" :disabled="amp == null" />
                            <label for="push-pull" class="ml-2">Push-Pull</label>
                        </div>
                    </div>
                    <div v-if="amp.type === 'pentode' || amp.type === 'tetrode'" class="col-3 py-2">
                        <div>
                            <label>Operating Mode</label>
                        </div>
                    </div>
                    <div v-if="amp.type === 'pentode' || amp.type === 'tetrode'" class="col-3 py-2">
                        <div class="flex align-items-center">
                            <RadioButton v-model="amp.mode" inputId="pentode" name="mode" value="pentode" />
                            <label for="pentode" class="ml-2" v-tooltip="'The screen-grid is connected to a stable DC voltage (i.e. no signal appears on the screen-grid)'">
                                Pentode
                            </label>
                        </div>
                        <div class="flex align-items-center">
                            <RadioButton v-model="amp.mode" inputId="triode" name="mode" value="triode" />
                            <label for="triode" class="ml-2" v-tooltip="'The screen-grid is connected to the plate (i.e. 100% of the signal appears on the screen-grid)'">
                                Triode
                            </label>
                        </div>
                        <div class="flex align-items-center">
                            <RadioButton v-model="amp.mode" inputId="ultralinear" name="mode" value="ultralinear" />
                            <label for="ultralinear" class="ml-2" v-tooltip="'The screen-grid is connected to an appropriate tap on the primary winding of the output transformer (i.e. some percentage of the signal appears on the screen-grid)'">
                                Ultralinear
                            </label>
                        </div>
                    </div>
                </div>
            </template>

            <div class="grid col-12 align-items-center">
                <div class="col-3 py-2">
                    <label v-tooltip="'The DC voltage of the power supply at the plate load'">B+ (V)</label>
                </div>
                <div class="col-3 py-2">
                    <InputNumber v-model="amp.Bplus" :min=0 :maxFractionDigits=2 showButtons
                        :step="proportionalStep(amp.Bplus)" :disabled="amp == null" />
                </div>
                <template v-if="amp.model">
                    <div class="col-3 py-2">
                        <label v-tooltip="'The maximum possible power dissipated by the load'">Max Output Power</label>
                    </div>
                    <div class="col-3 py-2">
                        <div class="flex flex-column">
                            {{  amp.maxOutputPowerRMS()!.toFixed(2) + " W rms" }}
                        </div>
                    </div>
                </template>
            </div>

            <div class="grid surface-ground col-12 align-items-center border-y-1 border-400">
                <div class="col-3 py-2">
                    <label v-tooltip="'The stable, steady-state condition at which the amplifier operates when no input signal is present.'">
                        Quiescent Operating Point
                    </label>
                </div>
                <div class="col-3 py-2">
                    <label for="Vq" class="flex align-items-left">
                        Vq (V)
                    </label>
                    <div class="flex align-items-left">
                        <InputNumber v-model="amp.Vq" inputId="Vq" :min=0 :maxFractionDigits=1 
                            :step="proportionalStep(amp.Vq)" showButtons :disabled="amp == null || amp.loadType === 'reactive'"/>
                    </div>
                    <label for="Iq" class="flex align-items-left">
                        Iq (ma)
                    </label>
                    <div class="flex align-items-left">
                        <InputNumber v-model="Iq_ma" inputId="Iq" :min=0.001 :maxFractionDigits=2
                            :step="proportionalStep(Iq_ma!)" showButtons :disabled="amp == null" />
                    </div>
                </div>
                <template v-if="amp.model">
                    <div class="col-3 py-2">
                        <div class="flex flex-column align-items-left">
                            <label v-tooltip="'The DC voltage applied to the control grid'">Grid Bias (V)</label>
                            <div class="px-4">
                                <RadioButton v-model="amp.biasMethod" inputId="cathodeBias" value="cathode"
                                    :disabled="amp == null || amp.model === null" /> 
                                <label for="cathodeBias" v-tooltip="'The bias voltage is developed across a resistor connected between the cathode and ground (or a negative voltage supply)'">
                                    Cathode
                                </label>
                            </div>
                            <div class="px-4">
                                <RadioButton v-model="amp.biasMethod" inputId="fixedBias" value="fixed"
                                    :disabled="amp == null || amp.model === null" /> 
                                <label for="fixedBias" v-tooltip="'The bias voltage is set by a separate bias supply and resistor network, independent of the cathode current'">
                                    Fixed
                                </label>
                            </div>
                        </div>
                    </div>
                    <div class="col-3 py-2">
                        <InputNumber v-model="amp.Vg" :max=0 
                            :step="proportionalStep(amp.Vg!)" :maxFractionDigits=2 showButtons :disabled="amp == null || amp.model === null" />
                    </div>
                </template>                    
            </div>

            <div class="grid col-12 align-items-center">
                <div class="col-3 py-2">
                    <div class="flex flex-column align-items-left">
                        <label v-tooltip="'The resistance or impedence of the load connected to the plate'">Plate Load (Ω)</label>
                        <div class="px-4">
                            <RadioButton v-model="amp.loadType" inputId="resistiveLoad" value="resistive" :disabled="amp == null" />
                            <label for="resistiveLoad" v-tooltip="'The plate is connected to a resistor or other non-reactive load'">
                                Resistive
                            </label>
                        </div>
                        <div class="px-4">
                            <RadioButton v-model="amp.loadType" inputId="reactiveLoad" value="reactive" :disabled="amp == null" />
                            <label for="reactiveLoad" v-tooltip="'The plate is connected to an output transformer or other reactive load, and the load is the full plate-to-plate impedance of the primary winding'">
                                Reactive
                            </label>
                        </div>
                    </div>
                </div>
                <div class="col-3 py-2">
                    <InputNumber v-model="amp.Rp" :min=0 :step="proportionalStep(amp.Rp)" showButtons :disabled="amp == null" />
                </div>
                <template v-if="amp.model">
                    <div class="col-3 py-2">
                        <label v-tooltip="'The value of the cathode bias resistor'">Cathode Load (Ω)</label>
                        <div class="px-4">
                            <Checkbox v-model="amp.cathodeBypass" inputId="cathodeBypass" :binary="true" 
                                :disabled="amp == null || amp.model === null || amp.biasMethod !== 'cathode'" />
                            <label for="cathodeBypass" v-tooltip="'A capacitor is connected in parallel with the cathode resistor to allow AC signal to pass unimpeded'">
                                AC Bypass
                            </label>
                        </div>
                    </div>
                    <div class="col-3 py-2">
                        <InputNumber v-model="amp.Rk" :min=0 :step="proportionalStep(amp.Rk!)" :maxFractionDigits=0 showButtons
                            :disabled="amp == null || amp.model === null || amp.biasMethod !== 'cathode'" />
                    </div>
                </template>
            </div>

            <div v-if="amp.model && (amp.type === 'pentode' || amp.type === 'tetrode')" class="grid col-12 align-items-center surface-ground border-y-1 border-400">
                <div class="col-3 py-2">
                    <label v-tooltip="'The voltage at the screen or suppressor grid'">
                        Screen Voltage (V)
                    </label>
                </div>
                <div class="col-3 py-2">
                    <InputNumber v-model="amp.Vg2" :min=0 :maxFractionDigits=0 :step=1 showButtons 
                        :disabled="amp == null || amp.mode === 'triode'"/>
                </div>
                <div class="col-3 py-2">
                    <label v-tooltip="'The percentage of the signal which appears on the screen-grid'">
                        Ultra-linear tap (%)
                    </label>
                </div>
                <div class="col-3 py-2">
                    <InputNumber v-model="amp.ultralinearTap" :min=0 :max=100 :step=10 showButtons
                        :disabled="amp.mode !== 'ultralinear'" />
                </div>
            </div>

            <div v-if="amp.model && amp.loadType === 'resistive'" class="grid col-12 align-items-center surface-ground border-y-1 border-400">
                <div class="col-3 py-2">
                    <label v-tooltip="'The input impedance of the following amplifier stage'">
                        Next Stage Impedance (Ω)
                    </label>
                </div>
                <div class="col-3 py-2">
                    <InputNumber v-model="amp.Znext" :min=0 :step=1000 showButtons
                        :disabled="amp == null" />
                </div>
            </div>

            <div v-if="amp.model" class="grid col-12 align-items-center">
                <div class="col-3 py-2">
                    <label v-tooltip="'The maximum amplitude of the input signal'">
                        Peak Input Headroom (V)
                    </label>
                </div>
                <div class="col-3 py-2">
                    <div class="flex flex-column align-items-left">
                        <InputNumber v-model="amp.inputHeadroom" :maxFractionDigits=4 :min=0 :step=0.01 showButtons
                            :disabled="amp == null" />
                        <div class="py-2">{{ amp.inputHeadroom !== undefined ? (amp.inputHeadroom * 0.70710678118).toFixed(2) + ' V rms' : '' }} </div>
                    </div>
                </div>
                <div v-if="amp.inputHeadroom" class="col-6 py-2">
                    <div class="grid align-items-center">
                        <div class="col-4 py-2">
                            <label v-tooltip="'The voltage swing of the output signal'">
                                Output Headroom
                            </label>
                        </div>
                        <div v-if="amp.inputHeadroom" class="col-8 py-2">
                            <Scatter id="output-headroom-chart" :options="outputHeadroomChartOptions" :data="outputHeadroomChartData"  />
                        </div>
                        <div class="col-4 py-2">
                            <label v-tooltip="'The average power dissipated by the load'">
                                Average Output Power
                            </label>
                        </div>
                        <div class="col-8 py-2">
                            {{ amp.averageOutputPowerRMS().toFixed(2) + " W rms" }}
                        </div>
                        <div class="col-4 py-2">
                            <label v-tooltip="'The effective amplification factor'">
                                Effective μ
                            </label>
                        </div>
                        <div class="col-8 py-2">
                            {{ amp.effectiveAmplificationFactor().toFixed(0) }}
                        </div>
                    </div>  
                </div>

            </div>


        </template>
    </div>
</template>
