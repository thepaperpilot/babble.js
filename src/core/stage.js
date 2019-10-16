// imports
const PIXI = require('pixi.js')
window.PIXI = PIXI;
window.PIXI[ "default" ] = PIXI;
require('pixi-tween')
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
    Rectangle = PIXI.Rectangle,
    ticker = PIXI.ticker

/**
 * @class
 */
class Stage {

    /**
     * @param {string} element - the id of the DOM element to append the stage to
     * @param {Object} project - object with information on the assets, puppets, and stage settings
     * @param {Object[]} assets - array of assets
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
        
        this.lastFrame = Date.now()
        this.puppets = []
        this.listeners = []

        // Make the game fit the entire window
        this.renderer.view.style.position = "absolute";
        this.renderer.view.style.display = "block";

        // Load Assets
        if (loader.loading) {
            this.resize()
            if (callback) requestAnimationFrame(() => {callback(this)})
            this.gameLoop()
            return
        }
        let texturesToLoad = false
        Object.values(assets).forEach(asset => {
            if (!TextureCache[path.join(assetsPath, asset.location)]) {
                loader.add(path.join(assetsPath, asset.location))
                texturesToLoad = true
            }
        })
        let stage = this
        if (texturesToLoad) {
            loader.onComplete.once(function() { 
                stage.resize()
                if (callback) requestAnimationFrame(() => {callback(stage)})
                stage.gameLoop()
            })
            loader.load()
        } else {
            loader.load()
            stage.resize()
            if (callback) requestAnimationFrame(() => {callback(stage)})
            stage.gameLoop()
        }
    }

    registerPuppetListener(event, callback) {
        this.listeners.push({"event": event, "callback": callback})
        this.puppets.forEach(p => p.container.on(event, callback))
    }

    addAsset(id, asset, callback) {
        this.assets[id] = asset
        let date = Date.now()
        if (asset.type !== "bundle") {
            TextureCache[path.join(this.assetsPath, asset.location)] =
                Texture.fromImage(path.join(this.assetsPath, asset.location + "?random=" + date))
            BaseTextureCache[path.join(this.assetsPath, asset.location)] =
                BaseTextureCache[path.join(this.assetsPath, asset.location + "?random=" + date)]
            if (callback)
                TextureCache[path.join(this.assetsPath, asset.location)].baseTexture.on('loaded', callback)
        } else if (callback)
            callback()
    }

    reloadAssets(callback) {
        Object.values(this.assets).forEach(a => {
            TextureCache[path.join(this.assetsPath, a.location)] =
                Texture.fromImage(path.join(this.assetsPath, a.location))
        })
        let stage = this
        let onLoad = () => {
            if (!Object.values(BaseTextureCache).some(a => a.isLoading)) {
                callback(stage)
                ticker.shared.remove(onLoad)
            }
        }

        this.reloadPuppets()
        if (callback) {
            ticker.shared.add(onLoad)
        }
    }

    updateAsset(id) {
        let stage = this
        let callback = function(asset, sprite, layer, emote) {
            let parent = sprite.parent
            let index = parent.getChildIndex(sprite)
            let newAsset = stage.getAsset(asset, layer, emote)
            parent.removeChildAt(index)
            parent.addChildAt(newAsset, index)
        }
        this.puppets.forEach(p => p.applyToAsset(id, callback))
    }

    reloadPuppets() {
        this.puppets.forEach(p => this.setPuppet(p.id, this.createPuppet(p.puppet)))
    }

    reattach(element) {
        this.screen = document.getElementById(element)
        this.screen.appendChild(this.renderer.view)
        this.resize()
    }

    resize(e, width, height) {
        let rect = this.screen.getBoundingClientRect()
        this.bounds = {
            width: width || rect.width,
            height: height || rect.height
        }
        if (this.bounds.width !== this.renderer.screen.width ||
            this.bounds.height !== this.renderer.screen.height)
            this.renderer.resize(this.bounds.width, this.bounds.height)
        this.slotWidth = this.bounds.width / this.project.numCharacters
        if (this.slotWidth < 400) {
            this.puppetStage.scale.x = this.puppetStage.scale.y = this.slotWidth / 400
            this.slotWidth = 400
        } else this.puppetStage.scale.x = this.puppetStage.scale.y = 1

        this.puppets.forEach(p => p.updatePosition())
    }

    createPuppet(puppet) {
        return new Puppet(this, puppet, -1)
    }

    addPuppet(puppet, id) {
        let newPuppet = new Puppet(this, puppet, id)
        this.puppets.push(newPuppet)
        this.puppetStage.addChild(newPuppet.container)
        this.listeners.forEach(l => newPuppet.container.on(l.event, l.callback))
        newPuppet.updatePosition()
        return newPuppet
    }

    removePuppet(id) {
        const puppet = this.puppets.find(p => p.id == id)
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

    banishPuppets() {
        this.puppets.forEach(puppet => {
            if (puppet.target > this.project.numCharacters / 2) {
                puppet.target = this.project.numCharacters + 1
                puppet.facingLeft = false
                puppet.container.scale.x = this.project.puppetScale || 1
            } else {
                puppet.target = 0
                puppet.facingLeft = true
                puppet.container.scale.x = -1 * (this.project.puppetScale || 1)
            }
        })
    }

    getPuppet(id) {
        return this.puppets.find(p => p.id == id)
    }

    setPuppet(id, newPuppet) {
        let oldPuppet = this.getPuppet(id)
        newPuppet.changeEmote(oldPuppet.emote)
        newPuppet.id = newPuppet.container.id = oldPuppet.id
        newPuppet.position = oldPuppet.position
        newPuppet.target = oldPuppet.target
        newPuppet.facingLeft = oldPuppet.facingLeft
        newPuppet.babbling = oldPuppet.babbling
        this.listeners.forEach(l => newPuppet.container.on(l.event, l.callback))

        this.puppets[this.puppets.indexOf(oldPuppet)] = newPuppet
        this.puppetStage.removeChild(oldPuppet.container)
        this.puppetStage.addChild(newPuppet.container)
        this.resize()

        return newPuppet
    }

    getThumbnail() {
        this.renderer.render(this.stage)
        try {
            return trim(this.renderer.view).canvas.toDataURL().replace(/^data:image\/\w+;base64,/, "")
        } catch(e) {
            this.status.error("Failed to generate thumbnail", e)
            return null
        }
    }

    gameLoop() {
        let thisFrame = Date.now()
        let delta = thisFrame - this.lastFrame
        this.lastFrame = thisFrame

        requestAnimationFrame(this.gameLoop.bind(this))
        if (this.enabled) this.update(delta)
    }

    getAsset(container, asset) {
        let sprite
        if (this.assets[asset.id]) {
            let assetData = this.assets[asset.id]
            if (assetData.type === "animated") {
                let base = BaseTextureCache[path.join(this.assetsPath, assetData.location)]
                let textures = []
                let width = base.width / assetData.cols
                let height = base.height / assetData.rows
                for (let i = 0; i < assetData.numFrames; i++) {
                    if ((i % assetData.cols) * width + width > base.width || Math.floor(i / assetData.cols) * height + height > base.height) continue
                    let rect = new Rectangle((i % assetData.cols) * width, Math.floor(i / assetData.cols) * height, width, height)
                    textures.push(new Texture(base, rect))
                }
                sprite = new PIXI.extras.AnimatedSprite(textures)
                sprite.animationSpeed = 20 / assetData.delay
                sprite.play()
            } else sprite = new Sprite(TextureCache[path.join(this.assetsPath, assetData.location)])
        } else {
            sprite = new Sprite()
            if (this.status) this.status.log("Unable to load asset \"" + asset.id + "\"", 5, 2)
        }
        sprite.scale.set(asset.scaleX, asset.scaleY)
        sprite.anchor.set(.5, .5)
        container.addChild(sprite)
        container.x = asset.x
        container.y = asset.y
        container.rotation = asset.rotation
        container.asset = asset
        return container
    }

    update(delta) {
        this.puppets.forEach(puppet => {
            // Movement animations
            // I've tried to emulate what puppet pals does as closely as possible
            // But frankly it's difficult to tell
            if (puppet.target != puppet.position || puppet.movingAnim !== 0) {
                // Whether its going left or right
                if (puppet.direction === 0 && puppet.target != puppet.position)
                    puppet.direction = puppet.target > puppet.position ? 1 : -1
                // Update how far into the animation we are
                puppet.movingAnim += delta / (1000 * MOVE_DURATION)

                // We want to do a bit of animation when they arrive at the target slot. 
                //  in order to do that we have part of the animation (0 - .6) be for each slot
                //  and the rest (.6 - 1) only plays at the destination slot
                if (puppet.movingAnim >= 0.6 && puppet.movingAnim - delta / (1000 * MOVE_DURATION) < 0.6) {
                    // Once we pass .6, update our new slot position
                    puppet.position += puppet.direction
                    puppet.direction = 0
                    // If we're not at the final slot yet, reset the animation
                    if (puppet.position != puppet.target) puppet.movingAnim = 0
                    else puppet.container.scale.x = (puppet.facingLeft ? -1 : 1) * (this.project.puppetScale || 1)
                } else if (puppet.movingAnim >= 1) {
                    puppet.movingAnim = 0
                    puppet.container.scale.x = (puppet.facingLeft ? -1 : 1) * (this.project.puppetScale || 1)
                } else if (puppet.movingAnim < 0.6) puppet.container.scale.x = puppet.direction * (this.project.puppetScale || 1)

                // Scale in a sin formation such that it does 3 half circles per slot, plus 2 more at the end
                puppet.container.scale.y = (1 + Math.sin((1 + puppet.movingAnim * 5) * Math.PI) / 40) * (this.project.puppetScale || 1) 
                // Update y value so it doesn't leave the bottom of the screen while bouncing
                puppet.container.y = this.bounds.height / this.puppetStage.scale.y
                // Linearly move across the slot, unless we're in the (.6 - 1) part of the animation, and ensure we're off screen even when the puppets are large
                let interpolation = Math.min(1, puppet.movingAnim / 0.6)
                let pos = puppet.position % (this.project.numCharacters + 1)
                if (pos < 0) pos += this.project.numCharacters + 1
                let start = pos == 0 ?
                    puppet.direction === 1 ? - Math.abs(puppet.container.width) :                        // Starting on left edge of screen
                        this.project.numCharacters * this.slotWidth + Math.abs(puppet.container.width) : // Starting on right edge of screen
                    (pos - 0.5) * this.slotWidth                                                         // Ending on screen
                pos += puppet.direction
                if (pos < 0) pos += this.project.numCharacters + 1
                let end = pos <= 0 ? - Math.abs(puppet.container.width) :                            // Starting left of screen
                    pos >= this.project.numCharacters + 1 ? 
                    this.project.numCharacters * this.slotWidth + Math.abs(puppet.container.width) : // Starting right of screen
                    (pos - 0.5) * this.slotWidth                                                     // Ending on screen
                puppet.container.x = interpolation === 1 ? start : start + (end - start) * interpolation
            }
            if (puppet.babbling) {
                // Update how long each face part has been on display
                puppet.eyesAnim += delta
                puppet.mouthAnim += delta

                // Update eyes
                if (puppet.eyesAnim >= puppet.eyesDuration && (puppet.emote === '0' || !puppet.emotes[puppet.emote])) {
                    puppet.updateEyeBabble()
                }

                // Update mouth
                if (puppet.mouthAnim >= puppet.mouthDuration) {
                    puppet.updateMouthBabble()
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
                        puppet.deadbonesStartY = puppet.deadbonesTargetY
                        puppet.deadbonesStartRotation = puppet.deadbonesTargetRotation
                        puppet.head.forEach(a => {
                            a.y = a.asset.y + puppet.deadbonesStartY
                            a.rotation = a.asset.rotation + puppet.deadbonesStartRotation
                        })
                        puppet.deadbonesTargetY = 10 - Math.random() * 20
                        puppet.deadbonesTargetRotation = 0.1 - Math.random() * 0.2
                    } else {
                        puppet.deadbonesDuration = 0
                        puppet.head.forEach(a => {
                            a.y = a.asset.y + puppet.deadbonesTargetY
                            a.rotation = a.asset.rotation + puppet.deadbonesTargetRotation
                        })
                    }
                } else {
                    let percent = (puppet.deadbonesAnim / puppet.deadbonesDuration) * (puppet.deadbonesAnim / puppet.deadbonesDuration)
                    puppet.head.forEach(a => {
                        a.y = a.asset.y + puppet.deadbonesStartY + (puppet.deadbonesTargetY - puppet.deadbonesStartY) * percent
                        a.rotation = a.asset.rotation + puppet.deadbonesStartRotation + (puppet.deadbonesTargetRotation - puppet.deadbonesStartRotation) * percent
                    })
                }
            }
        })
        this.renderer.render(this.stage)
        PIXI.timerManager.update(delta / 1000)
        PIXI.tweenManager.update(delta / 1000)
    }
}

module.exports = Stage
