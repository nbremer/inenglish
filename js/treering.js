
d3.select(window).on('resize', resizeTreeRings); 

	///////////////////////////////////////////////////////////////////////////
	//////////////////////////// Set up the SVG ///////////////////////////////
	///////////////////////////////////////////////////////////////////////////

	var divWidth = parseInt(d3.select("#viz-tree-ring").style("width"));
	var marginScale = d3.scaleLinear()
		.domain([320, 1200])
	    .range([10, 25]);

	var marginSize = Math.round(marginScale(divWidth));
	var margin = {
	  top: marginSize,
	  right: marginSize,
	  bottom: marginSize,
	  left: marginSize 
	};
	var width = divWidth - margin.left - margin.right;
	var height = width; //TODO - calculate correct height

	//SVG container
	var svg = d3.select("#viz-tree-ring")
		.append("svg")
		.attr("width", width + margin.left + margin.right)
		.attr("height", height + margin.top + margin.bottom);

	var g = svg.append("g")
		.attr("id", "tree-ring-group")
		.attr("transform", "translate(" + (margin.left) + "," + (margin.top) + ")");

	///////////////////////////////////////////////////////////////////////////
	//////////////////////// Create mappings and scales ///////////////////////
	///////////////////////////////////////////////////////////////////////////

	var languageMap = [];
	languageMap["de"] = "German";
	languageMap["es"] = "Spanish";
	languageMap["fr"] = "French";
	languageMap["it"] = "Italian";
	languageMap["ja"] = "Japanese";
	languageMap["nl"] = "Dutch";
	languageMap["pl"] = "Polish";
	languageMap["pt"] = "Portugese";
	languageMap["ru"] = "Russian";
	languageMap["tr"] = "Turkish";
	languageMap["all"] = "All languages";

	//Radius of the big chosen language and the smaller languages
	var radiusBigCircle = Math.min(300, width/2);
	var radiusSmallCircles = Math.min(40, width/3);
	var chosenLanguage = "de";
	var numLanguages = 11;
	var gridPos = [];

	var radiusScale = d3.scaleLinear()
		.domain([1,10])
		.range([radiusBigCircle, radiusBigCircle*0.2]);

	var radiusScaleSmall = d3.scaleLinear()
		.domain([1,10])
		.range([radiusSmallCircles, radiusSmallCircles * 0.2]);

	var openScale = d3.scaleLinear()
		.domain([1,10])
		.range([5, 15]);

	var paddingScale = d3.scaleLinear()
		.domain([320, 750])
		.range([1.3, 1.5]);

	var bigFontScale = d3.scaleLinear()
		.domain([320, 750])
		.range([50, 80]);

	var smallFontScale = d3.scaleLinear()
		.domain([320, 750])
		.range([14, 16]);

	///////////////////////////////////////////////////////////////////////////
	///////////////////////////// Read the data ///////////////////////////////
	///////////////////////////////////////////////////////////////////////////

	d3.csv('data/top10_per_language.csv', function (error, data) {

		if (error) throw error;

		//Make numeric
		data.forEach(function(d) {
			d.rank = +d.rank;
		});

		//Nest the data on the language
		var languageData = d3.nest()
			.key(function(d) { return d.language; })
			.entries(data);

		numLanguages = languageData.length;

		///////////////////////////////////////////////////////////////////////////
		/////////////////////// Calculate the grid positions //////////////////////
		///////////////////////////////////////////////////////////////////////////

		gridPos = calculateGrid(numLanguages - 1, radiusScaleSmall(1), radiusScale(1), width);

		//Set correct height now that we know the number of rows
		svg.attr("height", (gridPos[gridPos.length-1].y + radiusScaleSmall(1)) + margin.top + margin.bottom);

		///////////////////////////////////////////////////////////////////////////
		///////////////////////// Create the word paths ///////////////////////////
		///////////////////////////////////////////////////////////////////////////

		var gridCounter = 0;
		var tree = g.selectAll(".tree")
			.data(languageData)
			.enter().append("g")
			.attr("class", function(d) { return "tree " + d.key; })
			.each(function(d) { d.chosen = d.key === chosenLanguage ? 1 : 0; })
			.attr("transform", function(d,i) {
				if(d.chosen) {
					return "translate(" + gridPos[0].x + "," + gridPos[0].y + ")";
				} else {
					gridCounter += 1;
					return "translate(" + gridPos[gridCounter].x + "," + gridPos[gridCounter].y + ")";
				}//else
			})
			.on("click", switchChosenLanguage);

		//Append text for the language
		var ringLanguage = tree.append("text")
			.attr("class", "ring-center-text")
			.attr("y", function(d) { return d.chosen ? 0 : -radiusScaleSmall(1)*1.6; })
			.attr("dy", "0.25em")
			.style("fill", function(d) { return d.chosen ? "#cfcece" : "#161616"; })
			.style("font-size", function(d) { return d.chosen ? bigFontScale(width) : smallFontScale(width); })
			.text(function(d,i) { return languageMap[d.key]; });

		//Create a group for each ring
		var ring = tree.selectAll(".ring")
			.data(function(d) { return d.values; })
			.enter().append("g")
			.attr("class", "ring")
			.each(function(d) { d.chosen = d.language === chosenLanguage ? 1 : 0; });

		var ringPath = ring.append("path")
			.attr("class", "ring-path")
			.attr("id", function(d) { return "lang-" + d.language + "-rank-" + d.rank; })
			.attr("d", function(d,i) {
				var radius = d.chosen ? radiusScale(d.rank) : radiusScaleSmall(d.rank);
				var open = d.chosen ? openScale(d.rank) : 1;
				return "M" + round2(radius*Math.cos(open*Math.PI/180 + Math.PI/2)) + "," + round2(radius*Math.sin(open*Math.PI/180 + Math.PI/2)) + 
						"A" + round2(radius) + "," + round2(radius) + " 0 1,1 " + 
						round2(radius*Math.cos(-open*Math.PI/180 + Math.PI/2)) + "," + round2(radius*Math.sin(-open*Math.PI/180 + Math.PI/2));
			});

		//Create an SVG text element and append a textPath element
		ring.append("text")
			.attr("class", "ring-text")
			.style("fill", function(d) { return d.chosen ? "#161616" : "#afafaf"; })
		  .append("textPath")
		  	.attr("startOffset","50%")
		  	.style("text-anchor","middle")
			.attr("xlink:href", function(d) { return "#lang-" + d.language + "-rank-" + d.rank; })
			.text(function(d) { return new Array(80).join( d.translation + (d.chosen ? '\u00A0\u00A0\u00A0' : ' ') ); });

		//Add position number to the chosen language
		var ranks = g.append("g")
			.attr("class", "ring-rank-group")
			.attr("transform", "translate(" + gridPos[0].x + "," + gridPos[0].y + ")");

		ranks.selectAll(".ring-rank")
			.data(d3.range(0,11))
			.enter().append("text")
			.attr("class", "ring-rank")
			.attr("y", function(d) { return radiusScale(d); })
			.attr("dy", "0.5em")
			.text(function(d) { return d === 0 ? "position" : d; });

	});//d3.csv

	///////////////////////////////////////////////////////////////////////////
	////////////////////// Calculate the grid positions ///////////////////////
	///////////////////////////////////////////////////////////////////////////

	function calculateGrid(numSmallCircle, smallCircleRadius, bigCircleRadius, width) {
		
		//Will contain the grid positions of the tree rings
		var gridPos = [];
		//The main chosen ring
		gridPos.push({
				x: width/2,
				y: bigCircleRadius
		});

		var extraWidth = 2*smallCircleRadius,
			yOffset = 2.1*bigCircleRadius + smallCircleRadius*1.8 + 50;

		var circleTotalWidth = 2*smallCircleRadius * paddingScale(width),
			circleTotalHeight = 2*smallCircleRadius * 1.8,
			numPerRow = Math.floor( (extraWidth + width) / circleTotalWidth ),
			remainingWidth = round2( extraWidth + width - numPerRow * circleTotalWidth)/2,
			remainingCircle = numSmallCircle % numPerRow,
			numRows = Math.ceil(numSmallCircle / numPerRow);

		//If there are only two rows, divide them up nicely
		if(numRows === 2) {
			numPerRow = Math.ceil(numSmallCircle/2) + (numSmallCircle % 2 === 0 ? 1 : 0);
			remainingWidth = round2(extraWidth + width - numPerRow * circleTotalWidth)/2;
			remainingCircle = numSmallCircle % numPerRow;
		}//if

		for(var i = 0; i < numSmallCircle; i++) {
			var offsetX = 0.5;
			//In case there is anything left for the last row that isn't exactly numPerRow
			if(i >= numSmallCircle - remainingCircle) offsetX = (numPerRow - remainingCircle) * offsetX + offsetX;

			gridPos.push({
				x: round2(-extraWidth/2 + remainingWidth + offsetX*circleTotalWidth + i%numPerRow * circleTotalWidth),
				y: round2(yOffset + Math.floor(i/numPerRow) * circleTotalHeight)
			});

		}//for i

		return gridPos;
	}//calculateGrid

	///////////////////////////////////////////////////////////////////////////
	/////////////////// Change positions and sizes on resize //////////////////
	///////////////////////////////////////////////////////////////////////////

	function resizeTreeRings() {
		console.log("resize tree ring");

		var divWidth = parseInt(d3.select("#viz-tree-ring").style("width"));

		var marginSize = Math.round(marginScale(divWidth));
		var margin = {
		  top: marginSize,
		  right: marginSize,
		  bottom: marginSize,
		  left: marginSize 
		};
		var width = divWidth - margin.left - margin.right;
		var height = width;

		//Adjust SVG container
		svg.attr("width", width + margin.left + margin.right);
		g.attr("transform", "translate(" + (margin.left) + "," + (margin.top) + ")");

		//Update the scales
		var radiusBigCircle = Math.min(300, width/2);
		var radiusSmallCircles = Math.min(40, width/3);
		radiusScale.range([radiusBigCircle, radiusBigCircle*0.2]);
		radiusScaleSmall.range([radiusSmallCircles, radiusSmallCircles * 0.2]);

		//Update the grid locations
		gridPos = calculateGrid(numLanguages - 1, radiusScaleSmall(1), radiusScale(1), width);

		//Set correct height again
		svg.attr("height", (gridPos[gridPos.length-1].y + radiusScaleSmall(1)) + margin.top + margin.bottom);

		//Update the positions of the language rings
		var gridCounter = 0;
		svg.selectAll(".tree")
			.attr("transform", function(d,i) {
				if(d.chosen) {
					return "translate(" + gridPos[0].x + "," + gridPos[0].y + ")";
				} else {
					gridCounter += 1;
					return "translate(" + gridPos[gridCounter].x + "," + gridPos[gridCounter].y + ")";
				}//else
			});

		//Move the language title
		svg.selectAll(".ring-center-text")
			.attr("y", function(d) { return d.chosen ? 0 : -radiusScaleSmall(1)*1.6; })
			.style("font-size", function(d) { return d.chosen ? bigFontScale(width) + "px" : smallFontScale(width) + "px"; });
		//Move the rank locations
		svg.selectAll(".ring-rank-group").attr("transform", "translate(" + gridPos[0].x + "," + gridPos[0].y + ")");
		svg.selectAll(".ring-rank").attr("y", function(d) { return radiusScale(d); });

		//Update the paths of the language rings
		svg.selectAll(".tree").selectAll(".ring-path")
			.attr("d", function(d,i) {
				var radius = d.chosen ? radiusScale(d.rank) : radiusScaleSmall(d.rank);
				var open = d.chosen ? openScale(d.rank) : 1;
				return "M" + round2(radius*Math.cos(open*Math.PI/180 + Math.PI/2)) + "," + round2(radius*Math.sin(open*Math.PI/180 + Math.PI/2)) + 
						"A" + round2(radius) + "," + round2(radius) + " 0 1,1 " + 
						round2(radius*Math.cos(-open*Math.PI/180 + Math.PI/2)) + "," + round2(radius*Math.sin(-open*Math.PI/180 + Math.PI/2));
			});

	}//resizeTreeRings

	///////////////////////////////////////////////////////////////////////////
	///////////////////////////// Switch on click /////////////////////////////
	///////////////////////////////////////////////////////////////////////////

	function switchChosenLanguage(d) {

		chosenLanguage = d.key;
		console.log(chosenLanguage);

		var gridCounter = 0;
		svg.selectAll(".tree")
			.each(function(d) { d.chosen = d.key === chosenLanguage ? 1 : 0; })
			.transition().duration(1000)
			.attr("transform", function(d,i) {
				if(d.chosen) {
					return "translate(" + gridPos[0].x + "," + gridPos[0].y + ")";
				} else {
					gridCounter += 1;
					return "translate(" + gridPos[gridCounter].x + "," + gridPos[gridCounter].y + ")";
				}//else
			});

		//Append text for the language
		svg.selectAll(".ring-center-text")
			.transition().duration(1000)
			.attr("y", function(d) { return d.chosen ? 0 : -radiusScaleSmall(1)*1.6; })
			.style("fill", function(d) { return d.chosen ? "#cfcece" : "#161616"; })
			.style("font-size", function(d) { return d.chosen ? bigFontScale(width) + "px" : smallFontScale(width) + "px"; });

		svg.selectAll(".tree").selectAll(".ring")
			.each(function(d) { d.chosen = d.language === chosenLanguage ? 1 : 0; });

		svg.selectAll(".tree").selectAll(".ring-path")
			.transition().duration(1000)
			.attr("d", function(d,i) {
				var radius = d.chosen ? radiusScale(d.rank) : radiusScaleSmall(d.rank);
				var open = d.chosen ? openScale(d.rank) : 1;
				return "M" + round2(radius*Math.cos(open*Math.PI/180 + Math.PI/2)) + "," + round2(radius*Math.sin(open*Math.PI/180 + Math.PI/2)) + 
						"A" + round2(radius) + "," + round2(radius) + " 0 1,1 " + 
						round2(radius*Math.cos(-open*Math.PI/180 + Math.PI/2)) + "," + round2(radius*Math.sin(-open*Math.PI/180 + Math.PI/2));
			});

		svg.selectAll(".tree").selectAll(".ring-text")
			.transition().duration(1000)
			.style("fill", function(d) { return d.chosen ? "#161616" : "#afafaf"; });

		// svg.selectAll(".tree")
		// 	.filter(function(d) { return d.chosen; })
		// 	.selectAll(".ring-text")
		// 	.select("textPath").text(function(d) { return new Array(80).join( d.translation + '\u00A0\u00A0\u00A0' ); });


	}//switchChosenLanguage


///////////////////////////////////////////////////////////////////////////
/////////////////////////// Extra functions ///////////////////////////////
///////////////////////////////////////////////////////////////////////////

//Round number to 2 behind the decimal
function round2(num) {
	return (Math.round((num + 0.00001) * 100)/100);
}//round2