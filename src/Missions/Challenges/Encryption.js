const   Challenge = require('./Challenge'),
        helper = require('../../Helpers');
class Encryption extends Challenge
{
    /**
     *
     * @param {number} difficulty
     */
    constructor(difficulty)
    {
        let rows = Encryption.getDimensionForDifficulty(difficulty),
            cols = Encryption.getDimensionForDifficulty(difficulty),
            size = rows * cols;
        let name = "Linear";
        if(difficulty > 10)
        {
            name = 'Cubic';
        }
        else if(difficulty > 5)
        {
            name = 'Quadratic';
        }
        super(name + ' Encryption', difficulty);
        this.rows = rows;
        this.cols = cols;
        this.size = size;
    }

    get calculatedDifficulty()
    {
        return Math.pow(Math.min(this.rows, this.cols), Challenge.difficultyExponent);
    }

    static getDimensionForDifficulty(difficulty)
    {
        const   flooredDifficulty = Math.floor(difficulty),
                min = (5 + flooredDifficulty),
                max = (5 + flooredDifficulty) * 2;
        return helper.getRandomIntegerBetween(min, max);
    }
}

module.exports = Encryption;
