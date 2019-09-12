const   Company = require('../Companies/Company'),
        MissionComputer = require('./MissionComputer'),
        {Password} = require('./Challenges/Password'),
        Encryption = require('./Challenges/Encryption'),
        EventListener = require('../EventListener'),
        validWorldMapPoints = require('../validWorldMapPoints'),
        helpers = require('../Helpers');

const MISSION_STATUSES = {
    UNDERWAY:'underway',
    AVAILABLE:'available',
    COMPLETE:'complete',
    FAILED:'failed'
};


class Mission extends EventListener
{
    /**
     * Any mission is going to involve connecting to another computer belonging to a company and doing something to it
     * @param {Company}    target      The object representing the company you are, in some way, attacking
     * @param {Company}    sponsor     The company sponsoring this hack
     */
    constructor(target, sponsor)
    {
        super();
        this.name = `Hack ${target.name} for ${sponsor.name}`;
        /**
         * @type {Company} the target company being attacked
         */
        this.target = target;
        /**
         * @type {Company} the company sponsoring this mission
         */
        this.sponsor = sponsor;

        // these values are all instantiated later.
        /**
         * @type {number}
         */
        this.difficulty = 0;
        /**
         *
         * @type {MissionComputer}
         */
        this.computer = null;

        /**
         * @type {string} A constant enum value used for state checking
         */
        this.status = MISSION_STATUSES.AVAILABLE;

    }

    setDifficulty(difficulty)
    {
        this.difficulty = difficulty;
    }

    get challenges()
    {
        return this.computer.challenges;
    }

    /**
     * A method to set the computer for this mission.
     * This is kept as a separate method because we only really want the mission to be populated when we take it,
     * not when we're just listing it.
     *
     *
     */
    build()
    {
        if(this.computer)
        {
            return this;
        }

        this.setDifficulty(this.target.securityLevel);

        let serverType = "Server";
        if(this.difficulty > 10)
        {
            serverType = 'Server Farm';
        }
        else if(this.difficulty > 5)
        {
            serverType = 'Cluster';
        }

        this.computer = new MissionComputer(this.target, serverType)
            .setPassword(Password.getPasswordForDifficulty(this.difficulty))
            .setEncryption(new Encryption(this.difficulty))
            .setLocation(helpers.getRandomArrayElement(validWorldMapPoints))
            .on('accessed', ()=>{
                this.signalComplete();
            }).on('connectionStepTraced', (step)=>{
                this.trigger("connectionStepTraced", step);
            }).on('hackTracked', ()=>{
                console.log('Connection traced');
                this.status = MISSION_STATUSES.FAILED;
                this.target.traceHacker();
                this.trigger('hackTracked');
                this.computer.disconnect();
            }).on('updateTracePercentage', (percentage)=>{
                this.trigger('updateTracePercentage', percentage);
            });

        this.status = MISSION_STATUSES.UNDERWAY;
        return this;
    }

    /**
     * @returns {number}
     */
    get reward()
    {
        return Math.pow((this.difficulty * this.computer.difficultyModifier), this.sponsor.playerRespectModifier);
    }

    signalComplete()
    {
        this.status = MISSION_STATUSES.COMPLETE;
        this.sponsor.finishMission(this);
        this.target.increaseSecurityLevel();
        this.trigger('complete');
    }

    set connection(connection)
    {
        this.computer.connect(connection);
    }

    get connection()
    {
        return this.computer.currentPlayerConnection;
    }

    tick()
    {
        if(this.status === MISSION_STATUSES.COMPLETE)
        {
            return;
        }
        this.build();
        this.computer.tick();
    }

    static getNewMission()
    {
        let companies = helpers.shuffleArray([...Company.allCompanies]),
            source = companies.shift(),
            target = companies.shift();
        return new Mission(source, target);
    }
}
module.exports = Mission;
