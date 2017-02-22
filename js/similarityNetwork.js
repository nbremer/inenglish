/////////////////////////////////////////////////////////////////////////////////////
////////// Create the visualization with the network of top10 similarities //////////
/////////////////////////////////////////////////////////////////////////////////////

var resizeSimilarityNetwork;

function createSimilarityNetwork() {

	//Base scale for the font size
	var fontScale = d3.scaleLinear()
		.domain([50, 300])
		.range([7, 15]);

	//The margin is scaled with the circle radius
	var marginScale = d3.scaleLinear()
		.domain([320, 700])
	    .range([20, 50]);

	///////////////////////////////////////////////////////////////////////////
	////////////////////////////// Set up the SVG /////////////////////////////
	///////////////////////////////////////////////////////////////////////////

	var divWidth = parseInt(d3.select("#viz-similarity-network").style("width"));
	var windowHeight = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;

	//The radius of the network in circular shape
	var radius = Math.min(divWidth/2 * 0.9, windowHeight * 0.8);

	var marginSize = Math.round(marginScale(radius));
	var margin = {
		top: marginSize*2,
		right: marginSize,
		bottom: marginSize*2,
		left: marginSize 
	};
	var width = divWidth - margin.left - margin.right;
	var height = width;

	//SVG container
	var svg = d3.select("#viz-similarity-network").append("svg")
		.attr("width", width + margin.left + margin.right)
		.attr("height", height + margin.top + margin.bottom)
		.append("g")
		.attr("transform", "translate(" + (margin.left + width/2) + "," + (margin.top + height/2) + ")")
		.style("font-size", round2(fontScale(radius)) + "px");

	///////////////////////////////////////////////////////////////////////////
	///////////////////// Figure out variables for layout /////////////////////
	///////////////////////////////////////////////////////////////////////////

	var middleLang = "all"; //starting language in the middle
	var radiusNum = [0.2, 0.45, 0.5];	//The fraction of the radius the links should

	//Scale for the white circles, one for each language
	var circleScale = d3.scaleLinear()
		.domain([50, 300])
		.range([10, 48]);

	//Opacities for the links (without words)
	var linkOpacity = 0.2,
		hoverLinkOpacity = 0.4;

	///////////////////////////////////////////////////////////////////////////
	////////////////////////// Create shadow filter ///////////////////////////
	///////////////////////////////////////////////////////////////////////////

	//Filter for the outside glow
	var filter = svg.append("defs").append("filter").attr("id","shadow");

	filter.append("feColorMatrix")
		.attr("type", "matrix")
		.attr("values", "0 0 0 0   0 0 0 0 0   0 0 0 0 0   0 0 0 0 0.4 0")
	filter.append("feGaussianBlur")
	  .attr("stdDeviation","3")
	  .attr("result","coloredBlur");;

	var feMerge = filter.append("feMerge");
	feMerge.append("feMergeNode").attr("in","coloredBlur");
	feMerge.append("feMergeNode").attr("in","SourceGraphic");

	///////////////////////////////////////////////////////////////////////////
	//////////////////////////// Read in the data /////////////////////////////
	///////////////////////////////////////////////////////////////////////////

	var linkedByIndex = {};
	var nodesByName = {};
	var nodes;

	d3.csv('data/links_English_combined.csv', function (error, links) {

		///////////////////////////////////////////////////////////////////////////
		///////////////////////////// Final data prep /////////////////////////////
		///////////////////////////////////////////////////////////////////////////
		
		if (error) throw error;

		//From http://stackoverflow.com/questions/11368339/drawing-multiple-edges-between-two-nodes-with-d3
	  	//Sort links by source, then target
		links.sort(function(a,b) {
		    if (a.source > b.source) {return 1;}
		    else if (a.source < b.source) {return -1;}
		    else {
		        if (a.target > b.target) {return 1;}
		        if (a.target < b.target) {return -1;}
		        else {return 0;}
		    }//else
		});//sort

		//Any links with duplicate source and target get an incremented 'linknum'
		for (var i = 0; i < links.length; i++) {
		    if (i != 0 && links[i].source == links[i-1].source && links[i].target == links[i-1].target) {
		            links[i].linknum = links[i-1].linknum + 1;

		    } else { 
		    	if(i != 0) { 
		    		var max = links[i-1].linknum;
		    		for (var j = 1; j <= max; j++) { links[i-j].max = max; }
		    	}//if
		    	links[i].linknum = 1; 
		    }//else
		}//for i

	  	//Create nodes for each unique source and target.
	  	links.forEach(function(link,i) {
	  		link.index = i;
	    	link.source = nodeByName(link.source);
	    	link.target = nodeByName(link.target);
	  	});
	  	//Extract the array of nodes from the map by name.
	  	nodes = d3.values(nodesByName);

	  	//For the hover effects
	  	//http://stackoverflow.com/questions/8739072/highlight-selected-node-its-links-and-its-children-in-a-d3-force-directed-grap
		links.forEach(function(d) {
		  linkedByIndex[d.source.name + "," + d.target.name] = 1;
		});

		//Set up the locations of the nodes
		calculateNodePositions(nodes);

		///////////////////////////////////////////////////////////////////////////
		//////////////////////////// Create the links /////////////////////////////
		///////////////////////////////////////////////////////////////////////////

		var link = svg.selectAll(".link")
			.data(links)
			.enter().append("g")
			.attr("class", "link");

		//Create the paths
		link.append("path")
			.attr("id", function(d) { return "link-id-" + d.index; })
			.attr("class", "link-path")
			.style("stroke", lightgrey) 
			.style("stroke-width", 3)
			.style("opacity", function(d) { return middle(d) ? 0 : linkOpacity; })
			.attr("d", linkPathCalculation);

		//Find the width of a normal space
		var space = svg.append("text")
			.attr("class", "link-text noselect space-width")
			.style("fill", "white")
			.text('\u00A0');
		spaceWidth = round2(space.node().getComputedTextLength());

		//Create a text element for the big bold part in the middle
		var textMiddle = link.append("text")
			.attr("class", "link-text-bold noselect")
			.style("fill", "none")
			.text(function(d) { return '\u00A0' + d.translation + '\u00A0'; });
		//Create a text element for the start and end of the link
		var textSource = link.append("text")
			.attr("class", "link-text link-source-text noselect")
			.style("fill", "none")
			.style("font-family", function(d) { return d.source.name === "ru" ? "'Cormorant Infant', serif" : null; })
			.text(function(d) { return '\u00A0' + d.wordSource + '\u00A0'; });
		var textTarget = link.append("text")
			.attr("class", "link-text link-target-text noselect")
			.style("fill", "none")
			.style("font-family", function(d) { return d.target.name === "ru" ? "'Cormorant Infant', serif" : null; })
			.text(function(d) { return '\u00A0' + d.wordTarget + '\u00A0'; });

		//Create the text on the paths
		updateLinkTextPaths();

		///////////////////////////////////////////////////////////////////////////
		//////////////////////////// Create the nodes /////////////////////////////
		///////////////////////////////////////////////////////////////////////////

		var node = svg.selectAll(".node")
			.data(nodes)
			.enter().append("g")
			.attr("class", "node")
			.attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; })
			.on("click", switchCenterLanguage)
			.on("mouseover", nodeMouseOver)
			.on("mouseout", nodeMouseOut);

		//Append a white circle for each language
		node.append("circle")
			.attr("class", "node-background-circle")
			.attr("r", circleScale(radius))
			.style("fill", "white")
			.style("filter", "url(#shadow)");

		//Append the language text in the circle
		node.append("text")
			.attr("class", "node-language-text")
			.attr("dy", "0.35em")
			.text(function(d) { return languageMap[d.name]; })

	});//d3.csv

	///////////////////////////////////////////////////////////////////////////
	///////////////////////////// Switch languages ////////////////////////////
	///////////////////////////////////////////////////////////////////////////

	function switchCenterLanguage(d) {

		//Switch locations of the center and clicked node
		svg.selectAll(".node")
			.on("click", null)
			.on("mouseover", null)
			.on("mouseout", null)
			.filter(function(n) { return n.name === middleLang; })
			.transition().duration(1000).delay(1000)
			.attr("transform", function(n) {
				n.x = d.x;
				n.y = d.y;
				return "translate(" + n.x + "," + n.y + ")";
			});
		d3.select(this)
			.transition().duration(1000).delay(1000)
			.attr("transform", function(n) {
				n.x = 0;
				n.y = 0;
				return "translate(" + n.x + "," + n.y + ")";
			});

		//Change id for middle language
		middleLang = d.name;

		//Fade out the textPaths and then remove them
		svg.selectAll(".link").selectAll("textPath")
			.transition().duration(1000)
			.style("opacity", 0)
			.remove();

		//Update the paths
		svg.selectAll(".link-path")
			.transition().duration(1000)
			.style("opacity", hoverLinkOpacity)
			.transition().duration(1000)
			.attrTween("d", function(n) {
	      		//https://bl.ocks.org/mbostock/3916621
	      		var d1 = linkPathCalculation(n), 
	      			precision = 4;

		      	var path0 = this,
			        path1 = path0.cloneNode(),
			        n0 = path0.getTotalLength(),
			        n1 = (path1.setAttribute("d", d1), path1).getTotalLength();

			    // Uniform sampling of distance based on specified precision.
			    var distances = [0], i = 0, dt = precision / Math.max(n0, n1);
			    while ((i += dt) < 1) distances.push(i);
			    distances.push(1);

			    // Compute point-interpolators at each distance.
			    var points = distances.map(function(t) {
			    	var p0 = path0.getPointAtLength(t * n0),
			          	p1 = path1.getPointAtLength(t * n1);
			    	return d3.interpolate([p0.x, p0.y], [p1.x, p1.y]);
			    });

			    return function(t) {
			    	return t < 1 ? "M" + points.map(function(p) { return p(t); }).join("L") : d1;
			    };
		    })
		    .transition().duration(1000)
			.style("opacity", function(n) { return middle(n) ? 0 : linkOpacity; });


		//Adjust the text paths
		setTimeout(updateLinkTextPaths,2000);

		//Basically do a mouseout but then slowly
		setTimeout(function() {
			//Fade everything back in
			svg.selectAll(".node")
				.transition().duration(1000)
				.style("opacity", 1);
			svg.selectAll(".link")
				.transition().duration(1000)
				.style("opacity", 1);
			svg.selectAll(".link").selectAll(".link-path")
				.transition().duration(1000)
				.style("stroke-width", 3)
				.style("opacity", function(d) { return middle(d) ? 0 : linkOpacity; });
			//Set the hovers back on
			svg.selectAll(".node")
				.on("click", switchCenterLanguage)
				.on("mouseover", nodeMouseOver)
				.on("mouseout", nodeMouseOut);
		},3000);

	}//function switchCenterLanguage

	///////////////////////////////////////////////////////////////////////////
	/////////////////////////// Calculate the paths ///////////////////////////
	///////////////////////////////////////////////////////////////////////////

	function linkPathCalculation(d) {
		var dx = d.target.x - d.source.x,
        	dy = d.target.y - d.source.y,
        	dr = Math.sqrt(dx * dx + dy * dy),
         	arc;

        var sweepflag = d.linknum % 2 === 0 ? 1 : 0;

        //Figure out the best radius to give the arc
        if(d.max%2 === 1) { //Is the total number of links uneven
        	if(d.linknum === 1) { //For the first link
        		//If there are multiple links to draw between these nodes, make the first straight
        		if(d.max !== 1) {
        			arc = 0
        		} else { //If there is only 1 link, make it curved
        			//For the line towards the center, just make it all clockwise
        			if(d.source.name === middleLang || d.target.name === middleLang) {
        				sweepflag = 1;
        			} else { //For the rest, figure out in which quadrant it lies wrt the source
		        		var da = (d.target.angle - d.source.angle)/Math.PI;
						if( (da >= 0 && da < 1) || (da >= -2 && da < -1) ) {
							sweepflag = 1;
						}//if	        				
        			}//else
					arc = dr; 
				}//else
        	} else { //for the links greater than number 1
        		arc = dr - radiusNum[Math.floor(d.linknum/2)-1] * dr;
        	}//else
        } else { //for the even numbered total links
        		arc = dr - radiusNum[Math.ceil(d.linknum/2)-1] * dr;
        } //else

        var path;
        
        // if(middle(d)) {
        // 	if(d.source.name === middleLang) {
        // 		if(d.target.x < 0) {
        // 			sweepflag
        // 		}
        // 	} else {

        // 	}
        // 	path = "M" + round2(d.source.x) + "," + round2(d.source.y) + " A" + round2(arc) + "," + round2(arc) + " 0 0," + sweepflag + " " + 
        // 				 round2(d.target.x) + "," + round2(d.target.y);

        // } else {
        // 	path = "M" + round2(d.source.x) + "," + round2(d.source.y) + " A" + round2(arc) + "," + round2(arc) + " 0 0," + sweepflag + " " + 
        // 				 round2(d.target.x) + "," + round2(d.target.y);
        // }
        

		path = "M" + round2(d.source.x) + "," + round2(d.source.y) + " A" + round2(arc) + "," + round2(arc) + " 0 0," + sweepflag + " " + 
        			 round2(d.target.x) + "," + round2(d.target.y);

        return path;

	}//function linkPathCalculation

	///////////////////////////////////////////////////////////////////////////
	//////////////////////// Resize the path on an update /////////////////////
	///////////////////////////////////////////////////////////////////////////

	resizeSimilarityNetwork = function() {
		console.log("resize similarity network");

		// ------------------------ Update the SVGs --------------------------- //

		divWidth = parseInt(d3.select("#viz-similarity-network").style("width"));
		windowHeight = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;

		radius = Math.min(divWidth/2 * 0.9, windowHeight * 0.8);

		marginSize = Math.round(marginScale(radius));
		margin = {
		  top: marginSize*2,
		  right: marginSize,
		  bottom: marginSize*2,
		  left: marginSize 
		};

		width = divWidth - margin.left - margin.right;
		height = width;

		//Adjust SVG container
		d3.select("#viz-similarity-network svg")
			.attr("width", width + margin.left + margin.right)
			.attr("height", height + margin.top + margin.bottom);
		svg = d3.select("#viz-similarity-network svg g");

		//Adjust the center and font size
		svg
			.attr("transform", "translate(" + (margin.left + width/2) + "," + (margin.top + height/2) + ")")
			.style("font-size", round2(fontScale(radius)) + "px");

		// --------------------- Update locations and sizes ---------------------- //
		
		//Put nodes on new locations
		calculateNodePositions(nodes);
		svg.selectAll(".node")
			.attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });

		//Resize background circle
		svg.selectAll(".node-background-circle")
			.attr("r", circleScale(radius));

		//Update the paths between the circles
		svg.selectAll(".link-path")
			.attr("d", linkPathCalculation);

		//Update the text paths
		updateLinkTextPaths();

	}//function resizeSimilarityNetwork

	///////////////////////////////////////////////////////////////////////////
	///////////////////////// Do all the textPath things //////////////////////
	///////////////////////////////////////////////////////////////////////////

	function updateLinkTextPaths() {

		var svg = d3.selectAll("#viz-similarity-network svg g");
		//Recalculate the width of a space
		spaceWidth = round2(svg.select(".space-width").node().getComputedTextLength());

		//Remove all the text paths, because we need to recalculate the text lengths
		svg.selectAll(".link").selectAll("textPath").remove();

		//Add the bold middle translation back in
		var textWidthBold = [];
		svg.selectAll(".link").select(".link-text-bold").filter(function(d) { return middle(d); })
			.each(function(d) {
		    	var el = d3.select(this);
		    	//Save the width of the large section to be used later
				textWidthBold[d.index] = round2(this.getComputedTextLength());

				el.append("textPath")
				  	.attr("class", "link-text-middle")
				  	.attr("startOffset", "50%")
				  	.style("text-anchor","middle")
				  	.style("opacity", 0)
				  	.style("fill", darkgrey)
					.attr("xlink:href", "#link-id-" + d.index)
					.text(d.translation);
			});

		//Smaller text from source to middle
		svg.selectAll(".link").select(".link-source-text").filter(function(d) { return middle(d); })
		    .each(function(d) {
		    	var el = d3.select(this);

				//Find and save the width of one word
	        	d.textWidth = round2(this.getComputedTextLength());
	        	//Get the length of the path
		        d.pathLength = round2(document.getElementById("link-id-" + d.index).getTotalLength());
				//The offset to start the text
				var textOffset = textWidthBold[d.index]/d.pathLength * 100/2;
				//How often does the text fit in the remaining path
				var textFit = Math.round( ((50 - textOffset)/100 * d.pathLength) / d.textWidth ) + 2;
				//console.log(textFit, d.textWidth, textWidthBold[i], d.pathLength, ((50 - textOffset)/100 ))
				
				//Add text on path
	        	el.append("textPath")
					.attr("class", "link-text-normal")
				  	.attr("startOffset", round2(50 - textOffset) + "%")
				  	.style("text-anchor","end")
				  	.style("fill", middlegrey)
				  	.style("opacity", 0)
					.attr("xlink:href", "#link-id-" + d.index)
					.text(new Array(textFit).join( '\u00A0' + d.wordSource + '\u00A0' ));
		    });
		//Smaller text from middle to target
		svg.selectAll(".link").select(".link-target-text").filter(function(d) { return middle(d); })
		    .each(function(d,i) {
		    	var el = d3.select(this);
		    	//See above
	        	d.textWidth = round2(this.getComputedTextLength());
		        d.pathLength = round2(document.getElementById("link-id-" + d.index).getTotalLength());
				var textOffset = textWidthBold[d.index]/d.pathLength * 100/2;
				var textFit = Math.round( ((50 - textOffset)/100 * d.pathLength) / d.textWidth ) + 2;
				//console.log(textFit)

				//Add the text on path
	        	el.append("textPath")
					.attr("class", "link-text-normal")
				  	.attr("startOffset", round2(50 + textOffset) + "%")
				  	.style("text-anchor","start")
				  	.style("fill", middlegrey)
				  	.style("opacity", 0)
					.attr("xlink:href", "#link-id-" + d.index)
					.text(new Array(textFit).join( '\u00A0' + d.wordTarget + '\u00A0' ));
		    });

		//Now show them
		svg.selectAll(".link").selectAll("textPath")
			.transition().duration(1000)
			.style("opacity", 1);

	}//function updateLinkTextPaths

	///////////////////////////////////////////////////////////////////////////
	///////////////////////////// Extra functions /////////////////////////////
	///////////////////////////////////////////////////////////////////////////

	//Mouse over a language circle
	function nodeMouseOver(d) {
		console.log(d.name);
		var opacity = 0.1;
		//Dim all other nodes
		svg.selectAll(".node").style("opacity", function(o) { return neighboring(d, o) || d === o ? 1 : opacity; });
		//Dim unconnected links
		svg.selectAll(".link").style("opacity", function(o) { return o.source === d || o.target === d ? 1 : opacity; });
		//Highlight connected link paths even more
		svg.selectAll(".link").selectAll(".link-path")
			.style("stroke-width", 2)
			.style("opacity", function(o) { 
				if(middle(o)) return 0;
				else return o.source === d || o.target === d ? hoverLinkOpacity : opacity; 
			});
	}//nodeMouseOver

	//Mouse out a language circle
	function nodeMouseOut(d) {
		//Bring everything back to normal
		svg.selectAll(".node").style("opacity", 1);
		svg.selectAll(".link").style("opacity", 1);
		svg.selectAll(".link").selectAll(".link-path")
			.style("stroke-width", 3)
			.style("opacity", function(d) { return middle(d) ? 0 : linkOpacity; });
	}//nodeMouseOut

	//Calculate the positions of the language circles
	function calculateNodePositions(nodes) {
		var counter = 0;
		nodes.forEach(function(d) {
			if(d.name === middleLang) {
				d.x = 0;
				d.y = 0;
				d.angle = 0;
			} else {
				d.angle = counter * 2*Math.PI/(nodes.length-1);
				d.x = radius * Math.cos(d.angle);
				d.y = radius * Math.sin(d.angle);
				counter+=1;
			}//else
		});//forEach nodes
	}//calculateNodePositions


	function nodeByName(name) { 
		return nodesByName[name] || (nodesByName[name] = {name: name}); 
	}

	function neighboring(a, b) { 
		return linkedByIndex[a.name + "," + b.name] || linkedByIndex[b.name + "," + a.name]; 
	}

	//Is the link attached to the middle circle
	function middle(d) {
		return d.source.name === middleLang || d.target.name === middleLang;
	}//function middle

}//function createSimilarityNetwork

