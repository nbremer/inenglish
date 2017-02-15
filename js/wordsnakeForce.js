	var divWidth = parseInt(d3.select("#viz-word-snake").style("width"));
	var margin = {
	  top: 10,
	  right: 10,
	  bottom: 10,
	  left: 10 
	};
	var width = divWidth - margin.left - margin.right;
	var forceLength = 900;
	var height = divWidth > forceLength ? 300 : Math.sqrt(forceLength*forceLength - width*width);

	//SVG container for the big circle
	var svg = d3.select("#viz-word-snake").append("svg")
		.attr("width", width + margin.left + margin.right)
		.attr("height", height + margin.top + margin.bottom)
		.append("g")
		.attr("transform", "translate(" + (margin.left) + "," + (margin.top) + ")");

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
		
		var wordDummy = svg.append("text")
			.attr("id", "word-length-dummy")
			.attr("class", "circle-path-text noselect")
			.style("position","absolute")
			.style("fill", "white")
			.text("");

		top100Overall.forEach(function(d,i) {
			d.rank = +d.rank;
			//d.totalWord = (i+1) + " " + d.translation + "\u00A0\u00A0";
			d.totalWord = d.translation + "\u00A0\u00A0";
			//Need to know the width of each word
			wordDummy.text(d.totalWord);
			d.textLength = round2(document.getElementById("word-length-dummy").getComputedTextLength());
		});

		top1.forEach(function(d) {
			d.frequency = +d.frequency;
		});

		var rScale = d3.scaleSqrt()
			.domain(d3.extent(top1, function(d) { return d.frequency; }))
			.range([50,70]);

		var widthScale = d3.scaleLinear()
			.domain([0,9])
			.range([50,width-50]);
		var heightScale = d3.scaleLinear()
			.domain([0,9])
			.range([50,height-50]);

		///////////////////////////////////////////////////////////////////////////
		////////////////////////////// Create nodes ///////////////////////////////
		///////////////////////////////////////////////////////////////////////////

		var nodes = [];

		top1.forEach(function(d,i) {
			//Are there more original words for this translation?
			var words = d.original.split(" | ");
			nodes.push({
				rank: i,
				radius: d.frequency,
				translation: d.translation,
				original: d.original,
				language: languageMap[d.language],
				originalMore: words.length > 1,
				counter: 0,
				originalSeparate: words
			})
		});

		//console.log(nodes);

		///////////////////////////////////////////////////////////////////////////
		///////////////////////////// Create the nodes ////////////////////////////
		///////////////////////////////////////////////////////////////////////////

		var nodeWrapper = svg.append("g").attr("class", "node-wrapper");

		//Create a group for each circle
	  	var node = nodeWrapper.selectAll(".node")
			.data(nodes)
	    	.enter().append("g")
	        .attr("class", "node")
	        .attr("transform", function(d) { 
		      	d.x = widthScale(d.rank);
        		d.y = heightScale(d.rank); 
        		return "translate(" + d.x + "," + d.y + ")";
        	});

	    // //Attach a circle to each group
	    // node.append("circle")
	    //   	.attr("r", function(d) { return rScale(d.radius); })
	    //   	.style("fill", "grey");

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
	   			.transition().duration(500).delay(function(d) { return Math.random() * 800; })
	   			.style("opacity", 0)
	   			.on("end", function() {
	   				d3.select(this)
		   			.text(function(d) { 
		   				d.counter = (d.counter + 1) % d.originalSeparate.length;
		   				return d.originalSeparate[d.counter]; 
		   			})
		   			.transition().duration(1500 + Math.random()*500)
	   				.style("opacity", 1);
	   			});

		}//loopWords

		///////////////////////////////////////////////////////////////////////////
		////////////////////// Create the outer circular paths ////////////////////
		///////////////////////////////////////////////////////////////////////////

	    //Create two paths for the groups - a bottom circle half and top circle half
	    var counter = 0;
	    var open = 1 * Math.PI/180;
	    node.selectAll(".circle-path")
	    	.filter(function(d) { return this.parentNode.__data__.translation; })
	    	.data([{pos: 0},{pos: 1}])
	    	.enter().append("path")
	    	.attr("class", "circle-path")
	    	.attr("id", function(d,i) { return "circle-path-" + counter++; })
	    	//.style("stroke", "#d2d2d2")
	    	.style("fill", "none")
	    	.attr("d", function(d,i) {
	    		d.radius = round2(rScale(this.parentNode.__data__.radius));
	    		var side = d.pos === 0 ? 1 : -1;
	    		return "M" + -(d.radius * Math.cos(open)) + "," + (side * d.radius * Math.sin(open)) + 
	    				" A" + d.radius + "," + d.radius + " 0 0, " + d.pos + " " + 
	    				(d.radius * Math.cos(open)) + "," + (side * d.radius * Math.sin(open));
	    	});

	   	//Create text on path
	    var counter = 0;
	    var wordCounter = 0;
	    var textRing = node.selectAll(".circle-path-text")
	    	.filter(function(d) { return this.parentNode.__data__.translation; })
	    	.data([{pos: 1},{pos: 0}])
	    	.enter().append("text")
			.attr("class", "circle-path-text noselect")
			.style("fill", "none")
			.attr("dy", function(d,i) { return (d.pos === 0 ? "0.35em" : "0em"); })
			.append("textPath")
			  	.style("text-anchor","middle")
			  	.attr("startOffset","50%")
			  	.style("fill", lightgrey)
				.attr("xlink:href", function(d,i) { return "#circle-path-" + (2*(this.parentNode.parentNode.__data__.rank) + d.pos); })
				.text(function(d,i) {
					var totalLength = 0;
					var words = "";
					d.pathLength = round2(document.getElementById("circle-path-" + (2*(this.parentNode.parentNode.__data__.rank) + d.pos)).getTotalLength());
					while(totalLength < d.pathLength) {
						totalLength += top100Overall[wordCounter].textLength;
						if(totalLength < d.pathLength) {
							words = words + top100Overall[wordCounter].totalWord;
							wordCounter += 1;
						} else {
							break;
						}//else
					}//while
					return words;
				});

		///////////////////////////////////////////////////////////////////////////
		//////////////////////////// Create simulation ////////////////////////////
		///////////////////////////////////////////////////////////////////////////

		var simulation = d3.forceSimulation(nodes)
			.alphaDecay(0.001)
			.velocityDecay(0.99)
		    .force("collide", d3.forceCollide().radius( function(d) { return rScale(d.radius) * 1.3; }).strength(1).iterations(2) )
		   	//.force("x", d3.forceX(function(d) { return widthScale(d.rank); }).strength(0.9) )
		    //.force("y", d3.forceY(function(d) { return heightScale(d.rank); }).strength(0.5) )
		    .stop();

		///////////////////////////////////////////////////////////////////////////
		/////////////////////////// Run the simulation ////////////////////////////
		///////////////////////////////////////////////////////////////////////////

		var n = Math.ceil(Math.log(simulation.alphaMin()) / Math.log(1 - simulation.alphaDecay()));
		for (var i = 0; i < n; ++i) {
		 	simulation.tick();
		 	ticked();
		}//for i
		//simulation.on("tick", ticked); //for animated movement

		function ticked() {
		  	node
		      	.attr("transform", function(d) { 
		      		d.x = Math.max(rScale(d.radius), Math.min(width - rScale(d.radius), d.x));
        			d.y = Math.max(rScale(d.radius), Math.min(height - rScale(d.radius), d.y)); 
        			return "translate(" + d.x + "," + d.y + ")";
        		});

		}//ticked

	};//function drawWordSnake

