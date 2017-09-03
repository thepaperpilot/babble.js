# Cutscene

Cutscene Scripts:

- Each action is a new line, ending with either a comma or a semicolon
- Commas mean the next action gets immediately run, semicolons tell the cutscene to wait until this action is complete
- Each line has a command and its parameters, e.g. "move josh 1 5;"
- Some parameters are optional
 
Default commands:

- `add {name} {id} [position] [facingLeft] [emote]` - adds a puppet with the given name at the given position, assigns it the given id for later reference, and optionally overrides initial state
- `set {target} {name}` - changes the given puppet (using assigned ids) to a new puppet with the given name
- `remove {target}` - removes a given puppet from the stage
- `delay {duration}` - simply waits, should generally be used as a ";" action
- `move {target} {position}` - moves puppet to a new position
- `babble {target} [start/stop/toggle]` - makes a puppet start or stop babbling. Default is toggle
- `emote {target} [emote]` - makes a puppet switch to a given emote. Default is 'default'
- `jiggle {target}` - causes a given puppet to jiggle

Actions are defined in the cutscene's "actions" object. You can add functions to that object to add custom actions. The function will be passed a callback function to be called when the action is complete, as well as any parameters passed to the action. You can use `this` to access references to the stage and actors

### `new Cutscene(stage, script, actors, callback)`

- `stage` Stage - The stage this puppet will be attached to
- `script` string - The script for the cutscene
- `actors` Object - Dictionary of actors (e.g. each member is "name": Character)
	- `{name of character}` Puppet
- `callback` Function - Function to be called after cutscene finishes (either successfully or after an error)

## Methods

### `cutscene.start()`

Starts the cutscene
