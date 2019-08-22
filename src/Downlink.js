const   MissionGenerator = require('./Missions/MissionGenerator'),
        PlayerComputer = require('./PlayerComputer'),
        EventListener = require('./EventListener');

/**
 * This exists as an instantiable class only because it's really difficult to get static classes to have events
 */
class Downlink extends EventListener
{
    constructor()
    {
        super();
        this.playerComputer = PlayerComputer.getMyFirstComputer();
    }

    tick()
    {
        this.playerComputer.tick();
        this.activeMission.tick();
    }

    getNextMission()
    {

        this.activeMission = MissionGenerator.getFirstAvailableMission();

        for(let target of this.activeMission.hackTargets)
        {
            this.playerComputer.addTaskForChallenge(target);
        }
        return this.activeMission;
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

}

module.exports = new Downlink();