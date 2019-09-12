const   CPU = require('./CPU'),
        Task = require('./Tasks/Task'),
        helpers = require('../Helpers'),
        EventListener = require('../EventListener');

/*
 * Custom exceptions
 */
class NoFreeCPUCyclesError extends Error{}
class CPUDuplicateTaskError extends Error{}
class InvalidTaskError extends Error{}

class CPUPool extends EventListener
{
    /**
     * @param {Array.<CPU>} cpus   The CPUs to add into the cpu pool
     * @param {number} maxCPUs      The maximum number of CPUs in the pool
     */
    constructor(cpus, maxCPUs)
    {
        super();
        /**
         * @type {Array.<CPU>}
         */
        this.cpus = [];

        /**
         * @type {number}
         */
        this.maxCPUs = maxCPUs;

        if(cpus.length > this.maxCPUs)
        {
            throw new Error("More CPUs than allotted amount");
        }
        /**
         * @type {number} The average speed of all cpus in the pool
         */
        this.totalSpeed = 0;
        /**
         * @type {number} The total cycles used by all tasks
         */
        this.load = 0;
        /**
         * * @type {Array.<Task>}
         */
        this.tasks = [];

        /**
         * @type {Object.<string, Task>}
         */
        this.tasksByHash = {};

        /**
         * @type {number} The number of CPUs. Because entries can be null, this needs to be counted
         */
        this.cpuCount = 0;

        for(let cpu of cpus)
        {
            this.addCPU(cpu);
        }

        CPU.on('upgrade', ()=>{
            this.update();
        });
    }

    get width()
    {
        return Math.ceil(Math.sqrt(this.maxCPUs));
    }

    increaseCPUSize()
    {
        this.maxCPUs += this.width;
    }

    /**
     * @param {CPU} cpu
     */
    addCPU(cpu)
    {
        this.setCPUSlot(this.cpus.length, cpu);
    }

    setCPUSlot(slot, cpu)
    {
        if(cpu)
        {
            cpu.once('burnOut', ()=>{
                this.flagCPUDead(slot, cpu);
            });
            this.cpus[slot] = cpu;
            this.update();
        }
        else
        {
            this.cpus[slot] = null;
        }
    }

    flagCPUDead()
    {
        this.trigger('cpuBurnedOut');
        this.update();
        if(this.cpuCount === 0)
        {
            this.trigger('cpuPoolEmpty');
        }
    }

    update()
    {
        this.totalSpeed = 0;
        this.cpuCount = 0;
        for(let cpu of this.cpus)
        {
            if(cpu && cpu.living)
            {
                this.totalSpeed += cpu.speed;
                this.cpuCount ++;
            }
        }
    }

    /**
     * Add a task to the cpu pool
     * @param {Task} task   The task to be added
     */
    addTask(task)
    {
        // if it's not a task, complain
        if (!(task instanceof Task))
        {
            throw new InvalidTaskError('Tried to add a non task object to a processor');
        }
        // if it's already in the pool, complain
        if(this.tasks.indexOf(task)>=0)
        {
            throw new CPUDuplicateTaskError('This task is already on the CPU');
        }
        let freeCycles = this.availableCycles;
        // if you don't have the free oomph, complain
        if(task.minimumRequiredCycles > freeCycles)
        {
            throw new NoFreeCPUCyclesError(`CPU pool does not have the required cycles for ${task.name}. Need ${task.minimumRequiredCycles.toString()} but only have ${freeCycles}.`);
        }

        task.on('complete', ()=>{ this.completeTask(task); });

        this.load += task.minimumRequiredCycles;
        this.tasks.push(task);
        this.tasksByHash[task.hash] = task;
        this.updateLoadBalance();
    }

    /**
     * Finish a task and remove it from the cpu pool
     * @param {Task} task
     */
    completeTask(task)
    {
        let freedCycles = task.cyclesPerTick;

        helpers.removeArrayElement(this.tasks, task);
        delete this.tasksByHash[task.hash];
        this.load -= task.minimumRequiredCycles;

        if(this.tasks.length >= 1)
        {
            let freedCyclesPerTick = Math.floor(freedCycles / this.tasks.length);
            let i = 0;
            while(i < this.tasks.length && freedCycles > (0))
            {
                let task = this.tasks[i];
                freedCycles -= freedCyclesPerTick;
                task.addCycles(freedCyclesPerTick);
                i++;
            }
        }
        this.updateLoadBalance();
        this.trigger('taskComplete');
    }

    removeTasks(tasks)
    {
        for(let task of tasks)
        {
            helpers.removeArrayElement(this.tasks, task);
            delete this.tasksByHash[task.hash];
        }
    }

    get availableCycles()
    {
        return this.totalSpeed - this.load;
    }

    alterCPULoad(taskHash, direction)
    {
        let task = this.tasksByHash[taskHash];
        if(task)
        {
            task.alterWeight(direction);
        }
        return this.updateLoadBalance();
    }

    updateLoadBalance()
    {
        if(this.tasks.length === 0)
        {
            return;
        }
        let totalWeight = 0;

        for(let task of this.tasks)
        {
            totalWeight += task.weight;
        }

        let weightedFreeSpace = this.availableCycles / totalWeight;
        let results = {};

        try
        {
            for (let task of this.tasks)
            {
                let weightedCycles = weightedFreeSpace * task.weight,
                    taskCycles = weightedCycles + task.minimumRequiredCycles,
                    cyclePercentage = (taskCycles / this.totalSpeed * 100).toFixed(2);
                task.setCyclesPerTick(Math.floor(taskCycles));
                task.setLoadPercentage(cyclePercentage);
                results[task.hash] = cyclePercentage;
            }
        }
        catch(e)
        {
            if(e.constructor.name === 'CPUOverloadError')
            {
                this.pauseAllTasks();
            }
        }

        return results;
    }

    pauseAllTasks()
    {
        for (let task of this.tasks)
        {
            task.pause();
        }
    }

    /**
     *
     * @returns {Array.<Task>}
     */
    tick()
    {
        let tasks = [];
        let averageLoad = 0;
        for(let task of this.tasks)
        {
            averageLoad += task.tick();
            // we do this because the task could be removed from this.tasks after ticking
            // so it would be lost reference wise and we would have no way of updating it later
            tasks.push(task);
        }
        for(let cpu of this.cpus)
        {
            if(cpu && cpu.remainingLifeCycle > 0)
            {
                cpu.tick(averageLoad);
            }
        }
        return tasks;
    }
}

module.exports = CPUPool;
