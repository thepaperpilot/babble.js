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
        let emotes = Object.keys(puppet.emotes)
        for (let i = 0; i < emotes.length; i++) {
            if (!puppet.emotes[emotes[i]].enabled) continue
            this.emotes[emotes[i]] = {
                "mouth": new Container(),
                "eyes": new Container()
            }
            this.mouthsContainer.addChild(this.emotes[emotes[i]].mouth)
            this.eyesContainer.addChild(this.emotes[emotes[i]].eyes)
            for (let j = 0; j < puppet.emotes[emotes[i]].mouth.length; j++) {
                this.emotes[emotes[i]].mouth.addChild(stage.getAsset(puppet.emotes[emotes[i]].mouth[j], emotes[i] + '-emote'))
            }
            for (let j = 0; j < puppet.emotes[emotes[i]].eyes.length; j++) {
                this.emotes[emotes[i]].eyes.addChild(stage.getAsset(puppet.emotes[emotes[i]].eyes[j], emotes[i] + '-emote'))
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
        this.container.y = stage.screen.clientHeight / stage.puppetStage.scale.y
        this.container.x = (this.position - 0.5) * stage.slotWidth
        this.container.scale.x = this.container.scale.y = (stage.project.puppetScale || 1) 
        this.container.scale.x *= this.facingLeft ? -1 : 1
    }

    changeEmote(emote) {
        this.emote = emote
        let emotes = Object.keys(this.emotes)
        for (let i = 0; i < emotes.length; i++) {
            this.emotes[emotes[i]].mouth.visible = false
            this.emotes[emotes[i]].eyes.visible = false
        }
        if (this.emotes[emote]) {
            this.emotes[emote].mouth.visible = true
            this.emotes[emote].eyes.visible = true
        } else {
            this.emotes['default'].mouth.visible = true
            this.emotes['default'].eyes.visible = true
        }
    }

    // TODO replace these with a `move(amount)` function, that accepts negative values

    moveLeft() {
        if (this.target > this.position) return
        if (this.facingLeft || this.position === 0 || this.position == this.stage.project.numCharacters + 1) {
            this.target--
            this.facingLeft = true
            this.container.scale.x = -1
        } else {
            this.facingLeft = true
            this.container.scale.x = -1
        }
    }

    moveRight() {
        if (this.target < this.position) return
        if (!this.facingLeft || this.position === 0 || this.position == this.stage.project.numCharacters + 1) {
            this.target++
            this.facingLeft = false
            this.container.scale.x = 1
        } else {
            this.facingLeft = false
            this.container.scale.x = 1
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

    applyToAsset(asset, callback) {
        let character = this.container.puppet
        let topLevel = ["body", "head", "hat", "props"]

        for (let j = 0; j < topLevel.length; j++)
            for (let k = 0; k < character[topLevel[j]].length; k++)
                if (character[topLevel[j]][k].tab === asset.tab && character[topLevel[j]][k].hash === asset.hash)
                    callback(character[topLevel[j]][k])
                
        let emotes = Object.keys(character.emotes)
        for (let j = 0; j < emotes.length; j++) {
            for (let k = 0; k < character.emotes[emotes[j]].eyes.length; k++)
                if (character.emotes[emotes[j]].eyes[k].tab === asset.tab && character.emotes[emotes[j]].eyes[k].hash === asset.hash)
                    callback(character.emotes[emotes[j]].eyes[k])
            for (let k = 0; k < character.emotes[emotes[j]].mouth.length; k++)
                if (character.emotes[emotes[j]].mouth[k].tab === asset.tab && character.emotes[emotes[j]].mouth[k].hash === asset.hash)
                    callback(character.emotes[emotes[j]].mouth[k])
        }
    }
}

module.exports = Puppet
