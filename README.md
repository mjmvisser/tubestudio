# tubestudio

This project displays the characteristic curves of vacuum tubes used
for audio amplification and plots load lines. It supports single-ended 
and push-pull topologies, supports multiple mathematical models, and 
allows you to independently adjust almost all parameters (e.g. B+, 
load, operating point voltage and amperage, grid bias voltage or 
cathode load). It also plots a simulation of an ideal sine wave
under amplification and calculates power dissipation.

You can access the tool here: https://mjmvisser.github.io/tubestudio

Adding new tubes is pretty straightforward – take a look at src/tubeDatabase.ts. 

I also wrote a simple regex parser to help extract tube model parameters
from SPICE models. You can run it like this:

```$ cat some_model.inc | npm run parse-spice```

This will output a chunk of JSON, which corresponds to the "models" section of
a tube in tubeDatabase.ts. You still need to fill in the rest of the tube parameters 
from the datasheet yourself. YMMV, it only works on a few models and it's *very*
particular about formatting.