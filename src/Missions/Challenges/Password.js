const   dictionary = require('./dictionary'),
        Challenge = require('./Challenge'),
        Alphabet = require('../../Alphabet'),
        helpers = require('../../Helpers');

const PASSWORD_TYPES = {
    'DICTIONARY':'Dictionary',
    'ALPHANUMERIC':'Alphanumeric'
};
const PASSWORD_DICTIONARY_DIFFICULTIES = {
    'EASIEST':1,
    'HARDEST':3
};

class Password extends Challenge
{
    constructor(text, difficulty, type)
    {
        super(type + ' Password', difficulty) ;
        this.text = text;
        this.length = text.length;
    }

    attack(testPassword)
    {
        this.trigger('start');
        return testPassword === this.text;
    }

    get calculatedDifficulty()
    {
        return Math.pow(this.length, Challenge.difficultyExponent);
    }

    static get PASSWORD_DICTIONARY_DIFFICULTIES()
    {
        return PASSWORD_DICTIONARY_DIFFICULTIES;
    }

    static getPasswordForDifficulty(difficulty)
    {
        if(difficulty <= PASSWORD_DICTIONARY_DIFFICULTIES.HARDEST)
        {
            return DictionaryPassword.getRandomPassword(difficulty);
        }
        return AlphanumericPassword.getRandomPassword(difficulty);
    }

}

class AlphanumericPassword extends Password
{
    constructor(text, difficulty)
    {
        super(text, difficulty, 'Alphanumeric');
        this.lettersSolved = 0;
    }

    attackLetter(letter)
    {
        if(this.text.charAt(this.lettersSolved) === letter)
        {
            this.lettersSolved ++;
            return true;
        }
        return false;
    }

    static getRandomPassword(difficulty)
    {
        let stringLength = helpers.getRandomIntegerBetween(5, 10) + Math.floor(difficulty);
        let password = '';
        for (let i = 0; i < stringLength; i++)
        {
            password += Alphabet.getRandomLetter();
        }
        return new AlphanumericPassword(password, difficulty);
    }
}

class DictionaryPassword extends Password
{
    constructor(text, difficulty, dictionary)
    {
        super(text, difficulty, 'Dictionary');
        this.dictionary = dictionary;
    }

    /**
     *
     * @param {number} difficulty should be between one and 10
     * @returns {DictionaryPassword}
     */
    static getRandomPassword(difficulty)
    {
        let usedDictionary = DictionaryPassword.reduceDictionary(PASSWORD_DICTIONARY_DIFFICULTIES.HARDEST - Math.min(Math.floor(difficulty), PASSWORD_DICTIONARY_DIFFICULTIES.HARDEST)),
            password = helpers.getRandomArrayElement(usedDictionary);
        return new DictionaryPassword(password, difficulty, usedDictionary);
    }

    static reduceDictionary(reduction)
    {
        let reducedDictionary = [];
        dictionary.forEach((entry, index)=>{if(index%PASSWORD_DICTIONARY_DIFFICULTIES.HARDEST >= reduction){reducedDictionary.push(entry);}});
        return reducedDictionary;
    }
}

module.exports = {Password:Password, DictionaryPassword:DictionaryPassword, AlphanumericPassword:AlphanumericPassword};
