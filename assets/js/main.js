//app data storage system
var appData = {
	title : "cardriventure",
	money : 0,
	cartype : 1,
	carspeed : 250,
	carposx : 130,
	carposy : 420,
	carangle : 90,
	currentlevel : 1,
	unlockedlevels : []
};
if (localStorage.getItem(appData.title) !== null) {
	appData = JSON.parse(localStorage.getItem(appData.title));
} else {
	saveData();
}
function saveData() {
	localStorage.setItem(appData.title, JSON.stringify(appData));
}


//game screen variables
var baseWidth = 920;
var screenRatio = window.innerWidth / window.innerHeight;
var gameHeight = baseWidth / screenRatio;
var game = new Phaser.Game(baseWidth, gameHeight, Phaser.AUTO);
var ZKGame = {};
var tiles;
var timers = [
	15,//1
	15,
	25,
	16,
	10,//5
	25,
	25,
	10,
	25,
	18,//10
];
var timerInterval;
var levelStatus = 0;
var sndClick, sndFail, sndSuccess, sndMenu, sndInGame;

ZKGame.LogoIntro = {
	preload: function() {
		game.load.audio("click", ["assets/audio/click.mp3", "assets/audio/click.ogg"]);
		game.load.audio("fail", ["assets/audio/fail.mp3", "assets/audio/fail.ogg"]);
		game.load.audio("success", ["assets/audio/success.mp3", "assets/audio/success.ogg"]);
		game.load.audio("menu", ["assets/audio/menu.mp3", "assets/audio/menu.ogg"]);
		game.load.audio("ingame", ["assets/audio/ingame.mp3", "assets/audio/ingame.ogg"]);
		game.load.image("logo", "assets/zkcs.png");
		game.load.image("grass", "assets/grass.jpg");
		game.load.bitmapFont("gameFont", 'assets/font.png', 'assets/font.fnt');
	},
	create: function() {
		game.stage.backgroundColor = "#ffffff";
		game.scale.scaleMode = Phaser.ScaleManager.EXACT_FIT;
		var zkLogo = game.add.sprite(game.world.centerX, game.world.centerY, "logo");
		zkLogo.anchor.setTo(.5);
		game.camera.flash(0x000000, 1000);
		setTimeout(function() {
			game.state.start("MainMenu");
		}, 4000);
		/*
		bgmusic = game.add.audio("bgmusic");
		bgmusic.volume = 1;
		sndClick = game.add.audio("sndClick");
		*/
	}
}

var mainMenuTiles = {"width":920,"height":517,"tilesize":"32","tiles":[{"x":64,"y":96,"flipx":1,"spritename":"tile7","rotation":0,"param":""},{"x":256,"y":96,"flipx":1,"spritename":"tile7","rotation":0,"param":""},{"x":640,"y":96,"flipx":1,"spritename":"tile7","rotation":0,"param":""},{"x":832,"y":288,"flipx":1,"spritename":"tile7","rotation":90,"param":""},{"x":832,"y":480,"flipx":1,"spritename":"tile7","rotation":90,"param":""},{"x":832,"y":96,"flipx":1,"spritename":"tile23","rotation":0,"param":""},{"x":768,"y":320,"flipx":1,"spritename":"tile14","rotation":30,"param":""},{"x":32,"y":160,"flipx":1,"spritename":"tile14","rotation":-20,"param":""},{"x":128,"y":192,"flipx":1,"spritename":"tile14","rotation":160,"param":""},{"x":768,"y":480,"flipx":1,"spritename":"tile14","rotation":90,"param":""},{"x":640,"y":544,"flipx":1,"spritename":"tile2","rotation":0,"param":""},{"x":64,"y":352,"flipx":1,"spritename":"tile2","rotation":-90,"param":""},{"x":256,"y":352,"flipx":1,"spritename":"tile2","rotation":-90,"param":""},{"x":640,"y":352,"flipx":1,"spritename":"tile3","rotation":-270,"param":""},{"x":864,"y":160,"flipx":1,"spritename":"tile27","rotation":30,"param":""},{"x":864,"y":448,"flipx":1,"spritename":"tile26","rotation":-60,"param":""},{"x":64,"y":64,"flipx":1,"spritename":"tile25","rotation":-150,"param":""},{"x":448,"y":96,"flipx":1,"spritename":"tile7","rotation":0,"param":""},{"x":448,"y":352,"flipx":1,"spritename":"tile2","rotation":-90,"param":""},{"x":32,"y":448,"flipx":1,"spritename":"tile15","rotation":-20,"param":""},{"x":480,"y":480,"flipx":1,"spritename":"tile11","rotation":-20,"param":""},{"x":96,"y":160,"flipx":1,"spritename":"tile14","rotation":-90,"param":""}]};
var transitionTiles = {"width":920,"height":517,"tilesize":"32","tiles":[{"x":832,"y":192,"flipx":1,"spritename":"tile3","rotation":0,"param":""},{"x":832,"y":384,"flipx":1,"spritename":"tile3","rotation":-180,"param":""},{"x":640,"y":384,"flipx":1,"spritename":"tile2","rotation":-270,"param":""},{"x":448,"y":384,"flipx":1,"spritename":"tile2","rotation":90,"param":""},{"x":256,"y":384,"flipx":1,"spritename":"tile2","rotation":90,"param":""},{"x":64,"y":384,"flipx":1,"spritename":"tile3","rotation":0,"param":""},{"x":64,"y":576,"flipx":1,"spritename":"tile2","rotation":0,"param":""},{"x":512,"y":480,"flipx":1,"spritename":"tile6","rotation":0,"param":""},{"x":64,"y":256,"flipx":1,"spritename":"tile6","rotation":0,"param":""},{"x":848,"y":48,"flipx":1,"spritename":"tile6","rotation":0,"param":""},{"x":16,"y":208,"flipx":1,"spritename":"tile6","rotation":0,"param":""},{"x":736,"y":96,"flipx":1,"spritename":"tile13","rotation":40,"param":""},{"x":816,"y":496,"flipx":1,"spritename":"tile13","rotation":0,"param":""},{"x":192,"y":480,"flipx":1,"spritename":"tile13","rotation":50,"param":""},{"x":640,"y":96,"flipx":1,"spritename":"tile19","rotation":0,"param":""},{"x":64,"y":96,"flipx":1,"spritename":"tile7","rotation":0,"param":""},{"x":256,"y":96,"flipx":1,"spritename":"tile7","rotation":0,"param":""},{"x":448,"y":96,"flipx":1,"spritename":"tile24","rotation":0,"param":""}]};

//EDITABLE - START//
ZKGame.MainMenu = {
	preload: function() {
		for(var i = 0; i < mainMenuTiles.tiles.length; i++){
			game.load.image(mainMenuTiles.tiles[i].spritename, "assets/" + mainMenuTiles.tiles[i].spritename + ".png");
		}
	},
	create: function() {
		zk.showBanner();
		sndClick = game.add.audio("click");
		sndFail = game.add.audio("fail");
		sndSuccess = game.add.audio("success");
		sndMenu = game.add.audio("menu", .5, false);
		sndInGame = game.add.audio("ingame", 1, true);
		game.sound.stopAll();
		sndMenu.play();
		
		clearInterval(timerInterval);
		game.camera.x = 0;
		game.camera.y = 0;
		game.world.setBounds(0, 0, baseWidth, gameHeight);
		game.add.tileSprite(0, 0, game.width, game.height, "grass");
		tiles = game.add.group();
		for(var i = 0; i < mainMenuTiles.tiles.length; i++){
			var currt = mainMenuTiles.tiles[i];
			var t = tiles.create(currt.x, currt.y, currt.spritename);
			t.anchor.setTo(.5);
			t.angle = currt.rotation;
			t.scale.setTo(currt.flipx, 1);
			t.spritename = currt.spritename;
			t.param = currt.param;
		}
		
		this.titletext = game.add.bitmapText(game.world.centerX, game.world.centerY - 50, "gameFont", "Cardriventure", 80);
		this.titletext.anchor.setTo(.5);
		this.st = game.add.bitmapText(game.world.centerX, this.titletext.y + 50, "gameFont", "A game by Zofia Kreasi", 30);
		this.st.anchor.setTo(.5);
		$("#mainmenu").show();
		$("#timer").hide();
		$("#barsbutton").hide();
	},
	update: function() {}
};

ZKGame.Transition = {
	preload: function() {
		for(var i = 0; i < transitionTiles.tiles.length; i++){
			game.load.image(transitionTiles.tiles[i].spritename, "assets/" + transitionTiles.tiles[i].spritename + ".png");
		}
	},
	create: function() {
		sndInGame.pause();
		
		clearInterval(timerInterval);
		$("#mainmenu").show();
		$("#timer").hide();
		game.camera.x = 0;
		game.camera.y = 0;
		game.world.setBounds(0, 0, baseWidth, gameHeight);
		game.add.tileSprite(0, 0, game.width, game.height, "grass");
		tiles = game.add.group();
		for(var i = 0; i < transitionTiles.tiles.length; i++){
			var currt = transitionTiles.tiles[i];
			var t = tiles.create(currt.x, currt.y, currt.spritename);
			t.anchor.setTo(.5);
			t.angle = currt.rotation;
			t.scale.setTo(currt.flipx, 1);
			t.spritename = currt.spritename;
			t.param = currt.param;
		}
		
		var bigText;
		var lilText;
		switch (levelStatus){
			case 0 : // very first level
				bigText = "Ready to drive?";
				lilText = "Tap \"play\" to start playing";
				break;
			case 1 : // time is up
				zk.showAd();
				zk.vibrate();
				sndFail.play();
				bigText = "Time's up. Try again?";
				lilText = "Tap \"play\" to replay";
				break;
			case 2 : // great!
				zk.showAd();
				sndSuccess.play();
				bigText = "Great!";
				lilText = "Tap \"play\" to start the next level";
				break;
			case 3 : // end of levels
				sndSuccess.play();
				bigText = "The End :D";
				lilText = "Wait for new update to play next levels";
				break;
		}
		
		this.titletext = game.add.bitmapText(game.world.centerX, game.world.centerY - 50, "gameFont", bigText, 60);
		this.titletext.anchor.setTo(.5);
		this.st = game.add.bitmapText(game.world.centerX, this.titletext.y + 50, "gameFont", lilText, 30);
		this.st.anchor.setTo(.5);
		
		game.input.onDown.add(function(){
			$("#drawer").hide();
		}, self);
	},
	update: function() {}
};

var car;
var carType = appData.cartype;
var maxCar = 12;
var currentLevel = appData.currentlevel;
var entryPoint = -1;
var reversing = false;
var loadingNewWorld = false;
var levelTimer = 0;

var btnUp, btnDown, btnLeft, btnRight;
var goingUp, goingDown, goingLeft, goingRight;

ZKGame.Play = {
	preload: function() {
		game.load.image("navbtn", "assets/navbtn.png");
		for(var i = 0; i < maxCar; i++){
			game.load.image("car" + (i+1), "assets/car" + (i+1) + ".png");
		}
		for(var i = 0; i < levelTiles[currentLevel].tiles.length; i++){
			game.load.image(levelTiles[currentLevel].tiles[i].spritename, "assets/" + levelTiles[currentLevel].tiles[i].spritename + ".png");
		}
	},
	create: function() {
		zk.hideBanner();
		game.sound.stopAll();
		sndInGame.play();
		$("#mainmenu").hide();
		$("#barsbutton").show();
		$("#timer").show();
		$("#fader").show().fadeOut();
		$("#levelinfo").html("Level " + (currentLevel+1) + " of " + levelTiles.length).css({ top : innerHeight/3 + "px" }).fadeIn();
		setTimeout(function(){
			$("#levelinfo").fadeOut();
		}, 1500);
		
		$("#timertext").html("<i class='fa fa-hourglass-half'></i> " + timers[currentLevel]);
		$("#currentscore").html("<i class='fa fa-trophy'></i> " + appData.money);
		clearInterval(timerInterval);
		levelStatus = 1;
		levelTimer = timers[currentLevel];
		timerInterval = setInterval(function(){
			if(levelTimer < 0){
				clearInterval(timerInterval);
				game.state.start("Transition");
			}
			$("#timertext").html("<i class='fa fa-hourglass-half'></i> " + levelTimer--);
		}, 1000);
		
		game.stage.backgroundColor = '#ffffff'
		game.physics.startSystem(Phaser.Physics.P2JS);
		
		game.world.setBounds(0, 0, levelTiles[currentLevel].width, levelTiles[currentLevel].height);
		game.add.tileSprite(0, 0, levelTiles[currentLevel].width, levelTiles[currentLevel].height, "grass");

		var currentCarX = appData.carposx;
		var currentCarY = appData.carposy;		
		
		tiles = game.add.group();
		var tileSize = levelTiles[currentLevel].tilesize;
		var levTiles = levelTiles[currentLevel].tiles;
		var jumperColliderCount = 0;
		for(var i = 0; i < levTiles.length; i++){
			var currt = levTiles[i];
			var t = tiles.create(currt.x, currt.y, currt.spritename);
			t.anchor.setTo(.5);
			t.angle = currt.rotation;
			t.scale.setTo(currt.flipx, 1);
			t.spritename = currt.spritename;
			t.param = currt.param;
			switch(currt.spritename){
				case "tile9" :
					t.alpha = 0;
					if(entryPoint > -1){
						if(entryPoint == jumperColliderCount){
							switch(jumperColliderCount){
								case 0 :
									currentCarX = t.x;
									currentCarY = t.y + 64;
									break;
								case 1 :
									currentCarX = t.x + 64;
									currentCarY = t.y;
									break;
								case 2 :
									currentCarX = t.x - 64;
									currentCarY = t.y;
									break;
								case 3 :
									currentCarX = t.x;
									currentCarY = t.y - 64;
									break;
							}
						}
					}
					jumperColliderCount++;
					break;
				case "tile10" :
				case "tile11" :
				case "tile12" :
				case "tile13" :
				case "tile14" :
				case "tile15" :
				case "tile17" :
				case "tile18" :
				case "tile19" :
				case "tile20" :
				case "tile21" :
				case "tile22" :
				case "tile23" :
				case "tile24" :
				case "tile6" :
				case "tile7" :
				case "tile8" :
					game.physics.p2.enable(t, false);
					t.body.angle = currt.rotation;
					t.body.static = true;
					break;
				default :
					break;
			}
		}		
		
		car = game.add.sprite(currentCarX, currentCarY, "car" + carType);
		appData.carposx = currentCarX;
		appData.carposy = currentCarY;
		saveData();
		game.physics.p2.enable(car, false);
		car.anchor.setTo(.5);
		car.colchild = car.addChild(game.make.sprite(0, 0, "car" + carType));
		car.colchild.scale.setTo(.25);
		car.colchild.anchor.setTo(.5);
		car.colchild.alpha = 1;
		car.body.angle = appData.carangle;
		game.camera.follow(car, Phaser.Camera.FOLLOW_LOCKON, .05, .05);
		game.camera.x = car.x - (game.width/2);
		game.camera.y = car.y - (game.width/2);
		
		//Nav Buttons
		btnUp = game.add.sprite(0, 0, "navbtn");
		btnUp.alpha = .25;
		btnUp.anchor.setTo(.5);
		btnUp.angle = 180;
		btnUp.inputEnabled = true;
		btnUp.events.onInputDown.add(function(){
			goingUp = true;
			btnUp.alpha = .5;
		}, this);
		btnUp.events.onInputUp.add(function(){
			goingUp = false;
			btnUp.alpha = .25;
		}, this);
		
		game.input.onDown.add(function(){
			$("#drawer").hide();
		}, self);
		
		btnDown = game.add.sprite(0, 0, "navbtn");
		btnDown.alpha = .25;
		btnDown.anchor.setTo(.5);
		btnDown.inputEnabled = true;
		btnDown.events.onInputDown.add(function(){
			goingDown = true;
			btnDown.alpha = .5;
		}, this);
		btnDown.events.onInputUp.add(function(){
			goingDown = false;
			btnDown.alpha = .25;
		}, this);
		
		game.input.onDown.add(function(){
			$("#drawer").hide();
		}, self);
		
		btnLeft = game.add.sprite(0, 0, "navbtn");
		btnLeft.alpha = .25;
		btnLeft.anchor.setTo(.5);
		btnLeft.angle = 90;
		btnLeft.inputEnabled = true;
		btnLeft.events.onInputDown.add(function(){
			goingLeft = true;
			btnLeft.alpha = .5;
		}, this);
		btnLeft.events.onInputUp.add(function(){
			goingLeft = false;
			btnLeft.alpha = .25;
		}, this);
		
		btnRight = game.add.sprite(0, 0, "navbtn");
		btnRight.alpha = .25;
		btnRight.anchor.setTo(.5);
		btnRight.angle = -90;
		btnRight.inputEnabled = true;
		btnRight.events.onInputDown.add(function(){
			goingRight = true;
			btnRight.alpha = .5;
		}, this);
		btnRight.events.onInputUp.add(function(){
			goingRight = false;
			btnRight.alpha = .25;
		}, this);
		//End of Nav Buttons
		
		game.input.onDown.add(function(){
			$("#drawer").hide();
		}, self);
		
	},
	update: function() {
		if (game.input.keyboard.isDown(Phaser.Keyboard.UP) || goingUp) {
			if(onRoad()){
				car.body.thrust(appData.carspeed);
				car.body.damping = .75;
			}
			else{
				car.body.thrust(appData.carspeed/4);
				car.body.damping = .8;
			}
			reversing = false;
		}else if(game.input.keyboard.isDown(Phaser.Keyboard.DOWN) || goingDown){
			if(onRoad()){
				car.body.thrust((appData.carspeed/3) * -1);
				car.body.damping = .75;
			}
			else{
				car.body.thrust((appData.carspeed/5) * -1);
				car.body.damping = .8;
			}
			reversing = true;
		}
		car.body.setZeroRotation();
		carLeftRight();
		colliCheck();
		
		btnUp.x = (game.camera.x + game.width) - (btnUp.width/2) - 30;
		btnUp.y = (game.camera.y + game.height) - (btnUp.height * 2);
		btnDown.x = (game.camera.x + game.width) - (btnDown.width/2) - 30;
		btnDown.y = (game.camera.y + game.height) - (btnDown.height/2) - 30;
		btnLeft.x = game.camera.x + 30 + (btnLeft.width/2);
		btnLeft.y = (game.camera.y + game.height) - (btnLeft.height/2) - 30;
		btnRight.x = game.camera.x + (btnRight.width * 2);
		btnRight.y = (game.camera.y + game.height) - (btnRight.height/2) - 30;
	}
};

game.state.add("LogoIntro", ZKGame.LogoIntro);
game.state.add("MainMenu", ZKGame.MainMenu);
game.state.add("Transition", ZKGame.Transition);
game.state.add("Play", ZKGame.Play);
game.state.start("LogoIntro");

function play() {
	currentLevel = appData.currentlevel-1;
	if(checkUnlockedLevels(currentLevel)){
		game.state.start("Transition");
	}else{
		game.state.start("Play");
	}
}

function checkUnlockedLevels(l){
	for(var i = 0; i < appData.unlockedlevels.length; i++){
		if(appData.unlockedlevels[i] == l)
			return false;
	}
	appData.unlockedlevels.push(l);
	appData.money += 100;
	appData.money += levelTimer;
	saveData();
	updateScore(appData.money);
	if(!levelStatus == 0){
		levelStatus = 2;
	}
	return true;
}

function onRoad(){
	for(var i = 0; i < tiles.children.length; i++){
		if(tiles.children[i].spritename == "tile2" || tiles.children[i].spritename == "tile3" || tiles.children[i].spritename == "tile4" || tiles.children[i].spritename == "tile5"){
			if(checkOverlap(tiles.children[i], car.colchild)){
				return true;
			}
		}
	}
	return false;
}

function colliCheck(){
	for(var i = 0; i < tiles.children.length; i++){
		if(tiles.children[i].spritename == "tile9"){
			if(tiles.children[i].param != ""){
				if(checkOverlap(tiles.children[i], car.colchild)){
					var worldNum = tiles.children[i].param.split(",")[0];
					var pointNum = tiles.children[i].param.split(",")[1];
					goToWorld(parseInt(worldNum), parseInt(pointNum));
					console.log("to world " + worldNum + " entry " + pointNum)
				}
			}
		}
	}
}

function checkOverlap(x1, x2){
	var boundsA = x1.getBounds();
	var boundsB = x2.getBounds();
	return Phaser.Rectangle.intersects(boundsA, boundsB);
}

function carLeftRight(){
	if (Math.abs(car.body.velocity.x) > 10 || Math.abs(car.body.velocity.y) > 10) {
		if (game.input.keyboard.isDown(Phaser.Keyboard.LEFT) || goingLeft) {
			if(!reversing)
				car.body.rotateLeft(25);
			else
				car.body.rotateRight(25);
		} else if (game.input.keyboard.isDown(Phaser.Keyboard.RIGHT) || goingRight) {
			if(!reversing)
				car.body.rotateRight(25);
			else
				car.body.rotateLeft(25);
		}
	}
}

function goToWorld(wn, pn){
	if(!loadingNewWorld){
		loadingNewWorld = true;
		if(wn-1 < levelTiles.length){
			appData.currentlevel = wn;
			appData.carangle = car.body.angle;
			saveData();
			currentLevel = wn;
			entryPoint = pn;
			play(currentLevel);
		}else{
			levelStatus = 3;
			game.state.start("Transition");
		}
		loadingNewWorld = false;
	}
}

function showScreen(n){
	var txt = "";
	switch (n){
		case 1 :
			txt += "<h2 align='center'>Choose your Car:</h2>";
			for(var i = 0; i < maxCar; i++){
				txt += "<div style='display: inline-block; padding: 10px; margin: 5px;' onclick='selectCar(" + (i+1) + ")'><img src='assets/car" + (i+1) + ".png'></div>";
			}
			break;
		case 2 :
			txt += "<h2 align='center'>How to Play?</h2>";
			txt += "<p>Cardriventure is an adventure maze game. In this maze you are inside a car and you have to get out of the maze in a given time to enter the next maze.</p><p>In this game you are driving your favorite car. You can select any car you like. The main objective in this game is to reach the finish line as quick as possible. Each time you are in a level, you must drive your car to the finish line within some amount of time. If time is up, you can replay and try it again. If you reach the finish line before the time is over, you will unlock the next level. Each time you unlock a new level, you will be rewarded with score that add up your total score. Get more score and compare your score with other players in game's leaderboard.</p><p>Start line marked with single black and white tile and finish line marked with double black and white tile. Reach finish line to go to next level. You can go back to previous level by reaching the start line.</p>";
			break;
	}
	$("#screencontent").html(txt);
	$("#screen").show();
}

function selectCar(n){
	appData.cartype = n;
	saveData();
	carType = n;
	$("#screen").hide();
	play();
}

function playSndClick(){
	sndClick.play();
}
//EDITABLE - END//