const   CPU = require('./CPU'),
        Task = require('../Tasks/Task'),
        Decimal = require('break_infinity.js'),
        EventListener = require('../EventListener');

/*
 * Custom exceptions
 */
class NoFreeCPUCyclesError extends Error{};
class CPUDuplicateTaskError extends Error{};
class InvalidTaskError extends Error{};

class CPUPool extends EventListener
{
    constructor(cpus)
    {
        super();
        /**
         * @type {Array.<CPU>}
         */
        this.cpus = [];
        /**
         * @type {Decimal} The average speed of all cpus in the pool
         */
        this.averageSpeed = new Decimal(0);
        /**
         * @type {Decimal} The average speed of all cpus in the pool
         */
        this.totalSpeed = new Decimal(0);
        /**
         * @type {Decimal} The total cycles used by all tasks
         */
        this.load = new Decimal(0);
        /**
         * * @type {Array.<Task>}
         */
        this.tasks = [];

        for(let cpu of cpus)
        {
            this.addCPU(cpu);
        }
    }

    /**
     * @param {CPU} cpu
     */
    addCPU(cpu)
    {
        this.cpus.push(cpu);
        this.totalSpeed = this.totalSpeed.plus(cpu.speed);
        this.averageSpeed = this.totalSpeed.dividedBy(this.cpus.length);
    }

    /**
     * figure out how many cycles to assign the task. This number will be the larger of the minimum required cycles
     * and 1/nth of the total cycles available to the pool (where n is the number of total tasks being run, including
     * this task).
     * @param {Task} task   The task to figure out the cycles for
     * @returns {Decimal}   The number of cycles to assign the task
     */
    getCyclesForTask(task)
    {
        return Decimal.max(task.minimumRequiredCycles, Decimal.floor(this.totalSpeed.div(this.tasks.length + 1)));
    }

    /**
     * Figure out how many cycles to remove from all of the current tasks in the pool and do so.
     * This method will keep a tally of the freed cycles, as no task will lower its assigned cycles below the minimum
     * required amount.
     * @param task
     * @returns {Decimal}
     */
    balanceTaskLoadForNewTask(task)
    {
        // get the number of cycles to assign
        let cyclesToAssign = this.getCyclesForTask(task);
        if(this.tasks.length === 0)
        {
            return cyclesToAssign;
        }

        let idealCyclesToAssign = cyclesToAssign;
        if(this.tasks.length > 0)
        {
            // average that out
            let cyclesToTryToTakeAwayFromEachProcess = idealCyclesToAssign.dividedBy(this.tasks.length).ceil(),
                cyclesFreedUp = new Decimal(0);

            for(let task of this.tasks)
            {
                // add the actual amount freed up to the total freed
                cyclesFreedUp = cyclesFreedUp.plus(task.freeCycles(cyclesToTryToTakeAwayFromEachProcess));
            }
            cyclesToAssign = cyclesFreedUp;
        }
        return cyclesToAssign;
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
        let freeCycles = this.freeCycles;
        // if you don't have the free oomph, complain
        if(task.minimumRequiredCycles.greaterThan(freeCycles))
        {
            throw new NoFreeCPUCyclesError(`CPU pool does not have the required cycles for ${task.name}. Need ${task.minimumRequiredCycles.toString()} but only have ${freeCycles}.`);
        }

        // figure out how many cycles to assign
        let cyclesToAssign = this.balanceTaskLoadForNewTask(task);

        task.setCyclesPerTick(cyclesToAssign);
        task.on('complete', ()=>{ this.completeTask(task); });

        this.load = this.load.plus(task.minimumRequiredCycles);
        this.tasks.push(task);
    }

    /**
     * Finish a task and remove it from the cpu pool
     * @param {Task} task
     */
    completeTask(task)
    {
        let freedCycles = task.cyclesPerTick;
        this.tasks.removeElement(task);
        this.load = this.load.minus(task.minimumRequiredCycles);

        if(this.tasks.length >= 1)
        {
            let freedCyclesPerTick = freedCycles.dividedBy(this.tasks.length).floor();
            let i = 0;
            while(i < this.tasks.length && freedCycles.greaterThan(0))
            {
                let task = this.tasks[i];
                freedCycles = freedCycles.minus(freedCyclesPerTick);
                task.addCycles(freedCyclesPerTick);
                i++;
            }
        }
        this.trigger('taskComplete');
    }

    get freeCycles()
    {
        return this.totalSpeed.minus(this.load);
    }

    tick()
    {
        for(let task of this.tasks)
        {
            task.tick();
        }
        for(let cpu of this.cpus)
        {
            cpu.tick();
        }
    }
}

module.exports = CPUPool;
