// imports
const PIXI = require('pixi.js')

// Aliases
let Container = PIXI.Container

/**
 * @class
 */
class Puppet {

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
        this.emotes = { 0: { base: [], eyes: [], mouth: [] } }

        // Construct Puppet
        this.container.addChild(this.handleLayer(puppet.layers))

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

    handleLayer(layer, inherit = {}) {
        const container = new Container()
        Object.keys(layer).forEach(k => {if (!(k in container)) container[k] = layer[k]})
        Object.keys(inherit).forEach(k => inherit[k] == null && delete inherit[k])
        Object.keys(inherit).forEach(k => {if (!(k in container)) container[k] = inherit[k]})

        if (layer.children) {
            const inh = Object.assign((({ head, emote, emoteLayer }) =>
                ({ head, emote, emoteLayer }))(layer), inherit)
            layer.children.forEach(child =>
                container.addChild(this.handleLayer(child, inh)))
        } else {
            container.addChild(this.stage.getAsset(container, layer))
        }

        if (inherit.head == null && layer.head)
            this.head.push(container)

        if (container.emote != null && (inherit.emoteLayer == null && layer.emoteLayer || !layer.children)) {
            if (!(container.emote in this.emotes)) this.emotes[container.emote] = {
                base: [],
                eyes: [],
                mouth: []
            }
            this.emotes[container.emote][container.emoteLayer ?
                container.emoteLayer : 'base'].push(container)
        } else if (inherit.babble == null && layer.babble) {
            container.visible = false
        }

        return container
    }

    changeEmote(emote) {
        this.emote = emote || '0'
        const setEmoteVisible = visible => emote => {
            emote.base.forEach(layer => layer.visible = visible)
            emote.eyes.forEach(layer => layer.visible = visible)
            emote.mouth.forEach(layer => layer.visible = visible)
        }
        Object.values(this.emotes).forEach(setEmoteVisible(false))
        setEmoteVisible(true)(emote in this.emotes ?
            this.emotes[emote] :
            this.emotes['0'])
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
