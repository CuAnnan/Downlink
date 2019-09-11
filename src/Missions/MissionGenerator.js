const   Mission = require('./Mission'),
        MINIMUM_MISSIONS = 20;
let availableMissions = [];

class MissionGenerator
{
    static updateAvailableMissions()
    {
        while(availableMissions.length < MINIMUM_MISSIONS)
        {
            availableMissions.push(
                Mission.getNewMission()
            );
        }
    }

    static get availableMissions()
    {
        this.updateAvailableMissions();
        return availableMissions;
    }

    static getFirstAvailableMission()
    {
        this.updateAvailableMissions();
        let mission = availableMissions.shift().build();
        this.updateAvailableMissions();
        return mission;
    }
}

module.exports = MissionGenerator;
