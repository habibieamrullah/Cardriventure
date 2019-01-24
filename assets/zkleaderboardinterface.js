var zkLeaderboardData = {
	avatar : "0",
	rndPN : "", 
	nickname : "",
	gamename : appData.title,
	score : appData.money
};

//check if zkLeaderboardData not empty
if(localStorage.getItem("zkLeaderboardData") === null){
	//if it is null, show nickname form
	document.getElementById("nicknameForm").style.display = "block";
}else{
	//if not null, then set zkLeaderboardData object with those stored
	zkLeaderboardData = JSON.parse(localStorage.getItem("zkLeaderboardData"));
}

function displayLeaderboard(data){
	document.getElementById("leaderboard").innerHTML = data;
}