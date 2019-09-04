const   Computer = require('../Computers/Computer');
let  DIFFICULTY_EXPONENT = 1.8;


class MissionComputer extends Computer
{
    constructor(company, serverType)
    {
        let name = company.name+' '+serverType;
        super(name, null);
        /**
         * @type {string}
         */
        this.serverType = serverType;
        /**
         * @type {Encryption}   The Encryption this computer has on it
         */
        this.encryption = null;
        /**
         * @type {Password}     The Password this computer has on it
         */
        this.password = null;
        /**
         * Whether or not this computer has been successfully hacked
         * @type {boolean}
         */
        this.accessible = false;
        /**
         * The current connection by which the player accesses this computer
         * @type {Connection}
         */
        this.currentPlayerConnection = null;
        /**
         * The  connection by which the player last accessed this computer
         * @type {Connection}
         */
        this.previousPlayerConnection = null;
        /**
         * Whether or not the administrator of this computer should have been alerted as to the breach
         * @type {boolean}
         */
        this.alerted = false;
        /**
         * The set of all challenges that need to be overcome in order to access this computer
         * @type {Array.<Challenge>}
         */
        this.challenges = [];
        /**
         * We need this reference to determine how much the Mission Computer traces the connection each tick
         */
        this.company = company;
        this.difficultyModifier = 0;
        MissionComputer.computersSpawned++;
    }

    get uniqueID()
    {
        return `${this.name}_${MissionComputer.computersSpawned}`;
    }

    toJSON()
    {
        let json = super.toJSON();
        json.serverType = this.serverType;
    }

    fromJSON(companyJSON, company)
    {
        let computer = new MissionComputer(company, companyJSON.serverType);
        computer.setLocation(companyJSON.location);
    }

    /**
     * @param {Connection} connection
     */
    connect(connection)
    {
        super.connect();
        let clone = connection.clone();
        clone.setEndPoint(this);

        clone
            .once("connectionTraced", ()=>{
                this.trigger('hackTracked');
            }).on('stepTraced',(step)=>{
                this.trigger('connectionStepTraced', step);
            }).on('updateTracePercentage', (percentage)=>{
                this.trigger('updateTracePercentage', percentage);
            });
        this.currentPlayerConnection = clone;


        if(this.alerted)
        {
            this.startTraceBack();
        }


        return this;
    }

    disconnect()
    {
        super.disconnect();
        this.currentPlayerConnection.close();
        this.stopTraceBack();
        return this;
    }

    reconnect(connection)
    {
        if(connection.equals(this.currentPlayerConnection))
        {
            this.resumeTraceback();
        }
        else
        {
            this.connect(connection);
        }
        this.currentPlayerConnection.open();
        return this;
    }

    addChallenge(challenge)
    {
        challenge
            .setComputer(this)
            .on('solved', ()=>{
                this.updateAccessStatus();
                challenge.off();
            })
            .on('start', ()=>{this.startTraceBack();});

        this.difficultyModifier += Math.pow(challenge.difficulty, DIFFICULTY_EXPONENT);
        this.challenges.push(challenge);
        this.traceSpeed = Math.pow(this.difficultyModifier, this.company.securityLevel);
    }

    setEncryption(encryption)
    {
        this.encryption = encryption;
        this.addChallenge(encryption);
        return this;
    }

    setPassword(password)
    {
        this.password = password;
        this.addChallenge(password);
        return this;
    }

    updateAccessStatus()
    {
        if(!this.accessible)
        {
            let accessible = true;
            for(let challenge of this.challenges)
            {
                accessible = accessible && challenge.solved;
            }
            this.accessible = accessible;
        }

        if(this.accessible)
        {
            this.trigger('accessed');
        }
        return this.accessible;
    }

    tick()
    {
        if(this.tracingConnection)
        {
            this.currentPlayerConnection.traceStep(this.traceSpeed);
        }
    }

    startTraceBack()
    {
        if(this.tracingConnection)
        {
            return;
        }
        this.currentPlayerConnection.connect();
        this.tracingConnection = true;
    }

    resumeTraceback()
    {
        this.currentPlayerConnection.reconnect();
        this.tracingConnection = true;
    }

    stopTraceBack()
    {
        this.tracingConnection = false;
    }
}
MissionComputer.computersSpawned = 0;

module.exports = MissionComputer;
