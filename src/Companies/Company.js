const   ComputerGenerator = require('../Computers/ComputerGenerator'),
        companyNames = require('./companies');

/**
 * @type {Array.<Company>}
 */
let companies = [],
    /** @type {boolean} */
    locationsSet = false;


class Company
{
    constructor(name)
    {
        this.name = name;

        this.computers = [];

        /**
         * @type {number} the reward modifier this company offers the player
         * this is based on the accrued successful missions and the number of times the company has detected you hacking
         * one of their servers
         */
        this.playerRespectModifier = 1;
        /**
         * @type {number} the reward modifier this company offers the player
         * this is the increase exponent for successfully achieved missions
         */
        this.missionSuccessIncreaseExponent = 1.001;
    }

    setPublicServer(publicServer)
    {
        this.publicServer = publicServer;
        publicServer.setCompany(this);
    }

    addComputer(computer)
    {
        this.computers.push(computer);
    }

    finishMission(mission)
    {
        this.playerRespectModifier *= this.missionSuccessIncreaseExponent;
    }

    detectHacking()
    {
        this.playerRespectModifier /= (this.missionSuccessIncreaseExponent * 2);
    }

    static getRandomCompany()
    {
        return companies.randomElement();
    }

    /**
     * @returns {[<Company>]}
     */
    static get allCompanies()
    {
        return companies;
    }

    static setAllPublicServerLocations()
    {
        if(locationsSet)
        {
            return;
        }
        for(let company of companies)
        {
            company.publicServer.setLocation(ComputerGenerator.getRandomLandboundPoint());
        }
        locationsSet = true;
    }

    toJSON()
    {

        let json = {
            name:this.name,
            publicServer:this.publicServer.toJSON(),
            computers:[],
            playerRespectModifier:this.playerRespectModifier.toString(),
            missionSuccessIncreaseExponent:this.missionSuccessIncreaseExponent.toString()
        };
        for(let computer of this.computers)
        {
            json.computers.push(computer.toJSON());
        }
        return json;
    }

    static loadCompaniesFromJSON(companiesJSON)
    {
        companies = [];
        for(let companyJSON of companiesJSON)
        {
            companies.push(Company.fromJSON(companyJSON));
        }
    }

    static fromJSON(companyJSON)
    {
        let company = new Company(companyJSON.name);
        company.setPublicServer(ComputerGenerator.fromJSON(companyJSON.publicServer));
        company.playerRespectModifier = parseFloat(companyJSON.playerRespectModifier);
        company.missionSuccessIncreaseExponent = parseFloat(companyJSON.missionSuccessIncreaseExponent);

        for(let computerJSON of company.computers)
        {
            company.addComputer(ComputerGenerator.fromJSON(computerJSON, company));
        }
        locationsSet = true;
        return company;
    }

    static buildCompanyList()
    {
        companies = [];
        for(let companyName of companyNames)
        {
            let company = new Company(companyName);
            company.setPublicServer(ComputerGenerator.newPublicServer(company));
            companies.push(company);
        }
    }
}


module.exports = Company;
