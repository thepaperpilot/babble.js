# Puppet

### `new Puppet(stage, puppet, id)`

- `stage` Stage - The stage this puppet will be attached to
- `puppet` Object
	- `deadbonesStyle` boolean - Whether or not the puppet will bobble their head whilst babbling
	- `position` Number - Initial slot to place the puppet at
	- `facingLeft` boolean - Whether or not the puppet is initially looking left (if false, he looks right initially)
	- `emote` string - The initial emote of the puppet
	- `body` Object[] - Array of assets to construct the puppet's body layer out of
		- `tab` string - The asset list to look in
		- `hash` string - The name of the asset
		- `x` Number - The x coordinate to position the asset at
		- `y` Number - The y coordinate to position the asset at
		- `rotation` Number - How much to rotate the asset
		- `scaleX` Number - Modifier for how much to scale the puppet in the x axis
		- `scaleY` Number - Modifier for how much to scale the puppet in the y axis
	- `head` Object[] - Array of assets to construct the puppet's head layer out of
	- `hat` Object[] - Array of assets to construct the puppet's hat layer out of
	- `props` Object[] - Array of assets to construct the puppet's props layer out of
	- `mouths` string[] - Array of emotes to rotate mouths between whilst babbling
	- `eyes` string[] - Array of emotes to rotate eyes between whilst babbling
	- `emotes` Object - Object where each member is a different emote the puppet has. Must have at least "default"
		- `default` Object
			- `enabled` boolean - Whether or not this emote is selectable
			- `mouth` Object[] - Array of assets to construct this emote's mouth layer out of
			- `eyes` Object[] - Array of assets to construct this emote's eyes layer out of
- `id` Number - UUID to refer to this puppet on the stage later

## Methods

### `puppet.changeEmote(emote)`

- `emote` string - Emote to change to

Changes the puppet's current emote

### `puppet.moveLeft()`

Moves the puppet left if its currently facing left. Otherwise, makes the puppet face left

### `puppet.moveRight()`

Moves the puppet right if its currently facing right. Otherwise, makes the puppet face right

### `puppet.setBabbling(babble)`

- `babble` boolean - What to set babbling to

Changes whether or not the puppet is currently babbling

### `puppet.jiggle()`

Animates the puppet so it does a kind of jump

### `puppet.addEmote(emote)`

- `emote` Object - Emote to add

Adds an emote to the puppet

### `puppet.applyToAsset(asset, callback)`

- `asset` Object
	- `tab` string - Asset list to search for
	- `hash` string - Asset name to search for
- `callback` Function - Function to call upon each asset found

Looks for any assets with a given name from a given list, and calls a function on each
