// imports
const PIXI = require('pixi.js')
window.PIXI = PIXI;
window.PIXI[ "default" ] = PIXI;
const timer = require('pixi-timer')
const Puppet = require('./puppet')
const path = require('path')
const trim = require('./../util/trimCanvas')

// Constants
const MOVE_DURATION = 0.75 // in seconds

// Aliases
let BaseTextureCache = PIXI.utils.BaseTextureCache,
    Container = PIXI.Container,
    Sprite = PIXI.Sprite,
    Texture = PIXI.Texture,
    TextureCache = PIXI.utils.TextureCache,
    autoDetectRenderer = PIXI.autoDetectRenderer,
    loader = PIXI.loader,
    ticker = PIXI.ticker

/**
 * @class
 */
class Stage {

    /**
     * @param {string} element - the id of the DOM element to append the stage to
     * @param {Object} project - object with information on the assets, puppets, and stage settings
     * @param {Object[][]} assets - array of assets
     * @param {string} assetsPath - path to the assets folder
     * @param {requestCallback} callback - function to be called after assets are loaded
     * @param {Object} [status] - object for logging stuff
     * @param {boolean} [enabled=true] - whether or not it should start updating from the start
     */
    constructor(element, project, assets, assetsPath, callback, status, enabled) {
        this.project = project
        this.assets = assets
        this.assetsPath = assetsPath
        this.status = status
        this.MOVE_DURATION = MOVE_DURATION
        this.enabled = enabled === undefined ? true : enabled

        // Create some basic objects
        this.stage = new Container()
        this.puppetStage = new Container()
        this.stage.addChild(this.puppetStage)
        this.renderer = autoDetectRenderer(1, 1, {transparent: true})
        this.screen = document.getElementById(element)
        this.screen.appendChild(this.renderer.view)
        
        this.lastFrame = new Date()
        this.puppets = []
        this.listeners = []

        // Make the game fit the entire window
        this.renderer.view.style.position = "absolute";
        this.renderer.view.style.display = "block";

        // Load Assets
        let texturesToLoad = false
        for (let i = 0; i < project.assets.length; i++) {
            let tab = assets[project.assets[i].name]
            let keys = Object.keys(tab)
            for (let j = 0; j < keys.length; j++) {
                if (!TextureCache[path.join(assetsPath, tab[keys[j]].location)]) {
                    loader.add(path.join(assetsPath, tab[keys[j]].location))
                    texturesToLoad = true
                }
            }
        }
        let stage = this
        if (texturesToLoad) {
            loader.onComplete.once(function() { 
                stage.resize()
                if (callback) callback(stage)
                stage.gameLoop()
            })
            loader.load()
        } else {
            loader.load()
            stage.resize()
            if (callback) callback(stage)
            stage.gameLoop()
        }
    }

    registerPuppetListener(event, callback) {
        this.listeners.push({"event": event, "callback": callback})
        for (let i = 0; i < this.puppets.length; i++)
            this.puppets[i].container.on(event, callback)
    }

    addAsset(asset) {
        if (!this.assets[asset.tab])
            this.assets[asset.tab] = {}
        this.assets[asset.tab][asset.hash] = {"name": asset.name, "location": path.join(asset.tab, asset.hash + '.png')}
        TextureCache[path.join(this.assetsPath, this.assets[asset.tab][asset.hash].location)] = Texture.fromImage(path.join(this.assetsPath, this.assets[asset.tab][asset.hash].location))
    }

    reloadAssets(callback) {
        let assets = Object.keys(TextureCache)
        for (let i = 0; i < assets.length; i++) {
            TextureCache[assets[i]].destroy(true)
        }

        // Load Assets
        for (let i = 0; i < this.project.assets.length; i++) {
            let tab = this.assets[this.project.assets[i].name]
            let keys = Object.keys(tab)
            for (let j = 0; j < keys.length; j++) {
                if (!TextureCache[path.join(this.assetsPath, tab[keys[j]].location)]) {
                    TextureCache[path.join(this.assetsPath, tab[keys[j]].location)] = Texture.fromImage(path.join(this.assetsPath, tab[keys[j]].location))
                }
            }
        }
        let stage = this
        let onLoad = () => {
            let done = true
            let assets = Object.keys(BaseTextureCache)
            for (let i = 0; i < assets.length; i++)
                if (BaseTextureCache[assets[i]].isLoading)
                    done = false
            if (done) {
                callback(stage)
                ticker.shared.remove(onLoad)
            }
        }

        this.reloadPuppets()
        if (callback) {
            ticker.shared.add(onLoad)
        }
    }

    reloadPuppets() {
        for (let i = 0; i < this.puppets.length; i++)
            this.setPuppet(this.puppets[i].id, this.createPuppet(this.puppets[i].container.puppet))
    }

    reattach(element) {
        this.screen = document.getElementById(element)
        this.screen.appendChild(this.renderer.view)
        this.resize()
    }

    resize(e, width, height) {
        this.bounds = {
            width: width || this.screen.clientWidth,
            height: height || this.screen.clientHeight
        }
        this.renderer.resize(this.bounds.width, this.bounds.height)
        this.slotWidth = this.bounds.width / this.project.numCharacters
        if (this.slotWidth < 400) {
            this.puppetStage.scale.x = this.puppetStage.scale.y = this.slotWidth / 400
            this.slotWidth = 400
        } else this.puppetStage.scale.x = this.puppetStage.scale.y = 1
        for (let i = 0; i < this.puppets.length; i++) {
            let puppet = this.puppets[i]
            if (puppet.position > this.project.numCharacters + 1 || puppet.target > this.project.numCharacters + 1) {
                puppet.position = puppet.target = this.project.numCharacters + 1
                puppet.movingAnim = 0
            }
            puppet.container.scale.x = puppet.container.scale.y = (this.project.puppetScale || 1) 
            puppet.container.scale.x *= puppet.facingLeft ? -1 : 1
            puppet.container.y = this.bounds.height / this.puppetStage.scale.y
            puppet.container.x = (puppet.position - 0.5) * this.slotWidth
        }
    }

    createPuppet(puppet) {
        return new Puppet(this, puppet, -1)
    }

    addPuppet(puppet, id) {
        let newPuppet = new Puppet(this, puppet, id)
        this.puppets.push(newPuppet)
        this.puppetStage.addChild(newPuppet.container)
        for (let i = 0; i < this.listeners.length; i++)
            newPuppet.container.on(this.listeners[i].event, this.listeners[i].callback)
        newPuppet.container.y = this.bounds.height / this.puppetStage.scale.y
        newPuppet.container.x = (newPuppet.position - 0.5) * this.slotWidth
        return newPuppet
    }

    removePuppet(id) {
        let puppet
        for (let i = 0; i < this.puppets.length; i++)
            if (this.puppets[i].id == id) {
                puppet = this.puppets[i]
                break
            }
        if (puppet) {
            this.puppets.splice(this.puppets.indexOf(puppet), 1)
            this.puppetStage.removeChild(puppet.container)
        }
    }

    clearPuppets() {
        while (this.puppets.length !== 0) {
            this.puppetStage.removeChild(this.puppets[0].container)
            this.puppets.splice(0, 1)
        }
    }

    getPuppet(id) {
        for (let i = 0; i < this.puppets.length; i++)
            if (this.puppets[i].id == id)
                return this.puppets[i]
    }

    setPuppet(id, newPuppet) {
        let oldPuppet = this.getPuppet(id)
        newPuppet.changeEmote(oldPuppet.emote)
        newPuppet.id = oldPuppet.id
        newPuppet.position = oldPuppet.position
        newPuppet.target = oldPuppet.target
        newPuppet.facingLeft = oldPuppet.facingLeft
        newPuppet.container.scale.x = (newPuppet.facingLeft ? -1 : 1) * (this.project.puppetScale || 1) 

        for (let i = 0; i < this.listeners.length; i++)
            newPuppet.container.on(this.listeners[i].event, this.listeners[i].callback)
        newPuppet.container.y = this.bounds.height / this.puppetStage.scale.y
        newPuppet.container.x = (newPuppet.position - 0.5) * this.slotWidth

        this.puppets[this.puppets.indexOf(oldPuppet)] = newPuppet
        this.puppetStage.removeChild(oldPuppet.container)
        this.puppetStage.addChild(newPuppet.container)
        this.resize()
    }

    getThumbnail() {
        this.renderer.render(this.stage)
        try {
            return trim(this.renderer.plugins.extract.canvas(this.stage)).canvas.toDataURL().replace(/^data:image\/\w+;base64,/, "")
        } catch(e) {
            this.status.error("Failed to generate thumbnail", e)
            return null
        }
    }

    gameLoop() {
        let thisFrame = new Date()
        let delta = thisFrame - this.lastFrame
        this.lastFrame = thisFrame

        requestAnimationFrame(this.gameLoop.bind(this))
        if (this.enabled) this.update(delta)
    }

    getAsset(asset, layer, emote) {
        let sprite
        if (this.assets[asset.tab] && this.assets[asset.tab][asset.hash]) {
            sprite = new Sprite(TextureCache[path.join(this.assetsPath, this.assets[asset.tab][asset.hash].location)])
        } else {
            sprite = new Sprite()
            if (this.status) this.status.log("Unable to load asset \"" + asset.tab + ":" + asset.hash + "\"", 5, 2)
        }
        sprite.anchor.set(0.5)
        sprite.x = asset.x
        sprite.y = asset.y
        sprite.rotation = asset.rotation
        sprite.scale.x = asset.scaleX
        sprite.scale.y = asset.scaleY
        sprite.asset = asset
        sprite.layer = layer
        sprite.emote = emote
        return sprite
    }

    update(delta) {
        for (let i = 0; i < this.puppets.length; i++) {
            let puppet = this.puppets[i]
            // Movement animations
            // I've tried to emulate what puppet pals does as closely as possible
            // But frankly it's difficult to tell
            if (puppet.target != puppet.position || puppet.movingAnim !== 0) {
                // Whether its going left or right
                let direction = puppet.target > puppet.position ? 1 : -1
                // Update how far into the animation we are
                puppet.movingAnim += delta / (1000 * MOVE_DURATION)

                // We want to do a bit of animation when they arrive at the target slot. 
                //  in order to do that we have part of the animation (0 - .6) be for each slot
                //  and the rest (.6 - 1) only plays at the destination slot
                if (puppet.movingAnim >= 0.6 && puppet.movingAnim - delta / (1000 * MOVE_DURATION) < 0.6) {
                    // Once we pass .6, update our new slot position
                    puppet.position += direction
                    // If we're not at the final slot yet, reset the animation
                    if (puppet.position != puppet.target) puppet.movingAnim = 0

                } else if (puppet.movingAnim >= 1) puppet.movingAnim = 0

                // Scale in a sin formation such that it does 3 half circles per slot, plus 2 more at the end
                puppet.container.scale.y = (1 + Math.sin((1 + puppet.movingAnim * 5) * Math.PI) / 40) * (this.project.puppetScale || 1) 
                // Update y value so it doesn't leave the bottom of the screen while bouncing
                puppet.container.y = this.bounds.height / this.puppetStage.scale.y
                // Linearly move across the slot, unless we're in the (.6 - 1) part of the animation
                puppet.container.x = (puppet.position + direction * (puppet.movingAnim >= 0.6 ? 0 : puppet.movingAnim / 0.6) - 0.5) * this.slotWidth

                // Wrap Edges
                if (puppet.target > this.project.numCharacters + 1 && puppet.position >= this.project.numCharacters + 1 && puppet.movingAnim > 0) {
                    puppet.container.x -= (this.project.numCharacters + 1) * this.slotWidth
                    puppet.position = 0
                    puppet.target -= this.project.numCharacters + 1
                }
                if (puppet.target < 0 && puppet.position <= 0 && puppet.movingAnim > 0) {
                    puppet.container.x += (this.project.numCharacters + 1) * this.slotWidth
                    puppet.position = this.project.numCharacters + 1
                    puppet.target += this.project.numCharacters + 1
                }
            }
            if (puppet.babbling) {
                // Update how long each face part has been on display
                puppet.eyesAnim += delta
                puppet.mouthAnim += delta

                // Update eyes
                if (puppet.eyesAnim >= puppet.eyesDuration && puppet.eyes.length && (puppet.emote === 'default' || !puppet.emotes[puppet.emote])) {
                    if (puppet.emotes[puppet.emote]) puppet.emotes[puppet.emote].eyes.visible = false
                    puppet.emotes['default'].eyes.visible = false
                    for (let j = 0; j < puppet.eyes.length; j++) {
                        if (puppet.emotes[puppet.eyes[j]]) puppet.emotes[puppet.eyes[j]].eyes.visible = false
                    }
                    let eyes = puppet.eyes[Math.floor(Math.random() * puppet.eyes.length)]
                    puppet.emotes[puppet.emotes[eyes] ? eyes : 'default'].eyes.visible = true
                    puppet.eyesAnim = 0
                    puppet.eyesDuration = (0.1 + Math.random()) * puppet.eyeBabbleDuration
                }

                // Update mouth
                if (puppet.mouthAnim >= puppet.mouthDuration && puppet.mouths.length) {
                    if (puppet.emotes[puppet.emote]) puppet.emotes[puppet.emote].mouth.visible = false
                    puppet.emotes['default'].mouth.visible = false
                    for (let j = 0; j < puppet.mouths.length; j++) {
                        if (puppet.emotes[puppet.mouths[j]]) puppet.emotes[puppet.mouths[j]].mouth.visible = false
                    }
                    let mouth = puppet.mouths[Math.floor(Math.random() * puppet.mouths.length)]
                    puppet.emotes[puppet.emotes[mouth] ? mouth : 'default'].mouth.visible = true
                    puppet.mouthAnim = 0
                    puppet.mouthDuration = (0.1 + Math.random()) * puppet.mouthBabbleDuration
                }
            }
            // Update DeadbonesStyle Babbling
            // I'm not sure what Puppet Pals does, but I'm pretty sure this isn't it
            // But I think this looks "close enough", and probably the best I'm going
            // to get without Rob actually telling people how Puppet Pals does it
            if (puppet.deadbonesStyle && (puppet.babbling || puppet.deadbonesDuration !== 0)) {
                puppet.deadbonesAnim += delta
                if (puppet.deadbonesAnim >= puppet.deadbonesDuration) {
                    puppet.deadbonesAnim = 0
                    if (puppet.babbling) {
                        puppet.deadbonesDuration = 100 + Math.random() * 200
                        puppet.deadbonesStartY = puppet.head.y = puppet.deadbonesTargetY
                        puppet.deadbonesStartRotation = puppet.head.rotation = puppet.deadbonesTargetRotation
                        puppet.deadbonesTargetY = Math.random() * - 20 - puppet.headBase.height / 2
                        puppet.deadbonesTargetRotation = 0.1 - Math.random() * 0.2
                    } else {
                        puppet.deadbonesDuration = 0
                        puppet.head.y = puppet.deadbonesTargetY
                        puppet.head.rotation = puppet.deadbonesTargetRotation
                    }
                } else {
                    let percent = (puppet.deadbonesAnim / puppet.deadbonesDuration) * (puppet.deadbonesAnim / puppet.deadbonesDuration)
                    puppet.head.y = puppet.deadbonesStartY + (puppet.deadbonesTargetY - puppet.deadbonesStartY) * percent
                    puppet.head.rotation = puppet.deadbonesStartRotation + (puppet.deadbonesTargetRotation - puppet.deadbonesStartRotation) * percent
                }
            }
        }
        this.renderer.render(this.stage)
        PIXI.timerManager.update(delta / 1000)
    }
}

module.exports = Stage
