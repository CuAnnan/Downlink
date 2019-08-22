const   Computer = require('../Computer');
class MissionComputer extends Computer
{
    constructor(company, serverType)
    {
        let name = company.name+' '+serverType;
        super(name, company);
        this.encryption = null;
        this.password = null;
        this.accessible = false;
        this.currentPlayerConnection = null;
        this.previousPlayerConnection = null;
        this.alerted = false;

    }

    /**
     * @param {Connection} connection
     */
    connect(connection)
    {
        connection.open();
        super.connect();
        this.currentPlayerConnection = connection;

        if(this.currentPlayerConnection.equals(this.previousPlayerConnection) && this.alerted === true)
        {
            this.resumeTraceBack();
        }

        return this;
    }

    disconnect()
    {
        super.disconnect();
        this.currentPlayerConnection.close();
        this.stopTraceBack();
        return this;
    }

    setEncryption(encryption)
    {
        this.encryption = encryption;

        encryption
            .on('solved', ()=>{
                this.updateAccessStatus();
                encryption.off();
            })
            .on('start', ()=>{this.startTraceBack();});
        return this;
    }

    setPassword(password)
    {
        this.password = password;

        // password is not handled the same as encryption
        // because password is not a Tasks
        // the PasswordCracker Tasks isn't
        password.on('solved', ()=>{
            this.updateAccessStatus();
            password.off();
        }).on('start', ()=>{this.startTraceBack();});
        return this;
    }

    updateAccessStatus()
    {
        this.accessible = this.accessible || (this.encryption && this.encryption.solved && this.password && this.password.solved);
        if(this.accessible)
        {
            this.trigger('accessed');
        }
        return this.accessible;
    }

    startTraceBack()
    {

    }

    resumeTraceBack()
    {

    }

    stopTraceBack()
    {

    }
}

module.exports = MissionComputer;
