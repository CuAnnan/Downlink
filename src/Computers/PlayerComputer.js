const   {Password, DictionaryPassword, AlphanumericPassword} = require('../Missions/Challenges/Password'),
        helpers = require('../Helpers'),
        {DictionaryCracker, PasswordCracker, SequentialAttacker} = require('./Tasks/PasswordCracker'),
        Encryption = require('../Missions/Challenges/Encryption'),
        EncryptionCracker = require('./Tasks/EncryptionCracker'),
        Computer = require('./Computer'),
        CPUPool = require('./CPUPool'),
        CPU = require('./CPU.js');

class InvalidTaskError extends Error{};
const DEFAULT_MAX_CPUS = 4;


class PlayerComputer extends Computer
{
    constructor(cpus, maxCPUs)
    {
        super('Home', null, '127.0.0.1');
        this.cpuPool = new CPUPool(cpus);
        this.cpuPool.on('cpuBurnedOut', ()=>{
            this.trigger('cpuBurnedOut');
        }).on("cpuPoolEmpty", ()=>{
            this.trigger('cpuPoolEmpty');
        });
        /**
         * @type {Array.<Task>}
         */
        this.missionTasks = [];
        this.maxCPUs = maxCPUs?maxCPUs:DEFAULT_MAX_CPUS;
    }

    get cpus()
    {
        return this.cpuPool.cpus;
    }

    addCPU(cpu)
    {
        this.cpuPool.addCPU(cpu);
    }

    setCPUSlot(slot, cpu)
    {
        this.cpuPool.setCPUSlot(slot, cpu);
    }

    /**
     * @param challenge
     * @returns {Task}
     */
    getTaskForChallenge(challenge)
    {
        let task = null;

        if(challenge instanceof Encryption)
        {
            task = new EncryptionCracker(challenge);
        }
        else if(challenge instanceof DictionaryPassword)
        {
            task = new DictionaryCracker(challenge);
        }
        else if(challenge instanceof AlphanumericPassword)
        {
            task = new SequentialAttacker(challenge);
        }
        else
        {
            throw new InvalidTaskError('Unknown task');
        }


        return task;
    }

    addTaskForChallenge(challenge)
    {
        let task = this.getTaskForChallenge(challenge);
        this.missionTasks.push(task);
        task.on("complete", ()=>{
            helpers.removeArrayElement(this.missionTasks, task);
        });
        this.cpuPool.addTask(task);
    }

    tick()
    {
        return this.cpuPool.tick();
    }

    alterCPULoad(taskHash, direction)
    {
        return this.cpuPool.alterCPULoad(taskHash, direction);
    }


    get tasks()
    {
        return this.cpuPool.tasks;
    }

    toJSON()
    {
        let json = super.toJSON();
        json.cpus = [];
        for(let cpu of this.cpus)
        {
            if(cpu)
            {
                json.cpus.push(cpu.toJSON());
            }
            else
            {
                json.cpus.push(null);
            }
        }
        return json;
    }

    static fromJSON(json)
    {
        let cpus = [];
        for(let cpuJSON of json.cpus)
        {
            if(cpuJSON)
            {
                cpus.push(CPU.fromJSON(cpuJSON));
            }
            else
            {
                cpus.push(null);
            }
        }
        let pc = new PlayerComputer(cpus);
        pc.setLocation(json.location);
        return pc;
    }
}

module.exports = PlayerComputer;
