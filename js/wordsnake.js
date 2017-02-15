/////////////////////////////////////////////////////////////////////////////////////
// Create the visualization with word snake around the most translated word of all //
/////////////////////////////////////////////////////////////////////////////////////
var resizeWordSnake;

function createWordSnake() {

	///////////////////////////////////////////////////////////////////////////
	/////////////////////////// General variables /////////////////////////////
	///////////////////////////////////////////////////////////////////////////

	var darkgrey = "#161616",
		middlegrey = "#a7a7a7",
		lightgrey = "#afafaf";

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

	///////////////////////////////////////////////////////////////////////////
	////////////////////////////// Set up the SVG /////////////////////////////
	///////////////////////////////////////////////////////////////////////////

	var divWidth = parseInt(d3.select("#viz-word-snake").style("width"));
	var margin = {
	  top: 10,
	  right: 10,
	  bottom: 10,
	  left: 10 
	};
	var width = divWidth - margin.left - margin.right;
	var height = width;

	//SVG container for the big circle
	var svg = d3.select("#viz-word-snake").append("svg")
		.attr("width", width + margin.left + margin.right)
		.attr("height", height + margin.top + margin.bottom)
		.append("g")
		.attr("transform", "translate(" + (margin.left) + "," + (margin.top) + ")");

	///////////////////////////////////////////////////////////////////////////
	///////////////////// Figure out variables for layout /////////////////////
	///////////////////////////////////////////////////////////////////////////

	var angle = 35 * Math.PI/180;
	var radius = 75;
	var n;

	function calculateGrid() {
		//How many circles fir in one "row"
		var s = width / Math.cos(angle);
		var numCircle = Math.min(4, Math.floor(s / (2*radius)));
		//I don't want 1 circle
		if(numCircle === 1) numCircle = 2;
		//If it's not an exact fit, make it so
		radius = Math.min(radius, round2((s/numCircle)/2));

		//Save the x-locations if each circle
		var xLoc = new Array(numCircle);
		for(var i = 0; i<numCircle; i++){
			xLoc[i] = round2( (1 + 2*i) * radius * Math.cos(angle)); 
		}//for i

		//Locations for the textPath
		var xLocArc = new Array(numCircle+1);
		for(var i = 0; i<=numCircle; i++){
			xLocArc[i] = round2(2*i * radius * Math.cos(angle)); 
		}//for i

		//New width & divide margins so it will sit in the center
		width = xLocArc[numCircle];
		var newMargin = round2((divWidth - width)/2);
		svg.attr("transform", "translate(" + newMargin + "," + (margin.top) + ")");

		return {xLoc: xLoc, xLocArc: xLocArc, numCircle: numCircle };
	}//function calculateGrid

	var grid = calculateGrid();

	///////////////////////////////////////////////////////////////////////////
	//////////////////////////// Read in the data /////////////////////////////
	///////////////////////////////////////////////////////////////////////////

	d3.queue() 
	  .defer(d3.csv, "data/top1_per_language_English_combined.csv")
	  .defer(d3.csv, "data/top100_overall.csv")
	  .await(drawWordSnake);

	function drawWordSnake(error, top1, top100Overall) {

		///////////////////////////////////////////////////////////////////////////
		///////////////////////////// Final data prep /////////////////////////////
		///////////////////////////////////////////////////////////////////////////
		
		if (error) throw error;

		top100Overall.forEach(function(d,i) {
			d.rank = +d.rank;
			//d.totalWord = (i+1) + " " + d.translation + "\u00A0\u00A0";
			d.totalWord = d.translation + "\u00A0\u00A0";
		});

		top1.forEach(function(d) {
			d.frequency = +d.frequency;
		});

		///////////////////////////////////////////////////////////////////////////
		//////////////////////////// Create node data /////////////////////////////
		///////////////////////////////////////////////////////////////////////////

		var nodes = [];

		top1.forEach(function(d,i) {
			//Are there more original words for this translation?
			var words = d.original.split(" | ");
			nodes.push({
				rank: i,
				frequency: d.frequency,
				radius: radius,
				translation: d.translation,
				original: d.original,
				language: languageMap[d.language],
				originalMore: words.length > 1,
				counter: 0,
				originalSeparate: words
			})
		});

		n = nodes.length;

		///////////////////////////////////////////////////////////////////////////
		///////////////////////////// Create the nodes ////////////////////////////
		///////////////////////////////////////////////////////////////////////////

		var nodeWrapper = svg.append("g").attr("class", "node-wrapper");

		//Create a group for each circle
		var pos = 0, add = 1;
	  	var node = nodeWrapper.selectAll(".node")
			.data(nodes)
	    	.enter().append("g")
	        .attr("class", "node noselect")
	        .attr("transform", function(d,i) { 
	        	//Save the locations
	        	d.x = grid.xLoc[pos];
        		d.y = (1 + 2*i) * radius * Math.sin(angle);

        		//Figure out which position of the xLoc to use on the next one
        		if(pos === grid.numCircle-1) { add = -1; }
	        	else if (pos === 0) { add = 1; }
	        	pos = pos + add;

        		return "translate(" + d.x + "," + d.y + ")";
        	});

		///////////////////////////////////////////////////////////////////////////
		//////////////////////// Create the central words /////////////////////////
		///////////////////////////////////////////////////////////////////////////

	    //Attach center words to each group
		var originalText = node.append("text")
	    	.attr("class", "circle-center-original")
	    	.attr("y", 0)
	    	.attr("dy", "0.35em")
	    	.style("fill", darkgrey)
	    	.style("font-family", function(d) { return d.language === "Russian" ? "'Cormorant Infant', serif" : null; })
	    	.text(function(d) { return d.originalSeparate[0]; });
	   	node.append("text")
	    	.attr("class", "circle-center-translation")
	    	.attr("y", 22)
	    	.attr("dy", "0.35em")
	    	.style("fill", "#787878")
	    	.text(function(d) { return d.translation; });
	    node.append("text")
	    	.attr("class", "circle-center-language")
	    	.attr("dy", "0.35em")
	    	.attr("y", -25)
	    	.style("fill", lightgrey)
	    	.text(function(d) { return d.language; });

		var t = d3.interval(loopWords, 4500);
		function loopWords() {
			//For the languages that have multiple variants in the original, loop through the words
	   		originalText.filter(function(d) { return d.originalMore; })
	   			.transition().duration(500).delay(function(d) { return Math.random() * 1500; })
	   			//.style("opacity", 0)
	   			.on("end", function() {
	   				d3.select(this)
		   			.text(function(d) { 
		   				d.counter = (d.counter + 1) % d.originalSeparate.length;
		   				return d.originalSeparate[d.counter]; 
		   			})
		   			.transition().duration(1500 + Math.random()*500).delay(function(d) { return Math.random() * 1500; })
	   				.style("opacity", 1);
	   			});

		}//loopWords

		///////////////////////////////////////////////////////////////////////////
		////////////////////// Create the outer circular paths ////////////////////
		///////////////////////////////////////////////////////////////////////////

	    //Create path
	    svg.append("path")
	    	.attr("class", "circle-path")
	    	.attr("id", "circle-word-path")
	    	//.style("stroke", "#d2d2d2")
	    	.attr("d", calculateSnakePath(grid, n));
		
	   	//Create text on path
	    svg.append("text")
			.attr("class", "circle-path-text noselect")
			.style("fill", "none")
			.attr("dy", "0.15em")
			.append("textPath")
			  	.style("text-anchor","start")
			  	.style("fill", lightgrey)
				.attr("xlink:href", "#circle-word-path")
				.text(top100Overall.map(function(d){ return d.translation; }).join("\u00A0\u00A0"));

		///////////////////////////////////////////////////////////////////////////
		/////////////////////// Create the word string legend /////////////////////
		///////////////////////////////////////////////////////////////////////////

		var legend = svg.append("g")
			.attr("class", "word-snake-legend")
			.attr("transform", "translate(" + grid.xLoc[1] +  "," + (3 * radius * Math.sin(angle)) + ")");

		//Create the path for the legend
		legend.append("path")
	    	.attr("class", "circle-path")
	    	.attr("id", "circle-legend-path")
	    	//.style("stroke", "#d2d2d2")
	    	.attr("d", function(d) {
	    		var r = radius * 1.2;
	    		return "M" + (-r*Math.cos(angle)) + "," + (-r*Math.sin(angle)) + 
	    				" A" + r + "," + r + " 0 1,1" + (-r*Math.cos(angle*0.99)) + "," + (-r*Math.sin(angle*0.99)) + " ";
	    	});

	    //Append text to path
		legend.append("text")
			.attr("class", "circle-path-legend noselect")
			.style("fill", "none")
			.attr("dy", "0.15em")
			.append("textPath")
			  	.style("text-anchor","middle")
			  	.attr("startOffset", "25%")
			  	.style("fill", darkgrey)
				.attr("xlink:href", "#circle-legend-path")
				.text("the most often translated words across all languages");	

	};//function drawWordSnake

	///////////////////////////////////////////////////////////////////////////
	/////////////// Calculate the arching path between the words //////////////
	///////////////////////////////////////////////////////////////////////////

	function calculateSnakePath(grid, n) {
	    var pos = 0, add = 1;
		function newPos() {
			if(pos === grid.numCircle) { add = -1; } 
        	else if (pos === 0) { add = 1; }
	        pos = pos + add;
		}//newPos

		var xOld = 0, 
			yOld = 0,
			sweep = 0,
			switchSide = 1;

		var path = "M0,0 ";

		//Construct the custom SVG paths out of arcs
		for(var i = 1; i <= n; i++) {

			if(i !== 1 && (i-1)%(grid.numCircle-1) === 0 && grid.numCircle%2 === 1 && switchSide === 1) {
				//For the outside in an uneven row count when the arc should be the short side
				//console.log(i, "outer side, short arc");
				switchSide = 0;

	        	x = grid.xLocArc[pos];
	        	newPos();
	        	newPos();

	        	y = yOld + round2( 2 * radius * Math.sin(angle) );
    			path = path + " A" + radius + "," + radius + " 0 0," + sweep + " " + x + "," + y + " ";
    			yOld = y;
    			sweep = sweep ? 0 : 1;

			} else if (i !== 1 && (i-1)%(grid.numCircle-1) === 0) {	    				
				//For the outside rows in the even row count or,
				//For the outside in an uneven row count when the arc should be the long side
				//console.log(i, "outer side, long arc");
				if(grid.numCircle%2 === 1) switchSide = 1;

        		newPos();
	        	x = grid.xLocArc[pos];
	        	y = yOld + round2( 2 * radius * Math.sin(angle) );
    			path = path + " A" + radius + "," + radius + " 0 0," + sweep + " " + x + "," + y + " ";
        		
        		newPos();
	        	x = grid.xLocArc[pos];
	        	path = path + " A" + radius + "," + radius + " 0 0," + sweep + " " + x + "," + y + " ";

	        	xOld = x;
				yOld = y;
				sweep = sweep ? 0 : 1;

			} else {
				//For the inbetween circles
				//console.log(i, "inbetween");

    			newPos()
	        	x = grid.xLocArc[pos];
	        	y = yOld + round2( 2 * radius * Math.sin(angle) );
    			path = path + " A" + radius + "," + radius + " 0 0," + sweep + " " + x + "," + y + " ";
    			xOld = x;
    			yOld = y;
    			sweep = sweep ? 0 : 1;

			}//else

		}//for i

		//Adjust the height of the SVG
		height = yOld;
		d3.select("#viz-word-snake svg").attr("height", height + margin.top + margin.bottom);

		return path;
	}//function calculateSnakePath

	///////////////////////////////////////////////////////////////////////////
	//////////////////////// Resize the path on an update /////////////////////
	///////////////////////////////////////////////////////////////////////////

	resizeWordSnake = function() {
		//console.log("resize word snake");

		// ------------------------ Update the SVGs --------------------------- //

		divWidth = parseInt(d3.select("#viz-tree-ring").style("width"));
		width = divWidth - margin.left - margin.right;

		//Adjust SVG container
		d3.select("#viz-word-snake svg").attr("width", width + margin.left + margin.right);
		svg = d3.select("#viz-word-snake svg g");

		// --------------------- Update locations and sizes ---------------------- //
		
		grid = calculateGrid();

		//Adjust the node locations
		var pos = 0, add = 1;
	  	var node = svg.selectAll(".node")
	        .attr("transform", function(d,i) { 
	        	//Save the locations
	        	d.x = grid.xLoc[pos];
        		d.y = (1 + 2*i) * radius * Math.sin(angle);

        		//Figure out which position of the xLoc to use on the next one
        		if(pos === grid.numCircle-1) { add = -1; }
	        	else if (pos === 0) { add = 1; }
	        	pos = pos + add;

        		return "translate(" + d.x + "," + d.y + ")";
        	});

        //Adjust the path
        svg.select("#circle-word-path")
	    	.attr("d", calculateSnakePath(grid, n));

       	//Adjust the legend location
       	svg.select(".word-snake-legend")
       		.attr("transform", "translate(" + grid.xLoc[1] +  "," + (3 * radius * Math.sin(angle)) + ")");

	}//function resizeWordSnake

}//function createWordSnake

