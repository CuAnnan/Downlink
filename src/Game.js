// This file is solely responsible for exposing the necessary parts of the game to the UI elements
(($)=>{$(()=>{

    const   Downlink = require('./Downlink'),
            CPU = require('./Computers/CPU'),
            EncryptionCracker = require('./Computers/Tasks/EncryptionCracker'),
            {PasswordCracker} = require('./Computers/Tasks/PasswordCracker'),
            Decimal = require('break_infinity.js'),
            TICK_INTERVAL_LENGTH=100,
            MISSION_LIST_CLASS = 'mission-list-row',
            COMPANY_REP_CLASS = 'company-rep-row',
            COMPANY_SECURITY_CLASS = 'company-security-col',
            COMPANY_REP_VALUE_CLASS = 'company-rep-col',
            CPU_MISSION_TASK = 'cpu-mission-task',
            PLAYER_COMPUTER_CPU_ROW_CLASS = "cpu-row";

    function parseVersionNumber(versionNumberAsString)
    {
        let parts = versionNumberAsString.split('.'),
            partAsNumber = 0;
        for(let partIndex in parts)
        {
            let exponent = parts.length - 1 - partIndex,
                part = parseInt(parts[partIndex], 10),
                multiple = Math.pow(1000, exponent);
            partAsNumber +=  (part * multiple);
        }
        return partAsNumber
    }

    let game = {
        interval:null,
        ticking:true,
        initialised:false,
        takingMissions:false,
        mission:false,
        computer:null,
        downlink:null,
        version:"0.5.0b",
        requiresHardReset:true,
        canTakeMissions:true,
        requiresNewMission:true,
        minimumVersion:"0.5.0b",
        /**
         * jquery entities that are needed for updating
         */
        $missionContainer:null,
        $activeMissionName:null,
        $activeMissionPassword:null,
        $activeMissionEncryptionGrid:null,
        $activeMissionEncryptionType:null,
        $activeMissionIPAddress:null,
        $activeMissionServerName:null,
        $playerCurrencySpan:null,
        $playerStandingsTitle:null,
        $playerStandingsContainer:null,
        $playerComputerCPUListContainer:null,
        $worldMapModal:null,
        $worldMapContainer:null,
        $worldMapCanvasContainer:null,
        $activeMissionServer:null,
        $settingsTimePlayed:null,
        $settingsModal:null,
        $importExportTextarea:null,
        $computerBuildModal:null,
        $computerBuild:null,
        $computerPartsCPURow:null,
        $connectionLength:null,
        $connectionTraced:null,
        $connectionWarningRow:null,
        $missionToggleButton:null,
        $connectionTracePercentage:null,
        $connectionTraceBar:null,
        $encryptionCells:null,
        $activeMissionTraceStrength:null,
        $activeMissionDisconnectButton:null,
        $cpuTasksCol:null,
        $gridSizeIncreaseSpan:null,
        $gridSizeCostSpan:null,
        $gridSizeButton:null,
        $researchModal:null,
        $researchModalBody:null,
        /**
         * HTML DOM elements, as opposed to jQuery entities for special cases
         */
        mapImageElement:null,
        bindUIElements:function()
        {
            this.$missionContainer = $('#mission-list');
            this.$activeMissionName = $('#active-mission');
            this.$activeMissionServer = $('#active-mission-machine-details');
            this.$activeMissionPassword = $('#active-mission-password-input');
            this.$activeMissionEncryptionGrid = $('#active-mission-encryption-grid');
            this.$activeMissionEncryptionType = $('#active-mission-encryption-type');
            this.$activeMissionIPAddress = $('#active-mission-server-ip-address');
            this.$activeMissionServerName = $('#active-mission-server-name');
            this.$playerCurrencySpan = $('#player-currency');
            this.$playerStandingsTitle = $('#player-company-standings-title');
            this.$playerStandingsContainer = $('#player-company-standings');
            this.$playerComputerCPUListContainer = $('#player-computer-processors');
            this.$worldMapModal = $('#connection-modal');
            this.$worldMapContainer = $('#world-map');
            this.$worldMapCanvasContainer = $('#canvas-container');
            this.$worldMapModal.on("hide.bs.modal", ()=>{this.afterHideConnectionManager()});
            this.$settingsTimePlayed = $('#settings-time-played');
            this.$settingsModal = $('#settings-modal');
            this.$importExportTextarea = $('#settings-import-export');
            this.$computerBuildModal = $('#computer-build-modal');
            this.$computerBuild = $('#computer-build-layout');
            this.$computerPartsCPURow = $('#computer-parts-cpu-row');
            this.$connectionLength = $('#connection-length');
            this.$connectionTraced = $('#connection-traced');
            this.$connectionTracePercentage = $('#connection-trace-percentage');
            this.$connectionTraceBar = $('#connection-trace-bar');
            this.$connectionWarningRow = $('#connection-warning-row');
            this.$activeMissionTraceStrength = $('#active-mission-trace-strength');
            this.$cpuTasksCol = $('#tasks-col');
            this.$gridSizeIncreaseSpan = $('#grid-size-increase-amount');
            this.$gridSizeCostSpan = $('#grid-size-increase-cost');
            this.$researchModal = $('#research-modal');
            this.$researchModalBody = $('#research-modal-body');

            this.$gridSizeButton = $('#increase-cpu-grid-size').click(()=>{this.increaseCPUPoolSize()});
            this.$activeMissionDisconnectButton = $('#disconnect-button').click(()=>{this.disconnect()});
            this.$missionToggleButton = $('#missions-toggle-button').click(()=>{this.toggleMissions();});

            $('#settings-export-button').click(()=>{this.$importExportTextarea.val(this.save());});
            $('#settings-import-button').click(()=>{this.importFile(this.$importExportTextarea.val())});
            $('#settings-save-button').click(()=>{this.saveFile();});
            $('#connectionModalLink').click(()=>{this.showConnectionManager();});
            $('#settingsModalLink').click(()=>{this.showSettingsModal();});
            $('#researchModalLink').click(()=>{this.showResearchModal();});
            $('#game-version').html(this.version);
            $('#computerModalLink').click(()=>{this.showComputerBuildModal()});
            $('#connection-auto-build-button').click(()=>{this.autoBuildConnection()});

        },
        toggleMissions:function()
        {
            this.takingMissions = !this.takingMissions;
            if(this.takingMissions)
            {
                this.$missionToggleButton.text("Stop Taking Missions");
                this.$activeMissionDisconnectButton.removeAttr('disabled');
            }
            else
            {
                this.$missionToggleButton.text("Start Taking Missions");
            }
        },
        buildWorldMap:function()
        {
            let image = new Image();
            this.mapImageElement = image;
            /*
             This is needed so that we can know what the image values are before the game loads
             */
            return new Promise((resolve)=>{

                image.onload =()=>{
                    this.buildCanvas();
                    resolve();
                };
                image.src = './img/osm-world-map.png';
            });
        },
        getFreshCanvas()
        {
            let canvas = document.createElement('canvas');
            canvas.width = this.mapImageElement.width;
            canvas.height = this.mapImageElement.height;
            canvas
                .getContext('2d')
                .drawImage(
                    this.mapImageElement, 0, 0,
                    this.mapImageElement.width, this.mapImageElement.height
                );
            this.$worldMapCanvasContainer.empty().append($(canvas));
            return canvas;
        },
        /**
         * Using a canvas for two reasons. JavaScript requires one to figure out whether a random point is landbound or not
         * This will pass a fresh copy of the canvas to the Downlink object to keep for that purpose and also draw
         * one to the dom. The one on the dom will be drawn to and deleted and drawn to and deleted, but the
         * Downlink object needs to know the raw one.
         */
        buildCanvas:function()
        {
            this.downlink.performPostLoad(this.getFreshCanvas());

            this.$worldMapContainer.css({
                height:this.mapImageElement.height+'px',
                width:this.mapImageElement.width+'px'
            });
        },
        autoBuildConnection:function()
        {
            this.downlink.autoBuildConnection();
            this.updateConnectionMap();
        },
        newGame:function()
        {
            this.downlink = Downlink.getNew();
        },
        loadGame:function(json)
        {
            this.downlink = Downlink.fromJSON(json);
        },
        saveFile:function()
        {
            let data = new Blob([this.save()], {type: 'text/plain'}),
                a = document.createElement('a');
            a.href = window.URL.createObjectURL(data);
            a.download = 'Downlink-Save.txt';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        },
        importFile:function(json)
        {
            this.stop();
            this.initialised = false;
            this.loadGame(json);
            this.performPostLoadCleanup().then(()=>{
                this.start();
            });
        },
        needsHardReset:function(saveFile)
        {
            if(!saveFile.version)
            {
                return true;
            }
            let oldVersionAsInt = parseVersionNumber(saveFile.version),
                minVersionAsInt = parseVersionNumber(this.minimumVersion);
            return (oldVersionAsInt < minVersionAsInt);
        },
        initialise:function()
        {
            this.bindUIElements();

            let saveFile = this.load();
            if (saveFile && !this.needsHardReset(saveFile))
            {
                this.loadGame(saveFile);
            }
            else
            {
                this.newGame();
            }

            return this.performPostLoadCleanup();
        },
        performPostLoadCleanup:function()
        {
            this.updatePlayerDetails();

            this.initialised = true;
            return this.buildWorldMap().then(()=>{
                let pc = this.downlink.getPlayerComputer();
                pc.on('cpuBurnedOut', ()=>{this.buildComputerGrid();});
                pc.on('cpuPoolEmpty', ()=>{this.handleEmptyCPUPool();});
                this.addComputerToWorldMap(pc);
                this.updateComputerBuild();
                this.buildComputerPartsUI();
                this.buildComputerGrid();
                this.buildCompanyStateTable();

                this.canTakeMissions = pc.cpuPool.cpuCount > 0;
                this.updateMissionToggleButton();

                this.addPublicComputersToWorldMap();
                this.$connectionLength.html(this.downlink.playerConnection.connectionLength);
                this.showOrHideConnectionWarning();

                this.ticking = true;
                this.updateConnectionMap();
                this.save();
            });
        },
        addPublicComputersToWorldMap:function()
        {
            for(let computer of this.downlink.allPublicServers)
            {
                this.addComputerToWorldMap(computer, ()=>{
                    this.addComputerToConnection(computer);
                });
            }
        },
        addComputerToConnection:function(computer)
        {
            this.downlink.addComputerToConnection(computer);
            this.updateConnectionMap();
        },
        updateConnectionMap:function()
        {
            let connection = this.downlink.playerConnection;
            let context = this.getFreshCanvas().getContext('2d');
            let currentComputer = this.downlink.playerComputer;
            for(let computer of connection.computers)
            {
                // connect the current computer to the current computer in the connection
                context.beginPath();
                context.moveTo(currentComputer.location.x, currentComputer.location.y);
                context.lineTo(computer.location.x, computer.location.y);
                context.stroke();
                // set the currentComputer to be the current computer in the connection
                currentComputer = computer;
            }
        },
        start:function(){
            this.ticking = true;
            if(this.initialised)
            {
                this.tick();
            }
            else
            {
                this.initialise().then(() => {
                    this.tick();
                });
            }
            return this;
        },
        stop:function(){
            this.ticking = false;
            window.clearTimeout(this.interval);
            return this;
        },
        "restart":function()
        {
            this.stop().start();
        },
        tick:function() {
            if (this.ticking)
            {
                let tickResults = this.downlink.tick();
                this.animateTasks(tickResults.tasks);
                this.$settingsTimePlayed.html(this.getRunTime());
                if (this.takingMissions && this.requiresNewMission)
                {
                    this.getNextMission();
                }
                this.interval = window.setTimeout(() => {this.tick()}, TICK_INTERVAL_LENGTH);
            }
        },
        animateTasks:function(tasks)
        {
            if(tasks.length)
            {
                for(let task of tasks)
                {
                    if(task instanceof EncryptionCracker)
                    {
                        this.animateEncryptionGrid(task);
                    }
                    else if(task instanceof PasswordCracker)
                    {
                        this.animatePasswordField(task);
                    }
                }
            }
        },
        "setTraceStrength":function(traceStrength)
        {
            this.$activeMissionTraceStrength.text(traceStrength);
        },
        /**
         *
         * @param {PasswordCracker|undefined|null} passwordCracker
         */
        animatePasswordField:function(passwordCracker)
        {
            if(passwordCracker)
            {
                this.$activeMissionPassword
                    .val(passwordCracker.currentGuess)
                    .removeClass("solved-password unsolved-password")
                    .addClass(passwordCracker.completed ? "solved-password" : "unsolved-password");
            }
            else
            {
                this.$activeMissionPassword
                    .removeClass("unsolved-password")
                    .addClass('solved-password');
            }
        },
        updateEncryptionGridUI(numberOfCells, numberOfCols)
        {
            this.$activeMissionEncryptionGrid.css({
                'grid-template-columns':`repeat(${numberOfCols}, 1fr)`,
                "width":numberOfCols * 30+"px"
            });
            const   numberOfExtantCells = this.$activeMissionEncryptionGrid.children().length,
                    diff = numberOfCells - numberOfExtantCells;

            if(diff > 0)
            {
                // we need to add new cells
                let htmlToAppend = '';
                for (let i = 0; i < diff; i++)
                {
                    htmlToAppend += '<div class="encryption-cell unsolved-encryption-cell">*</div>';
                }

                this.$activeMissionEncryptionGrid.append($(htmlToAppend));
            }
            else if(diff < 0)
            {
                // we need to remove cells
                let cellsToRemove = Math.abs(diff);
                $(`.encryption-cell:nth-last-child(-n+${cellsToRemove})`).remove();
            }
            $('.encryption-cell').removeClass('solved-encryption-cell').addClass('unsolved-encryption-cell');
            this.$encryptionCells = document.querySelectorAll('.encryption-cell');
        },
        /**
         *
         * @param {EncryptionCracker} encryptionCracker
         */
        animateEncryptionGrid:function(encryptionCracker)
        {
            let cells = encryptionCracker.cellsForAnimating;
            for(let i = 0; i < cells.length; i++)
            {
                let cell = cells[i];
                let elem = this.$encryptionCells[i];
                let classes = elem.classList;
                if(cell.solved && classes.contains('unsolved-encryption-cell'))
                {
                    classes.remove('unsolved-encryption-cell');
                    classes.add('solved-encryption-cell');
                }
                if(elem.childNodes[0].nodeValue !== cell.letter)
                {
                    elem.childNodes[0].nodeValue = cell.letter;
                }
            }
        },
        disconnect:function()
        {
            if(this.mission && this.mission.computer.currentPlayerConnection.active)
            {
                this.downlink.disconnectFromMissionServer();
                this.$activeMissionDisconnectButton
                    .text('Reconnect')
                    .removeClass('btn-danger')
                    .addClass('btn-primary');
            }
            else
            {
                this.downlink.reconnectToMissionServer();
                this.$activeMissionDisconnectButton
                    .text('Disconnect')
                    .removeClass('btn-primary')
                    .addClass('btn-danger');

            }
        },
        getNextMission:function(){
            if(!this.takingMissions)
            {
                return false;
            }
            this.$activeMissionServer.show();
            this.$connectionTraced.html(0);
            this.$connectionTracePercentage.html(0);
            this.mission = this.downlink.getNextMission();
            this.$activeMissionTraceStrength.text(this.mission.computer.traceSpeed.toFixed(2));
            this.updateMissionInterface(this.mission);
            this.requiresNewMission = false;

            this.downlink
                .on("challengeSolved", (task)=>{this.updateChallenge(task)});
            // bind the mission events to the UI updates
            this.mission.on('complete', ()=>{
                this.updatePlayerDetails();
                this.updateComputerPartsUI();
                this.updateCompanyStates([this.mission.sponsor, this.mission.target]);
                this.requiresNewMission = true;
                this.$connectionTracePercentage.html(0);
                this.$connectionTraceBar.css('width', '0%');
                this.save();
            }).on("connectionStepTraced", (stepsTraced)=>{
                this.$connectionTraced.html(stepsTraced);
            }).on("updateTracePercentage", (percentageTraced)=>{
                this.$connectionTracePercentage.html(percentageTraced);
                this.$connectionTraceBar.css('width', percentageTraced+'%');
            });

        },
        updatePlayerDetails:function()
        {
            this.$playerCurrencySpan.html(this.downlink.currency.toFixed(2));
        },
        updateCompanyStates:function(companiesToUpdate)
        {
            for(let company of companiesToUpdate)
            {
                let $row = $(`.${COMPANY_REP_CLASS}[data-company-name="${company.name}"]`);
                $(`.${COMPANY_REP_VALUE_CLASS}`, $row).text(company.playerRespectModifier.toFixed(2));
                $(`.${COMPANY_SECURITY_CLASS}`, $row).text(company.securityLevel.toFixed(2));
            }
        },
        buildCompanyStateTable:function()
        {
            $(`.${COMPANY_REP_CLASS}`).remove();
            let html = '';
            for(let company of this.downlink.companies)
            {
                html += `<div class="row ${COMPANY_REP_CLASS}" data-company-name="${company.name}">
                    <div class="col">${company.name}</div>
                    <div class="col-2 ${COMPANY_REP_VALUE_CLASS}">${company.playerRespectModifier.toFixed(2)}</div>
                    <div class="col-2 ${COMPANY_SECURITY_CLASS}">${company.securityLevel.toFixed(2)}</div>
                </div>`;
            }
            this.$playerStandingsTitle.after(html);
        },
        updateComputerBuild:function()
        {
            $(`.${PLAYER_COMPUTER_CPU_ROW_CLASS}`).remove();

            for(let cpu of this.downlink.playerComputer.cpus)
            {
                if(cpu)
                {
                    let $row = $(`<div class="row ${PLAYER_COMPUTER_CPU_ROW_CLASS}">
                        <div class="col">${cpu.name}</div>
                        <div class="col-2">${cpu.speed}MHz</div>
                        <div class="col-5 cpu-remaining-cycle">${cpu.remainingLifeCycle}</div>
                    </div>`).appendTo(this.$playerComputerCPUListContainer);
                    cpu.on('lifeCycleUpdated', ()=>{
                        $('.cpu-remaining-cycle', $row).html(cpu.health?cpu.health:"Dead");
                    });
                }
            }
        },
        updateChallenge:function(challenge)
        {
            switch(challenge.constructor.name)
            {
                case "Password":
                    this.animatePasswordField(null);
                    break;
                case "EncryptionGrid":
                    break;
                default:
                    break;
            }
        },
        /**
         *
         * @param {Mission} mission
         */
        updateMissionInterface:function(mission){
            this.updateAvailableMissionList(mission);
            this.updateCurrentMissionView(mission.computer);
        },
        updateCPULoadBalancer:function()
        {
            $(`.${CPU_MISSION_TASK}`).remove();
            let html = '';
            for(let task of this.downlink.currentCPUTasks)
            {
                html += `<div class="row ${CPU_MISSION_TASK}" data-task-hash ="${task.hash}">`+
                    `<div class="col-5 cpu-task-name">${task.name}</div>`+
                    `<div class="col cpu-task-bar">`+
                        `<div class="reduce-cpu-load cpu-load-changer" data-cpu-load-direction="-1">&lt;</div>`+
                        `<div class="percentage-bar-container">`+
                            `<div class="percentage-bar" style="width:${task.loadPercentage}%" data-task-hash ="${task.hash}">&nbsp;</div>`+
                            `<div class="percentage-text" data-task-hash ="${task.hash}">${task.loadPercentage}%</div>`+
                        `</div>`+
                        `<div class="increase-cpu-load cpu-load-changer" data-cpu-load-direction="+1">&gt;</div>`+
                    `</div>`+
                `</div>`;
                task.on('complete', ()=>{this.updateCPULoadBalancer();});
            }
            this.$cpuTasksCol.html(html);
            $('.cpu-load-changer').on("click", (evt)=>{
                let rawDOMElement = evt.currentTarget,
                    row = rawDOMElement.parentElement.parentElement;
                this.alterCPULoad(row.dataset.taskHash, parseInt(rawDOMElement.dataset.cpuLoadDirection));
            });
        },
        alterCPULoad:function(taskHash, direction)
        {
            let cpuLoad = this.downlink.alterCPULoad(taskHash, direction);
            let hashes = Object.keys(cpuLoad);
            for(let hash of hashes)
            {
                $(`.percentage-bar[data-task-hash="${hash}"]`).css("width", `${cpuLoad[hash]}%`);
                $(`.percentage-text[data-task-hash="${hash}"]`).text(`${cpuLoad[hash]}%`);
            }
        },
        updateCurrentMissionView:function(server){
            this.updateCPULoadBalancer();
            this.$activeMissionPassword.val('');
            this.updateEncryptionGridUI(server.encryption.size, server.encryption.cols);
            this.$activeMissionEncryptionType.html(server.encryption.name);
            this.$activeMissionIPAddress.html(server.ipAddress);
            this.$activeMissionServerName.html(server.name);
        },
        updateAvailableMissionList:function(mission){
            $('.'+MISSION_LIST_CLASS).remove();
            this.$activeMissionName.html(mission.name);
            let html = '';
            for(let mission of this.downlink.availableMissions)
            {
                html += `<div class="row ${MISSION_LIST_CLASS}"><div class="col">${mission.name}</div></div>`;
            }
            let $html = $(html);
            this.$missionContainer.append($html);
        },
        addComputerToWorldMap(computer, callback)
        {
            let $node = $('<div/>')
                .addClass('computer')
                .attr('title', computer.name)
                .addClass(computer.constructor.name);
            if(callback)
            {
                $node.on("click", callback);
            }

            this.$worldMapContainer.append($node);
            let width = parseInt($node.css('width'), 10),
                height = parseInt($node.css('height'), 10);
            // This makes sure that the centre of the location is the centre of the div
            // which means that the lines between computer points go from centre point to centre point
            // instead of top left to top left
            $node.css({
                top:(computer.location.y - height / 2)+'px',
                left:(computer.location.x - width / 2)+'px'
            })
        },
        "hardReset":function()
        {
            this.stop();
            localStorage.removeItem('saveFile');
        },
        getJSON:function()
        {
            return this.downlink.toJSON();
        },
        save:function()
        {
            let json = this.getJSON();
            json.version = this.version;
            let jsonAsString = JSON.stringify(json),
                jsonAsAsciiSafeString = btoa(jsonAsString);
            localStorage.setItem('saveFile', jsonAsAsciiSafeString);
            return jsonAsAsciiSafeString;
        },
        parseLoadFile:function(loadFile)
        {
            let jsonAsString = atob(loadFile);
            return JSON.parse(jsonAsString);
        },
        load:function()
        {
            let jsonAsAsciiSafeString = localStorage.getItem('saveFile');
            if(jsonAsAsciiSafeString)
            {
                return this.parseLoadFile(jsonAsAsciiSafeString);
            }
            return null;
        },
        showConnectionManager:function()
        {
            this.$worldMapModal.modal({keyboard:false, backdrop:"static"});
        },
        showOrHideConnectionWarning:function()
        {
            if(this.downlink.playerConnection.connectionLength < 4)
            {
                this.$connectionWarningRow.show();
            }
            else
            {
                this.$connectionWarningRow.hide();
            }
        },
        afterHideConnectionManager:function()
        {
            this.$connectionTraced.html(0);
            this.$connectionLength.html(this.downlink.playerConnection.connectionLength);
            this.showOrHideConnectionWarning();
            this.save();
        },
        getRunTime:function()
        {
            return this.downlink.secondsRunning;
        },
        showSettingsModal:function()
        {
            this.$settingsModal.modal({keyboard:false, backdrop:"static"});
        },
        showComputerBuildModal:function()
        {
            this.$computerBuildModal.modal({keyboard:false, backdrop:"static"});
        },
        buildComputerPartsUI:function()
        {
            this.$computerPartsCPURow.empty();
            for(let cpu of CPU.getCPUs())
            {
                let cost = CPU.getPriceFor(cpu),
                    affordable = this.downlink.canAfford(cost);
                let $node = $(`<div data-part-cost="${cost.toString()}" class="col-4 cpu part ${affordable?"":"un"}affordable-part">
                        <div class="row"><div class="col">${cpu?'<img src="./img/'+cpu.img+'" alt="'+cpu.name+'"/>':""}</div></div>
                        <div class="row"><div class="col">${cpu.name}</div></div>
                        <div class="row"><div class="col">${cpu.speed} MHz</div></div>
                        <div class="row"><div class="col">${cost.toString()}</div></div>
                    </div>`);
                $node.click(() => {
                    this.setChosenPart(cpu, 'CPU', cost, $node);
                });

                this.$computerPartsCPURow.append($node);
            }
        },
        setChosenPart(part, type, cost, $node)
        {
            if(!this.downlink.canAfford(cost))
            {
                return;
            }
            $('.chosenPart').removeClass('chosenPart');
            if(part === this.chosenPart)
            {
                this.chosenPart = null;
                return;
            }
            this.chosenPart = part;
            $node.addClass('chosenPart');
        },
        updateComputerPartsUI:function()
        {
            let downlink = this.downlink;
            $('.part').each(function(){
                let $node = $(this),
                    cost = new Decimal($node.data('partCost')),
                    canAfford = downlink.canAfford(cost);
                $node.removeClass('affordable-part unaffordable-part').addClass(
                    (canAfford?'':'un')+'affordable-part'
                );
            });
        },
        getCPUIncreaseCost:function()
        {
            return this.downlink.cpuIncreaseCost;
        },
        buildComputerGrid:function()
        {
            let pc = this.downlink.playerComputer,
                cpus = pc.cpuPool.cpus,
                gridSize = pc.cpuWidth,
                html = '',
                width = `${(gridSize*31 + 1)}px`,
                cpuIndex = 0;
            this.$computerBuild.css({
                'grid-template-columns':`repeat(${gridSize}, 1fr)`,
                'width':width
            });
            //for(let cpu of cpus)
            for(let i = 0; i < pc.cpuPool.maxCPUs; i++)
            {
                let cpu = cpus[i];
                html += `<div data-cpu-slot="${cpuIndex}" class="col cpuHolder" title="${cpu?cpu.name:''}">`;
                if(cpu)
                {
                    html += `<img src="./img/${cpu.healthImage}" alt="${cpu.name}"/>`;
                }
                html += '</div>';
                cpuIndex++;
            }
            this.$computerBuild.html(html);

            this.$gridSizeIncreaseSpan.text(gridSize);
            let increaseCost = this.getCPUIncreaseCost();
            this.$gridSizeCostSpan.text(increaseCost);
            if(this.downlink.canAfford(increaseCost))
            {
                this.$gridSizeButton.removeAttr('disabled');
            }
            else
            {
                this.$gridSizeButton.attr('disabled', 'disabled');
            }

            $('.cpuHolder').click((evt)=> {
                let cpuSlot = $(evt.currentTarget).data('cpuSlot');
                this.buyCPU(cpuSlot)
            });
        },
        increaseCPUPoolSize:function()
        {
            if(!this.downlink.canAfford(this.getCPUIncreaseCost()))
            {
                return;
            }
            this.downlink.buyMaxCPUIncrease();
            this.buildComputerGrid();
            this.updatePlayerDetails();
            this.updateComputerPartsUI();
            this.save();
        },
        buyCPU:function(cpuSlot)
        {
            if(!this.chosenPart || !this.downlink.canAfford(CPU.getPriceFor(this.chosenPart)))
            {
                return;
            }
            this.canTakeMissions = true;
            this.downlink.buyCPU(this.chosenPart, cpuSlot);
            this.updateMissionToggleButton();
            this.buildComputerGrid();
            this.updateComputerBuild();
            this.updatePlayerDetails();
            this.updateComputerPartsUI();
            this.save();
        },
        handleEmptyCPUPool:function()
        {
            this.takingMissions = false;
            this.canTakeMissions = false;
            this.disconnect();
        },
        updateMissionToggleButton()
        {
            if(this.canTakeMissions)
            {
                this.$missionToggleButton.removeAttr('disabled');
            }
            else
            {
                this.$missionToggleButton.attr('disabled', 'disabled').text("Start taking missions");
            }
        },
        showResearchModal()
        {
            let html = ``;
            let availableResearch = this.downlink.availableResearch;
            for(let researchType in availableResearch)
            {
                html += `<h2 class="row">${researchType} (${availableResearch[researchType].length})</h2><div class="container-fluid">`;

                for(let researchItem of availableResearch[researchType])
                {
                    html += `<div class="row">
                        <div class="col">${researchItem.name}</div>
                        <div class="col-1">${researchItem.researchTicks}</div>
                        <div class="col-3">
                            <button data-research-item="${researchItem.name}" class="research-start-button btn btn-sm btn-primary" data-toggle="tooltip" data-html="true" title="<ul>`;
                            for(let property of researchItem.propertiesEffected)
                            {
                                html += `<li>${property.property} &times; ${property.amount}</li>`;
                            }
                            html +=`</ul>">Start researching</button>
                        </div>
                    </div>`;
                }
                html += `</div>`;
            }
            this.$researchModalBody.html(html);
            $('[data-toggle="tooltip"]').tooltip();
            $('.research-start-button').click((evt)=>{
                this.startResearch(evt.target.dataset.researchItem);
            });
            this.$researchModal.modal({keyboard:false, backdrop:"static"});
        },
        startResearch:function(researchItem)
        {
            this.downlink.startResearch(researchItem);
            this.downlink.on('researchComplete', ()=>{
                this.updateComputerBuild();
                this.save();
            });
            this.$researchModal.modal('hide');
            this.updateCPULoadBalancer();
        }
    };

    game.start();

    window.game = game;
})})(window.jQuery);
