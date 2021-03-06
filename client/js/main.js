//Základní proměnné
var socket = io({transports: ['websocket']});
var timeout = 0;
var loopGame = false;

//Proměnné, které bude mít klient u sebe - toto budu ale muset kontrolovat i na serveru, jestli sedí (ochrana proti cheatům)
var playing = -1;   //kdo je na tahu
var player = -1;    //jakou barvu má hráč a kde začíná. 1, pokud je dole. 2, pokud je nahoře. Tato hodnota se udá funkcí onStartGame(data).
var goldAmount = 2500;
var manaAmount = 15;     //POZOR! na serveru je také manaAmount 100
var goldIncome = 0;
var manaIncome = 0;
var happinessMultiplier = 1;
var greedMultiplier = 1;
var buildingSale = 1;

var mouseX = 0;
var mouseY = 0;

var index = 0;    //slouží při tvorbě ui
var hexBackgroundSelected = false;    //slouží při vykreslování pozadí hexagonů

var trainValue = [0,0,0];    //hodnota, která se udává při trénování nebo propuštění jednotek. 3 tlačítka, proto 3 hodnoty v array.
var trainButtonSelected = -1;   //Které z tlačítek pro trénování je označeno. Pokud žádné, -1.
var trainDigits = [[],[],[]];   //3 arraye v arrayi. 1 podarray v sobě zahrnuje číslice, které hráč zmáčknul, když měl označené tlačítko pro zadávání počtu jednotek.

var sendValue = [0,0,0];     //hodnota, která se udává při posílání jednotek. 3 tlačítka, proto 3 hodnoty v array.
var sendButtonSelected = -1;   //Které z tlačítek pro posílání jednotek je označeno. Pokud žádné, -1.
var sendDigits = [[],[],[]];   //3 arraye v arrayi. 1 podarray v sobě zahrnuje číslice, které hráč zmáčknul, když měl označené tlačítko pro zadávání počtu jednotek.

var hexMoveAvailable = [];		//If a hexagon is selected, it shows available moves. This array contains the id of hexagons, where the movement is possible.
var canMoveUnits = false;     //Jestli je označen hexagon, tak tato proměnná určí, jestli se mají zvýraznit okolní hexagony kvůli pohybu jednotek. Pokud v označené zemi žádné jednotky nejsou, tak se nic nezobrazí. Mění se přes step event.
var moveUnitsToHex = -1;      //Do jaké země se jednotky přesouvají.
var attacking = false;        //Jestli země, do které se jednotky přesouvají, je nepřátelská. Pokud ano, bude UI pro přesouvání jednotek vypadat (a chovat se) jinak.

var mapCreated = false;

var buildingOrSpell = "building";   //Jestli se mají zobrazovat budovy nebo kouzla

var columns = 5;
var mainColumnSize = 6;

var hex = {};   //Hexagon object - contains objects of each hexagon, named by a number (first index is 0)
var hexXpos = 275;	//Pozice, kde začíná mapa (kde se nachází hexagon s indexem 0)
var hexYpos = 280;

var mouseHexColliding = -1;		//What hexagon is mouse hovering over. If none, -1.
var mouseUIcolliding = {
  main:-1,
  trainingUnits:-1,
  sendingUnitsBg:-1,
  sendingUnits:-1,
  confirmSpellBg:-1,
  confirmSpell:-1
};

var placingBuilding = -1;		//What building the player has selected. If none, -1. 	//ID stavby = id stavby v UI.
var castingSpell = -1;      //What spell the player has selected. If none, -1.
var confirmCasting = false;   //Zda se má zobrazovat UI pro potvrzení seslání kouzla

var hexSelected = -1;		//What hexagon player has selected. If none, -1.

var showUnitUI = false;		//Jestli se má zobrazovat lišta pro trénování jednotek (zobrazuje se, pokud je označena nějaká země a je v ní budovu pro výcvik).
var showSendUnitUI = false;  //Jestli se má zobrazovat lišta pro přemístění jednotek (zobrazuje se při přemisťování jednotek).
var showConfirmSpellUI = false;

var justOpenedSendUI = false;   //Využití u funkce showSendUnitsUI(). Slouží k tomu, aby se UI nezavřela hned potom, co se otevře.
var justOpenedConfirmSpellUI = false;
var justStartedTargeting = false;   //spells.js
var justTargetedSpell = false;    //spells.js
var justSelectedFirstTarget = false; //spells.js


//UI
var ui = {
  main:{},
  trainingUnits:{},
  sendingUnitsBg:{},
  sendingUnits:{},
  confirmSpell:{},
  confirmSpellBg:{}
};

//Definované funkce
//Non-game socket functions
onSearching = function(socket){
  socket.on("searching",function(data){
    //Background
    ctx.fillStyle = "gray";
    ctx.fillRect(0,0,WIDTH,HEIGHT);

    //Text
    ctx.font = "60px Arial";
    ctx.fillStyle = "black";
    ctx.textAlign="center";
    ctx.textBaseline="middle";
    ctx.fillText("Searching...", WIDTH/2, HEIGHT/2);
  });
}

sendTimeoutSocket = function(socket){
  socket.on("timeout", function(data){
    timeout = data;
    var random = Math.random();
    socket.emit("timein", random);
  });
}

onStartGame = function(socket){
  socket.on("startGame", function(data){
    loopGame = true;
    playing = data;
    if (playing === true){
      player = 1;
    }
    else {
      player = 2;
    }
    console.log("Start game! Is this player first? " + playing);

    //Draw some basic text (temporary)
    ctx.fillStyle = "gray";
    ctx.fillRect(0,0,WIDTH,HEIGHT);

    ctx.fillStyle = "black";
    ctx.textAlign="center";
    ctx.textBaseline="middle";
    ctx.fillText(playing, WIDTH/2, HEIGHT/2);
  });
}

//Game socket functions
onCreateBalanceVariables = function(socket){
  socket.on("createBalanceVariables", function(data){
    balance = data;
  });
}

onStartTurn = function(socket){
  socket.on("startTurn", function(){
    playing = true;
    happinessMultiplier = 1;
    changeIncome();
    refreshUnits();     //definováno v input.js
  });
}

onEnemyTrainUnits = function(socket){
  socket.on("enemyTrainUnits", function(data){
    //data: {hex, unitsType, unitsWaitingAmount, unitsAmount}
    var unitsWaiting = data.unitsType + "Waiting";
    hex[data.hex][data.unitsType] = data.unitsAmount;
    hex[data.hex][unitsWaiting] = data.unitsWaitingAmount;
  });
}

onEnemySendUnits = function(socket){
  socket.on("enemySendUnits", function(data){
    //data: {currentHex, targetHex, unitsType, unitsCurrentAmount, unitsTargetWaitingAmount, targetHexOwner, unitsCurrentWaitingAmount, unitsTargetWorkers, unitsTargetSoldiers, unitsTargetMages}
    var unitsWaiting = data.unitsType + "Waiting";
    hex[data.currentHex][data.unitsType] = data.unitsCurrentAmount;
    hex[data.targetHex][unitsWaiting] = data.unitsTargetWaitingAmount;

    //Variables connected with attacking
    hex[data.targetHex].owner = data.targetHexOwner;
    hex[data.currentHex][unitsWaiting] = data.unitsCurrentWaitingAmount;
    hex[data.targetHex].workers = data.unitsTargetWorkers;
    hex[data.targetHex].soldiers = data.unitsTargetSoldiers;
    hex[data.targetHex].mages = data.unitsTargetMages;

    changeIncome();
  });
}

onEnemyPlaceBuilding = function(socket){
  socket.on("enemyPlaceBuilding", function(data){
    hex[data.hex].building = data.building;
  });
}

onCaughtCheating = function(socket){
  socket.on("caughtCheating", function(data){
    window.location.replace(data);
  });
}

//gameLoop - starts looping when a match is found
gameLoop = function(){
  if (loopGame && allImagesLoaded){
    //Create the map
  	if (mapCreated === false){
      createUI();
  		createMap(columns,mainColumnSize);
  	}

    //Check collision
    checkCollision();

    //Step event
  	stepEvent();

  	//Draw
  	drawGame();
  }
}

//Interaction with the server
onSearching(socket);

onStartGame(socket);

sendTimeoutSocket(socket);

onCreateBalanceVariables(socket);

onCaughtCheating(socket);

onEnemyTrainUnits(socket);

onEnemySendUnits(socket);

onEnemyPlaceBuilding(socket);

onStartTurn(socket);

onGreedCast(socket);    //spells.js
onBlackMagicCast(socket);
onPoisonousPlantsCast(socket);
onArmageddonCast(socket);
onEnergyBoostCast(socket);
onMagicWindCast(socket);
onRecyclingCast(socket);

//Inputs
input();

//Game loop
setInterval(gameLoop, 1000/25);
