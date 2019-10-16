// imports
const PIXI = require('pixi.js')

// Aliases
let Container = PIXI.Container

/**
 * @class
 */
class Puppet {

    // Give it a layer and what it inherited, and it'll return
    // what the layer's children will inherit
    static getInherit(layer, inherit) {
        return Object.assign((({ head, emote, emoteLayer }) =>
            ({ head, emote, emoteLayer }))(layer), inherit)
    }

    // If you pass this function an assets object, a root layer, and a layer handler
    // it'll run through every child of that layer recursively and run that
    // layer handler on every layer. Handles asset bundles and ignores
    // recursive asset bundles
    // If you ever want it to stop after handling a specific layer, just have
    // the layer handler return true when it should stop
    // Note this is only for working on layer data, not layers on the Puppet container
    static handleLayer(assets, layer, handleLayer, bundles = []) {
        if (handleLayer(layer, bundles))
            return true
        if (layer.children)
            return layer.children.find(l => Puppet.handleLayer(assets, l, handleLayer, bundles))
        if (layer.id in assets && assets[layer.id].type === 'bundle' && !bundles.includes(layer.id))
            return assets[layer.id].layers.children.find(l => Puppet.handleLayer(assets, l, handleLayer, [...bundles, layer.id]))
    }

    static createTween(layer, container) {
        let tween = PIXI.tweenManager.createTween(container)
        const easing = layer.easing in PIXI.tween.Easing ? layer.easing : 'linear'
        tween.easing = PIXI.tween.Easing[easing]()
        tween.time = layer.duration || 1000
        tween.delay = layer.delay || 0
        switch (layer.animation) {
        case 'FADE_ZOOM':
            container.alpha = 0
            container.scale.x = 1.5
            container.scale.y = 1.5
            tween.from({
                alpha: 0,
                scale: { x: 1.5, y: 1.5 }
            })
            tween.to({
                alpha: 1,
                scale: { x: 1, y: 1 }
            })
            break
        case 'FADE':
            container.alpha = 0
            tween.from({
                alpha: 0
            })
            tween.to({
                alpha: 1
            })
            break
        default:
            return container
        }
        tween.start()
    }

    /**
     * @param {Stage} stage - the stage this puppet will be attached to
     * @param {Object} puppet - object with all the data to construct the puppet
     * @param {number} id - UUID to refer to this puppet later
     */
    constructor(stage, puppet, id) {
        // Init Variables
        this.babbling = false
        this.puppet = puppet
        this.stage = stage
        this.id = id
        this.container = new Container()
        this.position = this.target = puppet.position
        this.facingLeft = puppet.facingLeft
        this.deadbonesStyle = puppet.deadbonesStyle
        this.movingAnim = this.eyesAnim = this.mouthAnim = this.deadbonesAnim = 0
        this.eyesDuration = this.mouthDuration = this.deadbonesDuration = 0
        this.deadbonesTargetY = this.deadbonesStartY = 0
        this.deadbonesTargetRotation = this.deadbonesStartRotation = 0
        this.eyeBabbleDuration = puppet.eyeBabbleDuration || 2000
        this.mouthBabbleDuration = puppet.mouthBabbleDuration || 270
        this.direction = 0
        this.head = []
        this.emotes = { }

        // Construct Puppet
        this.container.addChild(this.createLayer(puppet.layers))

        // Finish Setup
        this.changeEmote(puppet.emote)

        // Place Puppet on Stage
        this.container.interactive = true
        this.container.puppet = this
        this.container.id = id
        this.container.y = stage.screen.clientHeight / stage.puppetStage.scale.y
        this.container.x = (this.position - 0.5) * stage.slotWidth
        this.container.scale.x = this.container.scale.y =
            (stage.project.puppetScale || 1) 
        this.container.scale.x *= this.facingLeft ? -1 : 1
    }

    createLayer(layer, inherit = {}) {
        const container = new Container()
        Object.keys(layer).forEach(k => {if (!(k in container)) container[k] = layer[k]})
        Object.keys(inherit).forEach(k => inherit[k] == null && delete inherit[k])
        Object.keys(inherit).forEach(k => {if (!(k in container)) container[k] = inherit[k]})

        if (layer.head != null) {
            if (inherit.head == null) {
                this.head.push(container)
            } else if (this.stage.status) {
                this.stage.status.warn(`[${this.puppet.name}] Attempting to make layer '${layer.name}' a head layer but is already inside one. Ignoring...`)
            }
        }

        // Check if we're trying to add an emote that already exists
        if (inherit.emote == null && layer.emote != null && layer.emote in this.emotes) {
            if (this.stage.status)
                this.stage.status.warn(`[${this.puppet.name}] Attempting to create emote '${layer.name}' (${layer.emote}) but emote '${this.emotes[layer.emote].name}' (${layer.emote}) already exists. Ignoring...`)
        // Otherwise, check if we're trying to add an emote or are in an emote
        } else if (layer.emote != null || inherit.emote != null) {
            // If we're the first layer with an emote...
            if (inherit.emote == null) {
                this.emotes[layer.emote] = {
                    name: layer.name,
                    base: [],
                    eyes: [],
                    mouth: []
                }

                // And add us to that emote's right emoteLayer
                this.emotes[layer.emote][layer.emoteLayer ? layer.emoteLayer : 'base'].push(container)

                if (this.stage.status)
                    this.stage.status.info(`[${this.puppet.name}] Creating emote '${layer.name}' (${layer.emote})`)
            }

            // If they told us to be a specific emote, but we're already inside an emote, send a warning
            if (this.stage.status && layer.emote != null && inherit.emote != null) {
                this.stage.status.warn(`[${this.puppet.name}] Attempting to place emote '${layer.name}' (${layer.emote}) inside emote '${this.emotes[inherit.emote].name}' (${inherit.emote}). Ignoring...`)
            }

            // If we're not the first layer with a specific emote, and specify an emote Layer...
            if (layer.emote == null && layer.emoteLayer != null) {
                // check if we're already inside an emoteLayer. If we aren't, add ourselves to that emoteLayer
                // If we already are in one, send a warning
                if (inherit.emoteLayer == null) {
                    this.emotes[inherit.emote][layer.emoteLayer].push(container)
                } else if (this.stage.status) {
                    this.stage.status.warn(`[${this.puppet.name}] Attempting to place a${layer.emoteLayer === 'mouth' ? ' mouth' : 'n eyes'} layer '${layer.name}' inside a${inherit.emoteLayer === 'mouth' ? ' mouth' : 'n eyes'}. Ignoring...`)
                }
            }
        }

        if (layer.children || (layer.id in this.stage.assets && this.stage.assets[layer.id].type === 'bundle')) {
            if (!layer.children) {
                if (inherit.bundles != null && inherit.bundles.includes(layer.id)) {
                    // TODO would people be interested in allowing recursion up to N levels?
                    if (this.stage.status)
                        this.stage.status.warn(`[${this.puppet.name}] Attempting to add recursive asset bundle. Skipping recursion...`)
                    return container
                }
                if (!inherit.bundles)
                    inherit.bundles = []
                inherit.bundles.push(layer.id)
            }

            if (layer.scaleX != null || layer.scaleY != null) {
                container.scale.set(layer.scaleX, layer.scaleY)
            }

            if (layer.x != null || layer.x != null) {
                container.position.set(layer.x, layer.y)
            }

            if (layer.rotation != null) {
                container.rotation = layer.rotation
            }

            const inh = Puppet.getInherit(layer, inherit);
            (layer.children ? layer : this.stage.assets[layer.id].layers).children.forEach(child =>
                container.addChild(this.createLayer(child, inh)))
        } else {
            container.addChild(this.stage.getAsset(container, layer))
        }

        // Set up the enter animation, if the layer has one
        if (layer.animation && this.stage.project.animations !== false) {
            Puppet.createTween(layer, container)
        }

        return container
    }

    changeEmote(emote) {
        this.emote = emote || '0'
        const handleLayer = visible => layer => {
            layer.visible = visible
            if (visible &&
                layer.animation &&
                this.stage.project.animations !== false) {
                Puppet.createTween(layer, layer)
            }
        }
        const setEmoteVisible = visible => emote => {
            const h = handleLayer(visible)
            emote.base.forEach(h)
            emote.eyes.forEach(h)
            emote.mouth.forEach(h)
        }
        Object.values(this.emotes).forEach(setEmoteVisible(false))
        if (emote in this.emotes)
            setEmoteVisible(true)(this.emotes[emote])
        else if ('0' in this.emotes)
            setEmoteVisible(true)(this.emotes['0'])
    }

    setBabbling(babble) {
        // Babbling will be triggered by holding down a button,
        //  which could end up calling this function a bunch
        //  so only do anything if we're actually changing the value
        if (this.babbling == babble) return
        this.babbling = babble

        if (!babble) {
            this.changeEmote(this.emote)

            if (this.deadbonesStyle) {
                this.deadbonesAnim = 0
                this.deadbonesDuration = 0
                this.deadbonesTargetY = this.deadbonesStartY = 0
                this.deadbonesTargetRotation = this.deadbonesStartRotation = 0
            }
        }
    }

    jiggle() {
        if (this.movingAnim === 0) this.movingAnim = 0.6
    }

    applyToAsset(id, callback, parent, layer) {
        layer = layer || this.puppet.layers
        
        if (layer.children) {
            layer.children.forEach(l => this.applyToAsset(id, callback, layer, l))
        } else if (layer.id === id)
            callback(parent, layer)
    }

    update(updateBabble = true) {
        // Update position
        this.updatePosition()

        // Update emote
        this.changeEmote(this.emote)

        // Update babble
        if (updateBabble) {
            if (this.deadbonesStyle) {
                this.deadbonesAnim = 0
                this.deadbonesDuration = 100 + Math.random() * 200
                this.deadbonesStartY = this.head.y = 10 - Math.random() * 20
                this.deadbonesStartRotation = this.head.rotation = 0.1 - Math.random() * 0.2
                this.head.forEach(a => {
                    a.y = a.asset.y + this.deadbonesStartY
                    a.rotation = a.asset.rotation + this.deadbonesStartRotation
                })
                this.deadbonesTargetY = 10 - Math.random() * 20
                this.deadbonesTargetRotation = 0.1 - Math.random() * 0.2
            } else {
                this.updateEyeBabble()
                this.updateMouthBabble()
            }
        }
    }

    updatePosition() {
        this.container.scale.x = this.container.scale.y = (this.stage.project.puppetScale || 1) 
        this.container.scale.x *= this.facingLeft ? -1 : 1
        this.container.y = this.stage.bounds.height / this.stage.puppetStage.scale.y
        let pos = this.position % (this.stage.project.numCharacters + 1)
        if (pos < 0) pos += this.stage.project.numCharacters + 1
        this.container.x = pos <= 0 ? - Math.abs(this.container.width) / 2 :                      // Starting left of screen
           pos >= this.stage.project.numCharacters + 1 ? 
           this.stage.project.numCharacters * this.stage.slotWidth + Math.abs(this.container.width) / 2 :   // Starting right of screen
           (pos - 0.5) * this.stage.slotWidth                                                     // Starting on screen
    }

    updateEyeBabble() {
        // Disable this emote's eyes
        if (this.emotes[this.emote]) this.emotes[this.emote].eyes.forEach(c => c.visible = false)
        this.emotes['0'].eyes.forEach(c => c.visible = false)

        // Find eyes to set
        const reducer = (acc, curr) => {
            if (curr.babble && curr.emoteLayer === 'eyes') {
                return acc.concat(curr)
            } else if (curr.children) {
                return curr.children.reduce(reducer, acc)
            } else return acc
        }
        const eyes = this.container.children.reduce(reducer, [])
        eyes.forEach(e => e.visible = false);

        // Set new eyes
        ([eyes[Math.floor(Math.random() * eyes.length)]] || this.emotes['0'].eyes).
            forEach(c => c.visible = true)
        this.eyesAnim = 0
        this.eyesDuration = (0.1 + Math.random()) * this.eyeBabbleDuration
    }

    updateMouthBabble() {
        // Disable this emote's eyes
        if (this.emotes[this.emote]) this.emotes[this.emote].mouth.forEach(c => c.visible = false)
        this.emotes['0'].mouth.forEach(c => c.visible = false)

        // Find eyes to set
        const reducer = (acc, curr) => {
            if (curr.babble && curr.emoteLayer === 'mouth') {
                return acc.concat(curr)
            } else if (curr.children) {
                return curr.children.reduce(reducer, acc)
            } else return acc
        }
        const mouths = this.container.children.reduce(reducer, [])
        mouths.forEach(e => e.visible = false);

        // Set new mouth
        ([mouths[Math.floor(Math.random() * mouths.length)]] || this.emotes['0'].mouths).
            forEach(c => c.visible = true)
        this.mouthAnim = 0
        this.mouthDuration = (0.1 + Math.random()) * this.mouthBabbleDuration
    }
}

module.exports = Puppet
