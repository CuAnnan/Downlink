const   Task = require('./Tasks/Task'),
        Upgradeable = require('../Upgradeable'),
        cpus = require('./cpus');

class CPUFullError extends Error{}
class CPUDuplicateTaskError extends Error{}
class InvalidTaskError extends Error{}

const CPU_COST_MODIFIER = 4000;

class CPU extends Upgradeable
{
    constructor(name, speed, img, lifeCycle, lifeCycleUsed)
    {
        super();
        let defaultCPU = cpus[0];
        /**
         * @type {string}
         */
        this.name = name?name:defaultCPU.name;
        /**
         * @type {number}
         */
        this.baseSpeed = parseInt(speed?speed:defaultCPU.speed);
        /**
         * @type {string} the rgb() color for the cpu
         */
        this.img = img?img:defaultCPU.img;
        /**
         * @type {Array.<Task>}
         */
        this.tasks = [];
        /**
         * @type {number}
         */
        this.baseLifeCycle = parseInt(lifeCycle?lifeCycle:defaultCPU.lifeCycle);
        this.lifeCycleUsed = parseInt(lifeCycleUsed?lifeCycleUsed:0);
        this.living = this.lifeCycleUsed < this.lifeCycle;
    }

    get lifeCycle()
    {
        let lifeCycle = this.baseLifeCycle;
        if(CPU.upgrades && CPU.upgrades.lifeCycle)
        {
            for(let amount of CPU.upgrades.lifeCycle)
            {
                lifeCycle *= amount;
            }
        }
        return lifeCycle;
    }

    get speed()
    {
        let speed = this.baseSpeed;
        if(CPU.upgrades && CPU.upgrades.speed)
        {
            for(let amount of CPU.upgrades.speed)
            {
                speed *= amount;
            }
        }
        return speed;
    }

    get remainingLifeCycle()
    {
        return Math.max(this.lifeCycle - this.lifeCycleUsed, 0);
    }

    get health()
    {
        if(this.lifeCycleUsed >= this.lifeCycle)
        {
            return 0;
        }
        let decimal = this.remainingLifeCycle / this.lifeCycle,
            percentage = decimal * 100,
            fixed = percentage.toFixed(2);
        return fixed;
    }

    toJSON()
    {
        let json = {
            name:this.name,
            speed:this.baseSpeed.toString(),
            img:this.img,
            lifeCycle:this.baseLifeCycle.toString(),
            lifeCycleUsed:this.lifeCycleUsed.toString()
        };
        return json;
    }

    static fromJSON(json)
    {
        return new CPU(json.name, json.speed, json.img, json.lifeCycle, json.lifeCycleUsed);
    }

    static getCPUs()
    {
        return cpus;
    }

    static getCPUByName(name)
    {
        let cpuData = cpus.filter(cpu=>{return cpu.name === name});
        if(!cpuData.length)
        {
            throw new Error('No CPU found');
        }
        return this.fromJSON(cpuData);
    }

    tick(load)
    {
        this.lifeCycleUsed += load;
        if(this.lifeCycleUsed >= this.lifeCycle)
        {
            this.living = false;
            this.trigger('burnOut');
        }
        this.trigger('lifeCycleUpdated');
    }

    /**
     * @param cpuData
     */
    static getPriceFor(cpuData)
    {
        return cpuData.lifeCycle * cpuData.speed / CPU_COST_MODIFIER;
    }

    static get deadImage()
    {
        return 'cpu-dead.png';
    }

    get healthImage()
    {
        return this.living?this.img:CPU.deadImage;
    }

    static get loadReduction()
    {
        return 1;
    }
}


module.exports = CPU;
