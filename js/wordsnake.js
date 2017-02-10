	var divWidth = parseInt(d3.select("#viz-word-snake").style("width"));

	var margin = {
	  top: 10,
	  right: 10,
	  bottom: 10,
	  left: 10 
	};
	var width = divWidth*0.6 - margin.left - margin.right;
	var height = width;

	//SVG container for the big circle
	var svg = d3.select("#viz-word-snake").append("svg")
		.attr("width", width + margin.left + margin.right)
		.attr("height", height + margin.top + margin.bottom)
		.append("g")
		.attr("transform", "translate(" + (margin.left) + "," + (margin.top) + ")");