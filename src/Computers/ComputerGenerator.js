const   PlayerComputer = require('./PlayerComputer'),
        Computer = require('./Computer'),
        CPU = require('./CPU'),
        PublicComputer= require('./PublicComputer'),
        MissionComputer = require('../Missions/MissionComputer'),
        constructors = {PlayerComputer:PlayerComputer, PublicComputer:PublicComputer, MissionComputer:MissionComputer},
        helpers = require('../Helpers');

class ComputerGenerator
{
    constructor()
    {
        this.canvasContext = null;
        this.boundaries = {};
    }

    /**
     * In order to determine valid locations for any new computer, the class needs a reference to the image so that
     * a random point on the image|map is on a land mass. This method builds up a canvas and throws the image onto
     * the canvas. The canvas' context is then bound as an instance variable
     * @see getRandomLandboundPoint
     * @param {object} canvas
     */
    defineMapImage(canvas)
    {

        this.boundaries = {
            x:{min:0, max:canvas.width},
            y:{min:0, max:canvas.height}
        };
        this.canvasContext = canvas.getContext('2d');
        return this;
    }

    newPlayerComputer(location)
    {
        let potato = new PlayerComputer([
            new CPU(),
            new CPU(),
            new CPU(),
            new CPU()
        ]);
        potato.setLocation(location);
        return potato;
    }

    newPublicServer(company)
    {
        let server = new PublicComputer(company.name+' Public Server');
        server.setCompany(company);
        return server;
    }

    fromJSON(computerJSON, company)
    {
        let computer = constructors[computerJSON.className].fromJSON(computerJSON, company);
        return computer;
    }
}



module.exports = new ComputerGenerator();
