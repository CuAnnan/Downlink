const   ComputerGenerator = require('../Computers/ComputerGenerator'),
        helper = require('../Helpers'),
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
        this.securityLevel = 1;
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
        this.playerRespectModifier *= Company.missionSuccessIncreaseExponent;
    }

    traceHacker()
    {
        this.playerRespectModifier /= Company.hackDetectedExponent;
    }

    static get hackDetectedExponent()
    {
        return 1.02;
    }

    increaseSecurityLevel()
    {
        this.securityLevel *= Company.securityIncreaseExponent;
    }

    static get securityIncreaseExponent()
    {
        return 1.009;
    }

    static get missionSuccessIncreaseExponent()
    {
        return 1.0085;
    }

    /**
     * @returns {[<Company>]}
     */
    static get allCompanies()
    {
        return companies;
    }

    static setAllPublicServerLocations(validWorldMapPoints)
    {
        if(locationsSet)
        {
            return;
        }

        for(let company of companies)
        {
            company.publicServer.setLocation(helper.popRandomArrayElement(validWorldMapPoints));
        }
        locationsSet = true;
    }

    toJSON()
    {

        let json = {
            name:this.name,
            publicServer:this.publicServer.toJSON(),
            playerRespectModifier:this.playerRespectModifier,
            securityLevel:this.securityLevel
        };

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
        company.securityLevel = parseFloat(companyJSON.securityLevel);
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
