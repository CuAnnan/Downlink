const   MissionGenerator = require('./Missions/MissionGenerator'),
        //PlayerComputer = require('./PlayerComputer'),
        EventListener = require('./EventListener'),
        Connection = require('./Connection'),
        Company = require('./Company'),
        ComputerGenerator = require('./Computers/ComputerGenerator'),
        Decimal = require('decimal.js');

/**
 * This class serves to expose, to the front end, any of the game classes functionality that the UI needs access to
 * It exists only as a means of hard encapsulation
 * This exists as an instantiable class only because it's really difficult to get static classes to have events
 */
class Downlink extends EventListener
{
    constructor()
    {
        super();
        this.playerComputer = null;
        /**
         *
         * @type {Connection}
         */
        this.playerConnection = null;
        this.getNewConnection();
        this.currency = new Decimal(0);
    }

    getNewConnection()
    {
        this.playerConnection = new Connection("Player Connection");
        return this.playerComputer;
    }

    setPlayerComputer()
    {
        this.playerComputer = ComputerGenerator.newPlayerComputer();
        return this.playerComputer;
    }

    tick()
    {
        this.playerComputer.tick();
        this.activeMission.tick();
    }

    getNextMission()
    {
        this.activeMission = MissionGenerator.getFirstAvailableMission().on("complete", ()=>{
            this.finishCurrentMission(this.activeMission);
        });
        for(let challenge of this.activeMission.challenges)
        {
            challenge.on("solved", ()=>{this.challengeSolved(challenge)});
            this.playerComputer.addTaskForChallenge(challenge);
        }
        return this.activeMission;
    }

    finishCurrentMission(mission)
    {
        this.currency = this.currency.add(mission.reward);
    }

    challengeSolved(challenge)
    {
        this.trigger("challengeSolved", challenge);
    }

    /**
     * Just exposing the currently available missions
     */
    get availableMissions()
    {
        return MissionGenerator.availableMissions;
    }

    get currentMissionTasks()
    {
        return this.playerComputer.missionTasks;
    }

    get allPublicServers()
    {
        let servers = [];
        for(let company of Company.allCompanies)
        {
            servers.push(company.publicServer);
        }
        return servers;
    }

    /**
     *
     * @returns {[<Company>]}
     */
    get companies()
    {
        return Company.allCompanies;
    }

    performPostLoad(canvas)
    {
        this.buildComputerGenerator(canvas);
        Company.setAllPublicServerLocations();
    }

    buildComputerGenerator(imageReference)
    {
        ComputerGenerator.defineMapImage(imageReference);
    }

    /**
     * @param {<Computer>} computer
     * @returns {<Connection>}
     */
    addComputerToConnection(computer)
    {
        let result = this.playerConnection.addComputer(computer);
        return result;
    }
}

module.exports = new Downlink();
