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
        this.stage = stage
        this.id = id
        this.container = new Container()
        this.position = this.target = puppet.position
        this.facingLeft = puppet.facingLeft
        this.eyes = puppet.eyes
        this.mouths = puppet.mouths
        this.deadbonesStyle = puppet.deadbonesStyle
        this.movingAnim = this.eyesAnim = this.mouthAnim = this.deadbonesAnim = 0
        this.eyesDuration = this.mouthDuration = this.deadbonesDuration = 0
        this.deadbonesTargetY = this.deadbonesStartY = 0
        this.deadbonesTargetRotation = this.deadbonesStartRotation = 0
        this.eyeBabbleDuration = puppet.eyeBabbleDuration || 2000
        this.mouthBabbleDuration = puppet.mouthBabbleDuration || 270
        this.direction = 0

        // Construct Puppet
        this.body = new Container()
        for (let i = 0; i < puppet.body.length; i++) {
            this.body.addChild(stage.getAsset(puppet.body[i], 'body'))
        }
        this.container.addChild(this.body)

        this.head = new Container()
        this.headBase = new Container()
        for (let i = 0; i < puppet.head.length; i++) {
            this.headBase.addChild(stage.getAsset(puppet.head[i], 'headBase'))
        }
        this.head.addChild(this.headBase)
        this.emotes = {}
        this.mouthsContainer = new Container()
        this.eyesContainer = new Container()
        for (let i = 0; i < puppet.emotes.length; i++) {
            let emote = puppet.emotes[i]
            this.emotes[i] = {
                "mouth": new Container(),
                "eyes": new Container(),
                enabled: emote.enabled,
                name: emote.name
            }
            this.mouthsContainer.addChild(this.emotes[i].mouth)
            this.eyesContainer.addChild(this.emotes[i].eyes)
            for (let j = 0; j < puppet.emotes[i].mouth.length; j++) {
                this.emotes[i].mouth.addChild(stage.getAsset(puppet.emotes[i].mouth[j], 'mouth', i))
            }
            for (let j = 0; j < puppet.emotes[i].eyes.length; j++) {
                this.emotes[i].eyes.addChild(stage.getAsset(puppet.emotes[i].eyes[j], 'eyes', i))
            }
        }
        this.head.addChild(this.mouthsContainer)
        this.head.addChild(this.eyesContainer)
        this.hat = new Container()
        for (let i = 0; i < puppet.hat.length; i++) {
            this.hat.addChild(stage.getAsset(puppet.hat[i], 'hat'))
        }
        this.head.addChild(this.hat)
        this.head.pivot.y = - this.headBase.height / 2
        this.head.y = - this.headBase.height / 2
        this.deadbonesTargetY = this.deadbonesStartY = - this.headBase.height / 2
        this.container.addChild(this.head)

        this.props = new Container()
        for (let i = 0; i < puppet.props.length; i++) {
            this.props.addChild(stage.getAsset(puppet.props[i], 'props'))
        }
        this.container.addChild(this.props)

        // Finish Setup
        this.changeEmote(puppet.emote)

        // Place Puppet on Stage
        this.container.interactive = true
        this.container.puppet = puppet
        this.container.id = id
        this.container.y = stage.screen.clientHeight / stage.puppetStage.scale.y
        this.container.x = (this.position - 0.5) * stage.slotWidth
        this.container.scale.x = this.container.scale.y = (stage.project.puppetScale || 1) 
        this.container.scale.x *= this.facingLeft ? -1 : 1
    }

    changeEmote(emote) {
        this.emote = emote || '0'
        let emotes = Object.keys(this.emotes)
        for (let i = 0; i < emotes.length; i++) {
            this.emotes[emotes[i]].mouth.visible = false
            this.emotes[emotes[i]].eyes.visible = false
        }
        if (emote && this.emotes[emote].enabled) {
            this.emotes[emote].mouth.visible = true
            this.emotes[emote].eyes.visible = true
        } else {
            this.emotes['0'].mouth.visible = true
            this.emotes['0'].eyes.visible = true
        }
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
                this.deadbonesDuration = 100
                this.deadbonesTargetY = - this.headBase.height / 2
                this.deadbonesTargetRotation = 0
                this.deadbonesStartY = this.head.y
                this.deadbonesStartRotation = this.head.rotation
            }
        }
    }

    jiggle() {
        if (this.movingAnim === 0) this.movingAnim = 0.6
    }

    addEmote(emote) {
        if (this.emotes[emote]) return
        this.emotes[emote] = {
            "mouth": new Container(),
            "eyes": new Container()
        }
        this.mouthsContainer.addChild(this.emotes[emote].mouth)
        this.eyesContainer.addChild(this.emotes[emote].eyes)
    }

    applyToAsset(id, callback) {
        let character = this.container.puppet
        let topLevel = ["body", "head", "hat", "props"]

        for (let j = 0; j < topLevel.length; j++)
            for (let k = 0; k < character[topLevel[j]].length; k++)
                if (character[topLevel[j]][k].id === id)
                    callback(character[topLevel[j]][k], this[topLevel[j] === "head" ? "headBase" : topLevel[j]].children[k], topLevel[j] === "head" ? "headBase" : topLevel[j])
                
        let emotes = Object.keys(character.emotes)
        for (let j = 0; j < emotes.length; j++) {
            for (let k = 0; k < character.emotes[emotes[j]].eyes.length; k++)
                if (character.emotes[emotes[j]].eyes[k].id === id)
                    callback(character.emotes[emotes[j]].eyes[k], this.emotes[emotes[j]].eyes.children[k], "eyes", emotes[j])
            for (let k = 0; k < character.emotes[emotes[j]].mouth.length; k++)
                if (character.emotes[emotes[j]].mouth[k].id === id)
                    callback(character.emotes[emotes[j]].mouth[k], this.emotes[emotes[j]].mouth.children[k], "mouth", emotes[j])
        }
    }

    update(updateBabble = true) {
        // Update position
        this.container.scale.x = this.container.scale.y = (this.stage.project.puppetScale || 1) 
        this.container.scale.x *= this.facingLeft ? -1 : 1
        this.container.y = this.stage.bounds.height / this.stage.puppetStage.scale.y
        this.container.x = this.position <= 0 ? - Math.abs(this.container.width) / 2 :                                      // Starting left of screen
                           this.position >= this.stage.project.numCharacters + 1 ? 
                           this.stage.project.numCharacters * this.stage.slotWidth + Math.abs(this.container.width) / 2 :   // Starting right of screen
                           (this.position - 0.5) * this.stage.slotWidth                                                     // Starting on screen

        // Update emote
        let emotes = Object.keys(this.emotes)
        for (let i = 0; i < emotes.length; i++) {
            this.emotes[emotes[i]].mouth.visible = false
            this.emotes[emotes[i]].eyes.visible = false
        }
        if (this.emote && this.emotes[this.emote].enabled) {
            this.emotes[this.emote].mouth.visible = true
            this.emotes[this.emote].eyes.visible = true
        } else {
            this.emotes['0'].mouth.visible = true
            this.emotes['0'].eyes.visible = true
        }

        // Update babble
        if (updateBabble) {
            if (this.deadbonesStyle) {
                this.deadbonesAnim = 0
                this.deadbonesDuration = 100 + Math.random() * 200
                this.deadbonesStartY = this.head.y = Math.random() * - 20 - this.headBase.height / 2
                this.deadbonesStartRotation = this.head.rotation = 0.1 - Math.random() * 0.2
                this.deadbonesTargetY = Math.random() * - 20 - this.headBase.height / 2
                this.deadbonesTargetRotation = 0.1 - Math.random() * 0.2
            } else {
                this.updateEyeBabble()
                this.updateMouthBabble()
            }
        }
    }

    updateEyeBabble() {
        if (this.emotes[this.emote]) this.emotes[this.emote].eyes.visible = false
        this.emotes['0'].eyes.visible = false
        for (let j = 0; j < this.eyes.length; j++) {
            if (this.emotes[this.eyes[j]]) this.emotes[this.eyes[j]].eyes.visible = false
        }
        let eyes = this.eyes[Math.floor(Math.random() * this.eyes.length)]
        this.emotes[this.emotes[eyes] ? eyes : '0'].eyes.visible = true
        this.eyesAnim = 0
        this.eyesDuration = (0.1 + Math.random()) * this.eyeBabbleDuration
    }

    updateMouthBabble() {
        if (this.emotes[this.emote]) this.emotes[this.emote].mouth.visible = false
        this.emotes['0'].mouth.visible = false
        for (let j = 0; j < this.mouths.length; j++) {
            if (this.emotes[this.mouths[j]]) this.emotes[this.mouths[j]].mouth.visible = false
        }
        let mouth = this.mouths[Math.floor(Math.random() * this.mouths.length)]
        this.emotes[this.emotes[mouth] ? mouth : '0'].mouth.visible = true
        this.mouthAnim = 0
        this.mouthDuration = (0.1 + Math.random()) * this.mouthBabbleDuration
    }
}

module.exports = Puppet
