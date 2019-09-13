const   MissionGenerator = require('./Missions/MissionGenerator'),
        EventListener = require('./EventListener'),
        Connection = require('./Connection'),
        Company = require('./Companies/Company'),
        ComputerGenerator = require('./Computers/ComputerGenerator'),
        CPU = require('./Computers/CPU'),
        helper = require('./Helpers'),
        Research = require('./Computers/Research/Research'),
        Decimal = require('break_infinity.js');

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
        /**
         * @type {PlayerComputer}
         */
        this.playerComputer = null;
        /**
         *
         * @type {Connection}
         */
        this.playerConnection = null;
        this.runTime = 0;
        this.lastTickTime = Date.now();
        this.missionData = {
            taken:0,
            failed:0,
            succeeded:0
        };
        this.autoPurchaseCPUs = false;
        /**
         * @type {Decimal}
         */
        this.currency = new Decimal(0);
    }

    setPlayerComputer(location)
    {
        this.playerComputer = ComputerGenerator.newPlayerComputer(location);
        return this.playerComputer;
    }

    getPlayerComputer(location)
    {
        if(!this.playerComputer)
        {
            this.setPlayerComputer(location);
        }
        this.playerComputer.once('cpuPoolEmpty', ()=>{
            this.trigger('cpuPoolEmpty');
        }).on('cpuBurnedOut', (slot, cpu)=>{
            if(this.autoPurchaseCPUs)
            {
                this.autoBuyCPU(cpu, slot);
            }
        });
        return this.playerComputer;
    }

    tick()
    {
        let now = Date.now();
        this.runTime += now - this.lastTickTime;

        let tasks = this.playerComputer.tick();
        if(this.activeMission)
        {
            this.activeMission.tick();
        }
        this.lastTickTime = Date.now();
        return {
            tasks:tasks
        }
    }

    getNextMission()
    {
        if(this.playerComputer.cpuPool.cpuCount === 0)
        {
            return null;
        }
        this.missionData.taken ++;
        this.activeMission = MissionGenerator.getFirstAvailableMission()
            .on("complete", ()=>{
                this.finishCurrentMission(this.activeMission);
                this.activeMission = null;
                this.missionData.succeeded++;
                this.trigger('missionComplete');
            })
            .on("hackTracked", ()=>{
                this.missionData.failed++;
                this.playerComputer.clearMissionTasks();
            });
        this.activeMission.computer.connect(this.playerConnection);
        for(let challenge of this.activeMission.challenges)
        {
            challenge.on("solved", ()=>{this.challengeSolved(challenge)});
            this.playerComputer.addTaskForChallenge(challenge);
        }
        return this.activeMission;
    }

    disconnectFromMissionServer()
    {
        if(this.activeMission)
        {
            this.activeMission.computer.disconnect();
            for (let task of this.playerComputer.missionTasks)
            {
                task.pause();
            }
        }
    }

    reconnectToMissionServer()
    {
        this.activeMission.computer.reconnect(this.playerConnection);
        for(let task of this.playerComputer.missionTasks)
        {
            task.resume();
        }
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
        let allValidPoints = [...require('./validWorldMapPoints')];
        this.getPlayerComputer(helper.popRandomArrayElement(allValidPoints));
        this.autoBuildConnection();
        Company.setAllPublicServerLocations(allValidPoints);
    }

    buildComputerGenerator(imageReference)
    {
        ComputerGenerator.defineMapImage(imageReference);
    }

    /**
     * @param {Computer} computer
     * @returns {Connection}
     */
    addComputerToConnection(computer)
    {
        return this.playerConnection.addComputer(computer);
    }

    autoBuildConnection()
    {
        this.playerConnection = Connection.fromAllPublicServers();
        this.playerConnection.setStartingPoint(this.playerComputer).initialise();
        return this.playerConnection;
    }

    get currentConnection()
    {
        if(this.activeMission)
        {
            return this.activeMission.connection;
        }
        else
        {
            return this.playerConnection;
        }
    }

    toJSON()
    {
        let json = {
            playerComputer:this.playerComputer.toJSON(),
            playerConnection:this.playerConnection.toJSON(),
            companies:[],
            currency:this.currency.toString(),
            runTime:this.runTime,
            researches:Research.categoryResearches,
            missionData:this.missionData,
            autoPurchaseCPUs:this.autoPurchaseCPUs
        };
        for(let company of this.companies)
        {
            json.companies.push(company.toJSON());
        }
        return json;
    }

    static fromJSON(json)
    {
        Company.loadCompaniesFromJSON(json.companies);
        Research.loadJSON(json.researches);

        let downlink = new Downlink();

        downlink.currency = Decimal.fromString(json.currency);
        downlink.playerComputer = ComputerGenerator.fromJSON(json.playerComputer);
        downlink.runTime = parseInt(json.runTime);
        downlink.lastTickTime = Date.now();
        downlink.missionData = json.missionData;
        downlink.autoPurchaseCPUs = json.autoPurchaseCPUs;


        downlink.playerConnection = Connection.fromJSON(json.playerConnection);
        downlink.playerConnection.setStartingPoint(downlink.playerComputer);

        return downlink;
    }

    static getNew()
    {
        Company.buildCompanyList();
        Research.loadDefaultJSON();
        let dl = new Downlink();
        return dl;
    }

    static stop()
    {

    }

    getTaskByHash(hash)
    {
        for(let task of this.playerComputer.cpuPool.tasks)
        {
            if(task.hash === hash)
            {
                return task;
            }
        }
    }

    get secondsRunning()
    {
        return Math.floor(this.runTime / 1000);
    }

    canAfford(cost)
    {
        return this.currency.greaterThan(cost);
    }

    autoBuyCPU(cpuData, slot)
    {
        let cpu = CPU.getCPUByName(cpuData.name);
        this.currency = this.currency.minus(CPU.getPriceFor(cpuData) * 1.5);
        this.playerComputer
            .setCPUSlot(slot, cpu)
            .updateLoadBalance();
        this.trigger('cpusAutoReplaced');
    }

    buyCPU(cpuData, slot)
    {
        let cpu = CPU.fromJSON(cpuData);
        this.currency = this.currency.minus(CPU.getPriceFor(cpuData));
        this.playerComputer
            .setCPUSlot(slot, cpu)
            .updateLoadBalance();
    }

    alterCPULoad(taskHash, direction)
    {
        return this.playerComputer.alterCPULoad(taskHash, direction);
    }

    get cpuIncreaseCost()
    {
        return this.playerComputer.cpuPool.maxCPUs * 1000
    }

    buyMaxCPUIncrease()
    {
        this.currency = this.currency.minus(this.cpuIncreaseCost);
        this.playerComputer.increaseCPUPoolSize();
    }

    get availableResearch()
    {
        return Research.availableResearch;
    }

    startResearch(researchItemName)
    {
        let researchItem = Research.getItemByName(researchItemName);
        researchItem.on('complete', ()=>{
            this.playerComputer.updateCPUPool();
            this.trigger('researchComplete');
        });

        this.playerComputer.startResearchTask(researchItem);
    }

    get currentCPUTasks()
    {
        return this.playerComputer.currentCPUTasks;
    }

    setCPUAutoPurchase(autoPurchase)
    {
        this.autoPurchaseCPUs = autoPurchase;
    }

}

module.exports = Downlink;
