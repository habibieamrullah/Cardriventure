//main functions
function submitNickname(){
	var nickname = document.getElementById("nickname").value;
	if(validateMe(nickname)){
		var rndPN = randomPreNick();
		zkLeaderboardData.rndPN = rndPN;
		zkLeaderboardData.nickname = nickname;

		//communicate with server
		var url = "http://zk.ciihuy.com/zkscripts/zkleaderboard.php?addnew&rndpn=" + rndPN + "&nickname=" + nickname + "&gamename=" + zkLeaderboardData.gamename;
		callNet(url);
		
		document.getElementById("nicknameForm").innerHTML = "<h3 style='color: white'>Please wait...</h3>";
		
		//setTimeout(function(){ location.href="index.html" }, 5000);
		document.getElementById("nicknameForm").style.display = "none";
	}else{
		alert("Only characters and numbers (without spaces) is allowed");
	}
}

function updateAvatar(){
	if(navigator.onLine){
		var newAvatar = document.getElementById("avatar").value;
		//communicate with server
		var url = "http://zk.ciihuy.com/zkscripts/zkleaderboard.php?updateavatar&rndpn=" + zkLeaderboardData.rndPN + "&nickname=" + zkLeaderboardData.nickname + "&gamename=" + zkLeaderboardData.gamename + "&newavatar=" + newAvatar;
		callNet(url);
	}
}

function updateScore(newScore){
	if(navigator.onLine){
		//communicate with server
		var url = "http://zk.ciihuy.com/zkscripts/zkleaderboard.php?updatescore&rndpn=" + zkLeaderboardData.rndPN + "&nickname=" + zkLeaderboardData.nickname + "&gamename=" + zkLeaderboardData.gamename + "&newscore=" + newScore;
		callNet(url);
	}
}

function refreshLeaderboard(){
	if(navigator.onLine){
		//communicate with server
		var url = "http://zk.ciihuy.com/zkscripts/zkleaderboard.php?refresh&rndpn=" + zkLeaderboardData.rndPN + "&nickname=" + zkLeaderboardData.nickname + "&gamename=" + zkLeaderboardData.gamename;
		callNet(url);
	}
}


//other functions
function randomPreNick() {
  var text = "";
  var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for (var i = 0; i < 8; i++)
    text += possible.charAt(Math.floor(Math.random() * possible.length));

  return text;
}

function callNet(url){
	document.getElementById("scriptHolder").innerHTML = "";
	var s = document.createElement("script");
	s.src = url;
	document.getElementById("scriptHolder").appendChild(s);
}

function validateMe(text){
	var letters = /^[A-Za-z0-9]+$/;
	if(text.match(letters)) return true;
	else return false;
}

function newNicknameAdded(){
	if(localStorage.getItem("zkLeaderboardData") === null){
		localStorage.setItem("zkLeaderboardData", JSON.stringify(zkLeaderboardData));
		console.log("New nickname added!");
	}
}