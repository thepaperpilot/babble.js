/**
 * Cutscene Scripts:
 * Each action is an object with a "command" string for the action to perform, a "wait" boolean for whether or not to
 * wait until the action is complete before continuing, and any other parameters the command might need (sometimes optional)
 * e.g. { "action": "move", "target": "protagonist", "position": 2, "wait": true }
 * 
 * Default commands:
 * run {script} - takes a new script object to be run in parallel with the rest of the cutscene. Only useful with "wait" set to "false"
 * add {name} {id} [position] [facingLeft] [emote] - adds a puppet with the given name at the given position, assigns it the given id for later reference, and optionally overrides initial state
 * set {target} {name} - changes the given puppet (using assigned ids) to a new puppet with the given name
 * remove {target} - removes a given puppet from the stage
 * delay {duration} - simply waits, should generally be used as a ";" action
 * move {target} {position} - moves puppet to a new position
 * facingLeft {target} {facingLeft} - forces puppet direction
 * babble {target} [start/stop/toggle] - makes a puppet start or stop babbling. Default is toggle
 * emote {target} [emote] - makes a puppet switch to a given emote. Default is 'default'
 * jiggle {target} - causes a given puppet to jiggle
 *
 * Actions are defined in the cutscene's "actions" object. You can add functions to that object to add custom actions.
 * The function will be passed a callback function to be called when the action is complete, as well as the action object with all the parameters in it
 * You can use `this` to access references to the stage and actors
 *
 * To start the cutscene, just call cutscene.start()
 *
 * @class
 */
class Cutscene {

    /**
     * @param {Stage} stage - the stage this puppet will be attached to
     * @param {Object[]} script - the script for the cutscene
     * @param {Object} actors - dictionary of actors (e.g. each member is "name": Character)
     * @param {requestCallback} callback - function to be called after cutscene finishes (either successfully or after an error)
     */
    constructor(stage, script, actors, callback) {
        this.stage = stage
        this.actors = actors

        this.start = function() {this.parseNextAction(script, callback)}

        this.actions = {
            run: function(callback, action) {
                if (action.wait) {
                    this.parseNextAction(action.script, callback)
                } else {
                    this.parseNextAction(action.script, this.empty)
                    requestAnimationFrame(callback)
                }
            },
            add: function(callback, action) {
                if (this.stage.getPuppet(action.id)) throw new Error("Actor already on stage!")
                if (!(action.name in this.actors)) throw new Error("Could not find puppet with that name!")

                // Copy our actor from our actors object
                let actor = JSON.parse(JSON.stringify(this.actors[action.name]))
                
                // If optional parameters are set, apply them to our actor
                if (action.hasOwnProperty('position')) actor.position = action.position
                if (action.hasOwnProperty('facingLeft')) actor.facingLeft = action.facingLeft
                if (action.hasOwnProperty('emote')) actor.emote = action.emote

                // Add our actor to the stage
                this.stage.addPuppet(actor, action.id).name = action.name
                callback()
            },
            set: function(callback, action) {
                if (!this.stage.getPuppet(action.target)) throw new Error("Actor not present on stage!")
                if (!(action.name in this.actors)) throw new Error("Could not find puppet with that name!")

                this.stage.setPuppet(action.target, this.stage.createPuppet(this.actors[action.name])).name = action.name
                callback()
            },
            remove: function(callback, action) {
                if (!this.stage.getPuppet(action.target)) throw new Error("Actor not present on stage!")

                this.stage.removePuppet(action.target)
                callback()
            },
            delay: function(callback, action) {
                if (action.delay <= 0) requestAnimationFrame(callback)
                else {
                    let timer = PIXI.timerManager.createTimer(action.delay)
                    timer.on('end', callback)
                    timer.start()
                }
            },
            move: function(callback, action) {
                if (!this.stage.getPuppet(action.target)) throw new Error("Actor not present on stage!")
                
                let puppet = this.stage.getPuppet(action.target)
                puppet.target = action.position
                puppet.movingAnim = 0
                if (action.position > puppet.position) {
                    puppet.facingLeft = false
                    puppet.container.scale.x = 1
                } else if (action.position != puppet.position) {
                    puppet.facingLeft = true
                    puppet.container.scale.x = -1
                }
                this.actions.delay(callback, { delay: (Math.abs(puppet.target - puppet.position) * this.stage.MOVE_DURATION * 0.6 + this.stage.MOVE_DURATION * 0.4) * 1000 })
            },
            facingLeft: function(callback, action) {
                if (!this.stage.getPuppet(action.target)) throw new Error("Actor not present on stage!")
                
                let puppet = this.stage.getPuppet(action.target)
                puppet.facingLeft = action.facingLeft
                puppet.container.scale.x = puppet.facingLeft ? -1 : 1
                callback()
            },
            babble: function(callback, action) {
                if (!this.stage.getPuppet(action.target)) throw new Error("Actor not present on stage!")
                
                let puppet = this.stage.getPuppet(action.target)
                let babble = (action.action || "toggle") === "toggle" ? !puppet.babbling : action.action === "start"
                puppet.setBabbling(babble)
                callback()
            },
            emote: function(callback, action) {
                if (!this.stage.getPuppet(action.target)) throw new Error("Actor not present on stage!")
                
                this.stage.getPuppet(action.target).changeEmote(action.emote || "default")
                callback()
            },
            jiggle: function(callback, action) {
                if (!this.stage.getPuppet(action.target)) throw new Error("Actor not present on stage!")
                
                this.stage.getPuppet(action.target).jiggle()
                this.actions.delay(callback, { delay: this.stage.MOVE_DURATION * 0.4 * 1000 })
            }
        }
    }

    parseNextAction(script, callback) {
        // Check if script is complete
        if (script.length === 0) {
            // Cutscene finished successully
            if (callback) requestAnimationFrame(callback)
            return
        }

        // Parse current line of script
        let action = script[0]

        // Confirm command exists
        if (!action || !this.actions.hasOwnProperty(action.command)) {
            // Invalid command, end cutscene
            if (callback) requestAnimationFrame(callback)
            return
        }

        // Run action
        if (action.wait) {
            // Complete this action before proceeding
            let newCallback = function() {
                this.parseNextAction(script.slice(1), callback)
            }.bind(this)
            this.actions[action.command].call(this, newCallback, action)
        } else {
            // Perform this action and immediately continue
            this.actions[action.command].call(this, this.empty, action)
            this.parseNextAction(script.slice(1), callback)
        }
    }

    // Used for callbacks that don't need to do anything. 
    // Used so actions don't need to deal with undefined or null callbacks, 
    //  and to not mess up the parameter order
    empty() {}
}

module.exports = Cutscene
