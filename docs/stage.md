# Stage

The stage is what controls the puppets, and uses PIXI to render them. It takes the following parameters

### `new Stage(element, project, assets, assetsPath[, callback][, status][, enabled=true])`

- `element` string - The id of the DOM element to append the stage to
- `project` Object
	- `numCharacters` Number - The number of slots for characters
	- `puppetScale` Number - (optional) A multiplier to scale puppets by
- `assets` Object{} - Dictionary of assets
- `assetsPath` string - Path to the assets folder
- `callback` Function - (optional) Function to be called after assets are loaded
- `status` Object - (optional) Object with functions for logging stuff
- `enabled` boolean - (optional, default=true) Whether or not it should start updating from the start

Different types of assets may require different fields, but they'll all need the following:

- `name` string - Name of the asset
- `location` string - Location of the image file, relative to `assetsPath`
- `type` string - The type of asset, e.g. "sprite" or "animated"

> example asset list file:
>
> ```
> "165e1af4-93ac-4566-a5eb-bddb4fbcd16c:0": {
>     "type": "sprite",
>     "name": "Rawb_no",
>     "location": "165e1af4-93ac-4566-a5eb-bddb4fbcd16c/0.png"
> },
> "165e1af4-93ac-4566-a5eb-bddb4fbcd16c:1": {
>     "type": "animated",
>     "name": "O7GAtbK",
>     "rows": 12,
>     "cols": 12,
>     "numFrames": 141,
>     "delay": 40,
>     "location": "165e1af4-93ac-4566-a5eb-bddb4fbcd16c/1.png"
> },
> "165e1af4-93ac-4566-a5eb-bddb4fbcd16c:2": {
>     "type": "animated",
>     "name": "1",
>     "rows": 4,
>     "cols": 4,
>     "numFrames": 16,
>     "delay": 100,
>     "location": "165e1af4-93ac-4566-a5eb-bddb4fbcd16c/2.png"
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
