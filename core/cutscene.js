/**
 * Cutscene Scripts:
 * Each action is a new line, ending with either a comma or a semicolon
 * Commas mean the next action gets immediately run, semicolons tell the cutscene to wait until this action is complete
 * Each line has a command and its parameters, e.g. "move josh 1 5;"
 * Some parameters are optional
 * 
 * Default commands:
 * add {name} {position} {id} - adds a puppet with the given name at the given position, and optionally assigns it the given id 
 * set {target} {name} - changes the given puppet (using assigned ids) to a new puppet with the given name
 * remove {target} - removes a given puppet from the stage
 * delay {duration} - simply waits, should generally be used as a ";" action
 * move {target} {position} - moves puppet to a new position
 * babble {target} [start/stop/toggle] - makes a puppet start or stop babbling. Default is toggle
 * emote {target} [emote] - makes a puppet switch to a given emote. Default is 'default'
 * jiggle {target} - causes a given puppet to jiggle
 *
 * Actions are defined in the cutscene's "actions" object. You can add functions to that object to add custom actions.
 * The function will be passed a callback function to be called when the action is complete, as well as any parameters passed to the action
 *
 * To start the cutscene, just call cutscene.start()
 *
 * @class
 */
class Cutscene {

    /**
     * @param {Stage} stage - the stage this puppet will be attached to
     * @param {string} script - the script for the cutscene
     * @param {Object} actors - dictionary of actors (e.g. each member is "name": Character)
     * @param {requestCallback} callback - function to be called after cutscene finishes (either successfully or after an error)
     */
    constructor(stage, script, actors, callback) {
        this.stage = stage
        this.actors = actors

        var _script = script
        var _callback = callback
        this.start = function() {this.parseNextAction(_script.split("\n"), _callback)}

        this.actions = {
            add: function(callback, name, position, id) {
                this.stage.addPuppet(this.actors[name], id).position = position
                callback()
            },
            set: function(callback, target, name) {
                this.stage.setPuppet(target, this.stage.createPuppet(this.actors[name]))
                callback()
            },
            remove: function(callback, target) {
                this.stage.removePuppet(target)
                callback()
            },
            delay: function(callback, duration) {
                let timer = PIXI.timerManager.createTimer(duration)
                timer.on('end', callback)
                timer.start()
            },
            move: function(callback, target, position) {
                let puppet = this.stage.getPuppet(target)
                puppet.target = position
                puppet.movingAnim = 0
                if (position > puppet.position) {
                    this.facingLeft = false
                    this.container.scale.x = 1
                } else {
                    this.facingLeft = true
                    this.container.scale.x = -1
                }
                this.actions.delay(callback, this.stage.MOVE_DURATION * 1000)
            },
            babble: function(callback, target, action) {
                let puppet = this.stage.getPuppet(target)
                let babble = (action || "toggle") === "toggle" ? !target.babbling : action === "start"
                puppet.setBabbling(babble)
                callback()
            },
            emote: function(callback, target, emote) {
                this.stage.getPuppet(target).changeEmote(emote || "default")
                callback()
            },
            jiggle: function(callback, target) {
                this.stage.getPuppet(target).jiggle()
                callback()
            }
        }
    }

    parseNextAction(script, callback) {
        if (script.length === 0 || script[0].trim() === "") {
            // Cutscene finished successully
            if (callback) callback()
            return
        }

        let eol = script[0].trim().charAt(script[0].length - 1)
        let action = script[0].trim()
        action = action.substring(0, action.length - 1)
        let command = action.split(" ")[0]
        let parameters = action.split(" ").slice(1)
        switch (eol) {
            default:
                // Invalid end of line
                if (callback) callback()
                break
            case ';':
                if (this.actions[command] === null) {
                    // Invalid command
                    if (callback) callback()
                    break
                }
                let newCallback = function() {
                    this.parseNextAction(script.slice(1), callback)
                }.bind(this)
                this.actions[command].call(this, newCallback, ...parameters)
                break
            case ',':
                this.actions[command].call(this, this.empty, ...parameters)
                this.parseNextAction(script.slice(1), callback)
                break
        }
    }

    // Used for callbacks that don't need to do anything. 
    // Used so actions don't need to deal with undefined or null callbacks, 
    //  and to not mess up the parameter order
    empty() {}
}

module.exports = Cutscene
