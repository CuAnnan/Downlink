const   Task = require('./Task'),
        helper = require('../../Helpers');

class IcePoint
{
    constructor(heightRange)
    {
        this.heightRange = heightRange;
        this.height = helper.getRandomIntegerBetween(-this.heightRange, this.heightRange);
    }

}

class IceBreakerPoint
{
    /**
     * @param {IcePoint} icePoint
     * @param {number} range
     */
    constructor(icePoint, range)
    {
        /**
         * The total range of the line graph
         */
        this.totalRange = range;
        /**
         * The maximum distance this point can be from its paired IcePoint
         */
        this.searchRange = range;

        this.searchRangeReductionAmount = 0;
        this.solved = false;

        /**
         * the IcePoint to track
         * @type {IcePoint}
         */
        this.icePoint = icePoint;
        this.height = 0;
    }

    /**
     *
     */
    tick()
    {
        // if the point is solved, the height of this point should be the same as the height of the ice point
        if(this.solved)
        {
            this.height = this.icePoint.height;
            return;
        }
        // otherwise it should be within the searchRange of the point, but also within the total range of the graph
        this.determineHeight();
    }

    /**
     * A method to determine the height of the point. It should be bound by its search range and the total range of the graph
     */
    determineHeight()
    {
        // figure the min and max
        let min = Math.max(this.icePoint.height - this.searchRange, -this.totalRange),
            max = Math.min(this.icePoint.height + this.searchRange, this.totalRange);
        // pick a random int between those
        this.height = helper.getRandomIntegerBetween(min, max);
        // Make sure it's not the same as the icePoint
        if(this.height === this.icePoint.height)
        {
            if(this.height === this.totalRange)
            {
                // all we can do is shift it down
                this.height --;
            }
            else if (this.height === -this.totalRange)
            {
                // all we can do is shift it up
                this.height++;
            }
            else
            {
                // we can shift it either way
                let shift = helper.getRandomIntegerBetween(0, 1);
                this.height += shift?1:-1;
            }
        }
    }

    /**
     * Depending on how many CPUs the ICE Breaker has, this could be less than zero and have no instantaneous effect
     * @param fractionalAmount
     */
    reduceSearchRange(fractionalAmount)
    {
        if (this.solved)
        {
            return this;
        }

        this.searchRange -= fractionalAmount;
        if(this.searchRange < 0)
        {
            this.searchRange = 0;
        }
        if(this.searchRange === 0)
        {
            this.solved = true;
        }
        
        return this;
    }
}

class IceBreaker extends Task
{
    constructor(ice)
    {
        super('ICE Breaker', ice);
        this.width = ice.width;
        /**
         * This will always be odd
         */
        this.height = ice.height;
        let range = Math.floor(this.height / 2);


        /**
         * @type {Array.<IceBreakerPoint>}
         */
        this.iceBreakerPoints = [];
        /**
         * @type {Array.<IcePoint>}
         */
        this.icePoints = [];
        for(let i = 0; i < this.width; i++)
        {
            let icePoint= new IcePoint(range);
            let iceBreakerPoint = new IceBreakerPoint(icePoint, range);
            this.icePoints.push(icePoint);
            this.iceBreakerPoints.push(iceBreakerPoint);
        }
    }

    processTick()
    {
        let ticksToSpreadAround = this.cyclesPerTick / (this.width * this.challenge.difficulty * 10);
        let solvedPoints = 0;
        for(let i = 0; i < this.width; i++)
        {
            let iceBreakerPoint = this.iceBreakerPoints[i];
            iceBreakerPoint.reduceSearchRange(ticksToSpreadAround).tick();
            if(iceBreakerPoint.solved)
            {
                solvedPoints ++;
            }
        }
        if(solvedPoints === this.width)
        {
            this.signalComplete();
        }
    }
}

module.exports = IceBreaker;
