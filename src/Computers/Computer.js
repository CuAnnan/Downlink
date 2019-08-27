const EventListener = require('../EventListener');

function randomIPAddress()
{
    let ipAddress = "";
    for(let i = 0; i < 4; i++)
    {
        if(i)
        {
            ipAddress += '.';
        }
        ipAddress += Math.floor(Math.random() * 256);
    }
    return ipAddress;
}

class Computer extends EventListener
{
    /**
     *
     * @param {string}      name      The name of the computer
     * @param {Computer}    company   The company the computer belongs to
     * @param {string|null} ipAddress The ipAddress, if none provided a random ip address
     */
    constructor(name, company, ipAddress)
    {
        super();
        this.name= name;
        this.ipAddress = ipAddress?ipAddress:randomIPAddress();
        this.location = null;
        this.company = company;
    }

    setLocation(location)
    {
        this.location = location;
        return this;
    }

    connect()
    {
        return this;
    }

    disconnect()
    {
        return this;
    }

    tick()
    {

    }

    static fromJSON(json, company)
    {
        let computer = new this(json.name, company, json.ipAddress);
        computer.setLocation(json.location);
        return computer;
    }

    toJSON()
    {
        return {
            className:this.constructor.name,
            name:this.name,
            ipAddress:this.ipAddress,
            location:this.location
        };
    }
}

module.exports = Computer;
