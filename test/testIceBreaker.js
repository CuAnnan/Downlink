const   IceBreaker = require('../src/Computers/Tasks/ICEBreaker'),
        ICE = require('../src/Missions/Challenges/ICE');
let ice = new ICE(1), iceBreaker = new IceBreaker(ice).setCyclesPerTick(10);

// the padding
let xScaleLength, yScaleLength, xUnits, yUnits;

$(()=>{
    let canvas = document.getElementById('ice-test'),
        context = canvas.getContext('2d');
    canvas.width = 300;
    canvas.height = 150;
    xScaleLength = context.canvas.width - 20;
    yScaleLength = context.canvas.height - 20;
    xUnits = xScaleLength / (ice.width + 1);
    yUnits = yScaleLength / (ice.height -1);

    animateFrame(iceBreaker, context);
});

function animateFrame(iceBreaker, context)
{
    iceBreaker.tick();
    setupGrid(context);
    drawGraphs(iceBreaker, context);
    if(iceBreaker.completed)
    {
        console.log(`Finished graph synching in ${iceBreaker.ticksTaken} ticks`);
    }
    else
    {
        window.setTimeout(
            ()=>{animateFrame(iceBreaker, context)},
            100
        );
    }
}


function drawGraph(points, context, color)
{
    let lastPointY = context.canvas.height/2, lastPointX = 10;
    context.beginPath();
    context.strokeStyle = color;
    for(let i = 0; i < points.length; i++)
    {
        let point = points[i],
            nextPointX = lastPointX + xUnits,
            nextPointY = context.canvas.height / 2 + point.height * yUnits;

        context.moveTo(lastPointX, lastPointY);
        context.lineTo(nextPointX, nextPointY);
        lastPointX = nextPointX;
        lastPointY = nextPointY;
    }
    context.moveTo(lastPointX, lastPointY);
    context.lineTo(context.canvas.width - 10, context.canvas.height / 2);
    context.stroke();
}

/**
 * @param {IceBreaker} iceBreaker
 */
function drawGraphs(iceBreaker, context)
{
    if(!iceBreaker.completed)
    {
        drawGraph(iceBreaker.iceBreakerPoints, context, '#00d');
    }

    drawGraph(iceBreaker.icePoints, context, '#800');
    context.strokeStyle = '#000';
}

function setupGrid(context)
{
    context.clearRect(0, 0, context.canvas.width, context.canvas.height);
    context.strokeStyle = 'rgb(0,0,0)';
    context.beginPath();
    context.moveTo(10,context.canvas.height / 2);
    context.lineTo(context.canvas.width - 10, context.canvas.height / 2);
    context.moveTo(10,10);
    context.lineTo(10,context.canvas.height - 10);
    context.moveTo(context.canvas.width - 10, 10);
    context.lineTo(context.canvas.width - 10, context.canvas.height - 10);
    context.stroke();

    context.beginPath();
    for(let i = 1; i < ice.width + 2; i++)
    {
        let x = 10 + i * xUnits, y = context.canvas.height / 2 - 10;
        context.moveTo(x, y);
        context.lineTo(x, y +20);
    }
    for(let i = 0; i < ice.height; i++)
    {
        let y = 10 + i * yUnits;
        context.moveTo(0, y);
        context.lineTo(20, y);
        context.moveTo(context.canvas.width - 20, y);
        context.lineTo(context.canvas.width, y);
    }
    context.stroke();
}

