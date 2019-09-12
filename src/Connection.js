const   Computer = require('./Computers/Computer'),
        PublicComputer = require('./Computers/PublicComputer'),
        EventListener = require('./EventListener'),
        helpers = require('./Helpers'),
        md5 = require('md5');

class InvalidTypeError extends Error{}
class InvalidComputerError extends Error{}
//class DuplicateComputerError extends Error{}

let connections = 0;

class ConnectionStep extends EventListener
{
    constructor(computer1, computer2)
    {
        super();
        this.traceTicks = 0;
        this.computer1 = computer1;
        this.computer2 = computer2;
        this.amountTraced = 0;
        this.tracing = false;
        this.traced = false;
        this.state = ConnectionStep.states.pristine;
    }

    reverse()
    {
        let temp = this.computer1;
        this.computer1 = this.computer2;
        this.computer2 = temp;
        return this;
    }

    /**
     * This method increases the amount the connection step has been traced by
     * and returns the remaining amount that the reduction has left or null if the connection does not succeed
     * So if the ConnectionLength is 30, the amount traced is 10 and the current
     * trace amount is 25, this method will return 5.
     * If the ConnectionLength is 20, the amount traced is 5 and the current trace amount is 10
     * the return value will be -1
     * This allows us to check if the amount traced resulted in a successful trace as any value greater than
     * or equal to zero is a trace.
     * @param {number}  amount  The distance to trace
     * @returns {number}    The remaining distance after this step has been traced
     */
    traceAmount(amount) {
        this.state = ConnectionStep.states.tracing;
        this.amountTraced += amount;
        this.amountRemaining = ConnectionStep.distance - this.amountTraced;
        this.amountRemaining = this.amountRemaining >= 0 ? this.amountRemaining : 0;
        this.traceTicks++;
        if(this.amountTraced >= ConnectionStep.distance)
        {
            this.trigger(ConnectionStep.events.stepTraced);
            let remainder = this.amountTraced - ConnectionStep.distance;
            this.state = ConnectionStep.states.traced;
            return remainder;
        }
        return -1;
    }

}
ConnectionStep.distance = 25;
ConnectionStep.states = {'pristine':'pristine','tracing':'tracing', 'traced':'traced'};
ConnectionStep.events = {'stepTraced':'stepTraced'};

/**
 * A class to encapsulate the points in between you and the target computer, excluding both
 */
class Connection extends EventListener
{
    constructor(name)
    {
        super();
        if(!name)
        {
            connections++;
        }
        /**
         * This is used for easy comparison between two connections
         * and will only be of import in later game because in early game the connections will be automated
         * @type {string}
         */
        this.hash = '';
        /**
         * * @type {Computer}
         */
        this.startingPoint = null;
        /**
         * @type {Computer}
         */
        this.endPoint = null;
        /**
         * A friendly descriptor for the computer
         * One is generated using the number of currently created connections if none is provided
         * @type {string}
         */
        this.name = name?name:`Connection ${connections}`;
        /**
         * The computers in the connection
         * @type {Array.<Computer>}
         */
        this.computers=[];
        /**
         * The steps in the connection
         * @type {Array.<ConnectionStep>}
         */
        this.steps = [];
        /**
         * The total length of the connection as an abstract number.
         * This is used as a ticker to let us know if the connection has been traced
         * @type {number}
         */
        this.connectionLength = 0;
        /**
         * The number of computers that have been sucessfully traced
         * @type {number}
         */
        this.stepsTraced = 0;
        /**
         * The number of ticks that we have been tracing.
         * @type {number}
         */
        this.traceTicks = 0;
        /**
         * A flag for tracking if this connection is active
         * @type {boolean}
         */
        this.active = false;
        /**
         * A flag for tracking if the connection has been traced
         * @type {boolean}
         */
        this.traced = false;
        /**
         * A state container so that we can initialise this.steps
         * @type {boolean}
         */
        this.initialised = false;
        /**
         * The step currently being traced
         * @type {null|ConnectionStep}
         */
        this.currentStep = null;
    }

    /**
     * A method to initialise the connection steps.
     */
    initialise()
    {
        /*
        Make sure this happens only once
         */
        if(this.initialised)
        {
            return;
        }
        // default the array
        this.steps = [];
        if(this.startingPoint && this.computers.length>=1)
        {
            this.steps.push(
                new ConnectionStep(this.startingPoint, this.computers[0])
                    .on(ConnectionStep.events.stepTraced, () => {
                        this.stepTraced();
                    })
            );
        }

        // loop through all of the computers and make connections out of them.
        for(let i = 1; i < this.computers.length; i++)
        {
            // the connection's first computer is either the last computer in the loop
            // or the starting computer
            this.steps.push(
                new ConnectionStep(this.computers[i - 1], this.computers[i])
                    .on(ConnectionStep.events.stepTraced, ()=>{
                        this.stepTraced();
                    })
            );
            // set the last computer in the loop to be this computer
        }
        if(this.endPoint) {
            // make the step for the end point
            // determine what the previous point is
            let startPoint = this.computers.length > 0 ? this.computers[this.computers.length - 1] : this.startingPoint;
            this.steps.push(
                new ConnectionStep(startPoint, this.endPoint)
                    .on(ConnectionStep.events.stepTraced, () => {
                        this.stepTraced();
                    })
            );
        }
        // set initialised to true
        this.initialised = true;
        this.steps = this.steps.reverse();
        this.currentStep = this.steps[0];

    }

    stepTraced()
    {
        this.trigger("stepTraced", this.stepsTraced);
    }

    static improveConnectionDistance(amount)
    {
        Connection.connectionDistance += amount;
        ConnectionStep.length += amount;
    }

    get totalConnectionLength()
    {
        return this.connectionLength * ConnectionStep.distance;
    }

    setStartingPoint(startingComputer)
    {
        this.startingPoint = startingComputer;
        this.connectionLength ++;
        return this;
    }

    setEndPoint(endPointComputer)
    {
        this.endPoint = endPointComputer;
        this.connectionLength ++;
        this.initialise();
        return this;
    }

    connect()
    {
        this.stepsTraced = 0;
        this.active = true;
        return this.open();
    }

    reconnect()
    {
        this.active = true;
        return this.open();
    }

    open()
    {
        for(let computer of this.computers)
        {
            computer.connect();
        }
        return this;
    }

    /**
     * this is needed so that mission computers retain the state of the connection's tracedness
     */
    clone()
    {
        let clone = new Connection(this.name);
        clone.startingPoint = this.startingPoint;
        for(let computer of this.computers)
        {
            clone.addComputer(computer);
        }
        return clone;
    }

    /**
     * @param {Connection} otherConnection
     * @returns {boolean}
     */
    equals(otherConnection)
    {
        return (this.hash === otherConnection.hash);
    }

    /**
     * @param {number|null} stepTraceAmount the amount of the current step in the connection to trace by
     */
    traceStep(stepTraceAmount)
    {
        if(!this.initialised)
        {
            this.initialise();
        }
        if(this.traced)
        {
            this.trigger('updateTracePercentage', this.tracePercent);
            return;
        }

        this.traceTicks++;
        if(this.traceTicks % Connection.sensitivity === 0)
        {
            this.trigger('updateTracePercentage', this.tracePercent);
        }

        let remainder = null;
        do
        {
            remainder = this.currentStep.traceAmount(stepTraceAmount);
            if(remainder >= 0)
            {
                this.stepsTraced ++;
                this.currentStep = this.steps[this.stepsTraced < this.steps.length?this.stepsTraced:this.steps.length - 1];
            }


            if(this.stepsTraced === this.steps.length)
            {
                this.trigger('connectionTraced');
                this.traced = true;
            }
        }while(remainder > 0 || this.stepsTraced >= this.steps.length);
    }

    get totalAmountTraced()
    {
        return (this.stepsTraced * ConnectionStep.distance) + this.currentStep.amountTraced;
    }

    close()
    {
        let reverseComputers = this.computers.reverse();
        for(let computer of reverseComputers)
        {
            computer.disconnect();
        }
        this.active = false;
        return this;
    }

    addComputer(computer)
    {
        if(!(computer instanceof Computer))
        {
            throw new InvalidTypeError("Incorrect object type added");
        }
        if(this.computers.indexOf(computer) >= 0)
        {
            this.removeComputer(computer);
            return this;
        }
        this.computers.push(computer);
        this.connectionLength ++;
        this.buildHash();
        return this;
    }

    get tracePercent()
    {
        return Math.min(100, (this.totalAmountTraced / this.totalConnectionLength * 100).toFixed(2));
    }

    removeComputer(computer)
    {
        if(this.computers.indexOf(computer) < 0)
        {
            throw new InvalidComputerError("Computers not found in connection");
        }
        this.buildHash();
        helpers.removeArrayElement(this.computers, computer);
        this.connectionLength --;
    }

    buildHash()
    {
        let strToHash = '';
        for(let computer of this.computers)
        {
            strToHash += computer.simpleHash;
        }
        this.hash = md5(strToHash);
    }

    toJSON()
    {
        let json= {name:this.name, ipAddresses:[]};
        for(let computer of this.computers)
        {
            json.ipAddresses.push(computer.ipAddress);
        }
        return json;
    }

    static fromJSON(json, startingPoint)
    {
        let connection = new Connection(json.name);
        connection.startingPoint = startingPoint;
        for(let ipAddress of json.ipAddresses)
        {
            connection.addComputer(PublicComputer.getPublicComputerByIPAddress(ipAddress));
        }
        return connection;
    }

    static fromAllPublicServers()
    {
        return this.fromComputerArray(
            helpers.shuffleArray(
                Object.values(PublicComputer.getAllKnownPublicServers())
            )
        );
    }

    static fromComputerArray(computerArray)
    {
        let connection = new Connection();
        for(let computer of computerArray)
        {
            connection.addComputer(computer);
        }
        return connection;
    }

    reverse()
    {
        this.steps.reverse();
        for(let step of this.steps.reverse())
        {
            step.reverse();
        }
        [this.startingPoint, this.endPoint] = [this.endPoint, this.startingPoint];
        return this;
    }
}

Connection.connectionDistance = 50;
Connection.sensitivity = 10;

module.exports = Connection;
