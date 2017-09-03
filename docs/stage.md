# Stage

The stage is what controls the puppets, and uses PIXI to render them. It takes the following parameters

### `new Stage(element, project, assets, assetsPath[, callback][, status][, enabled=true])`

- `element` string - The id of the DOM element to append the stage to
- `project` Object
	- `numCharacters` Number - The number of slots for characters
	- `assets` Object[] - Array of lists of assets
		- `name` string - Name of the asset list
		- `location` string - Path to JSON file for the asset list, relative to `assetsPath`
	- `puppetScale` Number - (optional) A multiplier to scale puppets by
- `assets` assets - array of assets
- `assetsPath` string - Path to the assets folder
- `callback` Function - (optional) Function to be called after assets are loaded
- `status` Object - (optional) Object with functions for logging stuff
- `enabled` boolean - (optional, default=true) Whether or not it should start updating from the start

Asset lists are JSON files with a single JSON object where each member is an identifier for the asset, pointing to an object with the following properties:

- `name` string - Name of the asset
- `location` string - Location of the image file, relative to `assetsPath`

> example asset list file:
>
> ```
> {
>   "94370077": {
>     "name": "brow_excited",
>     "location": "eyebrows/94370077.png"
>   },
>   "-1478408941": {
>     "name": "brow_normal",
>     "location": "eyebrows/-1478408941.png"
>   },
>   "-1370165314": {
>     "name": "brow_confused",
>     "location": "eyebrows/-1370165314.png"
>   },
>   "-894109551": {
>     "name": "brow_sad",
>     "location": "eyebrows/-894109551.png"
>   },
>   "-1624236206": {
>     "name": "brow_angry",
>     "location": "eyebrows/-1624236206.png"
>   }
> }
> ```

## Methods

### `stage.registerPuppetListener(event, callback)`

- `event` string - The event to listen to
- `callback` Function - Function to call whenever the event is triggered

Registers an event listener to every puppet's container. Used for adding actions whenever you e.g. click on a puppet

### `stage.addAsset(asset)`

- `asset` Object - The asset to add

Loads an asset so it can be used by puppets. It will NOT automatically reload any puppets using this asset

### `stage.reloadAssets(callback)`

- `callback` Function - Function to be called after done reloading all the assets

Purge all the loaded assets and reload them from scratch

### `stage.reloadPuppets()`

Reconstructs all puppets. Used for if you've changed (or reloaded) any assets and you need to update the puppets

### `stage.reattach(element)`

- `element` string - The id of the DOM element to append the stage to

Moves the stage to a new place in the DOM

### `stage.resize(e, width, height)`

- `e` ignored
- `width` Number - (optional) new width of the stage, defaults to parent's width
- `height` Number - (optional) new height of the stage, defaults to parent's height

Changes the size of the stage and updates all puppets' locations

### `stage.createPuppet(puppet)`

- `puppet` Object

Takes the options object for a puppet and returns the created puppet, attached to this stage and with id `-1`

### `stage.addPuppet(puppet, id)`

- `puppet` Object - The options object for the puppet to add
- `id` Number - UUID to refer to this puppet later

Creates a puppet attached to this stage and with the given id, and then adds it to the stage. Returns the created puppet. 

### `stage.removePuppet(id)`

- `id` Number - UUID of the puppet to remove

Removes a puppet from the stage

### `stage.clearPuppets()`

Removes all puppets from the stage

### `stage.getPuppet(id)`

- `id` Number - UUID of the puppet to get

Returns the puppet with the given id

### `stage.setPuppet(id, newPuppet)`

- `id` Number - UUID of the puppet to set
- `newPuppet` Puppet - Puppet to change into

Takes an existing puppet and replaces them with a new one, while maintaining position, animation status, etc.

### `stage.getThumbnail()`

Returns a data URL of an image of the current stage, automatically trimmed. Returns `null` if unable to create thumbnail (e.g. if the stage is empty)

### `stage.update(delta)`

- `delta` Number - The number of seconds that've passed

Updates the stage. Note if `stage.enabled` is true it will automatically be updated every animation frame
